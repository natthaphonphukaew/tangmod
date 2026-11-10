"use client";

import { ArrowSquareOut, CalendarBlank, CaretLeft, CaretRight, ListBullets, Megaphone, SquaresFour } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AntMascot } from "@/components/brand/AntMascot";
import { TierBadge } from "@/components/ui/TierBadge";
import { classesOn, type ClassDay } from "@/lib/calendar/classes";
import {
  KIND_LABEL,
  academicMonths,
  allEvents,
  dayStatus,
  eventsInMonth,
  eventsOn,
  monthCells,
  upcoming,
  whenLabel,
  type CalendarEvent,
  type CalendarKind,
} from "@/lib/calendar/events";
import { useTimetable } from "@/lib/client/timetable-store";
import { noonOf, useToday } from "@/lib/client/use-today";
import { calendar } from "@/lib/data";
import { formatRange } from "@/lib/format";
import { ClassList } from "./ClassList";
import { KIND_ICON, KIND_STYLE } from "./kind-style";
import { TimetablePanel } from "./TimetablePanel";

/*
 * หน้าปฏิทินนักศึกษา (อยู่ใน TangmodApp แถบซ้ายไม่หาย)
 *   ซ้าย: ตัวกรองชนิด → ตารางเดือน (หรือภาพรวมทั้งปี) → รายละเอียดวันที่เลือก → รายการทั้งเดือน
 *   ขวา: ใกล้ถึงแล้ว → กำหนดการภาคนี้ → ตารางเรียนของฉัน
 * "วันนี้" รู้หลัง hydrate (useToday) ก่อนหน้านั้นแสดงเดือนแรกของปีการศึกษา
 */

const MONTHS = academicMonths();
const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
// ตัวกรองเลือกทีละชนิด: "ทั้งหมด" ไม่รวม TCAS (เรื่องของคนจะเข้ามหาลัย) ต้องกดชิปเอง
const FILTERS: CalendarKind[] = ["register", "pay", "exam", "holiday", "withdraw", "makeup", "grade", "activity", "term", "admission", "other"];
// "กำหนดการภาคนี้" เอาเฉพาะเส้นตายที่นักศึกษาต้องทำอะไร
const DEADLINE_KINDS: CalendarKind[] = ["register", "pay", "withdraw", "exam", "grade"];

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("th-TH", { ...opts, timeZone: "UTC" });
const MONTH_LONG = fmt({ month: "long", year: "numeric" });
const MONTH_SHORT = fmt({ month: "short" });
const DAY_LONG = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const DAY_SHORT = fmt({ day: "numeric", month: "short", year: "2-digit" });
const monthTitle = (year: number, month: number) => MONTH_LONG.format(new Date(Date.UTC(year, month - 1, 1)));
const isoEndOf = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}-31`;
const indexOfMonth = (iso: string | null) => (iso ? MONTHS.findIndex((m) => iso.startsWith(`${m.year}-${String(m.month).padStart(2, "0")}`)) : -1);

/** ช่วงยาว (เช่น ประเมินการสอน 3 เดือน) โชว์ในช่องวันแค่วันเริ่มกับวันจบ ไม่งั้นทุกช่องเต็มไปด้วยรายการเดิม */
const spanDays = (e: CalendarEvent) => (Date.parse(e.end) - Date.parse(e.start)) / 86_400_000 + 1;
const showInCell = (e: CalendarEvent, iso: string) => spanDays(e) <= 7 || iso === e.start || iso === e.end;

const ROUND_BTN = "grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-paper disabled:opacity-30";

export function CalendarScreen() {
  const today = useToday();
  const { timetable } = useTimetable();
  const [chosenMonth, setChosenMonth] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<CalendarKind | "all">("all");
  const [yearView, setYearView] = useState(false);
  // ประกาศเดือนใหม่ให้ screen reader เฉพาะตอนผู้ใช้เปลี่ยนเอง (ไม่ใช่ตอนโหลดหน้า)
  const [announce, setAnnounce] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  // เลือกวันแล้วเลื่อนให้เห็นรายละเอียด (บนคอมรายละเอียดอยู่ใต้ตาราง มักเลยขอบจอ)
  useEffect(() => {
    if (selected) detailRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  const monthIdx = chosenMonth ?? Math.max(indexOfMonth(today), 0);
  const { year, month } = MONTHS[monthIdx];
  const events = useMemo(() => allEvents().filter((e) => (filter === "all" ? e.kind !== "admission" : e.kind === filter)), [filter]);
  const monthEvents = useMemo(() => eventsInMonth(year, month, events), [year, month, events]);
  // วันที่เลือก: ค่าเริ่มต้นคือวันนี้ ถ้าวันนี้อยู่ในเดือนที่ดู
  const day = selected ?? (today && indexOfMonth(today) === monthIdx ? today : null);

  const showMonth = (i: number, pick: string | null = null) => {
    const next = Math.min(MONTHS.length - 1, Math.max(0, i));
    setChosenMonth(next);
    setSelected(pick);
    setYearView(false);
    setAnnounce(monthTitle(MONTHS[next].year, MONTHS[next].month));
  };
  // กรองแล้วเดือนนี้ว่าง: พาไปเดือนถัดไปที่มีรายการชนิดนั้น
  const nextWithEvents = filter === "all" ? undefined : events.find((e) => e.start > isoEndOf(year, month));
  const jumpTo = (iso: string) => {
    const i = indexOfMonth(iso);
    if (i >= 0) showMonth(i, iso);
  };

  const touch = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="relative mx-auto w-full max-w-[84rem] px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-6">
      <Header />

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* แถวเดียวทุกขนาดจอ เลื่อนแนวนอนได้ (ห่อหลายแถวแล้วตารางถูกดันลงไปต่ำ) */}
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0" role="group" aria-label="เลือกชนิดวันที่จะแสดง">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="ทั้งหมด" icon={<CalendarBlank size={18} weight="bold" />} />
        {FILTERS.map((kind) => {
          const Icon = KIND_ICON[kind];
          return (
            <FilterChip
              key={kind}
              active={filter === kind}
              onClick={() => setFilter(filter === kind ? "all" : kind)}
              label={KIND_LABEL[kind]}
              icon={<Icon size={18} weight="duotone" className={KIND_STYLE[kind].text} />}
            />
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0 space-y-5">
          {!today ? (
            <div aria-hidden className="h-[480px] animate-pulse rounded-[24px] border border-line bg-card sm:h-[640px]" />
          ) : (
          <section
            aria-label={yearView ? "ภาพรวมทั้งปีการศึกษา" : `ปฏิทินเดือน${monthTitle(year, month)}`}
            className="overflow-hidden rounded-[24px] border border-line bg-card shadow-[var(--shadow-card)]"
            onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
            onTouchEnd={(e) => {
              if (!touch.current || yearView) return;
              const dx = e.changedTouches[0].clientX - touch.current.x;
              const dy = e.changedTouches[0].clientY - touch.current.y;
              touch.current = null;
              // นับเฉพาะปัดแนวนอนชัด ๆ เลื่อนหน้าขึ้นลงแล้วนิ้วเอียงจะได้ไม่เปลี่ยนเดือนเอง
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showMonth(monthIdx + (dx < 0 ? 1 : -1));
            }}
          >
            <div className="flex items-center gap-1 px-2 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
              {!yearView && (
                <button type="button" onClick={() => showMonth(monthIdx - 1)} disabled={monthIdx === 0} aria-label="เดือนก่อน" className={ROUND_BTN}>
                  <CaretLeft size={20} weight="bold" />
                </button>
              )}
              <h2 className="flex min-w-0 flex-1 items-center justify-center gap-2 font-display text-xl text-ink sm:text-2xl">
                <CalendarBlank size={24} weight="duotone" className="shrink-0 text-brand-ink max-sm:hidden" />
                <span className="truncate">{yearView ? "ปีการศึกษา 2569" : monthTitle(year, month)}</span>
              </h2>
              {!yearView && (
                <button type="button" onClick={() => showMonth(monthIdx + 1)} disabled={monthIdx === MONTHS.length - 1} aria-label="เดือนถัดไป" className={ROUND_BTN}>
                  <CaretRight size={20} weight="bold" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setYearView((v) => !v)}
                aria-pressed={yearView}
                className="ml-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3 text-sm font-medium text-ink hover:border-brand/50 sm:px-4"
              >
                {yearView ? <ListBullets size={18} /> : <SquaresFour size={18} />}
                <span className="max-sm:sr-only">{yearView ? "ดูรายเดือน" : "ดูทั้งปี"}</span>
              </button>
            </div>

            {yearView ? (
              <YearGrid current={monthIdx} today={today} events={events} onPick={(i) => showMonth(i)} />
            ) : (
              <MonthGrid
                year={year}
                month={month}
                today={today}
                selected={day}
                events={events}
                classesOf={(iso) => classesOn(iso, timetable)}
                onSelect={(iso, inMonth) => (inMonth ? setSelected(iso) : jumpTo(iso))}
              />
            )}

            <Legend events={yearView ? events : monthEvents} hasClasses={!!timetable} />
          </section>
          )}

          {/* มือถือ: ใกล้ถึงแล้วต่อจากตาราง (จอใหญ่อยู่คอลัมน์ขวา) */}
          <div className="lg:hidden">
            <ComingUp today={today} onPick={jumpTo} />
          </div>

          {!yearView && day && (
            <DayDetail ref={detailRef} iso={day} isToday={day === today} events={eventsOn(day, events)} classes={classesOn(day, timetable)} />
          )}

          {!yearView && (
            <section aria-label="วันสำคัญทั้งเดือน">
              <h2 className="font-display text-lg text-ink">ทั้งหมดในเดือน{monthTitle(year, month)}</h2>
              {monthEvents.length === 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                  <span>ไม่มี{filter === "all" ? "รายการ" : KIND_LABEL[filter]}ในเดือนนี้</span>
                  {nextWithEvents && (
                    <button type="button" onClick={() => jumpTo(nextWithEvents.start)} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-ink hover:underline">
                      ไปที่ครั้งถัดไป {DAY_SHORT.format(utc(nextWithEvents.start))} <CaretRight size={14} weight="bold" />
                    </button>
                  )}
                </div>
              ) : (
                <ul className="mt-3 grid gap-2 xl:grid-cols-2">
                  {monthEvents.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-5" aria-label="สรุปกำหนดการ">
          <div className="max-lg:hidden">
            <ComingUp today={today} onPick={jumpTo} />
          </div>
          <TermDeadlines today={today} onPick={jumpTo} />
          <TimetablePanel today={today} />
        </aside>
      </div>
    </div>
  );
}

function Header() {
  // เปิดหน้าปฏิทินจากเมนูแล้วให้ focus มาที่ชื่อหน้า (ไม่ค้างอยู่ที่ปุ่มในแถบซ้าย)
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // เปิดตรงจาก URL (focus อยู่ที่ body) ไม่ต้องย้าย
    const active = document.activeElement;
    if (active && active !== document.body) titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="relative flex items-end gap-4">
      <div className="min-w-0 flex-1">
        <h1 ref={titleRef} tabIndex={-1} className="font-display text-[28px] leading-tight text-balance text-ink outline-none sm:text-4xl lg:text-[40px]">
          ปฏิทินนักศึกษา <span className="whitespace-nowrap">ปีการศึกษา 2569</span>
        </h1>
        <p className="mt-2 max-w-[40rem] text-[15px] text-ink-soft sm:text-base">วันลงทะเบียน จ่ายเงิน สอบ วันหยุด และคาบเรียนของคุณในที่เดียว</p>
      </div>
      {/* น้องมดกับปฏิทิน (ตกแต่ง) */}
      <div aria-hidden className="relative hidden shrink-0 sm:block">
        <div className="absolute inset-x-[-10%] bottom-[2%] aspect-square rounded-full bg-sun" />
        <AntMascot pose="cheer" sizes="130px" className="relative h-32 w-auto lg:h-36" />
        <CalendarSticker className="absolute bottom-3 -left-6 size-14 -rotate-12 drop-shadow-sm lg:size-16" />
      </div>
    </div>
  );
}

/** ปฏิทินเล็ก ๆ ประกอบภาพน้องมด */
function CalendarSticker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="presentation">
      <rect x="6" y="10" width="52" height="48" rx="10" fill="#fff" stroke="var(--brand-ink)" strokeWidth="3" />
      <path d="M6 22a10 10 0 0 1 10-12h32a10 10 0 0 1 10 12z" fill="var(--brand)" />
      <rect x="18" y="5" width="5" height="12" rx="2.5" fill="var(--ink)" />
      <rect x="41" y="5" width="5" height="12" rx="2.5" fill="var(--ink)" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={14 + c * 10} y={29 + r * 9} width="6" height="5" rx="1.5" fill={r === 1 && c === 2 ? "var(--brand)" : "var(--brand-tint-strong)"} />
        )),
      )}
    </svg>
  );
}

function FilterChip({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
        active ? "border-brand-ink bg-brand-ink text-white shadow-[0_6px_16px_-8px_var(--brand)] [&_svg]:text-white" : "border-line bg-card text-ink hover:border-brand/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MonthGrid({
  year,
  month,
  today,
  selected,
  events,
  classesOf,
  onSelect,
}: {
  year: number;
  month: number;
  today: string | null;
  selected: string | null;
  events: CalendarEvent[];
  classesOf: (iso: string) => ClassDay;
  onSelect: (iso: string, inMonth: boolean) => void;
}) {
  return (
    <div className="border-t border-line">
      <div className="grid grid-cols-7 border-b border-line bg-paper/60 text-center text-[13px] font-semibold text-ink-soft">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-2 ${i >= 5 ? "text-brand-ink" : ""}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthCells(year, month).map(({ iso, inMonth }, i) => (
          <DayCell
            key={iso}
            iso={iso}
            inMonth={inMonth}
            lastCol={i % 7 === 6}
            events={eventsOn(iso, events)}
            classes={inMonth ? classesOf(iso) : null}
            today={iso === today}
            selected={iso === selected}
            onSelect={() => onSelect(iso, inMonth)}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  iso,
  inMonth,
  lastCol,
  events: all,
  classes,
  today,
  selected,
  onSelect,
}: {
  iso: string;
  inMonth: boolean;
  lastCol: boolean;
  events: CalendarEvent[];
  classes: ClassDay | null;
  today: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = dayStatus(iso);
  const events = inMonth ? all.filter((e) => showInCell(e, iso)) : [];
  const kinds = [...new Set(events.map((e) => e.kind))];
  const slots = classes?.slots ?? [];
  const live = slots.filter((s) => !s.cancelled).length;
  const off = slots.length - live;
  const clash = slots.some((s) => s.conflicts);
  const classText = (live ? ` · เรียน ${live} คาบ` : off ? ` · งดเรียน ${off} คาบ` : "") + (clash ? " · มีคาบเวลาชน" : "");
  const label = `${DAY_LONG.format(utc(iso))}${today ? " (วันนี้)" : ""}${classText}${inMonth && all.length ? ` · ${all.map((e) => e.title).join(", ")}` : ""}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      className={`relative flex min-h-16 flex-col items-center gap-1 border-b border-line px-0.5 pt-1.5 pb-1.5 text-left transition sm:min-h-[104px] sm:items-stretch sm:px-1.5 ${lastCol ? "" : "border-r"} ${
        selected ? "bg-brand-tint" : today ? "bg-trail-tint/70" : inMonth ? "hover:bg-paper" : "bg-paper/40"
      }`}
    >
      {selected && <span aria-hidden className="pointer-events-none absolute inset-0.5 rounded-lg border-2 border-brand" />}
      <span
        className={`grid size-8 place-items-center self-center rounded-full text-sm tabular-nums sm:self-start ${
          today ? "bg-brand-ink font-bold text-white" : !inMonth ? "text-ink-soft/70" : status.tone === "holiday" ? "font-semibold text-ok" : "font-medium text-ink"
        }`}
      >
        {Number(iso.slice(8))}
      </span>
      {/* มือถือ: จุดสี · จอใหญ่: ป้ายชื่อ 2 รายการแรก */}
      <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
        {kinds.slice(0, 4).map((k) => (
          <span key={k} className={`size-1.5 rounded-full ${KIND_STYLE[k].dot}`} />
        ))}
      </span>
      <span className="hidden space-y-0.5 sm:block">
        {events.slice(0, 2).map((e) => (
          <span key={e.id} className={`line-clamp-2 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium break-words ${KIND_STYLE[e.kind].chip}`}>
            {e.title}
          </span>
        ))}
        {events.length > 2 && <span className="block px-1.5 text-[11px] text-ink-soft">+{events.length - 2} รายการ</span>}
      </span>
      {/* คาบเรียนของฉัน: ส้ม = มีเรียน · แดงชมพู = มีคาบเวลาชน · เส้นประ = คาบงด */}
      {(live > 0 || off > 0) && (
        <span
          aria-hidden
          className={`mt-auto block h-1 w-5 self-center rounded-full sm:w-full ${clash ? "bg-[#d6336c]" : live ? (selected ? "bg-brand-ink" : "bg-brand/70") : "border-t-2 border-dashed border-slate"}`}
        />
      )}
    </button>
  );
}

function Legend({ events, hasClasses }: { events: CalendarEvent[]; hasClasses: boolean }) {
  const kinds = [...new Set(events.map((e) => e.kind))];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-4 py-3 text-[13px] text-ink-soft">
      {kinds.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-full ${KIND_STYLE[k].dot}`} />
          {KIND_LABEL[k]}
        </span>
      ))}
      {hasClasses && (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-1 w-4 rounded-full bg-brand/70" />
          คาบเรียนของฉัน
        </span>
      )}
      <span className="w-full text-xs">ข้อมูลจากปฏิทินการศึกษา มจธ. 2569 ประกาศเปลี่ยนวันเกิดขึ้นได้ ตรวจประกาศทางการอีกครั้งก่อนวันสำคัญ</span>
    </div>
  );
}

function YearGrid({ current, today, events, onPick }: { current: number; today: string | null; events: CalendarEvent[]; onPick: (i: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 border-t border-line p-3 sm:grid-cols-3 sm:p-4 xl:grid-cols-4">
      {MONTHS.map(({ year, month }, i) => {
        const isNow = indexOfMonth(today) === i;
        return (
          <button
            key={`${year}-${month}`}
            type="button"
            onClick={() => onPick(i)}
            aria-label={`${monthTitle(year, month)} มี ${eventsInMonth(year, month, events).length} รายการ`}
            className={`rounded-2xl border p-2.5 text-left transition hover:border-brand/60 ${i === current ? "border-brand bg-brand-tint/50" : "border-line bg-card"}`}
          >
            <span className={`block text-sm font-semibold ${isNow ? "text-brand-ink" : "text-ink"}`}>
              {MONTH_SHORT.format(new Date(Date.UTC(year, month - 1, 1)))} {String(year + 543).slice(2)}
            </span>
            <span aria-hidden className="mt-1.5 grid grid-cols-7 gap-0.5">
              {monthCells(year, month).map(({ iso, inMonth }) => {
                const kind = inMonth ? eventsOn(iso, events).find((e) => showInCell(e, iso))?.kind : undefined;
                return (
                  <span
                    key={iso}
                    className={`aspect-square rounded-[3px] ${!inMonth ? "" : kind ? KIND_STYLE[kind].dot : "bg-paper-deep"} ${iso === today ? "ring-2 ring-ink ring-offset-1" : ""}`}
                  />
                );
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayDetail({
  ref,
  iso,
  isToday,
  events,
  classes,
}: {
  ref: React.Ref<HTMLElement>;
  iso: string;
  isToday: boolean;
  events: CalendarEvent[];
  classes: ClassDay;
}) {
  const status = dayStatus(iso);
  return (
    <section ref={ref} aria-label="วันที่เลือก" className="scroll-mt-4 rounded-[24px] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h2 className="font-display text-lg text-ink">
        {isToday && <span className="mr-2 rounded-full bg-brand-ink px-2 py-0.5 align-middle text-xs font-semibold text-white">วันนี้</span>}
        {DAY_LONG.format(utc(iso))}
      </h2>
      <p className="text-sm text-ink-soft">{status.text}</p>
      {(classes.slots.length > 0 || classes.note) && (
        <div className="mt-3 rounded-xl bg-paper p-3">
          <p className="text-[13px] font-semibold text-ink">คาบเรียนของฉัน</p>
          <ClassList day={classes} compact />
        </div>
      )}
      {events.length > 0 && (
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EventRow({ event: e }: { event: CalendarEvent }) {
  const Icon = KIND_ICON[e.kind];
  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-card p-3">
      <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl ${KIND_STYLE[e.kind].chip}`}>
        <Icon size={18} weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          <span className="font-semibold text-ink">{formatRange(e.start, e.end)}</span>
          <span className="text-ink-soft">{KIND_LABEL[e.kind]}</span>
        </div>
        <p className="mt-0.5 text-[15px] text-pretty text-ink">{e.title}</p>
        {e.note && <p className="mt-0.5 text-[13px] text-ink-soft">{e.note}</p>}
        <div className="mt-1.5 flex items-center gap-2">
          <TierBadge tier={e.tier} />
          {e.url && (
            <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs text-brand-ink hover:underline">
              แหล่งที่มา <ArrowSquareOut size={12} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-[24px] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** ใกล้ถึงแล้ว: 3 รายการถัดไปแบบป้ายวันที่ใหญ่ กดแล้วไปวันนั้นในปฏิทิน */
function ComingUp({ today, onPick }: { today: string | null; onPick: (iso: string) => void }) {
  const items = today ? upcoming(today, 3, ["register", "pay", "withdraw", "exam", "grade", "makeup", "term", "activity"]) : [];
  const now = today ? noonOf(today) : null;
  return (
    <Card title="ใกล้ถึงแล้ว" icon={<Megaphone size={22} weight="duotone" className="text-brand-ink" />}>
      {!today ? (
        <div className="mt-3 h-[220px] animate-pulse rounded-2xl bg-paper" aria-hidden />
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">ไม่มีกำหนดการที่กำลังจะถึงในปีการศึกษานี้</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((e) => {
            const target = e.start < today ? today : e.start;
            const d = utc(target);
            return (
              <li key={e.id}>
                <button type="button" onClick={() => onPick(target)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-2.5 text-left transition hover:border-brand/50">
                  <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-brand-tint py-1.5 text-brand-deep">
                    <span className="text-xs font-semibold">{MONTH_SHORT.format(d)}</span>
                    <span className="font-display text-2xl leading-none tabular-nums">{d.getUTCDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] font-medium text-ink">{e.title}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-soft">
                      {formatRange(e.start, e.end)} · <span className="font-semibold text-brand-ink">{now && whenLabel(e.start, e.end, now)}</span>
                    </span>
                  </span>
                  <CaretRight size={18} className="shrink-0 text-ink-soft" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ประกาศเกรดออกหลังปิดภาคราวเดือนเดียว ให้นับเป็นของภาคนั้นด้วย
const plusMonth = (iso: string) => {
  const d = utc(iso);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
};

/** กำหนดการภาคนี้: เส้นตายของภาคที่กำลังเรียน (ช่วงปิดเทอมคือภาคถัดไป) */
function TermDeadlines({ today, onPick }: { today: string | null; onPick: (iso: string) => void }) {
  const [all, setAll] = useState(false);
  if (!today) return <div aria-hidden className="h-[300px] animate-pulse rounded-[24px] border border-line bg-card" />;
  const term = calendar.terms.find((t) => today <= t.end) ?? calendar.terms.at(-1)!;
  const items = allEvents().filter((e) => DEADLINE_KINDS.includes(e.kind) && e.end >= addDaysBack(term.start) && e.start <= plusMonth(term.end));
  const shown = all ? items : items.filter((e) => e.end >= today).slice(0, 6);
  return (
    <Card title={`กำหนดการ${term.label.replace("ภาคการศึกษาที่ ", "ภาค ")}`} icon={<CalendarBlank size={22} weight="duotone" className="text-brand-ink" />}>
      <ul className="mt-2 divide-y divide-line">
        {shown.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e.start)}
              className={`flex min-h-11 w-full items-center gap-3 py-2 text-left text-sm hover:text-brand-ink ${e.end < today ? "opacity-60" : ""}`}
            >
              <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${KIND_STYLE[e.kind].dot}`} />
              <span className="w-[4.75rem] shrink-0 text-ink-soft tabular-nums">{DAY_SHORT.format(utc(e.start))}</span>
              <span className="min-w-0 flex-1 text-ink">{e.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {(all || items.length > shown.length) && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-ink hover:underline">
          {all ? "ดูเฉพาะที่ยังไม่ถึง" : `ดูทั้งหมด ${items.length} รายการ`} <CaretRight size={14} weight="bold" />
        </button>
      )}
    </Card>
  );
}

// ลงทะเบียนของภาคเริ่มก่อนวันเปิดภาคราวสองสัปดาห์
const addDaysBack = (iso: string) => {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() - 20);
  return d.toISOString().slice(0, 10);
};

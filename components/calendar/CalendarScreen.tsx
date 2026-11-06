"use client";

import { ArrowSquareOut, CaretLeft, CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { TierBadge } from "@/components/ui/TierBadge";
import {
  ALL_KINDS,
  KIND_LABEL,
  academicMonths,
  allEvents,
  dayStatus,
  eventsInMonth,
  eventsOn,
  monthGrid,
  type CalendarEvent,
  type CalendarKind,
} from "@/lib/calendar/events";
import { classesOn, type ClassDay } from "@/lib/calendar/classes";
import { useTimetable } from "@/lib/client/timetable-store";
import { useToday } from "@/lib/client/use-today";
import { formatRange } from "@/lib/format";
import { ClassList } from "./ClassList";
import { KIND_STYLE } from "./kind-style";
import { TimetablePanel } from "./TimetablePanel";

/*
 * หน้าปฏิทินนักศึกษา: ตารางรายเดือน (เริ่มวันจันทร์) + ภาพรวมทั้งปี + รายการวันสำคัญของเดือน
 * "วันนี้" รู้ได้หลัง hydrate เท่านั้น (useToday) เดือนเริ่มต้นจึงเป็นเดือนแรกของปีจนกว่าจะรู้วันนี้
 */

const MONTHS = academicMonths();
const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const monthTitle = (year: number, month: number) =>
  new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
const monthShort = (year: number, month: number) =>
  new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
const dayTitle = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

const indexOfMonth = (iso: string | null) => (iso ? MONTHS.findIndex((m) => iso.startsWith(`${m.year}-${String(m.month).padStart(2, "0")}`)) : -1);

export function CalendarScreen() {
  const today = useToday();
  const { timetable } = useTimetable();
  const [chosenMonth, setChosenMonth] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // รับสมัคร TCAS เป็นเรื่องของคนจะเข้ามหาลัย ซ่อนไว้ก่อน กดตัวกรองเพื่อดูได้
  const [hidden, setHidden] = useState<Set<CalendarKind>>(() => new Set(["admission"]));

  const monthIdx = chosenMonth ?? Math.max(indexOfMonth(today), 0);
  const { year, month } = MONTHS[monthIdx];
  const events = useMemo(() => allEvents().filter((e) => !hidden.has(e.kind)), [hidden]);
  const monthEvents = useMemo(() => eventsInMonth(year, month, events), [year, month, events]);
  const day = selected && indexOfMonth(selected) === monthIdx ? selected : null;

  const go = (delta: number) => {
    setChosenMonth(Math.min(MONTHS.length - 1, Math.max(0, monthIdx + delta)));
    setSelected(null);
  };
  const toggle = (kind: CalendarKind) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  // ปัดซ้ายขวาบนมือถือเพื่อเปลี่ยนเดือน
  const touchX = useRef<number | null>(null);

  return (
    <main className="min-h-svh bg-paper">
      <div className="mx-auto max-w-[72rem] px-4 py-6 sm:px-6 lg:py-8">
        <Link href="/" className="text-sm text-brand-ink hover:underline">
          ← กลับไปคุยกับน้องมด
        </Link>
        <h1 className="mt-3 font-display text-[28px] leading-tight text-ink sm:text-4xl">ปฏิทินนักศึกษา ปีการศึกษา 2569</h1>
        <p className="mt-2 max-w-[44rem] text-sm text-ink-soft">
          วันลงทะเบียน จ่ายเงิน ถอน W สอบ วันหยุด และเรียนชดเชย จากปฏิทินการศึกษา มจธ. 2569 รวมกับกำหนดการ TCAS70 · ประกาศเปลี่ยนวันเกิดขึ้นได้
          ตรวจกับประกาศทางการอีกครั้งก่อนวันสำคัญ
        </p>

        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="เลือกชนิดวันที่จะแสดง">
          {ALL_KINDS.map((kind) => {
            const on = !hidden.has(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(kind)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition ${
                  on ? "border-line-strong bg-card text-ink" : "border-line bg-transparent text-ink-soft line-through opacity-70"
                }`}
              >
                <span aria-hidden className={`size-2.5 rounded-full ${KIND_STYLE[kind].dot}`} />
                {KIND_LABEL[kind]}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section
            aria-label={`ปฏิทินเดือน${monthTitle(year, month)}`}
            className="rounded-[var(--radius-card)] border border-line bg-card p-3 shadow-[var(--shadow-card)] sm:p-4"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
            }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={monthIdx === 0}
                aria-label="เดือนก่อน"
                className="grid size-11 place-items-center rounded-full text-ink hover:bg-paper disabled:opacity-30"
              >
                <CaretLeft size={20} weight="bold" />
              </button>
              <h2 className="flex-1 text-center font-display text-xl text-ink" aria-live="polite">
                {monthTitle(year, month)}
              </h2>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={monthIdx === MONTHS.length - 1}
                aria-label="เดือนถัดไป"
                className="grid size-11 place-items-center rounded-full text-ink hover:bg-paper disabled:opacity-30"
              >
                <CaretRight size={20} weight="bold" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 text-center text-xs font-semibold text-ink-soft">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1.5">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid(year, month)
                .flat()
                .map((iso, i) =>
                  iso ? (
                    <DayCell
                      key={iso}
                      iso={iso}
                      events={eventsOn(iso, events)}
                      classes={classesOn(iso, timetable)}
                      today={iso === today}
                      selected={iso === day}
                      onSelect={() => setSelected(iso === day ? null : iso)}
                    />
                  ) : (
                    <div key={`blank-${i}`} aria-hidden />
                  ),
                )}
            </div>

            {day && <DayDetail iso={day} events={eventsOn(day, events)} classes={classesOn(day, timetable)} />}
          </section>

          <aside className="space-y-5">
            <TimetablePanel today={today} />
            <YearOverview current={monthIdx} today={today} events={events} onPick={(i) => {
                setChosenMonth(i);
                setSelected(null);
              }} />
          </aside>
        </div>

        <section className="mt-6" aria-label="วันสำคัญของเดือนนี้">
          <h2 className="font-display text-lg text-ink">วันสำคัญเดือน{monthTitle(year, month)}</h2>
          {monthEvents.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">ไม่มีรายการในเดือนนี้ (หรือถูกซ่อนด้วยตัวกรอง)</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {monthEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

/** ช่วงยาว (เช่น ประเมินการสอน 3 เดือน) โชว์ในช่องวันแค่วันเริ่มกับวันจบ ไม่งั้นทุกช่องเต็มไปด้วยรายการเดิม */
const LONG_DAYS = 7;
const spanDays = (e: CalendarEvent) => (Date.parse(e.end) - Date.parse(e.start)) / 86_400_000 + 1;
const showInCell = (e: CalendarEvent, iso: string) => spanDays(e) <= LONG_DAYS || iso === e.start || iso === e.end;

function DayCell({
  iso,
  events: all,
  classes,
  today,
  selected,
  onSelect,
}: {
  iso: string;
  events: CalendarEvent[];
  classes: ClassDay;
  today: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const live = classes.slots.filter((s) => !s.cancelled).length;
  const off = classes.slots.length - live;
  const status = dayStatus(iso);
  const events = all.filter((e) => showInCell(e, iso));
  const kinds = [...new Set(events.map((e) => e.kind))];
  const classText = live ? ` · เรียน ${live} คาบ` : off ? ` · งดเรียน ${off} คาบ` : "";
  const label = `${dayTitle(iso)}${classText}${all.length ? ` · ${all.map((e) => e.title).join(", ")}` : ""}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      className={`flex min-h-14 flex-col items-center gap-1 rounded-xl border px-0.5 pt-1.5 pb-1 text-sm transition sm:min-h-20 sm:items-start sm:px-1.5 ${
        selected ? "border-brand bg-brand-tint" : today ? "border-brand bg-card" : "border-transparent hover:bg-paper"
      }`}
    >
      <span
        className={`grid size-7 place-items-center rounded-full text-[13px] ${today ? "bg-brand font-bold text-white" : status.tone === "holiday" ? "font-semibold text-ok" : "text-ink"}`}
      >
        {Number(iso.slice(8))}
      </span>
      {/* มือถือ: จุดสี · จอใหญ่: แถบชื่อสั้น 2 รายการแรก */}
      <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
        {kinds.slice(0, 4).map((k) => (
          <span key={k} className={`size-1.5 rounded-full ${KIND_STYLE[k].dot}`} />
        ))}
      </span>
      <span className="hidden w-full space-y-0.5 sm:block">
        {events.slice(0, 2).map((e) => (
          <span key={e.id} className={`block truncate rounded px-1 text-left text-[11px] leading-[18px] ${KIND_STYLE[e.kind].chip}`}>
            {e.title}
          </span>
        ))}
        {events.length > 2 && <span className="block px-1 text-left text-[11px] text-ink-soft">+{events.length - 2} รายการ</span>}
      </span>
      {/* คาบเรียนของฉัน: เส้นใต้สีส้ม = มีเรียน · เส้นประเทา = คาบงด */}
      {(live > 0 || off > 0) && (
        <span aria-hidden className={`mt-auto block h-1 w-5 rounded-full sm:w-full ${live ? "bg-brand/70" : "border-t-2 border-dashed border-slate"}`} />
      )}
    </button>
  );
}

function DayDetail({ iso, events, classes }: { iso: string; events: CalendarEvent[]; classes: ClassDay }) {
  const status = dayStatus(iso);
  return (
    <div className="mt-4 rounded-xl border border-line bg-paper p-3">
      <p className="font-semibold text-ink">{dayTitle(iso)}</p>
      <p className="text-sm text-ink-soft">{status.text}</p>
      <ClassList day={classes} />
      {events.length > 0 && (
        <ul className="mt-2 space-y-2">
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({ event: e }: { event: CalendarEvent }) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-card p-3">
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${KIND_STYLE[e.kind].dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[e.kind].chip}`}>{KIND_LABEL[e.kind]}</span>
          <span className="text-sm font-semibold text-ink">{formatRange(e.start, e.end)}</span>
        </div>
        <p className="mt-1 text-[15px] text-ink">{e.title}</p>
        {e.note && <p className="mt-0.5 text-[13px] text-ink-soft">{e.note}</p>}
        <div className="mt-1.5 flex items-center gap-2">
          <TierBadge tier={e.tier} />
          {e.url && (
            <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-ink hover:underline">
              แหล่งที่มา <ArrowSquareOut size={12} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function YearOverview({ current, today, events, onPick }: { current: number; today: string | null; events: CalendarEvent[]; onPick: (i: number) => void }) {
  return (
    <section aria-label="ภาพรวมทั้งปี" className="rounded-[var(--radius-card)] border border-line bg-card p-3 shadow-[var(--shadow-card)] sm:p-4">
      <h2 className="font-display text-lg text-ink">ทั้งปีการศึกษา</h2>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
        {MONTHS.map(({ year, month }, i) => {
          const kinds = [...new Set(eventsInMonth(year, month, events).map((e) => e.kind))];
          const isNow = indexOfMonth(today) === i;
          return (
            <button
              key={`${year}-${month}`}
              type="button"
              onClick={() => onPick(i)}
              aria-current={i === current ? "date" : undefined}
              className={`rounded-xl border p-2 text-left transition ${i === current ? "border-brand bg-brand-tint" : "border-line hover:bg-paper"}`}
            >
              <span className={`block text-sm ${isNow ? "font-bold text-brand-ink" : "font-medium text-ink"}`}>
                {monthShort(year, month)} {String(year + 543).slice(2)}
              </span>
              <span className="mt-1 flex min-h-2 flex-wrap gap-0.5">
                {kinds.map((k) => (
                  <span key={k} title={KIND_LABEL[k]} className={`size-2 rounded-full ${KIND_STYLE[k].dot}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

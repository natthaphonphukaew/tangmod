"use client";

import { ArrowRight, ArrowsClockwise, BookOpen, Coffee, Exam, SunHorizon, TreePalm, type Icon } from "@phosphor-icons/react";
import { KIND_LABEL, dayStatus, upcoming, whenLabel, type DayStatus } from "@/lib/calendar/events";
import { classesOn, type ClassDay } from "@/lib/calendar/classes";
import { useTimetable } from "@/lib/client/timetable-store";
import { navigate } from "@/lib/client/nav";
import { noonOf, useToday } from "@/lib/client/use-today";
import { formatRange } from "@/lib/format";
import { ClassList } from "./ClassList";
import { KIND_ICON, KIND_STYLE } from "./kind-style";

/*
 * การ์ด "วันนี้" ที่หน้าแรก (หน้าตาชุดเดียวกับหน้าปฏิทิน)
 *   บน: ป้ายวันที่ใหญ่ + วันนี้เป็นวันแบบไหน · กลาง: คาบเรียนวันนี้ (ถ้ามีตาราง) · ล่าง: 3 เรื่องที่ใกล้ถึง
 * ไม่รวมวันหยุดและ TCAS ในเรื่องที่ใกล้ถึง (ดูได้ในหน้าปฏิทิน) ให้เห็นเส้นตายของนักศึกษาก่อน
 */

const TONE: Record<DayStatus["tone"], { pill: string; icon: Icon }> = {
  class: { pill: "bg-brand-tint text-brand-deep", icon: BookOpen },
  holiday: { pill: "bg-[#dcefe2] text-ok", icon: TreePalm },
  exam: { pill: "bg-[#fde3ec] text-[#8f1d45]", icon: Exam },
  makeup: { pill: "bg-trail-tint text-[#6b4b00]", icon: ArrowsClockwise },
  weekend: { pill: "bg-paper-deep text-ink", icon: Coffee },
  break: { pill: "bg-paper-deep text-ink", icon: SunHorizon },
};

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("th-TH", { ...opts, timeZone: "UTC" });
const WEEKDAY_SHORT = fmt({ weekday: "short" });
const MONTH_SHORT = fmt({ month: "short" });
const FULL = fmt({ weekday: "long", day: "numeric", month: "long" });
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function TodayCard() {
  const today = useToday();
  const { timetable } = useTimetable();
  // ตอน render ฝั่ง server ยังไม่รู้วันนี้: เว้นที่ไว้ขนาดใกล้การ์ดจริง หน้าจะได้ไม่กระโดด
  if (!today) return <div aria-hidden className="mt-6 h-[260px] animate-pulse rounded-[24px] border border-line bg-card/60 xl:mt-8" />;

  const status = dayStatus(today);
  const { pill, icon: StatusIcon } = TONE[status.tone];
  const next = upcoming(today, 3, ["register", "pay", "withdraw", "exam", "grade", "makeup", "term"]);
  const now = noonOf(today);
  const d = utc(today);
  const openCalendar = () => navigate("/calendar");

  return (
    <section aria-labelledby="today-title" className="mt-6 overflow-hidden rounded-[24px] border border-line bg-card shadow-[var(--shadow-card)] xl:mt-8">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        {/* ป้ายวันที่ (ตกแต่ง ข้อความเต็มอยู่ในหัวเรื่อง) */}
        <div aria-hidden className="grid w-16 shrink-0 place-items-center rounded-2xl bg-brand-ink py-2 text-white shadow-[0_8px_18px_-10px_var(--brand)] sm:w-[4.5rem]">
          <span className="text-xs font-medium opacity-90">{WEEKDAY_SHORT.format(d)}</span>
          <span className="font-display text-[32px] leading-none tabular-nums">{d.getUTCDate()}</span>
          <span className="text-xs font-medium opacity-90">{MONTH_SHORT.format(d)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-soft">วันนี้</p>
          <h3 id="today-title" className="font-display text-lg leading-snug text-ink sm:text-xl">
            {FULL.format(d)}
          </h3>
          <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${pill}`}>
            <StatusIcon size={15} weight="bold" aria-hidden />
            {status.text}
          </span>
        </div>
        <button
          type="button"
          onClick={openCalendar}
          className="hidden min-h-11 shrink-0 items-center gap-1.5 self-start rounded-full border border-line-strong bg-card px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/50 hover:text-brand-ink sm:inline-flex"
        >
          เปิดปฏิทิน <ArrowRight size={16} weight="bold" />
        </button>
      </div>

      {timetable && <TodayClasses classes={classesOn(today, timetable)} />}

      {next.length > 0 && (
        <div className="border-t border-line bg-paper/50 px-4 pt-3 pb-4 sm:px-5">
          <h4 className="text-[13px] font-semibold text-ink-soft">ใกล้ถึงแล้ว</h4>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            {next.map((e) => {
              const KindIcon = KIND_ICON[e.kind];
              return (
                <li key={e.id} className="flex gap-3 rounded-2xl border border-line bg-card p-3 sm:flex-col sm:gap-2">
                  <div className="flex shrink-0 items-start justify-between gap-2">
                    <span aria-hidden className={`grid size-9 place-items-center rounded-xl ${KIND_STYLE[e.kind].chip}`}>
                      <KindIcon size={18} weight="duotone" />
                    </span>
                    <span className="hidden rounded-full bg-brand-tint px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-brand-deep sm:inline">
                      {whenLabel(e.start, e.end, now)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="sr-only">{KIND_LABEL[e.kind]}: </span>
                    <p className="line-clamp-2 text-sm font-medium text-pretty text-ink">{e.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatRange(e.start, e.end)}
                      <span className="font-semibold text-brand-ink sm:hidden"> · {whenLabel(e.start, e.end, now)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* มือถือ: ปุ่มเต็มความกว้างท้ายการ์ด กดง่ายด้วยนิ้วโป้ง */}
      <div className="border-t border-line p-3 sm:hidden">
        <button
          type="button"
          onClick={openCalendar}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand-ink text-sm font-semibold text-white hover:bg-brand-deep"
        >
          เปิดปฏิทิน <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </section>
  );
}

function TodayClasses({ classes }: { classes: ClassDay }) {
  return (
    <div className="border-t border-line px-4 py-3 sm:px-5">
      <h4 className="text-[13px] font-semibold text-ink-soft">คาบเรียนวันนี้</h4>
      <div className="mt-1.5">
        {classes.slots.length || classes.note ? (
          <ClassList day={classes} compact />
        ) : (
          <p className="text-sm text-ink-soft">วันนี้ไม่มีคาบตามตารางของคุณ</p>
        )}
      </div>
    </div>
  );
}

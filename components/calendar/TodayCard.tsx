"use client";

import { CalendarDots, CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { KIND_LABEL, dayStatus, upcoming, type DayStatus } from "@/lib/calendar/events";
import { classesOn } from "@/lib/calendar/classes";
import { useTimetable } from "@/lib/client/timetable-store";
import { useToday } from "@/lib/client/use-today";
import { daysUntil, formatRange } from "@/lib/format";
import { ClassList } from "./ClassList";
import { KIND_STYLE } from "./kind-style";

/*
 * การ์ด "วันนี้" ที่หน้าแรก: วันนี้เป็นวันแบบไหน + กำหนดการที่ใกล้ที่สุด 3 อย่าง
 * ไม่รวมวันหยุดและ TCAS ในรายการถัดไป (มีในหน้าปฏิทิน) เพื่อให้เห็นเส้นตายของนักศึกษาก่อน
 */

const TONE: Record<DayStatus["tone"], string> = {
  holiday: "bg-[#dcefe2] text-ok",
  exam: "bg-[#fde3ec] text-[#8f1d45]",
  makeup: "bg-trail-tint text-[#6b4b00]",
  class: "bg-brand-tint text-brand-deep",
  weekend: "bg-paper-deep text-ink",
  break: "bg-paper-deep text-ink",
};

const todayTitle = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function when(start: string, end: string, now: Date): string {
  const toStart = daysUntil(start, now);
  if (toStart > 0) return toStart === 1 ? "พรุ่งนี้" : `อีก ${toStart} วัน`;
  const toEnd = daysUntil(end, now);
  if (toEnd === 0) return "วันสุดท้ายวันนี้";
  return start === end ? "วันนี้" : `เหลือ ${toEnd} วัน`;
}

export function TodayCard() {
  const today = useToday();
  const { timetable } = useTimetable();
  // ตอน render ฝั่ง server ยังไม่รู้วันนี้: เว้นที่ไว้ขนาดเท่าการ์ดจริง หน้าจะได้ไม่กระโดด
  if (!today) return <div aria-hidden className="mt-6 h-[188px] rounded-[var(--radius-card)] border border-line bg-card/60 xl:mt-8" />;
  const status = dayStatus(today);
  const next = upcoming(today, 3, ["register", "pay", "withdraw", "exam", "grade", "makeup", "term"]);
  const now = new Date();
  return (
    <section aria-label="วันนี้" className="mt-6 rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:px-5 xl:mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDots size={22} weight="duotone" className="text-brand-ink" />
        <h3 className="font-display text-lg text-ink">วันนี้ {todayTitle(today)}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${TONE[status.tone]}`}>{status.text}</span>
      </div>
      {timetable && <TodayClasses classes={classesOn(today, timetable)} />}
      {next.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {next.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-sm">
              <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${KIND_STYLE[e.kind].dot}`} />
              <span className="sr-only">{KIND_LABEL[e.kind]}</span>
              {/* มือถือ: ชื่อบรรทัดบน วันที่บรรทัดล่าง · จอใหญ่: แถวเดียว */}
              <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
                <span className="block text-pretty text-ink sm:min-w-0 sm:flex-1 sm:truncate">{e.title}</span>
                <span className="block shrink-0 text-ink-soft">
                  {formatRange(e.start, e.end)} · <span className="font-semibold text-brand-ink">{when(e.start, e.end, now)}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/calendar" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-ink hover:underline">
        ดูปฏิทินทั้งปี <CaretRight size={16} weight="bold" />
      </Link>
    </section>
  );
}

function TodayClasses({ classes }: { classes: ReturnType<typeof classesOn> }) {
  return (
    <div className="mt-3 rounded-xl bg-paper p-3">
      <p className="text-[13px] font-semibold text-ink">คาบเรียนวันนี้</p>
      {classes.slots.length || classes.note ? <ClassList day={classes} compact /> : <p className="text-sm text-ink-soft">วันนี้ไม่มีคาบตามตารางของคุณ</p>}
    </div>
  );
}

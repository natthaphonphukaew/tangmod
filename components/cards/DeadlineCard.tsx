"use client";

import { ArrowRight, CalendarCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { KIND_ICON, KIND_STYLE } from "@/components/calendar/kind-style";
import { TierBadge } from "@/components/ui/TierBadge";
import { KIND_LABEL, allEvents, whenLabel } from "@/lib/calendar/events";
import { navigate } from "@/lib/client/nav";
import { formatRange } from "@/lib/format";

/*
 * การ์ดกำหนดการ (วันลงทะเบียน จ่ายเงิน ถอน สอบ วันหยุด) จากข้อมูลปฏิทินจริง ไม่ใช่ข้อความที่ AI เขียน
 * นับถอยหลังจากวันนี้ และมีปุ่มไปหน้าปฏิทิน
 */
const byId = new Map(allEvents().map((e) => [e.id, e]));

export function DeadlineCard({ ids }: { ids: string[] }) {
  // การ์ดนี้ render หลังผู้ใช้ส่งข้อความเท่านั้น อ่านเวลาตอน mount ได้
  const [now] = useState(() => new Date());
  const events = ids.map((id) => byId.get(id)).filter((e) => e !== undefined);
  if (!events.length) return null;
  return (
    <article className="rounded-[var(--radius-card)] border border-line-strong bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <CalendarCheck size={22} weight="duotone" className="text-brand-ink" aria-hidden />
        <p className="font-display text-lg text-ink">กำหนดการ</p>
        <span className="ml-auto">
          <TierBadge tier={events[0].tier} />
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {events.map((e) => {
          const Icon = KIND_ICON[e.kind];
          const when = whenLabel(e.start, e.end, now);
          const past = e.end < now.toISOString().slice(0, 10);
          return (
            <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-line bg-paper/60 p-3">
              <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl ${KIND_STYLE[e.kind].chip}`}>
                <Icon size={18} weight="duotone" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-pretty text-ink">
                  <span className="sr-only">{KIND_LABEL[e.kind]}: </span>
                  {e.title}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-soft">
                  {formatRange(e.start, e.end)} ·{" "}
                  <span className={past ? "text-ink-soft" : "font-semibold text-brand-ink"}>{past ? "ผ่านไปแล้ว" : when}</span>
                </p>
                {e.note && <p className="mt-0.5 text-[13px] text-ink-soft">{e.note}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => navigate("/calendar")} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-ink hover:underline">
        เปิดปฏิทินนักศึกษา <ArrowRight size={16} weight="bold" />
      </button>
    </article>
  );
}

"use client";

import { useState } from "react";
import { admissionEvents, programById } from "@/lib/data";
import { daysUntil, formatRange } from "@/lib/format";
import { TierBadge } from "@/components/ui/TierBadge";

/** ไทม์ไลน์ TCAS70 นับถอยหลังจากวันจริง — กรองตามคณะของหลักสูตรที่ส่งมา (ถ้ามี) */
export function TimelineCard({ programIds }: { programIds: string[] }) {
  // การ์ดนี้ render หลังผู้ใช้ส่งข้อความเท่านั้น อ่านเวลาตอน mount ได้
  const [now] = useState(() => new Date());
  const faculties = new Set(programIds.map((id) => programById.get(id)?.faculty).filter(Boolean));

  const events = admissionEvents
    .filter((e) => e.kind === "apply" || e.kind === "announce")
    .filter((e) => !e.faculty || faculties.size === 0 || faculties.has(e.faculty))
    .filter((e) => !e.program_ids.length || !programIds.length || e.program_ids.some((id) => programIds.includes(id)))
    .filter((e) => daysUntil(e.end, now) >= -3)
    .slice(0, 6);

  return (
    <article className="rounded-[var(--radius-card)] border border-line-strong bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="font-display text-lg">ไทม์ไลน์ TCAS70</p>
      <p className="text-[13px] text-ink-soft">เข้าเรียนปีการศึกษา 2570 · เช็กประกาศทางการซ้ำทุกครั้ง</p>
      {/* ป้าย "ไม่เป็นทางการ" ซ้ำทุกแถวรก: บอกครั้งเดียวที่หัวการ์ด แถวไหนทางการค่อยติดป้าย */}
      {events.some((e) => e.tier !== "official") && (
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <TierBadge tier="student" /> บางรอบใช้ข้อมูลไม่เป็นทางการ
        </p>
      )}
      <ol className="mt-3 space-y-2.5">
        {events.map((e) => {
          const toStart = daysUntil(e.start, now);
          const toEnd = daysUntil(e.end, now);
          const open = toStart <= 0 && toEnd >= 0;
          const status = open
            ? { text: toEnd === 0 ? "ปิดวันนี้" : `เปิดอยู่ · เหลือ ${toEnd} วัน`, cls: toEnd <= 7 ? "bg-brand-ink text-white" : "bg-ok/10 text-ok" }
            : toStart > 0
              ? { text: `อีก ${toStart} วัน`, cls: "bg-paper-deep text-ink-soft" }
              : { text: "ปิดแล้ว", cls: "bg-slate/10 text-ink-soft" };
          return (
            <li key={e.id} className="flex gap-2.5">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${open ? "bg-brand" : "bg-line"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-[1.55]">
                  <span className="text-ink-soft">รอบ {e.round} · </span>
                  {e.title}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-soft tabular-nums">
                  {formatRange(e.start, e.end)}
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${status.cls}`}>{status.text}</span>
                  {e.tier === "official" && events.some((x) => x.tier !== "official") && <TierBadge tier="official" />}
                </p>
                {e.conflict_note && <p className="mt-1 text-xs text-warn">{e.conflict_note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

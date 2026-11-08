"use client";

import { CalendarDots } from "@phosphor-icons/react";
import { navigate } from "@/lib/client/nav";
import { useToday } from "@/lib/client/use-today";
import { admissionEvents } from "@/lib/data";
import { formatRange } from "@/lib/format";

/** กำหนดการ TCAS70 ที่ยังไม่ผ่าน: รายการรวมทุกคณะ + รายการเฉพาะสาขานี้ (ถ้ามี) */
export function TcasList({ programId, programLabel, limit = 5, className = "" }: { programId?: string; programLabel?: string; limit?: number; className?: string }) {
  const today = useToday();
  if (!today) return <div aria-hidden className={`h-24 animate-pulse rounded-[16px] bg-paper-deep ${className}`} />;
  const events = admissionEvents
    .filter((e) => e.end >= today && (e.program_ids.length === 0 ? !e.faculty : programId ? e.program_ids.includes(programId) : false))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit);
  return (
    <div className={className}>
      {events.length === 0 ? (
        <p className="text-sm text-ink-soft">ไม่มีกำหนดการที่ยังไม่ผ่านในข้อมูลของเรา</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-card">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-3.5 py-2.5 text-sm">
              <span className="mt-0.5 shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-xs font-medium text-ink-soft">รอบ {e.round}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-ink">{e.title}</span>
                <span className="block text-xs text-ink-soft tabular-nums">{formatRange(e.start, e.end)}</span>
              </span>
              {e.program_ids.includes(programId ?? "") && <span className="shrink-0 text-xs font-medium text-brand-ink">ของ {programLabel ?? "สาขานี้"}</span>}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => navigate("/calendar")}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-brand-ink hover:bg-brand-tint"
      >
        <CalendarDots size={16} weight="duotone" /> ดูวันรับสมัครทั้งหมดในปฏิทิน
      </button>
      <p className="text-xs text-ink-soft">เกณฑ์และวันรับสมัครของแต่ละสาขาให้ยืนยันที่ admission.kmutt.ac.th</p>
    </div>
  );
}

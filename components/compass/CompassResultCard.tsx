"use client";

import { ArrowClockwise, Check, Compass, MapPin, Warning } from "@phosphor-icons/react";
import { programById } from "@/lib/data";
import type { CompassResult } from "@/lib/compass";
import { AntAvatar, AntMascot } from "@/components/brand/AntMascot";

type Props = {
  results: CompassResult[];
  onAsk: (text: string) => void;
  onShowMap: () => void;
  onRetake: () => void;
};

/** ผลเข็มทิศสาขาในแชท: อันดับ + % ความเข้ากัน + เหตุผล (ตัวเลขทั้งหมดคิดในเครื่อง ไม่ได้มาจาก AI) */
export function CompassResultCard({ results, onAsk, onShowMap, onRetake }: Props) {
  const shown = results.slice(0, 4);
  return (
    <div className="flex gap-3">
      <AntAvatar size={28} />
      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        <p className="flex items-center gap-3 text-[15px]">
          <AntMascot pose="peace" className="h-16 w-auto shrink-0" />
          <span>
          จากคำตอบของเรา สาขาที่น่าจะเข้ากันที่สุดคือ <strong>{programById.get(results[0].programId)?.short}</strong> ลองดูเหตุผลด้านล่าง แล้วถามมดต่อได้เลย
          </span>
        </p>
        <section aria-label="ผลเข็มทิศสาขา" className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
          <header className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <Compass size={18} weight="duotone" className="text-brand-ink" />
            <h3 className="flex-1 font-display text-sm">เข็มทิศสาขา</h3>
            <button type="button" onClick={onRetake} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
              <ArrowClockwise size={13} /> ทำใหม่
            </button>
          </header>
          <ol className="divide-y divide-line">
            {shown.map((r, i) => {
              const p = programById.get(r.programId);
              if (!p) return null;
              return (
                <li key={r.programId} className="px-3.5 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm text-ink-soft">{i + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-sm">
                      <strong className="font-medium">{p.short}</strong> <span className="text-ink-soft">{p.name_th}</span>
                    </p>
                    <span className="font-display text-base tabular-nums text-brand-ink">{r.percent}%</span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={r.percent}
                    aria-label={`ความเข้ากันกับ ${p.short}`}
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${r.percent}%`, opacity: i === 0 ? 1 : 0.55 }} />
                  </div>
                  {(r.pros.length > 0 || r.cons.length > 0) && (
                    <ul className="mt-2 space-y-0.5 text-xs">
                      {r.pros.map((t) => (
                        <li key={t} className="flex items-start gap-1.5 text-ink">
                          <Check size={13} weight="bold" className="mt-0.5 shrink-0 text-brand-ink" /> {t}
                        </li>
                      ))}
                      {r.cons.map((t) => (
                        <li key={t} className="flex items-start gap-1.5 text-ink-soft">
                          <Warning size={13} className="mt-0.5 shrink-0 text-warn" /> {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  {i < 2 && (
                    <button type="button" onClick={() => onAsk(`เล่าเรื่อง ${p.short} ให้ฟังหน่อย เรียนอะไร จบไปทำงานอะไร`)} className="mt-2 text-xs text-brand-ink hover:underline">
                      ถามมดเรื่อง {p.short} ต่อ
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <footer className="flex items-center gap-3 border-t border-line px-3.5 py-2.5">
            <button type="button" onClick={onShowMap} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-brand-ink hover:bg-brand-tint lg:min-h-9">
              <MapPin size={16} weight="duotone" /> ดูตึกคณะบนแผนที่
            </button>
            <p className="flex-1 text-right text-xs text-ink-soft">คะแนนลักษณะสาขาทีมประเมินเอง ไม่ใช่คะแนนทางการ</p>
          </footer>
        </section>
      </div>
    </div>
  );
}

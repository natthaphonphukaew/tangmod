"use client";

import { ArrowSquareOut, MapPin } from "@phosphor-icons/react";
import { programById } from "@/lib/data";
import { baht, feePerTerm } from "@/lib/format";
import { TierBadge } from "@/components/ui/TierBadge";

const LANG = { th: "สอนภาษาไทย", en: "สอนภาษาอังกฤษ", "th/en": "ไทย/อังกฤษ" } as const;

/** ตัวเลขทุกตัวในการ์ดนี้มาจาก content/programs/*.json — ไม่ได้มาจาก LLM */
export function ProgramCard({ id, onShowPlace }: { id: string; onShowPlace?: (placeId: string) => void }) {
  const p = programById.get(id);
  if (!p) return null;
  const fee = feePerTerm(p.fee);
  const ar = p.admission_ar;

  return (
    <article className="rounded-[var(--radius-card)] border border-line-strong bg-card p-4 shadow-[var(--shadow-card)]">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg leading-[1.4]">
            {p.short} <span className="text-sm font-normal text-ink-soft">· {p.degree}</span>
          </p>
          <p className="truncate text-[13px] text-ink-soft" title={p.name_th}>
            {p.name_th}
          </p>
        </div>
        {p.place_id && onShowPlace && (
          <button
            type="button"
            onClick={() => onShowPlace(p.place_id!)}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-line-strong px-3 font-mono text-[13px] text-brand-ink hover:border-brand/50 lg:min-h-8"
          >
            <MapPin size={14} weight="fill" /> {p.place_id}
          </button>
        )}
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-[13px] text-ink-soft">{fee.note}</dt>
          <dd className="font-display text-lg leading-[1.4] tabular-nums">฿{baht(fee.amount)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-soft">ทั้งหลักสูตร (ประมาณ)</dt>
          <dd className="font-display text-lg leading-[1.4] tabular-nums">฿{baht(p.fee.total_est)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-soft">หน่วยกิต</dt>
          <dd>{p.credits ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-soft">ภาษา</dt>
          <dd>{LANG[p.language]}</dd>
        </div>
      </dl>

      {ar && (
        <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-[13px]">
          <span className="font-medium">เกณฑ์ Active Recruitment:</span>{" "}
          {[ar.gpax && `GPAX ≥ ${ar.gpax.toFixed(2)}`, ar.math && `คณิต ≥ ${ar.math.toFixed(2)}`, ar.sci && `วิทย์ ≥ ${ar.sci.toFixed(2)}`, ar.lang && `ภาษา ≥ ${ar.lang.toFixed(2)}`]
            .filter(Boolean)
            .join(" · ")}
          {ar.extra && <span className="block text-ink-soft">{ar.extra}</span>}
          {ar.tier !== "official" && <span className="block text-warn">ข้อมูลเกณฑ์จากแหล่งไม่เป็นทางการ</span>}
        </p>
      )}

      {p.tracks && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {p.tracks.slice(0, 6).map((t) => (
            <li key={t} className="rounded-full bg-paper-deep px-2.5 py-0.5 text-xs">
              {t}
            </li>
          ))}
        </ul>
      )}

      {p.conflict_note && <p className="mt-2 text-[13px] text-warn">หมายเหตุ: {p.conflict_note}</p>}

      <footer className="mt-3 flex items-center justify-between gap-2">
        <TierBadge tier={p.tier} updatedAt={p.updated_at} />
        <a href={p.fee_source_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-[13px] font-medium text-brand-ink hover:bg-brand-tint lg:min-h-8">
          ตารางค่าเทอม <ArrowSquareOut size={14} />
        </a>
      </footer>
    </article>
  );
}

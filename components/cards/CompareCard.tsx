"use client";

import { programById } from "@/lib/data";
import type { Program } from "@/lib/data/schemas";
import { baht, feePerTerm } from "@/lib/format";

const VIBES: { key: keyof NonNullable<Program["vibe"]>; label: string }[] = [
  { key: "coding", label: "เขียนโค้ด" },
  { key: "math_theory", label: "คณิต/ทฤษฎี" },
  { key: "hardware", label: "ฮาร์ดแวร์" },
  { key: "design_ux", label: "ออกแบบ/UX" },
  { key: "business", label: "ธุรกิจ" },
];

/** เปรียบเทียบสาขาที่คนสับสน — ตัวเลขทั้งหมดมาจากข้อมูลจริง */
export function CompareCard({ ids, onShowPlace }: { ids: string[]; onShowPlace?: (placeId: string) => void }) {
  const items = ids.map((id) => programById.get(id)).filter((p): p is Program => Boolean(p));
  if (items.length < 2) return null;
  const hasVibe = items.some((p) => p.vibe);

  const rows: { label: string; cell: (p: Program) => React.ReactNode }[] = [
    { label: "ค่าเทอม/เทอม", cell: (p) => `฿${baht(feePerTerm(p.fee).amount)}` },
    { label: "ทั้งหลักสูตร", cell: (p) => `฿${baht(p.fee.total_est)}` },
    { label: "หน่วยกิต", cell: (p) => p.credits ?? "—" },
    { label: "ปริญญา", cell: (p) => p.degree },
    { label: "ภาษา", cell: (p) => (p.language === "en" ? "อังกฤษ" : p.language === "th" ? "ไทย" : "ไทย/อังกฤษ") },
    { label: "GPAX (AR)", cell: (p) => (p.admission_ar?.gpax ? `≥ ${p.admission_ar.gpax.toFixed(2)}` : "—") },
    {
      label: "ตึก",
      cell: (p) =>
        p.place_id ? (
          <button type="button" onClick={() => onShowPlace?.(p.place_id!)} className="font-mono text-brand-ink hover:underline">
            {p.place_id}
          </button>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-sm">
          <thead>
            <tr className="bg-paper">
              <th className="w-24 px-3 py-2 text-left text-xs font-normal text-ink-soft">เทียบกัน</th>
              {items.map((p) => (
                <th key={p.id} scope="col" className="px-2 py-2 text-left font-display text-base font-medium">
                  {p.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <th scope="row" className="px-3 py-1.5 text-left text-xs font-normal text-ink-soft">
                  {row.label}
                </th>
                {items.map((p) => (
                  <td key={p.id} className="px-2 py-1.5 tabular-nums">
                    {row.cell(p)}
                  </td>
                ))}
              </tr>
            ))}
            {hasVibe &&
              VIBES.map((v) => (
                <tr key={v.key} className="border-t border-line">
                  <th scope="row" className="px-3 py-1.5 text-left text-xs font-normal text-ink-soft">
                    {v.label}
                  </th>
                  {items.map((p) => (
                    <td key={p.id} className="px-2 py-1.5">
                      {p.vibe ? <Level value={p.vibe[v.key] as number} /> : "—"}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {hasVibe && (
        <p className="border-t border-line px-3 py-2 text-[11px] text-ink-soft">
          แถบความเข้มข้น (เขียนโค้ด/คณิต/ฮาร์ดแวร์/ออกแบบ/ธุรกิจ) ทีมทางมดประเมินเองจากโครงสร้างหลักสูตร ไม่ใช่คะแนนทางการ
        </p>
      )}
    </article>
  );
}

function Level({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`ระดับ ${value} จาก 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-3.5 rounded-full ${i <= value ? "bg-brand" : "bg-line"}`} />
      ))}
    </span>
  );
}

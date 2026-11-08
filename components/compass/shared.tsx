"use client";

import {
  Atom,
  Briefcase,
  Buildings,
  ChalkboardTeacher,
  Code,
  FilmSlate,
  Flask,
  ForkKnife,
  Gear,
  Leaf,
  Lightning,
  MathOperations,
  PaintBrush,
  type Icon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { campusLabel, feeText } from "@/lib/compass";
import { currentCompass, saveCompass } from "@/lib/client/compass-store";
import type { CatalogProgram, CompassDim } from "@/lib/data/schemas";

export const DIM_ICON: Record<CompassDim, Icon> = {
  computing: Code,
  electronics: Lightning,
  machines: Gear,
  construction: Buildings,
  chem_bio: Flask,
  food_health: ForkKnife,
  math_data: MathOperations,
  physics: Atom,
  design_art: PaintBrush,
  media: FilmSlate,
  business: Briefcase,
  teaching: ChalkboardTeacher,
  environment: Leaf,
};

export const MAX_COMPARE = 3;

/** เพิ่ม/เอาออกจากรายการเทียบ (เก็บรวมกับผลเข็มทิศ จะได้อยู่ข้ามการรีโหลดและข้ามเครื่องถ้า login) · ครบ 3 แล้วไม่เพิ่ม (ไม่ตัดอันเก่าทิ้งเงียบ ๆ) */
export function toggleCompare(id: string) {
  const cur = currentCompass();
  const compare = cur?.compare ?? [];
  if (!compare.includes(id) && compare.length >= MAX_COMPARE) return;
  const next = compare.includes(id) ? compare.filter((x) => x !== id) : [...compare, id];
  void saveCompass({ v: 2, answers: cur?.answers ?? null, results: cur?.results ?? [], excluded: cur?.excluded ?? [], compare: next, updated_at: Date.now() });
}

/** ล้างผลแบบทดสอบ แต่เก็บรายการเทียบไว้ */
export function clearResult() {
  const cur = currentCompass();
  void saveCompass({ v: 2, answers: null, results: [], excluded: [], compare: cur?.compare ?? [], updated_at: Date.now() });
}

export const perTermText = (p: CatalogProgram) => (p.fee.per_term_est ? `~${feeText(p.fee.per_term_est)}/เทอม` : "ยังไม่มีค่าเทอม");
export const langText = (p: CatalogProgram) => (p.language === "en" ? "สอนภาษาอังกฤษ" : p.language === "th/en" ? "ไทยและอังกฤษ" : "ภาษาไทย");

/** ป้ายข้อเท็จจริงสั้น ๆ ของสาขา: วิทยาเขต ปี ภาษา ค่าเทอม */
export function FactChips({ p, className = "" }: { p: CatalogProgram; className?: string }) {
  const chips: ReactNode[] = [campusLabel(p.campus), `${p.years} ปี`, langText(p), perTermText(p)];
  return (
    <ul className={`flex flex-wrap gap-1.5 text-xs ${className}`} aria-label="ข้อมูลหลักสูตร">
      {chips.map((c, i) => (
        <li key={i} className={`rounded-full px-2.5 py-1 ${i === 0 && !p.campus ? "bg-trail-tint text-[#6b4b00]" : "bg-paper-deep text-ink-soft"}`}>
          {c}
        </li>
      ))}
    </ul>
  );
}

/** ปุ่มเทียบ: ป้ายคงที่ "เทียบ" สถานะบอกด้วย aria-pressed · ครบ 3 แล้วกดไม่ได้พร้อมบอกเหตุผล */
export function CompareToggle({ p, compare, onToggle }: { p: CatalogProgram; compare: string[]; onToggle: (id: string) => void }) {
  const on = compare.includes(p.id);
  const full = !on && compare.length >= MAX_COMPARE;
  return (
    <button
      type="button"
      onClick={() => !full && onToggle(p.id)}
      aria-pressed={on}
      aria-disabled={full}
      title={full ? "เลือกครบ 3 แล้ว เอาออกก่อน" : undefined}
      className={`${PILL_BTN} border border-line-strong bg-card text-ink hover:border-brand/50 aria-disabled:opacity-50 aria-pressed:border-brand-ink aria-pressed:bg-brand-tint`}
    >
      <span aria-hidden>{on ? "✓" : "+"}</span> เทียบ<span className="sr-only"> {p.name_th}</span>
      {full && <span className="text-xs text-ink-soft">(ครบ 3 แล้ว)</span>}
    </button>
  );
}

export const CARD = "rounded-[20px] border border-line bg-card shadow-[var(--shadow-card)]";
export const PILL_BTN = "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium";

import { programs } from "@/lib/data";
import type { Program } from "@/lib/data/schemas";

/*
 * เข็มทิศสาขา (Major Compass): ถาม 7 ข้อ แล้วจัดอันดับสาขาสายคอมพิวเตอร์/หุ่นยนต์ที่มีคะแนน vibe
 * ไม่ใช้ LLM — คิดแบบกฎตายตัว จึงเร็ว ฟรี ผลซ้ำได้ และอธิบายได้ว่าทำไมได้คะแนนเท่านี้
 * คะแนน vibe ทีมประเมินเองจากโครงสร้างหลักสูตร (ไม่ใช่คะแนนทางการ) — หน้าผลต้องบอกผู้ใช้ด้วย
 */

export type Dim = "coding" | "hardware" | "math_theory" | "design_ux" | "business";

type DimQuestion = { id: Dim; kind: "dim"; text: string; options: string[] };
type LangQuestion = { id: "lang"; kind: "lang"; text: string; options: string[] };
type BudgetQuestion = { id: "budget"; kind: "budget"; text: string; options: { label: string; max: number | null }[] };
export type CompassQuestion = DimQuestion | LangQuestion | BudgetQuestion;

export const QUESTIONS: CompassQuestion[] = [
  {
    id: "coding",
    kind: "dim",
    text: "ถ้าต้องเขียนโปรแกรมแทบทุกวันตลอด 4 ปี รู้สึกยังไง",
    options: ["ไม่ไหวแน่ ๆ", "พอได้ ถ้าไม่หนักมาก", "ชอบนะ", "ชอบมาก อยากเขียนทั้งวัน"],
  },
  {
    id: "hardware",
    kind: "dim",
    text: "ต่อวงจร ประกอบคอม เล่นบอร์ดอย่าง Arduino หรือหุ่นยนต์ สนุกไหม",
    options: ["ไม่สนเลย", "เฉย ๆ", "สนุกดี", "ชอบมาก"],
  },
  {
    id: "math_theory",
    kind: "dim",
    text: "โจทย์คณิตยาก ๆ แคลคูลัส การพิสูจน์ หรืออัลกอริทึม ชอบแค่ไหน",
    options: ["ไม่ชอบเลย", "พอทำได้", "ชอบ", "ชอบมาก ยิ่งยากยิ่งมัน"],
  },
  {
    id: "design_ux",
    kind: "dim",
    text: "ชอบคิดว่าแอปหรือเว็บควรหน้าตาแบบไหน ใช้ง่ายไหม (UX/UI)",
    options: ["ไม่ค่อยสน", "เฉย ๆ", "สนใจ", "สนใจมาก"],
  },
  {
    id: "business",
    kind: "dim",
    text: "สนใจเรื่องธุรกิจ การตลาด ทำสตาร์ทอัพ หรือวางแผนผลิตภัณฑ์ไหม",
    options: ["ไม่สนใจ", "นิดหน่อย", "สนใจ", "สนใจมาก"],
  },
  {
    id: "lang",
    kind: "lang",
    text: "เรียนเป็นภาษาอังกฤษทั้งหลักสูตรไหวไหม",
    options: ["ไม่อยาก ขอภาษาไทย", "ได้ ถ้าจำเป็น", "อยากเลย อยากไปต่อต่างประเทศด้วย"],
  },
  {
    id: "budget",
    kind: "budget",
    text: "ค่าเทอมต่อเทอมที่บ้านรับได้ประมาณเท่าไหร่",
    options: [
      { label: "ไม่เกิน 35,000", max: 35_000 },
      { label: "ไม่เกิน 50,000", max: 50_000 },
      { label: "ไม่เกิน 60,000", max: 60_000 },
      { label: "ไม่จำกัด / ยังไม่รู้", max: null },
    ],
  },
];

/** คำตอบ = index ของตัวเลือกในแต่ละข้อ */
export type CompassAnswers = Record<CompassQuestion["id"], number>;

export type CompassResult = {
  programId: string;
  /** 0–100 */
  percent: number;
  /** เหตุผลที่เข้ากัน (สูงสุด 3) */
  pros: string[];
  /** จุดที่อาจไม่ตรงใจ (สูงสุด 2) */
  cons: string[];
};

const DIMS: Dim[] = ["coding", "hardware", "math_theory", "design_ux", "business"];

const PRO_TEXT: Record<Dim, string> = {
  coding: "ได้เขียนโปรแกรมเยอะ",
  hardware: "ได้ลงมือกับฮาร์ดแวร์/หุ่นยนต์",
  math_theory: "มีคณิตและทฤษฎีเข้มข้น",
  design_ux: "ได้ออกแบบประสบการณ์ผู้ใช้",
  business: "ผสมธุรกิจและการตลาด",
};
const CON_TEXT: Record<Dim, string> = {
  coding: "เขียนโปรแกรมหนัก",
  hardware: "มีวิชาฮาร์ดแวร์เยอะ",
  math_theory: "คณิตและทฤษฎีหนัก",
  design_ux: "เน้นงานออกแบบ",
  business: "มีวิชาธุรกิจเยอะ",
};

/** ค่าเทอมต่อเทอมโดยประมาณ (หลักสูตรคิดตามหน่วยกิตใช้ค่าเฉลี่ยจากยอดรวม 8 เทอม) */
export function feePerTerm(p: Program): number {
  return p.fee.model === "flat" ? p.fee.per_semester : Math.round(p.fee.total_est / 8);
}

export const compassPrograms = () => programs.filter((p) => p.vibe);

export function scoreCompass(answers: CompassAnswers): CompassResult[] {
  const budgetQ = QUESTIONS.find((q): q is BudgetQuestion => q.kind === "budget")!;
  const budget = budgetQ.options[answers.budget]?.max ?? null;
  const langPref = answers.lang ?? 1; // 0 ไทยเท่านั้น · 1 ได้ · 2 อยากเรียนอังกฤษ/ไปต่างประเทศ

  return compassPrograms()
    .map((p) => {
      const vibe = p.vibe!;
      // ระยะห่างระหว่างความชอบกับลักษณะสาขา (0 = ตรงเป๊ะ, 15 = ตรงข้ามทุกด้าน)
      let distance = 0;
      const pros: string[] = [];
      const cons: string[] = [];
      for (const d of DIMS) {
        const want = answers[d] ?? 1;
        const has = vibe[d];
        distance += Math.abs(want - has);
        if (want >= 2 && has >= 2) pros.push(PRO_TEXT[d]);
        if (want <= 1 && has === 3) cons.push(CON_TEXT[d]);
      }
      let score = 1 - distance / 15;

      const english = p.language === "en";
      if (english && langPref === 0) {
        score -= 0.15;
        cons.unshift("สอนเป็นภาษาอังกฤษทั้งหลักสูตร");
      } else if (english && langPref === 2) {
        score += 0.06;
        pros.unshift(p.id === "sit-cs" ? "เรียนภาษาอังกฤษ ต่อแคนาดาได้ (Seneca 3+1)" : "เรียนเป็นภาษาอังกฤษ");
      }

      const fee = feePerTerm(p);
      if (budget !== null && fee > budget) {
        score -= 0.12;
        // เรื่องงบสำคัญกว่าเรื่องวิชา ให้อยู่บนสุดเสมอ (cons ถูกตัดเหลือ 2 ข้อ)
        cons.unshift(`ค่าเทอมราว ${fee.toLocaleString("th-TH")} บาท เกินงบที่ตั้งไว้`);
      }

      return {
        programId: p.id,
        // เพดาน 95%: คะแนนลักษณะสาขาทีมประเมินเอง ไม่ควรบอกผู้ใช้ว่า "ตรง 100%"
        percent: Math.min(95, Math.round(Math.max(0, score) * 100)),
        pros: pros.slice(0, 3),
        cons: cons.slice(0, 2),
      };
    })
    .sort((a, b) => b.percent - a.percent || a.programId.localeCompare(b.programId));
}

/** สรุปเป็นข้อความสั้น ใส่ในประวัติที่ส่งให้ LLM เพื่อให้ถามต่อเรื่องผลได้ (รวมเหตุผลของ 2 อันดับแรก) */
export function compassSummary(results: CompassResult[]): string {
  const name = (id: string) => programs.find((p) => p.id === id)?.short ?? id;
  const ranking = results.slice(0, 4).map((r) => `${name(r.programId)} ${r.percent}%`).join(", ");
  const why = results
    .slice(0, 2)
    .map((r) => `${name(r.programId)}: เข้ากันเพราะ ${r.pros.join(", ") || "-"}${r.cons.length ? ` · ข้อควรระวัง ${r.cons.join(", ")}` : ""}`)
    .join(" | ");
  return `ผลเข็มทิศสาขาของผู้ใช้ (คิดจากคำตอบ 7 ข้อ เทียบกับคะแนนลักษณะสาขาที่ทีมประเมินเอง): ${ranking} — ${why}`;
}

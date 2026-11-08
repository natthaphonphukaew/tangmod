import { catalog, catalogById, programById } from "@/lib/data";
import { COMPASS_DIMS, type Campus, type CatalogProgram, type CompassDim } from "@/lib/data/schemas";

/*
 * เข็มทิศสาขา v2: จัดอันดับปริญญาตรีทั้ง มจธ. (content/programs/catalog.json) จากคำตอบ 4 ส่วน
 *   1) เรื่องที่ชอบ (เลือก 1–3) และเรื่องที่ไม่อยากเจอ
 *   2) สไตล์การเรียน 5 ข้อ
 *   3) คำถามต่อยอดตามกลุ่มที่ชอบ (แยกสาขาในกลุ่มเดียวกันออกจากกัน)
 *   4) เงื่อนไข: วิทยาเขต ภาษา งบ จำนวนปี
 * ไม่ใช้ LLM — คิดแบบกฎตายตัว เร็ว ฟรี ผลซ้ำได้ และอธิบายได้ว่าทำไมได้คะแนนเท่านี้
 * คะแนน profile ของแต่ละสาขาทีมประเมินเอง (ไม่ใช่คะแนนทางการ) หน้าผลต้องบอกผู้ใช้
 */

export const DIM_LABEL: Record<CompassDim, { label: string; hint: string }> = {
  computing: { label: "คอมพิวเตอร์ เขียนโปรแกรม", hint: "แอป เว็บ AI เกม" },
  electronics: { label: "ไฟฟ้า วงจร อิเล็กทรอนิกส์", hint: "ชิป บอร์ด ระบบไฟฟ้า" },
  machines: { label: "เครื่องจักร หุ่นยนต์ การผลิต", hint: "เครื่องยนต์ โรงงาน หุ่นยนต์" },
  construction: { label: "อาคาร โครงสร้าง ก่อสร้าง", hint: "ตึก สะพาน ถนน" },
  chem_bio: { label: "เคมี ชีววิทยา แล็บ", hint: "ทดลอง สาร จุลินทรีย์" },
  food_health: { label: "อาหาร สุขภาพ การแพทย์", hint: "แปรรูปอาหาร ข้อมูลสุขภาพ" },
  math_data: { label: "คณิตศาสตร์ สถิติ ข้อมูล", hint: "ตัวเลข วิเคราะห์ data" },
  physics: { label: "ฟิสิกส์ วัสดุ", hint: "ทฤษฎี วัสดุ เซมิคอนดักเตอร์" },
  design_art: { label: "ออกแบบ สถาปัตย์ ศิลปะ", hint: "อาคาร ผลิตภัณฑ์ กราฟิก" },
  media: { label: "สื่อ ภาพยนตร์ แอนิเมชัน", hint: "วิดีโอ เกม มัลติมีเดีย" },
  business: { label: "ธุรกิจ การจัดการ", hint: "สตาร์ทอัพ การตลาด บริหาร" },
  teaching: { label: "สอน ถ่ายทอดความรู้", hint: "เป็นครู ทำสื่อการสอน" },
  environment: { label: "สิ่งแวดล้อม พลังงาน", hint: "มลพิษ พลังงานสะอาด" },
};

const PRO_TEXT: Record<CompassDim, string> = {
  computing: "ได้เขียนโปรแกรมและทำงานกับคอมพิวเตอร์",
  electronics: "ได้ทำเรื่องไฟฟ้าและวงจร",
  machines: "ได้ลงมือกับเครื่องจักรหรือหุ่นยนต์",
  construction: "ได้ทำงานโครงสร้างและการก่อสร้าง",
  chem_bio: "ได้ทำแล็บเคมีหรือชีววิทยา",
  food_health: "เกี่ยวกับอาหารหรือสุขภาพ",
  math_data: "ได้ใช้คณิตและข้อมูลเยอะ",
  physics: "ได้เรียนฟิสิกส์และวัสดุเชิงลึก",
  design_art: "ได้ออกแบบและสร้างสรรค์",
  media: "ได้ผลิตสื่อและงานภาพ",
  business: "ผสมธุรกิจและการจัดการ",
  teaching: "ได้ฝึกเป็นครูและถ่ายทอดความรู้",
  environment: "เกี่ยวกับสิ่งแวดล้อมและพลังงาน",
};

// ---------- คำถาม ----------

/** boost = เพิ่มน้ำหนักความสนใจ · prefer = สาขาที่ตัวเลือกนี้ชี้ถึงตรง ๆ (เช่น ภายใน → สถาปัตยกรรมภายใน) ซึ่งด้านความสนใจแยกไม่ออก */
type Option = { label: string; boost?: Partial<Record<CompassDim, number>>; prefer?: string[] };
export type ScaleQuestion = { id: StyleId; kind: "scale"; text: string; options: string[] };
export type FollowupQuestion = { id: string; kind: "followup"; for: CompassDim[]; text: string; options: Option[] };
export type ConstraintQuestion = { id: ConstraintId; kind: "constraint"; text: string; options: string[] };

export type StyleId = "hands_on" | "theory" | "coding" | "creative" | "teaching";
export type ConstraintId = "campus" | "lang" | "budget" | "years";

export const STYLE_QUESTIONS: ScaleQuestion[] = [
  { id: "hands_on", kind: "scale", text: "ชอบลงมือทำ เช่น ประกอบ ทดลองในแล็บ หรือทำในโรงงาน แค่ไหน", options: ["ไม่ชอบเลย", "พอได้", "ชอบ", "ชอบมาก"] },
  { id: "theory", kind: "scale", text: "คณิตยาก ๆ ฟิสิกส์ หรือทฤษฎีลึก ๆ ไหวแค่ไหน", options: ["ไม่ไหว", "พอทำได้", "ชอบ", "ยิ่งยากยิ่งมัน"] },
  { id: "coding", kind: "scale", text: "ถ้าต้องเขียนโปรแกรมแทบทุกวัน รู้สึกยังไง", options: ["ไม่ไหวแน่ ๆ", "พอได้ ถ้าไม่หนัก", "ชอบนะ", "ชอบมาก"] },
  { id: "creative", kind: "scale", text: "ชอบงานสร้างสรรค์ ออกแบบ หรือคิดของใหม่ แค่ไหน", options: ["ไม่ค่อย", "เฉย ๆ", "ชอบ", "ชอบมาก"] },
  { id: "teaching", kind: "scale", text: "อยากเป็นครูหรือสอนคนอื่นไหม", options: ["ไม่เลย", "อาจจะ", "สนใจ", "อยากเป็นครู"] },
];

export const FOLLOWUPS: FollowupQuestion[] = [
  {
    id: "fu_computing",
    kind: "followup",
    for: ["computing"],
    text: "อยากทำงานกับคอมพิวเตอร์แบบไหนที่สุด",
    options: [
      { label: "ฮาร์ดแวร์ วงจร ระบบฝังตัว", boost: { electronics: 2 } },
      { label: "อัลกอริทึม ทฤษฎีคอมพิวเตอร์", boost: { math_data: 2 } },
      { label: "ข้อมูลและ AI", boost: { math_data: 2, computing: 1 } },
      { label: "แอป เว็บ UX หรือธุรกิจดิจิทัล", boost: { design_art: 1, business: 2 } },
    ],
  },
  {
    id: "fu_design",
    kind: "followup",
    for: ["design_art", "media"],
    text: "งานออกแบบแบบไหนที่อยากทำ",
    options: [
      { label: "อาคาร ภูมิทัศน์", boost: { construction: 2, environment: 1 } },
      { label: "พื้นที่ภายใน ตกแต่ง เฟอร์นิเจอร์", boost: { construction: 1 }, prefer: ["soad-interior"] },
      { label: "กราฟิก แอนิเมชัน ภาพยนตร์", boost: { media: 2 } },
      { label: "ผลิตภัณฑ์ บรรจุภัณฑ์", boost: { business: 1, machines: 1 }, prefer: ["soad-design-innovation", "fiet-packaging"] },
      { label: "เกม สื่อดิจิทัล อินเทอร์แอกทีฟ", boost: { computing: 2, media: 1 } },
      { label: "ผสมหลายศาสตร์ ยังไม่อยากเลือกทางเดียว", prefer: ["soad-mid", "cms-creative-tech"] },
    ],
  },
  {
    id: "fu_engineering",
    kind: "followup",
    for: ["electronics", "machines", "construction"],
    text: "งานช่างหรือวิศวะแบบไหนที่สนใจที่สุด",
    options: [
      { label: "ไฟฟ้า อิเล็กทรอนิกส์ ชิป", boost: { electronics: 2, physics: 1 } },
      { label: "เครื่องยนต์ เครื่องจักร การผลิต", boost: { machines: 2 } },
      { label: "อาคาร สะพาน ถนน", boost: { construction: 2 } },
      { label: "หุ่นยนต์ ระบบอัตโนมัติ", boost: { machines: 1, electronics: 1, computing: 1 } },
    ],
  },
  {
    id: "fu_science",
    kind: "followup",
    for: ["chem_bio", "food_health", "environment", "physics"],
    text: "งานวิทยาศาสตร์แบบไหนที่ใช่",
    options: [
      { label: "แล็บเคมี สาร ปฏิกิริยา", boost: { chem_bio: 2 } },
      { label: "จุลินทรีย์ ชีววิทยา", boost: { chem_bio: 1, food_health: 1 } },
      { label: "อาหาร การพัฒนาผลิตภัณฑ์", boost: { food_health: 2, business: 1 } },
      { label: "สิ่งแวดล้อม พลังงาน", boost: { environment: 2 } },
    ],
  },
  {
    id: "fu_numbers",
    kind: "followup",
    for: ["math_data", "business"],
    text: "อยากใช้ตัวเลขหรือการจัดการแบบไหน",
    options: [
      { label: "คณิตล้วน พิสูจน์ ทฤษฎี", boost: { math_data: 2, physics: 1 } },
      { label: "วิเคราะห์ข้อมูล สถิติ", boost: { math_data: 2, computing: 1 } },
      { label: "บริหารโรงงานหรือระบบการผลิต", boost: { machines: 1, business: 1 } },
      { label: "สตาร์ทอัพ ธุรกิจ การตลาด", boost: { business: 2, design_art: 1 } },
    ],
  },
];

export const CONSTRAINTS: ConstraintQuestion[] = [
  { id: "campus", kind: "constraint", text: "ไปเรียนที่วิทยาเขตไหนได้บ้าง", options: ["บางมดเท่านั้น", "บางมด หรือบางขุนเทียน", "ที่ไหนก็ได้ รวมราชบุรี (พักประจำ)"] },
  { id: "lang", kind: "constraint", text: "เรียนเป็นภาษาอังกฤษทั้งหลักสูตรไหวไหม", options: ["ขอภาษาไทย", "ได้ ถ้าจำเป็น", "อยากเรียนภาษาอังกฤษ"] },
  { id: "budget", kind: "constraint", text: "ค่าเทอมต่อเทอมที่บ้านรับได้ประมาณเท่าไหร่", options: ["ไม่เกิน 30,000", "ไม่เกิน 50,000", "ไม่เกิน 90,000", "ไม่จำกัด / ยังไม่รู้"] },
  { id: "years", kind: "constraint", text: "หลักสูตร 5 ปี (เช่น สถาปัตย์ ครุศาสตร์อุตสาหกรรม) โอเคไหม", options: ["ขอ 4 ปี", "5 ปีก็ได้"] },
];

const BUDGET_MAX = [30_000, 50_000, 90_000, null] as const;
const CAMPUS_OK: Campus[][] = [["bangmod"], ["bangmod", "bangkhuntien"], ["bangmod", "bangkhuntien", "ratchaburi"]];
const CAMPUS_TH: Record<Campus, string> = { bangmod: "บางมด", bangkhuntien: "บางขุนเทียน", ratchaburi: "ราชบุรี" };
export const campusLabel = (c: Campus | null) => (c ? CAMPUS_TH[c] : "ยังไม่ยืนยันวิทยาเขต");

export type CompassAnswers = {
  v: 2;
  likes: CompassDim[];
  avoid: CompassDim[];
  style: Record<StyleId, number>;
  followups: Record<string, number>;
  campus: number;
  lang: number;
  budget: number;
  years: number;
};

/** คำถามต่อยอดที่ต้องถาม เลือกตามเรื่องที่ชอบ เรียงตามลำดับที่ผู้ใช้เลือก สูงสุด 2 ข้อ */
export function followupsFor(likes: CompassDim[]): FollowupQuestion[] {
  const out: FollowupQuestion[] = [];
  for (const d of likes) {
    const q = FOLLOWUPS.find((f) => f.for.includes(d));
    if (q && !out.includes(q)) out.push(q);
  }
  return out.slice(0, 2);
}

// ---------- คิดคะแนน ----------

export type CompassResult = {
  programId: string;
  /** 0–95 */
  percent: number;
  /** เหตุผลที่เข้ากัน (สูงสุด 3) */
  pros: string[];
  /** จุดที่อาจไม่ตรงใจ (สูงสุด 3) */
  cons: string[];
};
export type CompassExcluded = { programId: string; reason: string };
export type CompassOutcome = { results: CompassResult[]; excluded: CompassExcluded[] };

const LIKE_WEIGHT = 3;
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const feeText = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

function wantVector(a: CompassAnswers): Record<CompassDim, number> {
  const want = Object.fromEntries(COMPASS_DIMS.map((d) => [d, 0])) as Record<CompassDim, number>;
  for (const d of a.likes) want[d] += LIKE_WEIGHT;
  for (const q of followupsFor(a.likes)) {
    const boost = q.options[a.followups[q.id] ?? -1]?.boost ?? {};
    for (const [d, w] of Object.entries(boost) as [CompassDim, number][]) want[d] += w;
  }
  // อยากเป็นครูมาก = ความสนใจด้านการสอนเท่ากับเรื่องที่เลือกชอบ
  want.teaching += Math.max(0, a.style.teaching - 1) * 1.5;
  return want;
}

export function scoreCompass(a: CompassAnswers): CompassOutcome {
  const want = wantVector(a);
  const wantTotal = Object.values(want).reduce((s, w) => s + w, 0) || 1;
  const preferred = new Set(followupsFor(a.likes).flatMap((q) => q.options[a.followups[q.id] ?? -1]?.prefer ?? []));
  const budget = BUDGET_MAX[a.budget] ?? null;
  const campusOk = CAMPUS_OK[a.campus] ?? CAMPUS_OK[2];
  const results: (CompassResult & { raw: number })[] = [];
  const excluded: CompassExcluded[] = [];

  for (const p of catalog) {
    if (p.status !== "open") continue;
    const reason = hardFilter(p, a, campusOk, budget);
    if (reason) {
      excluded.push({ programId: p.id, reason });
      continue;
    }
    const prof = p.profile;
    const pros: string[] = [];
    const cons: string[] = [];

    // 1) ความสนใจ: ค่าเฉลี่ยถ่วงน้ำหนักของ profile ในด้านที่ผู้ใช้อยากได้ (0–1)
    let interest = 0;
    for (const d of COMPASS_DIMS) interest += want[d] * (prof[d] / 3);
    interest /= wantTotal;
    const liked = [...a.likes].sort((x, y) => prof[y] - prof[x]);
    for (const d of liked) if (prof[d] >= 2) pros.push(PRO_TEXT[d]);

    // 2) เรื่องที่ไม่อยากเจอ
    let avoid = 0;
    for (const d of a.avoid) {
      avoid += prof[d] / 3;
      if (prof[d] >= 2) cons.push(`มีเรื่อง${DIM_LABEL[d].label.split(" ")[0]}ที่บอกว่าไม่อยากเจอ`);
    }

    // 3) สไตล์: ระยะห่าง 3 ด้าน + โค้ดที่ไม่ไหว
    const styleDist =
      Math.abs(a.style.hands_on - prof.hands_on) + Math.abs(a.style.theory - prof.theory) + Math.abs(a.style.creative - prof.creative);
    let style = 1 - styleDist / 9;
    if (a.style.coding <= 1 && prof.computing >= 3) {
      style -= 0.25;
      cons.push("เขียนโปรแกรมหนัก");
    } else if (a.style.coding >= 2 && prof.computing >= 2 && !a.likes.includes("computing")) pros.push("ได้เขียนโปรแกรมด้วย");
    if (a.style.theory <= 1 && prof.theory >= 3) cons.push("ทฤษฎีและคณิตหนัก");
    if (a.style.hands_on >= 2 && prof.hands_on >= 3) pros.push("เน้นลงมือทำ");
    if (a.style.creative >= 2 && prof.creative >= 3 && !a.likes.includes("design_art")) pros.push("ได้ใช้ความคิดสร้างสรรค์");

    // 4) เงื่อนไขแบบอ่อน: งบ ภาษา วิทยาเขตที่ยังไม่ยืนยัน
    let penalty = 0;
    const fee = p.fee.per_term_est;
    if (budget !== null && fee !== null && fee > budget) {
      penalty += 0.12;
      cons.unshift(`ค่าเทอมเฉลี่ยราว ${feeText(fee)}/เทอม เกินงบ`);
    } else if (budget !== null && fee !== null) pros.push(`ค่าเทอมเฉลี่ยราว ${feeText(fee)}/เทอม อยู่ในงบ`);
    if (fee === null) cons.push("ยังไม่มีค่าเทอมในตารางทางการ");
    if (p.language === "en" && a.lang === 1) cons.push("สอนเป็นภาษาอังกฤษ");
    if (p.language === "en" && a.lang === 2) pros.unshift(p.id === "sit-cs" ? "เรียนภาษาอังกฤษ ต่อแคนาดาได้ (Seneca 3+1)" : "เรียนเป็นภาษาอังกฤษ");
    if (p.language === "th" && a.lang === 2) penalty += 0.05;
    if (p.years === 5) cons.push("เรียน 5 ปี");
    if (!p.campus) cons.push("ยังไม่ยืนยันว่าเรียนวิทยาเขตไหน");

    if (preferred.has(p.id)) pros.unshift("ตรงกับงานที่บอกว่าอยากทำ");
    const bonus = preferred.has(p.id) ? 0.08 : 0;
    const score = 0.68 * interest + 0.32 * clamp(style) + bonus - 0.3 * (avoid / Math.max(1, a.avoid.length)) - penalty;
    results.push({
      raw: score,
      programId: p.id,
      // เพดาน 95%: profile ทีมประเมินเอง ไม่ควรบอกว่า "ตรง 100%"
      percent: Math.min(95, Math.round(clamp(score) * 100)),
      pros: [...new Set(pros)].slice(0, 3),
      cons: [...new Set(cons)].slice(0, 3),
    });
  }

  // เรียงด้วยคะแนนดิบ (ก่อนตัดเพดาน 95%) สาขาที่ได้ 95% เท่ากันจะได้ไม่เรียงตามตัวอักษร
  results.sort((x, y) => y.raw - x.raw || x.programId.localeCompare(y.programId));
  return { results: results.map((r) => ({ programId: r.programId, percent: r.percent, pros: r.pros, cons: r.cons })), excluded };
}

function hardFilter(p: CatalogProgram, a: CompassAnswers, campusOk: Campus[], budget: number | null): string | null {
  if (p.campus && !campusOk.includes(p.campus)) return `เรียนที่${CAMPUS_TH[p.campus]}`;
  if (a.lang === 0 && p.language === "en") return "สอนเป็นภาษาอังกฤษทั้งหลักสูตร";
  if (a.years === 0 && p.years === 5) return "หลักสูตร 5 ปี";
  // เกินงบเกินครึ่งหนึ่งถือว่าไม่ใช่ตัวเลือก (เกินนิดหน่อยยังแสดงพร้อมคำเตือน)
  if (budget !== null && p.fee.per_term_est !== null && p.fee.per_term_est > budget * 1.5) return `ค่าเทอมเฉลี่ยราว ${feeText(p.fee.per_term_est)}/เทอม เกินงบมาก`;
  return null;
}

// ---------- ใช้ร่วมกับแชทและแผนที่ ----------

/** ชื่อสั้นของสาขา ใช้ได้ทั้งผลแบบใหม่ (catalog) และผลเก่าในประวัติแชท (programs) */
export function programName(id: string): string {
  const c = catalogById.get(id);
  return c?.short ?? c?.name_th ?? programById.get(id)?.short ?? id;
}

/** สรุปเป็นข้อความสั้น ใส่ในประวัติที่ส่งให้ LLM เพื่อให้ถามต่อเรื่องผลได้ */
export function compassSummary(results: CompassResult[]): string {
  const full = (id: string) => {
    const c = catalogById.get(id);
    return c ? `${c.name_th} (${c.faculty_th})` : programName(id);
  };
  const ranking = results.slice(0, 5).map((r) => `${full(r.programId)} ${r.percent}%`).join(", ");
  const why = results
    .slice(0, 2)
    .map((r) => `${programName(r.programId)}: เข้ากันเพราะ ${r.pros.join(", ") || "-"}${r.cons.length ? ` · ข้อควรระวัง ${r.cons.join(", ")}` : ""}`)
    .join(" | ");
  return `ผลเข็มทิศสาขาของผู้ใช้ (คิดจากคำตอบ เทียบกับคะแนนลักษณะสาขาที่ทีมประเมินเอง ไม่ใช่คะแนนทางการ): ${ranking} — ${why}`;
}

/** ตึกคณะของสาขาเรียงตามอันดับที่ดีที่สุดของตึกนั้น */
export function compassPlaceIds(results: CompassResult[]): string[] {
  const ids = results.map((r) => catalogById.get(r.programId)?.place_id ?? programById.get(r.programId)?.place_id);
  return [...new Set(ids.filter((id): id is string => !!id))];
}

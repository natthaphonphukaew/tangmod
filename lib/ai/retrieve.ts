import { places, programs } from "@/lib/data";
import { describeRoom, findRooms } from "@/lib/map/rooms";
import { corpus, type Chunk } from "./knowledge";

/*
 * Retrieval แบบ lexical (BM25) + ตรวจจับ entity ด้วยชื่อเรียก
 * ภาษาไทยไม่เว้นวรรค จึงตัดคำด้วย Intl.Segmenter (ICU dictionary ที่มากับ Node/เบราว์เซอร์)
 */

const segmenter = new Intl.Segmenter("th", { granularity: "word" });

// คำที่ไม่ช่วยแยกเอกสาร
const STOP = new Set([
  "ที่", "และ", "หรือ", "ของ", "ใน", "มี", "เป็น", "ได้", "ไหม", "มั้ย", "ครับ", "ค่ะ", "คะ", "นะ", "จะ", "ว่า",
  "อะไร", "ยังไง", "อย่างไร", "บ้าง", "ให้", "กับ", "ก็", "แล้ว", "the", "a", "of", "and", "to", "is",
  // คำถามภาษาพูด: ตัวตัดคำแยก "ยังไง" เป็น "ยัง" + "ไง" และคำพวกนี้อยู่ในแทบทุกคำถาม
  // ถ้าไม่ตัด chunk ที่หัวข้อมีคำว่า "ยังไง/สาขาไหน" จะติดอันดับต้นของคำถามที่ไม่เกี่ยวกันเลย
  // ("ค่า" ที่เป็นคำลงท้ายตัดไม่ได้ เพราะ "ค่าเทอม" ถูกแยกเป็น "ค่า" + "เทอม")
  "ยัง", "ไง", "ไหน", "เรา", "ถ้า", "ต้อง", "หรอ", "คับ", "จ้า", "ป่าว", "เปล่า", "ด้วย",
]);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const s of segmenter.segment(text.toLowerCase())) {
    if (!s.isWordLike) continue;
    const t = s.segment.trim();
    if (t.length < 1 || STOP.has(t)) continue;
    out.push(t);
  }
  return out;
}

type Doc = { chunk: Chunk; tf: Map<string, number>; len: number };
let index: { docs: Doc[]; df: Map<string, number>; avgLen: number } | null = null;

function getIndex() {
  if (index) return index;
  const docs = corpus().chunks.map((chunk) => {
    const tokens = tokenize(`${chunk.title}\n${chunk.title}\n${chunk.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, len: tokens.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(docs.length, 1);
  index = { docs, df, avgLen };
  return index;
}

function bm25(doc: Doc, query: string[], df: Map<string, number>, n: number, avgLen: number) {
  const k1 = 1.4;
  const b = 0.7;
  let score = 0;
  for (const q of new Set(query)) {
    const f = doc.tf.get(q);
    if (!f) continue;
    const idf = Math.log(1 + (n - (df.get(q) ?? 0) + 0.5) / ((df.get(q) ?? 0) + 0.5));
    score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.len) / avgLen)));
  }
  return score;
}

/** ชื่อเรียก → id เรียงจากยาวไปสั้น เพื่อให้ "คอมวิศวะอินเตอร์" ชนะ "คอมวิศวะ" */
const ALIASES: { alias: string; kind: "program" | "place"; id: string }[] = [
  ...programs.flatMap((p) =>
    [p.short, ...p.aliases].map((alias) => ({ alias: alias.toLowerCase(), kind: "program" as const, id: p.id })),
  ),
  ...places.flatMap((p) =>
    [p.name_th, ...(p.short ? [p.short] : []), ...p.aliases].map((alias) => ({
      alias: alias.toLowerCase(),
      kind: "place" as const,
      id: p.id,
    })),
  ),
]
  .filter((a) => a.alias.length >= 2)
  .sort((a, b) => b.alias.length - a.alias.length);

export function detectEntities(text: string): { programIds: string[]; placeIds: string[] } {
  let rest = text.toLowerCase();
  const programIds = new Set<string>();
  const placeIds = new Set<string>();
  for (const a of ALIASES) {
    // ชื่อสั้นแบบละติน (IT, CS, EE) ต้องเป็นคำเดี่ยว ไม่งั้น "it" จะไปเจอใน "submit"
    const latinShort = /^[a-z]{2,4}$/.test(a.alias);
    const hit = latinShort ? new RegExp(`(^|[^a-z])${a.alias}([^a-z]|$)`).test(rest) : rest.includes(a.alias);
    if (!hit) continue;
    (a.kind === "program" ? programIds : placeIds).add(a.id);
    rest = rest.split(a.alias).join(" ");
  }
  for (const m of text.matchAll(/\b([NSns]\d{1,2})\b/g)) {
    const code = m[1].toUpperCase();
    if (places.some((p) => p.id === code)) placeIds.add(code);
  }
  // หอใน S5/S6 (ธรรมรักษา) อยู่บางมดเท่านั้น ถามหอของบางขุนเทียนหรือราชบุรี (ไม่มีในแผนที่) ต้องไม่ได้หมุดหอบางมด
  if (/บางขุนเทียน|ราชบุรี/.test(text)) for (const id of [...placeIds]) if (places.find((p) => p.id === id)?.kind === "dorm") placeIds.delete(id);
  return { programIds: [...programIds], placeIds: [...placeIds] };
}

// "หอ" ที่ไม่ใช่หอพัก: หอสมุด หอประชุม ฯลฯ
const DORM_RE = /หอ(?!สมุด|ประชุม|ศิลป์|นาฬิกา|การค้า)|ห้องเช่า|เช่าห้อง|คอนโด|รูมเมท|หาเมท|ห้องว่าง|สัญญาเช่า|ปล่อยสัญญา|ขายสัญญา|dorm|heliconia|เฮลิโคเนีย|โรงแรม/i;
const DORM_INSIDE_RE = /หอใน|หอพักนักศึกษา|หอ ?มจธ|ธรรมรักษา|heliconia|เฮลิโคเนีย/i;

/** id ของชิ้นช่องทางไปต่อที่ต้องแนบเมื่อถามเรื่องหอ */
export function dormPins(message: string): string[] {
  if (!DORM_RE.test(message)) return [];
  const pins = ["kb:general/dorm-find-openchat#1"];
  // ช่องทางติดต่อของหอใน แยกตามวิทยาเขต
  const office = /heliconia|เฮลิโคเนีย|โรงแรม/i.test(message)
    ? "contact:heliconia"
    : /บางขุนเทียน/.test(message)
      ? "contact:residence_bkt"
      : /ราชบุรี/.test(message)
        ? "contact:residence_ratchaburi"
        : DORM_INSIDE_RE.test(message)
          ? "contact:residence"
          : null;
  if (office) pins.unshift(office);
  // ชิ้นราคา Heliconia (หัวข้อที่ 5 ของ dorm-inside-rates) คนเรียกว่า "โรงแรมในมอ" ซึ่งค้นด้วยคำไม่ค่อยเจอ
  if (office === "contact:heliconia") pins.unshift("kb:general/dorm-inside-rates#5");
  else pins.push("kb:general/dorm-find-facebook#1");
  return pins;
}

export type Retrieved = { chunks: Chunk[]; programIds: string[]; placeIds: string[] };

export function retrieve(opts: {
  message: string;
  previousUserMessage?: string;
  k?: number;
}): Retrieved {
  const k = opts.k ?? 8;
  const { docs, df, avgLen } = getIndex();
  const { byId } = corpus();

  const entities = detectEntities(opts.message);
  // คำถามต่อเนื่อง ("แล้วค่าเทอมล่ะ") มักไม่ระบุชื่อสาขา ใช้ entity จากคำถามก่อนหน้าช่วย
  if (!entities.programIds.length && !entities.placeIds.length && opts.previousUserMessage) {
    const prev = detectEntities(opts.previousUserMessage);
    entities.programIds.push(...prev.programIds);
    entities.placeIds.push(...prev.placeIds);
  }

  // ถามหอของบางขุนเทียนหรือราชบุรี: ไม่ส่งชิ้นตึกหอบางมดให้โมเดลด้วย (ดู detectEntities)
  const otherCampus = /บางขุนเทียน|ราชบุรี/.test(opts.message);
  const isBangmodDorm = (id: string) => places.find((p) => `place:${p.id}` === id)?.kind === "dorm";

  const query = [...tokenize(opts.message), ...tokenize(opts.previousUserMessage ?? "").slice(0, 6)];

  // น้องมดตัวเดียวตอบทุกเรื่อง จึงค้นทุก namespace เท่ากัน
  const scored = docs
    .map((d) => ({ chunk: d.chunk, score: bm25(d, query, df, docs.length, avgLen) }))
    .filter((x) => x.score > 0 && !(otherCampus && isBangmodDorm(x.chunk.id)))
    .sort((a, b) => b.score - a.score);

  // เลขห้อง (CB2301) ไม่มีใน KB: สร้าง chunk อธิบายห้องจากกติกาเลขห้องให้ LLM
  const roomChunks: Chunk[] = findRooms(opts.message).map((r) => ({
    id: `room:${r.code}`,
    namespace: "general",
    title: `ห้อง ${r.code}`,
    text: describeRoom(r),
    tier: "student",
    updated_at: "2026-10-29",
  }));

  const forced = [
    ...roomChunks,
    ...entities.programIds.map((id) => byId.get(`program:${id}`)),
    ...entities.placeIds.map((id) => byId.get(`place:${id}`)),
  ].filter((c): c is Chunk => Boolean(c));

  const picked = new Map<string, Chunk>();
  for (const c of forced.slice(0, 5)) picked.set(c.id, c);
  // คำถามเรื่องหอต้องมีช่องทางไปต่อแนบเสมอ (กลุ่มหาหอ / สำนักงานหอพัก) แอปแสดงลิงก์จาก source_url ของชิ้นที่อ้างเท่านั้น
  // ชิ้นพวกนี้ไม่นับรวมใน k จะได้ไม่เบียดชิ้นที่มีคำตอบ
  const pins = dormPins(opts.message).map((id) => byId.get(id)).filter((c): c is Chunk => Boolean(c));
  for (const { chunk } of scored) {
    if (picked.size >= k) break;
    picked.set(chunk.id, chunk);
  }
  for (const c of pins) picked.set(c.id, c);
  return { chunks: [...picked.values()], ...entities };
}

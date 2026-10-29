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
  return { programIds: [...programIds], placeIds: [...placeIds] };
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

  const query = [...tokenize(opts.message), ...tokenize(opts.previousUserMessage ?? "").slice(0, 6)];

  // น้องมดตัวเดียวตอบทุกเรื่อง จึงค้นทุก namespace เท่ากัน
  const scored = docs
    .map((d) => ({ chunk: d.chunk, score: bm25(d, query, df, docs.length, avgLen) }))
    .filter((x) => x.score > 0)
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
  for (const { chunk } of scored) {
    if (picked.size >= k) break;
    picked.set(chunk.id, chunk);
  }
  return { chunks: [...picked.values()], ...entities };
}

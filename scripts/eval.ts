/*
 * npm run eval — ยิงชุดคำถามใน eval/questions.json ผ่าน /api/chat ตัวจริง (เรียก handler ตรง ไม่ต้องเปิด dev server)
 * ตรวจคำตอบแบบกฎตายตัว: ตัวเลข/คำสำคัญในข้อความ, หมุด, การ์ด, การเปิดแผนที่, การปฏิเสธ, การยอมรับว่าไม่รู้
 *
 *   npm run eval                     ทั้งชุด
 *   npm run eval -- --only=fee-cs,bts  เฉพาะบางข้อ
 *   npm run eval -- --cat=unknown      เฉพาะหมวด
 *   CHAT_MODELS=google:gemini-3.5-flash npm run eval   เทียบโมเดลอื่น
 *
 * ผลละเอียดเขียนไว้ที่ eval/results/<เวลา>.json (ไม่ขึ้น git)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyProfile, type StreamEvent, type ValidatedAnswer } from "@/lib/ai/schema";

// route ใช้ฐานข้อมูลนับ rate limit: ใช้ Postgres ในหน่วยความจำ ไม่แตะ .data/pglite ที่ dev server อาจเปิดอยู่
// และห้ามเขียนตัวนับลงฐานข้อมูลจริงแม้ .env.local จะมี DATABASE_URL — ต้องตั้งก่อน import route (ทำใน main)
process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;
// tsx คอมไพล์เป็น CommonJS ใช้ top-level await ไม่ได้ จึง import route ใน main แล้วเก็บไว้ที่นี่
let POST: (req: Request) => Promise<Response>;

type Expect = {
  include?: string[];
  exclude?: string[];
  places_any?: string[];
  places_all?: string[];
  cards_any?: string[];
  cards_all?: string[];
  card_types_any?: string[];
  /** true = คำถามต้องการเห็นตำแหน่ง แผนที่ต้องเปิด · false = ไม่ควรเปิดแผนที่ */
  show_map?: boolean;
  refuse?: boolean;
  admits_unknown?: boolean;
};
type Question = { id: string; cat: string; q: string; expect: Expect };

const re = (pattern: string) => new RegExp(pattern, "i");
const UNKNOWN_RE = re("ยังไม่มีข้อมูล|ไม่มีข้อมูล|ไม่ทราบ|ไม่แน่ใจ|ยังไม่ได้|ยืนยันไม่ได้|ไม่สามารถ|สอบถาม|ติดต่อ|ไม่รู้");
const REFUSE_RE = re("ขอโทษ|ขออภัย|ไม่ได้|ไม่สามารถ|นอกเหนือ|เฉพาะเรื่อง");

function check(e: Expect, a: ValidatedAnswer): string[] {
  const fails: string[] = [];
  const msg = a.message;
  const places = a.places.map((p) => p.place_id);
  const cardIds = a.cards.flatMap((c) => c.ids);

  for (const p of e.include ?? []) if (!re(p).test(msg)) fails.push(`ข้อความไม่มี /${p}/`);
  for (const p of e.exclude ?? []) if (re(p).test(msg)) fails.push(`ข้อความมี /${p}/ ซึ่งไม่ควรมี`);
  if (e.places_any && !e.places_any.some((id) => places.includes(id))) fails.push(`หมุดไม่มี ${e.places_any.join("|")} (ได้ ${places.join(",") || "-"})`);
  for (const id of e.places_all ?? []) if (!places.includes(id)) fails.push(`หมุดขาด ${id}`);
  if (e.cards_any && !e.cards_any.some((id) => cardIds.includes(id))) fails.push(`การ์ดไม่มี ${e.cards_any.join("|")} (ได้ ${cardIds.join(",") || "-"})`);
  for (const id of e.cards_all ?? []) if (!cardIds.includes(id)) fails.push(`การ์ดขาด ${id}`);
  if (e.card_types_any && !a.cards.some((c) => e.card_types_any!.includes(c.type))) fails.push(`ไม่มีการ์ดประเภท ${e.card_types_any.join("|")}`);
  if (e.show_map !== undefined && a.show_map !== e.show_map) fails.push(`show_map = ${a.show_map} (คาด ${e.show_map})`);
  if (e.refuse) {
    if (!REFUSE_RE.test(msg)) fails.push("ไม่ได้ปฏิเสธ");
    if (a.cards.some((c) => c.type !== "place")) fails.push("ปฏิเสธแต่ยังแนบการ์ดสาขา");
  }
  if (e.admits_unknown && a.confidence !== "low" && !UNKNOWN_RE.test(msg)) fails.push("ไม่ได้บอกว่าไม่มีข้อมูล (confidence high)");
  return fails;
}

async function ask(q: Question, i: number) {
  const body = { history: [], message: q.q, profile: emptyProfile() };
  const started = Date.now();
  // ip ไม่ซ้ำกันต่อข้อ จะได้ไม่ชน rate limit ของ route
  const res = await POST(
    new Request("http://eval.local/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `eval-${i}-${started}` },
      body: JSON.stringify(body),
    }),
  );
  const lines = (await res.text()).trim().split("\n");
  const last = JSON.parse(lines.at(-1)!) as StreamEvent;
  return { ms: Date.now() - started, last };
}

async function main() {
  ({ POST } = await import("@/app/api/chat/route"));
  console.info = () => {}; // ปิด log ปกติของ route ให้ผล eval อ่านง่าย (warn ยังแสดง)
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  const all = JSON.parse(await readFile(path.join(process.cwd(), "eval/questions.json"), "utf8")) as Question[];
  const only = args.only?.split(",");
  const questions = all.filter((q) => (!only || only.includes(q.id)) && (!args.cat || q.cat === args.cat));
  const concurrency = Number(args.concurrency ?? 3);

  const results: { id: string; cat: string; q: string; pass: boolean; fails: string[]; model: string; ms: number; answer?: ValidatedAnswer }[] = [];
  let next = 0;
  async function worker() {
    while (next < questions.length) {
      const i = next++;
      const q = questions[i];
      try {
        const { ms, last } = await ask(q, i);
        if (last.type !== "final") {
          results.push({ id: q.id, cat: q.cat, q: q.q, pass: false, fails: [`error: ${last.type === "error" ? last.message : last.type}`], model: "-", ms });
        } else {
          const fails = check(q.expect, last.data);
          if (last.model.includes("offline")) fails.push(`ตอบแบบออฟไลน์ (${last.model})`);
          results.push({ id: q.id, cat: q.cat, q: q.q, pass: fails.length === 0, fails, model: last.model, ms, answer: last.data });
        }
      } catch (err) {
        results.push({ id: q.id, cat: q.cat, q: q.q, pass: false, fails: [`crash: ${String(err).slice(0, 120)}`], model: "-", ms: 0 });
      }
      const r = results.at(-1)!;
      process.stdout.write(`${r.pass ? "✓" : "✗"} ${r.id.padEnd(20)} ${String(r.ms).padStart(6)}ms ${r.model}${r.pass ? "" : `\n    ${r.fails.join("\n    ")}`}\n`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const byCat = new Map<string, { pass: number; total: number }>();
  for (const r of results) {
    const c = byCat.get(r.cat) ?? { pass: 0, total: 0 };
    c.total++;
    if (r.pass) c.pass++;
    byCat.set(r.cat, c);
  }
  const passed = results.filter((r) => r.pass).length;
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  console.log("\n— สรุป —");
  for (const [cat, c] of byCat) console.log(`${cat.padEnd(14)} ${c.pass}/${c.total}`);
  console.log(`รวม ${passed}/${results.length} = ${((passed / Math.max(1, results.length)) * 100).toFixed(1)}% · เวลา p50 ${ms[Math.floor(ms.length / 2)] ?? 0}ms p90 ${ms[Math.floor(ms.length * 0.9)] ?? 0}ms`);
  const models = new Map<string, number>();
  for (const r of results) models.set(r.model, (models.get(r.model) ?? 0) + 1);
  console.log(`โมเดลที่ตอบ: ${[...models].map(([m, n]) => `${m} ×${n}`).join(", ")}`);

  const dir = path.join(process.cwd(), "eval/results");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify({ passed, total: results.length, results }, null, 2), "utf8");
  console.log(`ผลละเอียด: ${path.relative(process.cwd(), file)}`);
}

void main();

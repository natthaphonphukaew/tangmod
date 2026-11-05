/**
 * วัดช่องว่าง: คำถามที่ AI ทั่วไปตอบได้ แต่ทางมดอาจตอบไม่ได้
 *
 *   npx tsx --env-file=.env.local scripts/gap-compare.ts <ไฟล์คำถาม.json> <ไฟล์ผล.json>
 *
 * ถามคำถามเดียวกัน 3 แบบ:
 *   tangmod  = route จริงของแอป (ค้น KB + prompt + validate)
 *   raw-minimax / raw-gemini = โมเดลเปล่า ไม่มีข้อมูลประกอบ เหมือนถามแชท AI ทั่วไป
 * คำถาม: [{ "id": "...", "group": "...", "q": "..." }]
 */
import { readFile, writeFile } from "node:fs/promises";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import { emptyProfile, type StreamEvent } from "@/lib/ai/schema";

// เหมือน scripts/eval.ts: ไม่แตะฐานข้อมูลจริง
process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;
let POST: (req: Request) => Promise<Response>;

type Q = { id: string; group: string; q: string };

const RAW_SYSTEM = "คุณเป็นผู้ช่วย AI ทั่วไป ตอบเป็นภาษาไทย กระชับ ไม่เกินประมาณ 120 คำ";

function rawModels(): { id: string; model: LanguageModel }[] {
  const out: { id: string; model: LanguageModel }[] = [];
  if (process.env.MINIMAX_API_KEY) {
    const gateway = createAnthropic({
      baseURL: process.env.MINIMAX_BASE_URL ?? "https://nrrai2-model.sit.kmutt.ac.th/api/v1",
      authToken: process.env.MINIMAX_API_KEY,
    });
    out.push({ id: "raw-minimax", model: gateway("minimax-m3") });
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) out.push({ id: "raw-gemini", model: createGoogleGenerativeAI()("gemini-3.5-flash") });
  return out;
}

async function askTangmod(q: Q, i: number) {
  const res = await POST(
    new Request("http://gap.local/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `gap-${i}-${Date.now()}` },
      body: JSON.stringify({ history: [], message: q.q, profile: emptyProfile() }),
    }),
  );
  const last = JSON.parse((await res.text()).trim().split("\n").at(-1)!) as StreamEvent;
  if (last.type !== "final") return { model: last.type, message: last.type === "error" ? last.message : "", confidence: "-", sources: [] as string[] };
  return { model: last.model, message: last.data.message, confidence: last.data.confidence, sources: last.data.sources.map((s) => s.id) };
}

async function askRaw(model: LanguageModel, q: Q) {
  try {
    const { text } = await generateText({ model, system: RAW_SYSTEM, prompt: q.q, abortSignal: AbortSignal.timeout(45_000) });
    // MiniMax อาจใส่ส่วนคิด <think> มาด้วย ตัดออก
    return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  } catch (err) {
    return `ERROR: ${String(err).slice(0, 120)}`;
  }
}

async function main() {
  ({ POST } = await import("@/app/api/chat/route"));
  const [inFile, outFile] = process.argv.slice(2);
  const qs = JSON.parse(await readFile(inFile, "utf8")) as Q[];
  const raws = rawModels();
  const results: Record<string, unknown>[] = [];
  let next = 0;
  async function worker() {
    while (next < qs.length) {
      const i = next++;
      const q = qs[i];
      const [tangmod, ...rawAnswers] = await Promise.all([askTangmod(q, i), ...raws.map((r) => askRaw(r.model, q))]);
      const row: Record<string, unknown> = { ...q, tangmod };
      raws.forEach((r, k) => (row[r.id] = rawAnswers[k]));
      results[i] = row;
      process.stdout.write(`${q.id.padEnd(22)} tangmod=${tangmod.confidence}/${tangmod.model}\n`);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  await writeFile(outFile, JSON.stringify(results, null, 1));
  console.log(`เขียนผล ${results.length} ข้อที่ ${outFile}`);
}

main();

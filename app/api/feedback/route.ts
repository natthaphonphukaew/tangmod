import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { rateLimited, scrubPII } from "@/lib/ai/guard";
import { FeedbackRequest } from "@/lib/ai/schema";

/*
 * POST /api/feedback ← ปุ่ม "ตอบไม่ตรง"
 * log แบบไม่ผูกตัวตน (ไม่เก็บ IP) · ตอน dev เขียนต่อท้าย .data/feedback.ndjson ด้วย เพื่อเอาไปทำชุด eval / เติม KB
 * บน Vercel ระบบไฟล์เขียนไม่ได้ ให้ดูจาก log ของ function แทน
 */
export async function POST(req: Request) {
  const parsed = FeedbackRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(`feedback:${ip}`)) return Response.json({ ok: false }, { status: 429 });

  const f = parsed.data;
  const entry = {
    at: new Date().toISOString(),
    ...f,
    question: scrubPII(f.question),
    answer: scrubPII(f.answer),
  };
  console.info(`[feedback] ${JSON.stringify(entry)}`);

  if (process.env.NODE_ENV !== "production") {
    const dir = path.join(process.cwd(), ".data");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "feedback.ndjson"), `${JSON.stringify(entry)}\n`, "utf8");
  }
  return new Response(null, { status: 204 });
}

import { scrubPII } from "@/lib/ai/guard";
import { FeedbackRequest } from "@/lib/ai/schema";
import { ensureSchema, getDb } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { isRateLimited } from "@/lib/rate-limit";

/*
 * POST /api/feedback ← ปุ่ม "ตอบไม่ตรง"
 * เก็บลงตาราง feedback (Neon บน production, PGlite ตอน dev) แบบไม่ผูกตัวตน ไม่เก็บ IP
 * ดึงออกมาทำชุด eval / เติม KB ด้วย `npm run feedback`
 */
export async function POST(req: Request) {
  const parsed = FeedbackRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (await isRateLimited(`feedback:${ip}`)) return Response.json({ ok: false }, { status: 429 });

  const f = parsed.data;
  const row = {
    reason: f.reason,
    question: scrubPII(f.question),
    answer: scrubPII(f.answer),
    model: f.model ?? null,
    placeIds: f.place_ids,
    cardIds: f.card_ids,
  };
  try {
    await ensureSchema();
    await getDb().insert(feedback).values(row);
  } catch (err) {
    // เก็บไม่ได้ก็ยังมีใน log ของ Vercel ให้ตามเก็บทีหลัง ผู้ใช้ไม่ต้องรู้
    console.error("[feedback] save failed", err instanceof Error ? err.message : err);
  }
  console.info(`[feedback] ${JSON.stringify({ reason: row.reason, model: row.model })}`);
  return new Response(null, { status: 204 });
}

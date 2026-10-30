import type { ValidatedAnswer } from "@/lib/ai/schema";
import { ensureSchema, getDb } from "@/lib/db";
import { feedback } from "@/lib/db/schema";

/*
 * คำถามที่มดตอบเองว่าข้อมูลไม่พอ (confidence = low) เก็บลงตาราง feedback อัตโนมัติ
 * ใช้ตารางเดียวกับปุ่ม "ตอบไม่ตรง" แยกด้วย reason จะได้ดึงออกมาด้วย `npm run feedback` ทีเดียว
 * ไม่ผูกตัวตน ไม่เก็บ IP · คำถามต้องผ่าน scrubPII มาก่อนแล้ว (route ทำให้)
 */
export const UNANSWERED_REASON = "auto_low_confidence";

export async function recordUnanswered(entry: { question: string; answer: ValidatedAnswer; model: string }) {
  try {
    await ensureSchema();
    await getDb()
      .insert(feedback)
      .values({
        reason: UNANSWERED_REASON,
        question: entry.question.slice(0, 500),
        answer: entry.answer.message.slice(0, 3000),
        model: entry.model,
        placeIds: entry.answer.places.map((p) => p.place_id),
        cardIds: entry.answer.cards.flatMap((c) => c.ids),
      });
  } catch (err) {
    // เก็บไม่ได้ไม่เป็นไร ผู้ใช้ได้คำตอบไปแล้ว
    console.error("[unanswered] save failed", err instanceof Error ? err.message : err);
  }
}

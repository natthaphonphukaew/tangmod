import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { conversation } from "@/lib/db/schema";

/*
 * ประวัติแชทฝั่ง server — ทุก query ผูกกับ userId ของคนที่ login เสมอ (อ่าน/เขียนแชทของคนอื่นไม่ได้)
 * thread เก็บเป็น JSON ตามที่หน้าเว็บส่งมา ตรวจแค่โครงและขนาด เพราะแสดงผลกลับให้เจ้าของเท่านั้น
 */

const MAX_THREAD_BYTES = 200_000;

export const ConversationInput = z
  .object({
    id: z.string().min(8).max(64).regex(/^[\w-]+$/),
    title: z.string().min(1).max(80),
    updatedAt: z.number().int().nonnegative(),
    thread: z.array(z.object({ kind: z.enum(["user", "assistant", "compass"]), id: z.string().max(64) }).loose()).max(60),
  })
  .refine((c) => JSON.stringify(c.thread).length <= MAX_THREAD_BYTES, { message: "แชทยาวเกินไป" });
export type ConversationInput = z.infer<typeof ConversationInput>;

export async function listConversations(userId: string) {
  return getDb()
    .select({ id: conversation.id, title: conversation.title, updatedAt: conversation.updatedAt })
    .from(conversation)
    .where(eq(conversation.userId, userId))
    .orderBy(desc(conversation.updatedAt))
    .limit(100);
}

export async function getConversation(userId: string, id: string) {
  const rows = await getDb()
    .select({ id: conversation.id, title: conversation.title, updatedAt: conversation.updatedAt, thread: conversation.thread })
    .from(conversation)
    .where(and(eq(conversation.userId, userId), eq(conversation.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** บันทึก (สร้างหรือแทนที่) · ถ้า id นี้เป็นของคนอื่นอยู่แล้ว คืน false และไม่แตะของเขา */
export async function saveConversation(userId: string, c: ConversationInput): Promise<boolean> {
  const rows = await getDb()
    .insert(conversation)
    .values({ id: c.id, userId, title: c.title, updatedAt: c.updatedAt, thread: c.thread })
    .onConflictDoUpdate({
      target: conversation.id,
      set: { title: c.title, updatedAt: c.updatedAt, thread: c.thread },
      setWhere: eq(conversation.userId, userId),
    })
    .returning({ id: conversation.id });
  return rows.length > 0;
}

export async function deleteConversation(userId: string, id: string) {
  await getDb()
    .delete(conversation)
    .where(and(eq(conversation.userId, userId), eq(conversation.id, id)));
}

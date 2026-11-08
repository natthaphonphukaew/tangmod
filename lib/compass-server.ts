import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { compassResult } from "@/lib/db/schema";
import { SavedCompass } from "./compass-saved";

/* ผลเข็มทิศฝั่ง server — ทุก query ผูกกับ userId ของคนที่ login เสมอ */

export async function getCompass(userId: string): Promise<SavedCompass | null> {
  const rows = await getDb().select({ data: compassResult.data }).from(compassResult).where(eq(compassResult.userId, userId)).limit(1);
  const parsed = SavedCompass.safeParse(rows[0]?.data);
  return parsed.success ? parsed.data : null;
}

export async function saveCompass(userId: string, c: SavedCompass) {
  await getDb()
    .insert(compassResult)
    .values({ userId, data: c, updatedAt: c.updated_at })
    .onConflictDoUpdate({ target: compassResult.userId, set: { data: c, updatedAt: c.updated_at } });
}

export async function deleteCompass(userId: string) {
  await getDb().delete(compassResult).where(eq(compassResult.userId, userId));
}

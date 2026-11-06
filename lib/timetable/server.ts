import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timetable } from "@/lib/db/schema";
import { Timetable } from "./schema";

/* ตารางเรียนฝั่ง server — ทุก query ผูกกับ userId ของคนที่ login เสมอ */

export async function getTimetable(userId: string): Promise<Timetable | null> {
  const rows = await getDb().select({ data: timetable.data }).from(timetable).where(eq(timetable.userId, userId)).limit(1);
  const parsed = Timetable.safeParse(rows[0]?.data);
  return parsed.success ? parsed.data : null;
}

export async function saveTimetable(userId: string, t: Timetable) {
  await getDb()
    .insert(timetable)
    .values({ userId, data: t, updatedAt: t.updated_at })
    .onConflictDoUpdate({ target: timetable.userId, set: { data: t, updatedAt: t.updated_at } });
}

export async function deleteTimetable(userId: string) {
  await getDb().delete(timetable).where(eq(timetable.userId, userId));
}

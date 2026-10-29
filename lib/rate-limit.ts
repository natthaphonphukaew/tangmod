import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { rateLimited as rateLimitedInMemory } from "@/lib/ai/guard";
import { ensureSchema, getDb } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";

/*
 * Rate limit แบบ fixed window 1 นาที เก็บใน Postgres ให้ทุก instance บน Vercel นับร่วมกัน
 * (ตัวนับในหน่วยความจำนับแยกต่อ instance — คนยิงถี่ ๆ จะกระจายไปหลาย instance แล้วหลุดลิมิต)
 * 1 คำขอ = 1 query (upsert แบบ atomic) · ฐานข้อมูลล่มเมื่อไรจะกลับไปใช้ตัวนับในหน่วยความจำ ไม่ให้แชทพังตาม
 */

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = Number(process.env.CHAT_RATE_LIMIT_PER_MIN ?? 12);

/** ไม่เก็บ IP จริงลงฐานข้อมูล เก็บแค่ hash */
const hashKey = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 32);

export async function isRateLimited(key: string, limit = DEFAULT_LIMIT, now = Date.now()): Promise<boolean> {
  const window = Math.floor(now / WINDOW_MS);
  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db
      .insert(rateLimit)
      .values({ key: hashKey(key), windowStart: window, count: 1 })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: {
          count: sql`CASE WHEN ${rateLimit.windowStart} = ${window} THEN ${rateLimit.count} + 1 ELSE 1 END`,
          windowStart: window,
        },
      })
      .returning({ count: rateLimit.count });
    // เก็บกวาดแถวของ window เก่า ๆ เป็นครั้งคราว (ราว 1 ใน 50 คำขอ) ไม่ต้องมี cron
    if (Math.random() < 0.02) void db.delete(rateLimit).where(lt(rateLimit.windowStart, window - 5)).catch(() => {});
    return (rows[0]?.count ?? 1) > limit;
  } catch {
    return rateLimitedInMemory(key, now);
  }
}

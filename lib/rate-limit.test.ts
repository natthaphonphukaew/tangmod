import { describe, expect, it } from "vitest";
import { feedback, rateLimit } from "@/lib/db/schema";

// vitest.config ตั้ง PGLITE_DIR=memory:// ไว้แล้ว (Postgres ในหน่วยความจำ)
const { isRateLimited } = await import("./rate-limit");
const { ensureSchema, getDb } = await import("@/lib/db");

describe("rate limit (Postgres)", () => {
  it("นับร่วมกันต่อ key ภายใน 1 นาที แล้วเริ่มใหม่เมื่อขึ้นนาทีใหม่", async () => {
    const t = 1_800_000_000_000;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await isRateLimited("ip-a", 3, t + i * 1000));
    expect(results).toEqual([false, false, false, true]);
    expect(await isRateLimited("ip-b", 3, t)).toBe(false); // คนละ key ไม่ปนกัน
    expect(await isRateLimited("ip-a", 3, t + 61_000)).toBe(false); // นาทีใหม่
  });

  it("ไม่เก็บ IP จริงลงฐานข้อมูล", async () => {
    await isRateLimited("203.0.113.7", 3);
    const keys = (await getDb().select({ key: rateLimit.key }).from(rateLimit)).map((r) => r.key);
    expect(keys.some((k) => k.includes("203.0.113.7"))).toBe(false);
  });

  it("ตาราง feedback รับข้อมูลได้", async () => {
    await ensureSchema();
    await getDb().insert(feedback).values({ reason: "wrong_place", question: "CB2301 อยู่ไหน", answer: "N17", model: "test", placeIds: ["N17"], cardIds: [] });
    const rows = await getDb().select().from(feedback);
    expect(rows.at(-1)).toMatchObject({ reason: "wrong_place", placeIds: ["N17"] });
  });
});

import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import path from "node:path";
import { MIGRATIONS } from "./migrate";
import { schema } from "./schema";

/*
 * มี DATABASE_URL (Neon) → ใช้ Postgres จริงผ่าน HTTP (เหมาะกับ serverless บน Vercel)
 * ไม่มี → PGlite: Postgres ตัวจริงที่รันใน process เก็บไฟล์ไว้ที่ .data/pglite (ใช้ตอน dev และเทสต์ ไม่ต้องสมัครอะไร)
 * ทั้งสองแบบใช้ query ของ Drizzle ชุดเดียวกัน
 */

export type Db = NeonHttpDatabase<typeof schema>;

type Holder = { db: Db; ready?: Promise<void> };
// dev server โหลด module ซ้ำตอน hot reload: เก็บ instance ไว้ที่ globalThis ไม่ให้เปิด PGlite ซ้อนบนไฟล์เดียวกัน
const g = globalThis as typeof globalThis & { __tangmodDb?: Holder };

function create(): Db {
  const url = process.env.DATABASE_URL;
  if (url) return drizzleNeon(neon(url), { schema });
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("ต้องตั้ง DATABASE_URL (Neon) บน production — PGlite ใช้ได้เฉพาะเครื่อง dev");
  }
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  // memory:// สำหรับเทสต์ (ไม่ทิ้งไฟล์)
  const client = new PGlite(dir === "memory://" ? undefined : dir);
  return drizzlePglite(client, { schema }) as unknown as Db;
}

export function getDb(): Db {
  g.__tangmodDb ??= { db: create() };
  return g.__tangmodDb.db;
}

/** สร้างตารางที่ยังไม่มี ทำครั้งเดียวต่อ process ต้อง await ก่อนใช้ฐานข้อมูลทุกครั้ง */
export function ensureSchema(): Promise<void> {
  const holder = (g.__tangmodDb ??= { db: create() });
  holder.ready ??= (async () => {
    for (const statement of MIGRATIONS) await holder.db.execute(sql.raw(statement));
  })().catch((err) => {
    holder.ready = undefined; // ให้ลองใหม่รอบหน้า ไม่ค้าง error ตลอดอายุ process
    if (!process.env.DATABASE_URL) {
      // PGlite เปิดไฟล์ได้ทีละ process เท่านั้น ถ้าเคยมีสองตัวเปิดพร้อมกัน (เช่น next build ระหว่างที่ dev server รันอยู่) ไฟล์จะเสีย
      console.error("[db] เปิด PGlite ไม่ได้ — ถ้าเป็นข้อมูลทดสอบ ให้ปิด dev server แล้วย้ายหรือลบโฟลเดอร์ .data/pglite แล้วเริ่มใหม่");
    }
    throw err;
  });
  return holder.ready;
}

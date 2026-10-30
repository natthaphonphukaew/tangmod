/*
 * npm run feedback — ดึงคำถามที่ต้องปรับปรุงออกมาใช้เติม KB / ทำชุด eval มีสองแหล่งในตารางเดียวกัน:
 *   - ผู้ใช้กด "ตอบไม่ตรง" (reason = wrong_info / missed_question / wrong_place / other)
 *   - มดตอบเองว่าข้อมูลไม่พอ เก็บอัตโนมัติ (reason = auto_low_confidence, lib/unanswered.ts)
 *
 *   ฐานข้อมูลจริง (Neon):  ตั้ง DATABASE_URL (คัดลอกจาก Neon console หรือ Vercel → Storage) แล้วรัน npm run feedback
 *   ฐานข้อมูลในเครื่อง:    npm run feedback -- --local   (ต้องปิด dev server ก่อน PGlite เปิดไฟล์ได้ทีละ process)
 *   เลือกช่วงเวลา:        --days=7 (ค่าเริ่มต้น 30)
 *   เฉพาะแหล่งเดียว:       --reason=auto_low_confidence
 *
 * เขียนผลไว้ที่ .data/feedback-export.ndjson (ไม่ขึ้น git เพราะมีคำถามของผู้ใช้)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { desc, gte } from "drizzle-orm";
import { ensureSchema, getDb } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { UNANSWERED_REASON } from "@/lib/unanswered";

const LABEL: Record<string, string> = {
  [UNANSWERED_REASON]: "มดตอบเองว่าข้อมูลไม่พอ",
  wrong_info: "ผู้ใช้: ข้อมูลผิด",
  missed_question: "ผู้ใช้: ไม่ตอบที่ถาม",
  wrong_place: "ผู้ใช้: ชี้ผิดที่",
  other: "ผู้ใช้: อื่น ๆ",
};

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  if (!process.env.DATABASE_URL && !("local" in args)) {
    console.error("ยังไม่ได้ตั้ง DATABASE_URL — ถ้าจะดึงจากฐานข้อมูลในเครื่อง ให้ปิด dev server แล้วรันด้วย --local");
    process.exit(1);
  }
  const days = Number(args.days ?? 30);
  const since = new Date(Date.now() - days * 86_400_000);

  await ensureSchema();
  const all = await getDb().select().from(feedback).where(gte(feedback.createdAt, since)).orderBy(desc(feedback.createdAt));
  const rows = args.reason ? all.filter((r) => r.reason === args.reason) : all;

  const byReason = new Map<string, number>();
  for (const r of rows) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
  console.log(`feedback ${days} วันล่าสุด: ${rows.length} รายการ`);
  for (const [reason, n] of byReason) console.log(`  ${(LABEL[reason] ?? reason).padEnd(24)} ${n}`);
  for (const r of rows.slice(0, 10)) console.log(`- [${r.reason}] ${r.question}`);

  const dir = path.join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "feedback-export.ndjson");
  await writeFile(file, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  console.log(`ผลเต็ม: ${path.relative(process.cwd(), file)}`);
}

// PGlite (--local) ค้าง event loop ไว้ ทำให้คำสั่งไม่จบเอง: ออกเองเมื่อเขียนไฟล์เสร็จ
void main().then(() => process.exit(0));

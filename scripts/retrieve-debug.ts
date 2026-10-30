/*
 * npm run retrieve -- "คำถาม"  — ดูว่าคำถามนี้ระบบดึงข้อมูลชิ้นไหนส่งให้ AI (ไม่เรียก AI ไม่ใช้โควตา)
 *
 * ใช้แยกว่าคำถามที่ตอบผิดเกิดจากอะไร:
 *   - ไม่มี chunk ที่มีคำตอบเลย            → ขาดข้อมูล เติมใน content/
 *   - มี chunk แต่ไม่ติดอันดับ / ไม่อยู่ในรายการ → ค้นไม่เจอ เพิ่มคำที่คนใช้ถามลงในเนื้อหา/หัวข้อ หรือ aliases
 *   - chunk ถูกแล้วแต่คำตอบยังผิด           → ปัญหาที่ prompt / validate
 */
import { tokenize, retrieve } from "@/lib/ai/retrieve";

const args = process.argv.slice(2);
const question = args.filter((a) => !a.startsWith("--")).join(" ");
if (!question) {
  console.error('ใช้: npm run retrieve -- "CB2301 อยู่ไหน" [--full]');
  process.exit(1);
}
const full = args.includes("--full");

const r = retrieve({ message: question });
console.log(`คำถาม: ${question}`);
console.log(`คำค้น: ${tokenize(question).join(" · ") || "-"}`);
console.log(`จับได้ว่าพูดถึง: สาขา [${r.programIds.join(", ") || "-"}] · สถานที่ [${r.placeIds.join(", ") || "-"}]`);
console.log(`\nส่งให้ AI ${r.chunks.length} ชิ้น (เรียงตามลำดับที่ส่ง):`);
r.chunks.forEach((c, i) => {
  console.log(`\n${String(i + 1).padStart(2)}. ${c.id}  [${c.tier}]  ${c.title}`);
  const text = full ? c.text : c.text.replace(/\s+/g, " ").slice(0, 160) + (c.text.length > 160 ? "…" : "");
  console.log(`    ${text.replace(/\n/g, "\n    ")}`);
});

import { z } from "zod";

/*
 * ผลเข็มทิศที่บันทึกไว้ (ในเครื่อง หรือบนบัญชีถ้า login) และรายการสาขาที่เลือกไว้เทียบ
 * แยกไฟล์จาก lib/compass.ts เพื่อให้ API ตรวจรูปแบบได้โดยไม่ต้องโหลด catalog
 */
const id = z.string().max(64);
const text = z.string().max(200);

export const SavedCompass = z.object({
  v: z.literal(2),
  /** คำตอบล่าสุด (ใช้ทำแบบทดสอบซ้ำโดยเริ่มจากคำตอบเดิม) · null = ยังไม่เคยทำ มีแค่รายการเทียบ */
  answers: z
    .object({
      v: z.literal(2),
      likes: z.array(z.string().max(32)).max(3),
      avoid: z.array(z.string().max(32)).max(13),
      style: z.record(z.string().max(32), z.number().int().min(0).max(3)),
      followups: z.record(z.string().max(32), z.number().int().min(0).max(9)),
      campus: z.number().int().min(0).max(2),
      lang: z.number().int().min(0).max(2),
      budget: z.number().int().min(0).max(3),
      years: z.number().int().min(0).max(1),
    })
    .nullable(),
  results: z.array(z.object({ programId: id, percent: z.number().min(0).max(100), pros: z.array(text).max(4), cons: z.array(text).max(4) })).max(12),
  excluded: z.array(z.object({ programId: id, reason: text })).max(80),
  compare: z.array(id).max(3),
  updated_at: z.number().int(),
});
export type SavedCompass = z.infer<typeof SavedCompass>;

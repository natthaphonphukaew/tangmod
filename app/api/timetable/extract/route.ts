import { isRateLimited } from "@/lib/rate-limit";
import { extractTimetable, NoVisionModel } from "@/lib/timetable/extract";

export const maxDuration = 60;

const MAX_BYTES = 4_000_000; // ฝั่งเบราว์เซอร์ย่อรูปให้เหลือราว 1 MB ก่อนส่งอยู่แล้ว
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/*
 * POST /api/timetable/extract  (FormData: image)
 * → { entries, dropped } ให้ผู้ใช้ตรวจแก้ก่อนบันทึก · ไม่เก็บรูปและไม่ต้อง login
 * จำกัด 3 ครั้งต่อนาทีต่อ IP เพราะเรียกโมเดลอ่านรูปแพงกว่าแชท
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (await isRateLimited(`timetable:${ip}`, 3)) {
    return Response.json({ error: "rate_limited", message: "อัปรูปถี่ไปนิด รอสักครู่แล้วลองใหม่" }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || !TYPES.includes(file.type) || file.size > MAX_BYTES) {
    return Response.json({ error: "bad_request", message: "ส่งได้เฉพาะรูป JPG, PNG หรือ WebP ไม่เกิน 4 MB" }, { status: 400 });
  }

  try {
    const result = await extractTimetable(new Uint8Array(await file.arrayBuffer()), file.type);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof NoVisionModel ? "ตอนนี้อ่านรูปอัตโนมัติไม่ได้ กรอกตารางเองได้เลย" : "อ่านรูปไม่สำเร็จ (AI อาจไม่ว่าง) ลองใหม่อีกครั้ง หรือกรอกตารางเอง";
    console.error("[timetable] extract failed", err instanceof Error ? err.name : "unknown");
    return Response.json({ error: "unavailable", message }, { status: 503 });
  }
}

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { Day } from "@/lib/data/schemas";
import { TimetableEntry } from "./schema";

/*
 * อ่านตารางเรียนจากรูปด้วย Gemini (MiniMax ผ่าน gateway ยังไม่รู้ว่ารับรูปได้ไหม จึงไม่ใช้)
 * ผลจาก AI ยังไม่ถือว่าถูก: ผู้ใช้ต้องตรวจแก้ในหน้าปฏิทินก่อนบันทึก
 * ไม่เก็บรูป ไม่ log ข้อความในรูป
 */

const MODELS = (process.env.TIMETABLE_MODELS ?? "gemini-3.5-flash,gemini-3.5-flash-lite").split(",").map((s) => s.trim());

// schema ที่ส่งให้โมเดล: เวลาเป็นข้อความธรรมดา (ตารางไทยมักเขียน 09.30) แล้วค่อยแปลงเอง
const Extracted = z.object({
  entries: z.array(
    z.object({
      code: z.string().describe("รหัสวิชา เช่น DSI122, LNG323"),
      name: z.string().optional().describe("ชื่อวิชาหรือคำในวงเล็บหลังรหัส ถ้ามี เช่น Data Analytic"),
      day: Day.describe("วันในสัปดาห์ของคาบนี้"),
      start: z.string().describe("เวลาเริ่มตามที่เขียนในช่อง เช่น 09.30"),
      end: z.string().describe("เวลาจบตามที่เขียนในช่อง เช่น 12.30"),
      room: z.string().optional().describe("ห้องเรียน เช่น CB2504 หรือ LX11/1-2"),
      note: z.string().optional().describe("หมายเหตุเกี่ยวกับวิชานี้ เช่น ย้ายห้องตั้งแต่สัปดาห์ที่ 9"),
    }),
  ),
});

const PROMPT = `รูปนี้คือตารางเรียนของนักศึกษา มจธ. (KMUTT) อ่านทุกคาบเรียนออกมาเป็นรายการ
- คาบที่ยาวหลายช่องนับเป็น 1 รายการ ใช้เวลาที่เขียนในวงเล็บของช่องนั้น (เช่น 09.30-12.30) ถ้าไม่มีให้ใช้หัวคอลัมน์
- วิชาเดียวกันที่เรียนหลายวัน แยกเป็นคนละรายการ
- ห้อง: เขียนตามที่เห็น เช่น CB2306, LX11/1-2 (ถ้ามีสองห้องคั่นด้วย / ให้ใส่ทั้งสอง)
- หมายเหตุใต้ตารางที่พูดถึงวิชาไหน ใส่ใน note ของวิชานั้น
- ห้ามใส่ชื่ออาจารย์ ชื่อนักศึกษา หรือรหัสนักศึกษา
- อ่านไม่ออกหรือไม่แน่ใจ ให้เว้นช่องนั้นว่าง ห้ามเดา
- ถ้ารูปไม่ใช่ตารางเรียน ให้ entries เป็นรายการว่าง`;

/** "9.30" "09:30" "9:30 น." → "09:30" · อ่านไม่ได้ → undefined */
export function normalizeTime(s: string): string | undefined {
  const m = s.match(/(\d{1,2})\s*[.:]\s*(\d{2})/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** แปลงผลจากโมเดลเป็น TimetableEntry ที่ผ่าน schema · รายการที่ไม่ผ่านนับไว้ให้ UI บอกผู้ใช้ */
export function cleanEntries(raw: z.infer<typeof Extracted>["entries"]): { entries: TimetableEntry[]; dropped: number } {
  const entries: TimetableEntry[] = [];
  let dropped = 0;
  for (const r of raw) {
    const parsed = TimetableEntry.safeParse({
      code: r.code.replace(/\s+/g, "").toUpperCase(),
      name: r.name?.trim() || undefined,
      day: r.day,
      start: normalizeTime(r.start),
      end: normalizeTime(r.end),
      room: r.room?.replace(/\s+/g, "") || undefined,
      note: r.note?.trim() || undefined,
    });
    if (parsed.success) entries.push(parsed.data);
    else dropped++;
  }
  return { entries, dropped };
}

export class NoVisionModel extends Error {}

export async function extractTimetable(image: Uint8Array, mediaType: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new NoVisionModel("ไม่มี key ของ Gemini");
  const google = createGoogleGenerativeAI();
  let lastError: unknown;
  for (const name of MODELS) {
    try {
      const { output } = await generateText({
        model: google(name),
        output: Output.object({ schema: Extracted }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "file", data: image, mediaType },
            ],
          },
        ],
        abortSignal: AbortSignal.timeout(40_000),
      });
      return cleanEntries(output.entries);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

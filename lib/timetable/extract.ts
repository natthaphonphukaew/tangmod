import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { addDays } from "@/lib/calendar/events";
import { calendar } from "@/lib/data";
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
      room_changes: z
        .array(
          z.object({
            from_date: z.string().optional().describe("วันที่เริ่มใช้ห้องใหม่ แบบ ค.ศ. YYYY-MM-DD (ปี พ.ศ. 2569 หรือ 69 = ค.ศ. 2026)"),
            from_week: z.number().int().optional().describe("สัปดาห์ที่เริ่มใช้ห้องใหม่ ถ้าหมายเหตุบอกเป็นสัปดาห์"),
            room: z.string().describe("ห้องใหม่"),
          }),
        )
        .optional()
        .describe("ใส่เมื่อหมายเหตุบอกว่าวิชานี้ย้ายห้องระหว่างภาค"),
    }),
  ),
});

const PROMPT = `รูปนี้คือตารางเรียนของนักศึกษา มจธ. (KMUTT) อ่านทุกคาบเรียนออกมาเป็นรายการ
- คาบที่ยาวหลายช่องนับเป็น 1 รายการ ใช้เวลาที่เขียนในวงเล็บของช่องนั้น (เช่น 09.30-12.30) ถ้าไม่มีให้ใช้หัวคอลัมน์
- วิชาเดียวกันที่เรียนหลายวัน แยกเป็นคนละรายการ
- ห้อง: เขียนตามที่เห็น เช่น CB2306, LX11/1-2 (ถ้ามีสองห้องคั่นด้วย / ให้ใส่ทั้งสอง)
- หมายเหตุใต้ตารางที่พูดถึงวิชาไหน ใส่ใน note ของวิชานั้น
- ถ้าวิชาย้ายห้องระหว่างภาค (ในช่องมีสองห้อง หรือหมายเหตุบอกว่าสัปดาห์ไหน/วันไหนเรียนห้องอะไร) ให้ room เป็นห้องที่เรียนก่อน แล้วใส่ห้องใหม่ใน room_changes พร้อมวันที่หรือสัปดาห์ที่เริ่ม
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

/** วันเริ่มใช้ห้องใหม่: วันที่ (แก้ปี พ.ศ. ที่หลุดมา) หรือสัปดาห์ที่ N นับจากวันเปิดภาค */
export function changeDate(c: { from_date?: string; from_week?: number }, termStart: string | undefined): string | undefined {
  const m = c.from_date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]) > 2400 ? Number(m[1]) - 543 : Number(m[1]);
    const date = `${year}-${m[2]}-${m[3]}`;
    // ตารางมักพิมพ์ปีผิด (เช่น "66" แทน "69"): วันที่นอกภาคให้ลองใช้ปีของภาคนั้นแทน
    if (!termStart || (date >= termStart && date <= addDays(termStart, 200))) return date;
    const sy = Number(termStart.slice(0, 4));
    const fixed = [sy, sy + 1].map((y) => `${y}-${m[2]}-${m[3]}`).find((d) => d >= termStart && d <= addDays(termStart, 200));
    if (fixed) return fixed;
  }
  if (c.from_week && termStart && c.from_week > 1 && c.from_week <= 20) return addDays(termStart, 7 * (c.from_week - 1));
  return undefined;
}

/** แปลงผลจากโมเดลเป็น TimetableEntry ที่ผ่าน schema · รายการที่ไม่ผ่านนับไว้ให้ UI บอกผู้ใช้ */
export function cleanEntries(raw: z.infer<typeof Extracted>["entries"], termStart?: string): { entries: TimetableEntry[]; dropped: number } {
  const entries: TimetableEntry[] = [];
  let dropped = 0;
  for (const r of raw) {
    const changes = (r.room_changes ?? [])
      .map((c) => ({ from: changeDate(c, termStart), room: c.room.replace(/\s+/g, "") }))
      .filter((c): c is { from: string; room: string } => !!c.from && !!c.room);
    // ช่องที่เขียนสองห้อง "CB2308/LX11/1-2" แต่ย้ายห้องแยกไว้แล้ว: ห้องแรกคือห้องก่อนย้าย
    let room = r.room?.replace(/\s+/g, "") || undefined;
    if (room && changes.length) {
      for (const c of changes) room = room.replace(`/${c.room}`, "").replace(`${c.room}/`, "");
    }
    const parsed = TimetableEntry.safeParse({
      code: r.code.replace(/\s+/g, "").toUpperCase(),
      name: r.name?.trim() || undefined,
      day: r.day,
      start: normalizeTime(r.start),
      end: normalizeTime(r.end),
      room,
      note: r.note?.trim() || undefined,
      room_changes: changes.length ? changes : undefined,
    });
    if (parsed.success) entries.push(parsed.data);
    else dropped++;
  }
  return { entries, dropped };
}

export class NoVisionModel extends Error {}

export async function extractTimetable(image: Uint8Array, mediaType: string, termId?: string) {
  const termStart = calendar.terms.find((t) => t.id === termId)?.start;
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
      return cleanEntries(output.entries, termStart);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

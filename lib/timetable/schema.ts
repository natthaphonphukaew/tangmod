import { z } from "zod";
import { Day } from "@/lib/data/schemas";

/*
 * ตารางเรียนส่วนตัวของนักศึกษา (อ่านจากรูปด้วย AI แล้วให้ผู้ใช้ตรวจแก้ หรือกรอกเอง)
 * ไม่เก็บชื่ออาจารย์และข้อมูลตัวบุคคล เก็บแค่วิชา วัน เวลา ห้อง
 */

export const isoDate = z.iso.date();
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "เวลาต้องเป็น HH:MM");

export const TimetableEntry = z
  .object({
    /** รหัสวิชา เช่น DSI122 */
    code: z.string().trim().min(1).max(20),
    /** ชื่อวิชาหรือคำอธิบายสั้น ถ้าตารางมี */
    name: z.string().trim().max(80).optional(),
    day: Day,
    start: hhmm,
    end: hhmm,
    /** ห้องเรียนตามที่ตารางเขียน เช่น CB2306, LX11/1-2 */
    room: z.string().trim().max(40).optional(),
    /** หมายเหตุ เช่น สัปดาห์ที่ 9 เป็นต้นไปย้ายห้อง */
    note: z.string().trim().max(160).optional(),
    /** ย้ายห้องระหว่างภาค: ตั้งแต่วันที่ from เรียนห้อง room (ก่อนหน้านั้นใช้ room ด้านบน) */
    room_changes: z
      .array(z.object({ from: isoDate, room: z.string().trim().min(1).max(40) }))
      .max(4)
      .optional(),
  })
  .refine((e) => e.start < e.end, { message: "เวลาเริ่มต้องก่อนเวลาจบ", path: ["end"] });
export type TimetableEntry = z.infer<typeof TimetableEntry>;

export const Timetable = z.object({
  v: z.literal(1),
  /** ภาคการศึกษาใน content/calendar.json เช่น 1-2569 */
  term_id: z.string().max(20),
  entries: z.array(TimetableEntry).max(40),
  updated_at: z.number().int(),
});
export type Timetable = z.infer<typeof Timetable>;

export const DAY_TH: Record<Day, string> = {
  mon: "จันทร์",
  tue: "อังคาร",
  wed: "พุธ",
  thu: "พฤหัสบดี",
  fri: "ศุกร์",
  sat: "เสาร์",
  sun: "อาทิตย์",
};
export const DAY_ORDER: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const sortEntries = (entries: TimetableEntry[]) =>
  [...entries].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start));

/** ห้องที่ใช้จริงในวันนั้น (คิดการย้ายห้องระหว่างภาคแล้ว) */
export function roomOn(entry: TimetableEntry, iso: string): string | undefined {
  const change = [...(entry.room_changes ?? [])].sort((a, b) => a.from.localeCompare(b.from)).filter((c) => c.from <= iso).at(-1);
  return change?.room ?? entry.room;
}

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start < b.end && b.start < a.end;

/** คาบที่เวลาชนกันในวันเดียวกันของตารางรายสัปดาห์ เช่น "พุธ DSI122 กับ DSI210" */
export function weeklyConflicts(entries: TimetableEntry[]): { day: TimetableEntry["day"]; a: TimetableEntry; b: TimetableEntry }[] {
  const out: { day: TimetableEntry["day"]; a: TimetableEntry; b: TimetableEntry }[] = [];
  entries.forEach((a, i) =>
    entries.slice(i + 1).forEach((b) => {
      if (a.day === b.day && overlaps(a, b)) out.push({ day: a.day, a, b });
    }),
  );
  return out;
}

export { overlaps as timesOverlap };

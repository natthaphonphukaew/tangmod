import { academicEvents, admissionEvents, calendar, holidays } from "@/lib/data";
import type { AcademicEventKind, Day, Tier } from "@/lib/data/schemas";

/*
 * ปฏิทินนักศึกษา: รวมวันสำคัญจาก 4 แหล่งเป็นรายการเดียว
 *   calendar.json        วันเปิด-ปิดภาค (milestone ของไฟล์นี้ซ้ำกับ academic-events จึงไม่ใช้)
 *   academic-events      ลงทะเบียน จ่ายเงิน ถอน สอบ เรียนชดเชย ประกาศเกรด วันหยุดของ มจธ. ปี 2570
 *   holidays.json        วันหยุดราชการปี 2569
 *   admission/tcas70     กำหนดการรับสมัคร TCAS70
 * วันที่เป็นสตริง YYYY-MM-DD ทั้งหมด เทียบกันด้วย < > ได้ตรง ๆ ไม่ต้องแปลงเป็น Date
 */

export type CalendarKind = AcademicEventKind | "term" | "admission";

export type CalendarEvent = {
  id: string;
  kind: CalendarKind;
  title: string;
  start: string;
  end: string;
  note?: string;
  followsDay?: Day;
  tier: Tier;
  url?: string;
};

/** ป้ายของแต่ละชนิด เรียงตามลำดับที่แสดงในตัวกรอง */
export const KIND_LABEL: Record<CalendarKind, string> = {
  term: "เปิด-ปิดภาค",
  register: "ลงทะเบียน",
  pay: "จ่ายเงิน",
  withdraw: "ถอน W",
  exam: "สอบ",
  holiday: "วันหยุด",
  makeup: "เรียนชดเชย",
  grade: "ประกาศเกรด",
  admission: "รับสมัคร TCAS",
  activity: "กิจกรรม",
  other: "อื่น ๆ",
};

export const ALL_KINDS = Object.keys(KIND_LABEL) as CalendarKind[];

let cache: CalendarEvent[] | undefined;

export function allEvents(): CalendarEvent[] {
  if (cache) return cache;
  const events: CalendarEvent[] = [];
  for (const t of calendar.terms) {
    events.push({ id: `term-${t.id}-start`, kind: "term", title: `เปิดภาค ${t.label}`, start: t.start, end: t.start, tier: calendar.tier, url: calendar.source_url });
    events.push({ id: `term-${t.id}-end`, kind: "term", title: `วันสุดท้ายของ${t.label}`, start: t.end, end: t.end, tier: calendar.tier, url: calendar.source_url });
  }
  for (const e of academicEvents.events) {
    events.push({ id: e.id, kind: e.kind, title: e.title, start: e.start, end: e.end, note: e.note, followsDay: e.follows_day, tier: academicEvents.tier, url: academicEvents.source_url });
  }
  for (const h of holidays.holidays) {
    events.push({ id: `holiday-${h.date}`, kind: "holiday", title: h.label, start: h.date, end: h.date, tier: holidays.tier, url: holidays.source_url });
  }
  for (const e of admissionEvents) {
    events.push({ id: `tcas-${e.id}`, kind: "admission", title: `TCAS70 รอบ ${e.round}: ${e.title}`, start: e.start, end: e.end, note: e.conflict_note, tier: e.tier, url: e.source_url });
  }
  cache = events.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.id.localeCompare(b.id));
  return cache;
}

const covers = (e: CalendarEvent, iso: string) => e.start <= iso && iso <= e.end;

export function eventsOn(iso: string, events = allEvents()): CalendarEvent[] {
  return events.filter((e) => covers(e, iso));
}

/** รายการที่มีบางวันอยู่ในเดือนนี้ (month เริ่มที่ 1) */
export function eventsInMonth(year: number, month: number, events = allEvents()): CalendarEvent[] {
  const first = isoOf(year, month, 1);
  const last = isoOf(year, month, daysInMonth(year, month));
  return events.filter((e) => e.start <= last && e.end >= first);
}

/** รายการที่ยังไม่จบ เรียงตามวันเริ่ม (ที่กำลังเกิดอยู่มาก่อน) */
export function upcoming(today: string, n: number, kinds?: CalendarKind[], events = allEvents()): CalendarEvent[] {
  return events.filter((e) => e.end >= today && (!kinds || kinds.includes(e.kind))).slice(0, n);
}

// ---------- วันที่ ----------

const pad = (n: number) => String(n).padStart(2, "0");
export const isoOf = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const DAY_KEYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const dayOf = (iso: string): Day => DAY_KEYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ตารางเดือนแบบเริ่มวันจันทร์: แถวละ 7 ช่อง ช่องที่ไม่ใช่วันในเดือนเป็น null */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(isoOf(year, month, d));
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/** เดือนของปีการศึกษา: ตั้งแต่เดือนที่ภาคแรกเปิดถึงเดือนที่ภาคสุดท้ายปิด */
export function academicMonths(): { year: number; month: number }[] {
  const [sy, sm] = calendar.terms[0].start.split("-").map(Number);
  const [ey, em] = calendar.terms.at(-1)!.end.split("-").map(Number);
  const out: { year: number; month: number }[] = [];
  let [y, m] = [sy, sm];
  while (y < ey || (y === ey && m <= em)) {
    out.push({ year: y, month: m });
    [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1];
  }
  return out;
}

// ---------- สถานะของวัน ----------

export type DayStatus = {
  tone: "holiday" | "exam" | "makeup" | "class" | "weekend" | "break";
  text: string;
  termId?: string;
  /** วันเรียนชดเชย: เรียนตามตารางของวันไหน */
  followsDay?: Day;
};

/** วันนี้เป็นวันแบบไหนสำหรับนักศึกษา ป.ตรี (ใช้กับการ์ดวันนี้และการกางคาบเรียน) */
export function dayStatus(iso: string, events = allEvents()): DayStatus {
  const on = eventsOn(iso, events);
  const term = calendar.terms.find((t) => t.start <= iso && iso <= t.end);
  const holiday = on.find((e) => e.kind === "holiday");
  if (holiday) return { tone: "holiday", text: `วันหยุด: ${holiday.title}`, termId: term?.id };
  const noClass = on.find((e) => e.kind === "activity" && e.title.includes("งดเรียน"));
  if (noClass) return { tone: "holiday", text: noClass.title, termId: term?.id };
  if (!term) return { tone: "break", text: "ปิดภาคเรียน" };
  const makeup = on.find((e) => e.kind === "makeup");
  if (makeup) return { tone: "makeup", text: makeup.title, termId: term.id, followsDay: makeup.followsDay };
  const exam = on.find((e) => e.kind === "exam");
  if (exam) return { tone: "exam", text: `${exam.title} (งดการสอนปกติ)`, termId: term.id };
  const day = dayOf(iso);
  if (day === "sat" || day === "sun") return { tone: "weekend", text: "วันหยุดสุดสัปดาห์", termId: term.id };
  return { tone: "class", text: `เรียนปกติ ${term.label}`, termId: term.id };
}

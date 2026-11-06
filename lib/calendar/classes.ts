import { calendar, places } from "@/lib/data";
import { findRooms } from "@/lib/map/rooms";
import type { Timetable, TimetableEntry } from "@/lib/timetable/schema";
import { allEvents, dayOf, dayStatus, type DayStatus } from "./events";

/*
 * กางตารางเรียนรายสัปดาห์ลงวันจริงของภาค
 *   วันหยุด / ไหว้ครู      → คาบของวันนั้นงด
 *   ช่วงสอบกลางภาค/ปลายภาค → คาบปกติงด (ปฏิทินบอกว่างดการสอนปกติ)
 *   วันเสาร์เรียนชดเชย      → มีคาบของวันที่ปฏิทินบอกว่าชดเชยให้ (ถ้าไม่บอก ให้ถามอาจารย์)
 *   นอกช่วงภาคของตาราง      → ไม่มีคาบ
 */

export type ClassSlot = { entry: TimetableEntry; cancelled?: string; makeup?: boolean };
export type ClassDay = { status: DayStatus; slots: ClassSlot[]; note?: string };

export function classesOn(iso: string, timetable: Timetable | null | undefined, events = allEvents()): ClassDay {
  const status = dayStatus(iso, events);
  const term = timetable && calendar.terms.find((t) => t.id === timetable.term_id);
  if (!timetable || !term || iso < term.start || iso > term.end) return { status, slots: [] };

  const byStart = (a: ClassSlot, b: ClassSlot) => a.entry.start.localeCompare(b.entry.start);
  const own = timetable.entries.filter((e) => e.day === dayOf(iso));

  if (status.tone === "holiday") return { status, slots: own.map((entry) => ({ entry, cancelled: status.text })) };
  if (status.tone === "exam") return { status, slots: own.map((entry) => ({ entry, cancelled: "ช่วงสอบ งดการสอนปกติ" })) };
  if (status.tone === "makeup") {
    const extra = status.followsDay ? timetable.entries.filter((e) => e.day === status.followsDay) : [];
    const slots = [...own.map((entry) => ({ entry })), ...extra.map((entry) => ({ entry, makeup: true }))].sort(byStart);
    const note = status.followsDay ? undefined : "วันนี้เป็นวันเรียนชดเชย แต่ปฏิทินไม่ได้บอกว่าชดเชยของวันไหน ถามอาจารย์ผู้สอน";
    return { status, slots, note };
  }
  return { status, slots: own.map((entry) => ({ entry })).sort(byStart) };
}

/** ห้องเรียน → รหัสสถานที่บนแผนที่: ห้อง CB อ่านจากเลขห้อง · อย่างอื่นเทียบชื่อย่อตึก เช่น "LX11/1-2" → ตึก LX */
export function roomPlaceId(room: string | undefined): string | undefined {
  if (!room) return undefined;
  const cb = findRooms(room)[0];
  if (cb) return cb.placeId;
  const token = room.trim().toUpperCase().match(/^[A-Z]+/)?.[0];
  if (!token || token === "CB") return undefined;
  return places.find((p) => p.short?.toUpperCase() === token)?.id;
}

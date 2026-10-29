import { placeById } from "@/lib/data";

/*
 * เลขห้องอาคารเรียนรวม: CB + เลขตึก + เลขชั้น + เลขห้อง 2 หลัก เช่น CB2301 = CB2 ชั้น 3 ห้อง 01
 * กติกานี้ผู้ใช้ยืนยันแล้ว และตรงกับคลินิก "ห้อง 2101" ที่อยู่ชั้น 1 ของ CB2
 * แต่คู่ CB ↔ รหัสตึกในผัง (N/S) อนุมานจากชื่อตึก ⚠ ยังต้องตรวจซ้ำ (docs/research/kmutt-facts.md, DATA_STATUS)
 */
const CB_TO_PLACE: Record<string, string> = { "1": "N20", "2": "N17", "3": "S13", "4": "S12", "5": "S11" };

export type Room = {
  /** เขียนแบบมาตรฐาน เช่น "CB2301" */
  code: string;
  building: string;
  placeId: string;
  floor: number;
  room: string;
};

// รับได้ทั้ง "CB2301", "cb 2301", "CB2 301", "CB2-301"
const ROOM_RE = /\bCB\s*([1-5])\s*[-–]?\s*(\d{1,2})(\d{2})\b/gi;

export function findRooms(text: string): Room[] {
  const rooms: Room[] = [];
  for (const m of text.matchAll(ROOM_RE)) {
    const [, b, floorStr, room] = m;
    const floor = Number(floorStr);
    const placeId = CB_TO_PLACE[b];
    if (!floor || !placeId || !placeById.has(placeId)) continue;
    const code = `CB${b}${floor}${room}`;
    if (!rooms.some((r) => r.code === code)) rooms.push({ code, building: `CB${b}`, placeId, floor, room });
  }
  return rooms;
}

export const parseRoom = (text: string): Room | undefined => findRooms(text)[0];

/** ประโยคอธิบายห้องสำหรับใส่ใน CONTEXT ของ LLM */
export function describeRoom(r: Room): string {
  const place = placeById.get(r.placeId)!;
  return `ห้อง ${r.code} อยู่ที่${place.name_th} (${r.building}, รหัสตึกในแผนที่ ${r.placeId}) ชั้น ${r.floor} ห้อง ${r.room} — อ่านจากเลขห้องตามกติกา CB + ตึก + ชั้น + ห้อง (ให้บอกผู้ใช้ว่า "อ่านจากเลขห้อง" ไม่ใช่รีวิวรุ่นพี่)`;
}

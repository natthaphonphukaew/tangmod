"use client";

import {
  Barbell,
  Bed,
  CalendarBlank,
  CalendarCheck,
  ChatCircleText,
  Coins,
  Exam,
  ForkKnife,
  GraduationCap,
  IdentificationCard,
  MapPin,
  Moon,
  Train,
  type Icon,
} from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";
import { assistant } from "@/lib/data";

/*
 * คำถามตัวอย่างหน้าแรก: ไอคอน + คำอธิบายสั้นต่อคำถาม (ข้อมูลหน้าตาอย่างเดียว คำถามจริงอยู่ใน content/assistant.json)
 * คำถามที่ไม่มีในตารางนี้ยังแสดงได้ ใช้ไอคอนแชทและไม่มีคำอธิบาย
 */

type Tone = "orange" | "yellow" | "green" | "blue";
export type ChipMeta = { icon: Icon; tone: Tone; tags: string };

const META: Record<string, ChipMeta> = {
  "คอมวิศวะ กับ CS ต่างกันยังไง": { icon: GraduationCap, tone: "green", tags: "เปรียบเทียบสาขา · ค่าเทอม · อาชีพ" },
  "TCAS70 รอบไหนยังเปิดอยู่": { icon: CalendarCheck, tone: "blue", tags: "รอบสมัคร · วันปิดรับ" },
  "ค่าเทอม IT CS DSI เท่าไหร่": { icon: Coins, tone: "yellow", tags: "เหมาจ่าย · ต่อหน่วยกิต" },
  "หอในค่าห้องเดือนละเท่าไหร่": { icon: Bed, tone: "orange", tags: "หอพักในมอ · ค่าน้ำไฟ" },
  "มาบางมดยังไงจาก BTS": { icon: Train, tone: "blue", tags: "รถเมล์ · การเดินทาง" },
  "โรงอาหารมีร้านฮาลาลไหม": { icon: ForkKnife, tone: "green", tags: "โรงอาหาร KFC · ร้านในมอ" },
  "CB2301 อยู่ตรงไหน": { icon: MapPin, tone: "orange", tags: "อ่านเลขห้อง · ตึก · ชั้น" },
  "ตี 1 อ่านหนังสือที่ไหนได้": { icon: Moon, tone: "blue", tags: "ที่อ่านหนังสือ · เปิด 24 ชม." },
  "สอบปลายภาคเริ่มวันไหน": { icon: Exam, tone: "yellow", tags: "ปฏิทินการศึกษา" },
  "ยิมมอเปิดกี่โมง": { icon: Barbell, tone: "green", tags: "เวลาเปิด · ข้อมูลรุ่นพี่" },
  "บัตรนักศึกษาหายทำยังไง": { icon: IdentificationCard, tone: "orange", tags: "ทำบัตรใหม่ · เบอร์ติดต่อ" },
  "เดือนนี้มอหยุดวันไหนบ้าง": { icon: CalendarBlank, tone: "yellow", tags: "วันหยุดราชการ" },
};

export const chipMeta = (chip: string): ChipMeta => META[chip] ?? { icon: ChatCircleText, tone: "orange", tags: "" };

/** พื้นวงกลมไอคอน + สีไอคอน (ทุกคู่ ≥3:1 ตามเกณฑ์ไอคอน WCAG 1.4.11) */
export const TONE_CLASS: Record<Tone, string> = {
  orange: "bg-brand-tint text-brand-ink",
  yellow: "bg-trail-tint text-[#8a5a00]",
  green: "bg-[#e3f1e6] text-ok",
  blue: "bg-[#e3eef8] text-[#1f5f99]",
};

/*
 * สุ่ม 6 จากทั้งหมด ครั้งแรกตอนโหลดหน้า และสุ่มใหม่ได้ด้วยปุ่ม
 * สุ่มใน render ตรง ๆ ไม่ได้: HTML จาก server จะไม่ตรงกับเบราว์เซอร์ จึงอ่านผ่าน useSyncExternalStore
 * ที่ฝั่ง server คืน null (เว้นที่ไว้) แล้วเบราว์เซอร์ค่อยใส่ชุดที่สุ่ม
 */
export const CHIPS_SHOWN = 6;
let picked: string[] | null = null;
const listeners = new Set<() => void>();

function shuffle(previous: string[] | null) {
  const pool = [...assistant.starter_chips];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // สุ่มใหม่ให้เห็นคำถามที่ยังไม่ได้เห็นก่อน
  if (previous) pool.sort((a, b) => Number(previous.includes(a)) - Number(previous.includes(b)));
  return pool.slice(0, CHIPS_SHOWN);
}

const getPicked = () => (picked ??= shuffle(null));
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function reshuffleChips() {
  picked = shuffle(picked);
  for (const cb of listeners) cb();
}

export const useStarterChips = () => useSyncExternalStore(subscribe, getPicked, () => null);

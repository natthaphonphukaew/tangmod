"use client";

import {
  Barbell,
  Bed,
  Buildings,
  CalendarBlank,
  CalendarCheck,
  ChatCircleText,
  Coins,
  Envelope,
  Exam,
  Flask,
  ForkKnife,
  GraduationCap,
  HouseLine,
  IdentificationCard,
  MapPin,
  Moon,
  PersonSimpleWalk,
  Train,
  UsersThree,
  Van,
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
  "ยิมในมออยู่ไหน เปิดกี่โมง": { icon: Barbell, tone: "green", tags: "ตึก 190 ปี ชั้น 1 · เวลาเปิด" },
  "คณะครุอยู่ตึกไหน": { icon: Buildings, tone: "orange", tags: "คณะครุศาสตร์ฯ · CB3 ชั้น 2" },
  "บัตรนักศึกษาหายทำยังไง": { icon: IdentificationCard, tone: "orange", tags: "ทำบัตรใหม่ · เบอร์ติดต่อ" },
  "เดือนนี้มอหยุดวันไหนบ้าง": { icon: CalendarBlank, tone: "yellow", tags: "วันหยุดราชการ" },  "คณะวิทย์อยู่ตึกไหน": { icon: Flask, tone: "green", tags: "คณะวิทยาศาสตร์ · ตึกภาควิชา" },
  "คณะสถาปัตย์อยู่บางมดไหม": { icon: Buildings, tone: "blue", tags: "วิทยาเขตบางขุนเทียน" },
  "ไปรษณีย์ในมออยู่ไหน": { icon: Envelope, tone: "orange", tags: "อาคารจอดรถ S2 · เวลาเปิด" },
  "จากหอสมุดเดินไปโรงอาหาร KFC ยังไง": { icon: PersonSimpleWalk, tone: "orange", tags: "เส้นทางเดินบนแผนที่" },
  "รถ shuttle ไปบางขุนเทียนขึ้นตรงไหน": { icon: Van, tone: "blue", tags: "จุดขึ้นรถ · ค่ารถ" },
  "หาหอนอกใกล้มอได้ที่ไหน": { icon: HouseLine, tone: "orange", tags: "หอนอก · กลุ่มหาหอ" },
  "ชมรมในมอมีอะไรบ้าง สมัครยังไง": { icon: UsersThree, tone: "blue", tags: "ชมรมทุกประเภท · วิธีสมัคร" },
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
 * คำถามที่พบบ่อย: สุ่ม 6 จากทั้งหมดทุกครั้งที่โหลดหน้า (ไม่มีปุ่มสุ่มใหม่)
 * สุ่มใน render ตรง ๆ ไม่ได้: HTML จาก server จะไม่ตรงกับเบราว์เซอร์ จึงอ่านผ่าน useSyncExternalStore
 * ที่ฝั่ง server คืน null (เว้นที่ไว้) แล้วเบราว์เซอร์ค่อยใส่ชุดที่สุ่ม
 */
export const CHIPS_SHOWN = 6;
let picked: string[] | null = null;

function shuffle() {
  const pool = [...assistant.starter_chips];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, CHIPS_SHOWN);
}

const getPicked = () => (picked ??= shuffle());
// ชุดที่สุ่มไม่เปลี่ยนระหว่างเปิดหน้า จึงไม่ต้องแจ้งใคร
const subscribe = () => () => {};

export const useStarterChips = () => useSyncExternalStore(subscribe, getPicked, () => null);

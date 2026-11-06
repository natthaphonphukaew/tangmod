"use client";

import { useSyncExternalStore } from "react";
import { bangkokDate } from "@/lib/time";

/*
 * วันนี้ (เวลากรุงเทพ) แบบ YYYY-MM-DD สำหรับ client component
 * HTML จาก server ไม่ควรมีวันที่ (หน้าอาจถูก cache ข้ามวัน) จึงคืน null ตอน render ฝั่ง server แล้วเบราว์เซอร์ค่อยใส่
 */
const subscribe = () => () => {};
const getToday = () => bangkokDate(new Date());

export const useToday = (): string | null => useSyncExternalStore(subscribe, getToday, () => null);

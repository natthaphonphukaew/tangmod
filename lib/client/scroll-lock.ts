"use client";

import { useEffect } from "react";

/*
 * ล็อกการเลื่อนหน้าข้างหลังตอนเปิด popup (กล่องรายละเอียด ตารางเทียบ การตั้งค่า เมนูมือถือ)
 * แอปนี้ไม่ได้เลื่อนที่ body แต่เลื่อนในกล่องด้านใน (แชท ปฏิทิน เข็มทิศ ประวัติแชท) ล็อก body อย่างเดียวจึงไม่พอ
 *   กล่องที่เลื่อนได้ติด data-app-scroll · ตอนล็อกใส่ data-scroll-locked ที่ <html>
 *   CSS ใน globals.css ปิดการเลื่อนของกล่องเหล่านั้น ยกเว้นกล่องที่อยู่ใน popup เอง ([data-popup])
 * นับจำนวน popup ที่เปิดซ้อนกัน ปิดตัวบนสุดแล้วหน้าข้างหลังยังล็อกอยู่จนปิดครบ
 */

let locks = 0;

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    if (locks++ === 0) html.setAttribute("data-scroll-locked", "");
    return () => {
      if (--locks === 0) html.removeAttribute("data-scroll-locked");
    };
  }, [active]);
}

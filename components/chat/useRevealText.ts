"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * ค่อย ๆ แสดงข้อความตามที่ไหลเข้ามา (แบบแชท AI ทั่วไป)
 * gateway ของ SIT มักส่งคำตอบมาเป็นก้อนใหญ่ทีเดียว ถ้าแสดงทันทีข้อความจะ "เด้ง" ขึ้นมาทั้งย่อหน้า
 * จึงไล่ตามความยาวจริงทีละจังหวะ ยิ่งค้างเยอะยิ่งเร็ว (คำตอบทั่วไปแสดงครบในราว 1 วินาที)
 *
 * animate=false (เช่น แชทเก่าที่โหลดจากประวัติ) หรือผู้ใช้ตั้งลดการเคลื่อนไหว → แสดงทั้งหมดทันที
 */
export function useRevealText(text: string, animate: boolean): { shown: string; revealing: boolean } {
  const reduceMotion = useReducedMotion();
  const instant = !animate || reduceMotion;
  const [count, setCount] = useState(() => (instant ? text.length : 0));

  useEffect(() => {
    if (instant || count >= text.length) return;
    // ใช้ setTimeout ไม่ใช่ requestAnimationFrame: rAF หยุดเมื่อแท็บถูกซ่อน ข้อความจะค้างว่างจนผู้ใช้กลับมา
    // แท็บถูกซ่อนอยู่ = แสดงทั้งหมดทันที (ไม่มีใครดูแอนิเมชันอยู่แล้ว)
    const id = setTimeout(
      () =>
        setCount((n) =>
          document.hidden ? text.length : Math.min(text.length, n + Math.max(2, Math.ceil((text.length - n) / 24))),
        ),
      16,
    );
    return () => clearTimeout(id);
  }, [instant, count, text.length]);

  const visible = instant ? text.length : Math.min(count, text.length);
  return { shown: text.slice(0, visible), revealing: visible < text.length };
}

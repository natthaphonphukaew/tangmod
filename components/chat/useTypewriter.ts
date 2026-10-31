"use client";

import { useEffect, useState } from "react";

const TYPE_MS = 70;
const DELETE_MS = 28;
const HOLD_MS = 1800;
const NEXT_MS = 450;

/**
 * พิมพ์ทีละตัวแล้วลบ วนสุ่มประโยคไปเรื่อย ๆ (ใช้เป็นตัวอย่างคำถามในช่องพิมพ์)
 * ตัดตาม grapheme ไม่ใช่ตัวอักษร: สระบน/ล่างและวรรณยุกต์จะโผล่พร้อมพยัญชนะ ไม่ลอยอยู่ตัวเดียว
 * active = false (ผู้ใช้กำลังพิมพ์ หรือตั้งลดการเคลื่อนไหว) → หยุดและคืนประโยคแรกเต็ม ๆ
 */
export function useTypewriter(phrases: readonly string[], active: boolean): string {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!active || phrases.length === 0) return;
    const graphemes = new Intl.Segmenter("th", { granularity: "grapheme" });
    let last = -1;
    const pick = () => {
      let i = Math.floor(Math.random() * phrases.length);
      if (phrases.length > 1 && i === last) i = (i + 1) % phrases.length;
      last = i;
      return [...graphemes.segment(phrases[i])].map((g) => g.segment);
    };

    let chars = pick();
    let shown = 0;
    let typing = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (typing) {
        shown++;
        setText(chars.slice(0, shown).join(""));
        if (shown >= chars.length) {
          typing = false;
          timer = setTimeout(tick, HOLD_MS);
        } else timer = setTimeout(tick, TYPE_MS + Math.random() * 60);
      } else {
        shown--;
        setText(chars.slice(0, shown).join(""));
        if (shown <= 0) {
          typing = true;
          chars = pick();
          timer = setTimeout(tick, NEXT_MS);
        } else timer = setTimeout(tick, DELETE_MS);
      }
    };
    timer = setTimeout(tick, NEXT_MS);
    return () => clearTimeout(timer);
  }, [active, phrases]);

  return active ? text : (phrases[0] ?? "");
}

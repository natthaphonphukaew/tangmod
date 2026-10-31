import Image, { type StaticImageData } from "next/image";
import cheer from "./art/cheer.webp";
import laptop from "./art/laptop.webp";
import logo from "./art/logo.webp";
import peace from "./art/peace.webp";
import think from "./art/think.webp";
import thumbs from "./art/thumbs.webp";
import wave from "./art/wave.webp";

/*
 * น้องมดสีส้ม (สี CI มจธ.) — 6 ท่า จากภาพที่เจ้าของโปรเจกต์สร้าง (ตัดพื้นหลัง ลบโลโก้ Apple บนแท็บเล็ต/โน้ตบุ๊ก
 * ย่อให้สูง 640px พอสำหรับจอความละเอียดสูง) · ท่า think เก็บขอบสติกเกอร์ไว้เพราะกล่อง "..." ติดกับขอบ
 * โลโก้ = น้องมดท่ายกแขน (หันตรง สมมาตร อ่านออกแม้เหลือ 16px) ตัดเป็นวงกลมเหลืองอ่อน
 * ไอคอนแท็บและไอคอนมือถืออยู่ที่ app/icon.png, app/apple-icon.png (ทำจากไฟล์เดียวกัน)
 */

const POSES = { wave, laptop, peace, cheer, thumbs, think } satisfies Record<string, StaticImageData>;
export type AntPose = keyof typeof POSES;

/**
 * ภาพน้องมดทั้งตัว (ตกแต่ง ไม่มีข้อความสำคัญ จึงซ่อนจาก screen reader)
 * sizes = ความกว้างที่แสดงจริง ให้ next/image เลือกไฟล์เล็กพอดี (ไม่บอกจะโหลด 640px แม้แสดงแค่ 60px)
 */
export function AntMascot({
  pose = "wave",
  className,
  priority = false,
  sizes = "96px",
}: {
  pose?: AntPose;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return <Image src={POSES[pose]} alt="" aria-hidden priority={priority} sizes={sizes} className={`select-none ${className ?? ""}`} draggable={false} />;
}

/** โลโก้หัวน้องมดในวงกลม สำหรับแถบซ้าย ข้อความในแชท และการ์ด */
export function AntAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src={logo}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`shrink-0 rounded-full select-none ${className}`}
      draggable={false}
    />
  );
}

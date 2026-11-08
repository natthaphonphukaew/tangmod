"use client";

/*
 * สลับหน้าในแอป (แชท ↔ ปฏิทิน ↔ เข็มทิศ) โดยไม่โหลดหน้าใหม่: แอปทั้งหมดอยู่ใน TangmodApp ตัวเดียว
 * แถบซ้าย แชทที่พิมพ์ค้าง และแผนที่จึงไม่หาย · Next ซิงก์ pushState กับ usePathname ให้ ปุ่ม back ใช้ได้
 */
export type AppPath = "/" | "/calendar" | "/compass";

export function navigate(path: AppPath) {
  if (window.location.pathname !== path) window.history.pushState(null, "", path);
}

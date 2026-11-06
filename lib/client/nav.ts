"use client";

/*
 * สลับหน้าในแอป (แชท ↔ ปฏิทิน) โดยไม่โหลดหน้าใหม่: แอปทั้งหมดอยู่ใน TangmodApp ตัวเดียว
 * แถบซ้าย แชทที่พิมพ์ค้าง และแผนที่จึงไม่หาย · Next ซิงก์ pushState กับ usePathname ให้ ปุ่ม back ใช้ได้
 */
export function navigate(path: "/" | "/calendar") {
  if (window.location.pathname !== path) window.history.pushState(null, "", path);
}

import type { KeyboardEvent } from "react";

/** Tab วนอยู่ในกล่องที่เปิดอยู่ (dialog / drawer) ไม่หลุดไปข้างหลัง */
export function trapTab(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], textarea, input, [tabindex='0']")];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

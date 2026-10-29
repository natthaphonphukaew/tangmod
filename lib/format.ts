import type { Fee } from "./data/schemas";

export const baht = (n: number) => n.toLocaleString("th-TH");

/** ค่าเทอมต่อเทอมแบบอ่านเร็ว: เหมาจ่ายใช้ตัวเลขเดียว แบบต่อหน่วยกิตใช้ค่ายืนยันสิทธิ์ (≈ เทอมแรก) */
export function feePerTerm(fee: Fee): { amount: number; note: string } {
  if (fee.model === "flat") return { amount: fee.per_semester, note: "เหมาจ่ายต่อเทอม" };
  if (fee.confirm_fee) return { amount: fee.confirm_fee, note: `เทอมแรก (${baht(fee.base)} + ${baht(fee.per_credit)}/หน่วยกิต)` };
  return { amount: fee.base, note: `+ ${baht(fee.per_credit)} บาท/หน่วยกิต` };
}

const isoBangkok = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);

export function daysUntil(iso: string, now: Date) {
  return Math.round((Date.parse(iso) - Date.parse(isoBangkok(now))) / 86_400_000);
}

export function formatRange(start: string, end: string) {
  const f = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  return start === end ? f.format(new Date(start)) : `${f.format(new Date(start))} – ${f.format(new Date(end))}`;
}

import type { CalendarKind } from "@/lib/calendar/events";

/** สีของแต่ละชนิดวันสำคัญ: dot = จุด/แถบในตาราง · chip = พื้นป้ายในรายการ (ตัวหนังสือสีเข้มบนพื้นอ่อน) */
export const KIND_STYLE: Record<CalendarKind, { dot: string; chip: string }> = {
  term: { dot: "bg-ink", chip: "bg-paper-deep text-ink" },
  register: { dot: "bg-brand", chip: "bg-brand-tint text-brand-deep" },
  pay: { dot: "bg-[#b45309]", chip: "bg-[#fdebc8] text-[#7c3a06]" },
  withdraw: { dot: "bg-[#7c4dce]", chip: "bg-[#eee6fb] text-[#4c2a8c]" },
  exam: { dot: "bg-[#d6336c]", chip: "bg-[#fde3ec] text-[#8f1d45]" },
  holiday: { dot: "bg-ok", chip: "bg-[#dcefe2] text-ok" },
  makeup: { dot: "bg-trail", chip: "bg-trail-tint text-[#6b4b00]" },
  grade: { dot: "bg-[#2f7fb5]", chip: "bg-[#dcecf7] text-[#1d4f73]" },
  admission: { dot: "bg-slate", chip: "bg-[#e8eaed] text-[#3d4249]" },
  activity: { dot: "bg-park-deep", chip: "bg-[#e7edd9] text-[#4a5a2f]" },
  other: { dot: "bg-line-strong", chip: "bg-paper-deep text-ink-soft" },
};

import {
  ArrowUUpLeft,
  ArrowsClockwise,
  ChartBar,
  Tag,
  Exam,
  Flag,
  PencilLine,
  Student,
  TreePalm,
  UsersThree,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import type { CalendarKind } from "@/lib/calendar/events";

/** สีของแต่ละชนิดวันสำคัญ: dot = จุด/แถบในตาราง · chip = พื้นป้ายในรายการ (ตัวหนังสือสีเข้มบนพื้นอ่อน) */
export const KIND_STYLE: Record<CalendarKind, { dot: string; chip: string; text: string }> = {
  term: { dot: "bg-ink", chip: "bg-paper-deep text-ink", text: "text-ink" },
  register: { dot: "bg-brand", chip: "bg-brand-tint text-brand-deep", text: "text-brand" },
  pay: { dot: "bg-[#b45309]", chip: "bg-[#fdebc8] text-[#7c3a06]", text: "text-[#b45309]" },
  withdraw: { dot: "bg-[#7c4dce]", chip: "bg-[#eee6fb] text-[#4c2a8c]", text: "text-[#7c4dce]" },
  exam: { dot: "bg-[#d6336c]", chip: "bg-[#fde3ec] text-[#8f1d45]", text: "text-[#d6336c]" },
  holiday: { dot: "bg-ok", chip: "bg-[#dcefe2] text-ok", text: "text-ok" },
  makeup: { dot: "bg-[#c99700]", chip: "bg-trail-tint text-[#6b4b00]", text: "text-[#a37400]" },
  grade: { dot: "bg-[#2f7fb5]", chip: "bg-[#dcecf7] text-[#1d4f73]", text: "text-[#2f7fb5]" },
  admission: { dot: "bg-slate", chip: "bg-[#e8eaed] text-[#3d4249]", text: "text-slate" },
  activity: { dot: "bg-[#5d7139]", chip: "bg-[#e7edd9] text-[#4a5a2f]", text: "text-[#4a5a2f]" },
  other: { dot: "bg-slate", chip: "bg-paper-deep text-ink-soft", text: "text-ink-soft" },
};

export const KIND_ICON: Record<CalendarKind, Icon> = {
  term: Flag,
  register: PencilLine,
  pay: Wallet,
  withdraw: ArrowUUpLeft,
  exam: Exam,
  holiday: TreePalm,
  makeup: ArrowsClockwise,
  grade: ChartBar,
  admission: Student,
  activity: UsersThree,
  other: Tag,
};

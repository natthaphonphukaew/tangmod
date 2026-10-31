"use client";

import { List, MapTrifold, NotePencil } from "@phosphor-icons/react";
import { AntAvatar } from "@/components/brand/AntMascot";

type Props = {
  /** ชื่อแชทที่เปิดอยู่ (null = หน้าแรก ไม่ต้องแสดงชื่อ) */
  title: string | null;
  mapOpen: boolean;
  onToggleMap: () => void;
  /** มือถือ และจอกลางตอนเปิดแผนที่ (sidebar ถูกซ่อน): เปิด drawer ประวัติแชท */
  onOpenHistory: () => void;
  onNew: () => void;
};

const iconButton = "grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink";

/** แถบบนของคอลัมน์แชท: ชื่อแชท + ปุ่มลัดเปิดแผนที่ (ตอนไม่มี sidebar มีโลโก้ ปุ่มประวัติและแชทใหม่ด้วย) */
export function TopBar({ title, mapOpen, onToggleMap, onOpenHistory, onNew }: Props) {
  // sidebar โชว์ตั้งแต่ lg แต่ถ้าเปิดแผนที่ต้องถึง xl (ดู TangmodApp) ปุ่มแทน sidebar ต้องซ่อนตามกัน
  const noSidebar = mapOpen ? "xl:hidden" : "lg:hidden";
  const withSidebar = mapOpen ? "max-xl:hidden" : "max-lg:hidden";
  return (
    <header className={`flex h-14 shrink-0 items-center gap-1 bg-paper px-2 lg:h-16 lg:px-5 ${title ? "border-b border-line" : ""}`}>
      <button type="button" onClick={onOpenHistory} aria-label="ประวัติแชท" className={`${iconButton} ${noSidebar}`}>
        <List size={22} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`flex items-center gap-2 ${noSidebar}`}>
          <AntAvatar size={28} />
          <span className="font-display text-lg leading-none text-ink">ทางมด</span>
        </span>
        {title && <span className={`truncate text-[15px] font-medium text-ink ${withSidebar}`}>{title}</span>}
      </div>
      <button
        type="button"
        onClick={onToggleMap}
        aria-pressed={mapOpen}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-[15px] font-medium shadow-[var(--shadow-card)] hover:border-brand/50 aria-pressed:border-brand-ink aria-pressed:bg-brand-tint aria-pressed:text-brand-ink lg:min-h-10"
      >
        <MapTrifold size={20} weight={mapOpen ? "fill" : "regular"} /> แผนที่
      </button>
      <button type="button" onClick={onNew} aria-label="แชทใหม่" className={`${iconButton} ${noSidebar}`}>
        <NotePencil size={22} />
      </button>
    </header>
  );
}

"use client";

import { List, MapTrifold, NotePencil } from "@phosphor-icons/react";

type Props = {
  title: string;
  mapOpen: boolean;
  onToggleMap: () => void;
  /** มือถือ และจอกลางตอนเปิดแผนที่ (sidebar ถูกซ่อน): เปิด drawer ประวัติแชท */
  onOpenHistory: () => void;
  onNew: () => void;
};

/** แถบบนของคอลัมน์แชท: ชื่อแชท + ปุ่มลัดเปิดแผนที่ (ตอนไม่มี sidebar มีปุ่มประวัติและแชทใหม่ด้วย) */
export function TopBar({ title, mapOpen, onToggleMap, onOpenHistory, onNew }: Props) {
  // sidebar โชว์ตั้งแต่ lg แต่ถ้าเปิดแผนที่ต้องถึง xl (ดู TangmodApp) ปุ่มแทน sidebar ต้องซ่อนตามกัน
  const noSidebar = mapOpen ? "xl:hidden" : "lg:hidden";
  const withSidebar = mapOpen ? "max-xl:hidden" : "max-lg:hidden";
  return (
    <header className="flex h-13 shrink-0 items-center gap-1.5 border-b border-line bg-paper px-2 lg:px-4">
      <button type="button" onClick={onOpenHistory} aria-label="ประวัติแชท" className={`rounded-md p-2 text-ink-soft hover:bg-paper-deep hover:text-ink ${noSidebar}`}>
        <List size={20} />
      </button>
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className={`font-display text-base ${noSidebar}`}>ทางมด</span>
        <span className={`text-ink-soft ${withSidebar}`}>{title}</span>
      </p>
      <button
        type="button"
        onClick={onToggleMap}
        aria-pressed={mapOpen}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm hover:border-brand/40 aria-pressed:border-brand/50 aria-pressed:bg-brand/10 aria-pressed:text-brand-ink"
      >
        <MapTrifold size={16} weight={mapOpen ? "fill" : "regular"} /> แผนที่
      </button>
      <button type="button" onClick={onNew} aria-label="แชทใหม่" className={`rounded-md p-2 text-ink-soft hover:bg-paper-deep hover:text-ink ${noSidebar}`}>
        <NotePencil size={20} />
      </button>
    </header>
  );
}

"use client";

import { X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { trapTab } from "@/components/ui/trap-tab";
import { useScrollLock } from "@/lib/client/scroll-lock";

/**
 * กล่องกลางจอบนคอม · เต็มจอจากล่างบนมือถือ · Esc ปิด · Tab วนในกล่อง · หน้าข้างหลังเลื่อนไม่ได้
 * render ผ่าน portal ไปที่ body: ถ้าอยู่ในกล่องที่เลื่อนได้ (เช่น หน้าเข็มทิศ) การเลื่อนบนพื้นหลังมืดจะไหลไปเลื่อนกล่องนั้น
 * ปิดแล้วคืน focus ให้ปุ่มที่กดเปิด · effect รันครั้งเดียว (onClose เก็บใน ref) focus จะไม่กระโดดตอนหน้าแม่ render ใหม่
 */
export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const reduce = useReducedMotion();
  const [opener] = useState(() => (typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)));
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useScrollLock();
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [opener]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      data-popup
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={trapTab}
        initial={reduce ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? undefined : { y: 24, opacity: 0 }}
        className={`flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[var(--radius-sheet)] bg-paper shadow-xl sm:rounded-[var(--radius-sheet)] ${wide ? "sm:max-w-5xl" : "sm:max-w-2xl"}`}
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-2">
          <p className="min-w-0 flex-1 truncate font-display text-lg text-ink">{title}</p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="ปิด" className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink">
            <X size={20} />
          </button>
        </header>
        <div data-app-scroll className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

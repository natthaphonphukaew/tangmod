"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

export type Undo = { id: number; message: string; undo: () => void };

const SHOW_MS = 6000;

/**
 * แจ้งผลการลบพร้อมปุ่มเลิกทำ (แทนการถามยืนยันก่อนลบ ซึ่งคนมักกดผ่าน)
 * อยู่กลางล่างจอ เหนือช่องพิมพ์ · screen reader อ่านข้อความผ่าน role="status"
 */
export function UndoToast({ toast, onDone }: { toast: Undo | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, pointerEvents: "none" }}
            className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink py-1.5 pr-1.5 pl-5 text-sm text-paper shadow-[var(--shadow-float)]"
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => {
                toast.undo();
                onDone();
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-semibold text-trail hover:bg-paper/10"
            >
              <ArrowCounterClockwise size={16} weight="bold" /> เลิกทำ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

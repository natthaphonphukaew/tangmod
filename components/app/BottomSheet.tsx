"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode, type RefObject } from "react";

/*
 * มือถือเมื่อเปิดแผนที่: แผนที่อยู่บน แชทเป็น bottom sheet 3 ระดับแบบ Apple Maps
 *   peek = เหลือช่องพิมพ์ · half = ครึ่งพื้นที่ (เห็นทั้งหมุดและคำตอบ) · full = อ่านยาว
 * ปิดแผนที่ (หรือจอใหญ่): mode="full" แชทเต็มพื้นที่ ไม่มีขีดจับ
 */

export type Detent = "peek" | "half" | "full";

const DESKTOP_QUERY = "(min-width: 1024px)";
const PEEK_PX = 132;

const subscribeMedia = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export const useIsDesktop = () =>
  useSyncExternalStore(subscribeMedia, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);

/** ความสูงของ element (0 ก่อนวัดได้) */
export function useElementHeight(ref: RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeight(Math.round(entry.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return height;
}

/** ความสูงของ sheet ในแต่ละระดับ เทียบกับพื้นที่ที่ sheet อยู่ (ใต้แถบบน) */
export function detentHeight(detent: Detent, areaH: number) {
  if (detent === "peek") return PEEK_PX;
  if (detent === "half") return Math.round(areaH * 0.5);
  return areaH - 48; // เหลือแผนที่ให้เห็นนิดหน่อย จะได้รู้ว่าปัดลงได้
}

type Props = {
  mode: "full" | "sheet";
  detent: Detent;
  onDetentChange: (d: Detent) => void;
  /** ความสูงพื้นที่ที่ sheet อยู่ */
  areaHeight: number;
  children: ReactNode;
};

const NEXT_ON_TAP: Record<Detent, Detent> = { peek: "half", half: "full", full: "half" };
const SPRING = { type: "spring", stiffness: 420, damping: 40 } as const;

export function BottomSheet({ mode, detent, onDetentChange, areaHeight, children }: Props) {
  const reduceMotion = useReducedMotion();
  const height = useMotionValue(0);
  const drag = useRef<{ startY: number; startH: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null);
  const sheet = mode === "sheet" && areaHeight > 0;

  // ระดับเปลี่ยน (จากการลากหรือจากแอป) → เลื่อนไปที่ความสูงนั้น
  useEffect(() => {
    if (!sheet) return;
    const target = detentHeight(detent, areaHeight);
    if (height.get() === 0 || reduceMotion) height.set(target);
    else animate(height, target, SPRING);
  }, [sheet, detent, areaHeight, reduceMotion, height]);

  const settle = () => animate(height, detentHeight(detent, areaHeight), SPRING);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startH: height.get(), lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (d.lastY - e.clientY) / dt; // px/ms, บวก = ลากขึ้น
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    if (Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    const h = d.startH + (d.startY - e.clientY);
    height.set(Math.min(detentHeight("full", areaHeight), Math.max(PEEK_PX * 0.8, h)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) return onDetentChange(NEXT_ON_TAP[detent]);
    // ปัดเร็ว ๆ ให้ไปตามทิศที่ปัด ไม่งั้นเลือกระดับที่ใกล้ที่สุด
    const projected = height.get() + d.v * 180;
    const order: Detent[] = ["peek", "half", "full"];
    const nearest = order.reduce((best, cur) =>
      Math.abs(detentHeight(cur, areaHeight) - projected) < Math.abs(detentHeight(best, areaHeight) - projected) ? cur : best,
    );
    if (nearest === detent) settle();
    else onDetentChange(nearest);
  };

  // ใช้ element ชุดเดิมทั้งสองโหมด แชทข้างในจะได้ไม่ mount ใหม่ (ข้อความที่พิมพ์ค้างและตำแหน่ง scroll ไม่หาย)
  return (
    <motion.div
      style={{ height: sheet ? height : "auto" }}
      className={
        sheet
          ? "absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[20px] border-t border-line bg-paper shadow-[0_-8px_24px_-12px_rgba(30,26,22,0.25)]"
          : "relative flex min-h-0 min-w-0 flex-1 flex-col"
      }
    >
      <div
        hidden={!sheet}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          settle();
        }}
        role="button"
        tabIndex={0}
        aria-label={detent === "full" ? "ย่อแชท" : "ขยายแชท"}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onDetentChange(NEXT_ON_TAP[detent])}
        className="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1.5 select-none"
      >
        <span className="h-1 w-10 rounded-full bg-line" />
      </div>
      {children}
    </motion.div>
  );
}

"use client";

import { PaperPlaneRight, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { FeedbackReason } from "@/lib/ai/schema";
import { AssistantMessage } from "./AssistantMessage";
import { HomeScreen } from "./HomeScreen";
import { useTypewriter } from "./useTypewriter";
import { useReducedMotion } from "motion/react";
import { assistant } from "@/lib/data";
import { CompassResultCard } from "@/components/compass/CompassResultCard";
import type { CompassResult } from "@/lib/compass";
import type { ThreadItem } from "./types";

type Props = {
  thread: ThreadItem[];
  /** คำถามถัดไปจากคำตอบล่าสุด (ว่าง = ไม่แสดง) */
  chips: string[];
  pending: boolean;
  onSend: (text: string) => void;
  onShowPlace: (placeId: string) => void;
  onRetry: () => void;
  onFeedback: (assistantId: string, reason: FeedbackReason) => void;
  /** เปิดเข็มทิศสาขา (ถาม 7 ข้อ) */
  onOpenCompass: () => void;
  /** ผลเข็มทิศ → ปักหมุดตึกคณะตามอันดับ */
  onCompassMap: (results: CompassResult[]) => void;
  /** มือถือระดับ peek: เหลือแค่ช่องพิมพ์ */
  compact?: boolean;
  /** มือถืออยู่ใน bottom sheet ใต้แผนที่: ซ่อนคำเตือนท้ายจอ ให้มีที่อ่านคำตอบ */
  inSheet?: boolean;
  onInputFocus?: () => void;
};

const MAX_LEN = 500;
// ตัวอย่างคำถามที่พิมพ์วนในช่องพิมพ์: ใช้ชุดเดียวกับการ์ดหน้าแรก (คำถามที่ตอบได้ดี ผ่าน eval แล้ว)
const EXAMPLES = assistant.starter_chips;

/** คอลัมน์แชทแบบที่คนคุ้นจาก ChatGPT/Claude: ข้อความกว้างไม่เกิน ~720px อยู่กลาง ช่องพิมพ์อยู่ล่าง */
export function ChatColumn(props: Props) {
  const { thread, chips, pending, compact = false } = props;
  const [draft, setDraft] = useState("");
  const reduceMotion = useReducedMotion();
  // หยุดพิมพ์ตัวอย่างเมื่อผู้ใช้เริ่มพิมพ์ หรือตั้งลดการเคลื่อนไหวไว้ในเครื่อง
  // แตะช่องพิมพ์แล้วตัวอย่างหายทันที (ไม่ต้องรอพิมพ์ตัวแรก) กลับมาวนต่อเมื่อออกจากช่องโดยยังว่างอยู่
  const [focused, setFocused] = useState(false);
  const showExample = !draft && !focused;
  const example = useTypewriter(EXAMPLES, showExample && !reduceMotion && !compact);
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = thread.length === 0;

  // screen reader: ประกาศเมื่อเริ่มหาคำตอบ และอ่านคำตอบเต็มครั้งเดียวตอนจบ (ไม่อ่านทุกตัวอักษรที่ไหลเข้ามา)
  const lastDone = thread.findLast((i) => (i.kind === "assistant" && i.status !== "streaming") || i.kind === "compass");
  const announcement = pending
    ? "มดกำลังหาคำตอบ"
    : lastDone?.kind === "compass"
      ? "ได้ผลเข็มทิศสาขาแล้ว"
      : lastDone?.kind === "assistant"
        ? lastDone.status === "error"
          ? (lastDone.error ?? "เกิดข้อผิดพลาด")
          : `${plainText(lastDone.answer?.message ?? "")}${lastDone.answer?.show_map ? " เปิดแผนที่ให้แล้ว" : ""}`
        : "";

  // เลื่อนให้คำถามล่าสุด (หรือผลเข็มทิศ) อยู่บนสุด คำตอบไหลต่อลงมาข้างล่างแบบ ChatGPT
  // ไม่ไล่ตามทุกตัวอักษรที่ไหลเข้ามา: คนจะได้อ่านตั้งแต่ต้นคำตอบ (sheet มือถือเตี้ย ถ้าเลื่อนลงล่างสุดจะเห็นแต่ท้ายคำตอบ)
  // หน้าแรกอยู่บนสุดเสมอ
  const anchorId = thread.findLast((i) => i.kind !== "assistant")?.id;
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const el = anchorId ? box.querySelector<HTMLElement>(`[data-anchor="${anchorId}"]`) : null;
    box.scrollTo({ top: el ? el.offsetTop - 16 : 0, behavior: el ? "smooth" : "instant" });
  }, [anchorId]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    props.onSend(t.slice(0, MAX_LEN));
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // ระหว่างเลือกคำด้วย IME (isComposing) ห้ามส่ง ไม่งั้นพิมพ์ไทยบางคีย์บอร์ดแล้วส่งกลางคำ
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(draft);
    }
  };

  return (
    <section aria-label="แชท" className="flex min-h-0 flex-1 flex-col">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div ref={scrollRef} hidden={compact} className="relative min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <HomeScreen onPick={submit} onOpenCompass={props.onOpenCompass} />
        ) : (
          <div className="mx-auto w-full max-w-[46rem] space-y-6 px-4 py-6 lg:space-y-8 lg:px-6">
            {thread.map((item) =>
              item.kind === "user" ? (
                <p key={item.id} data-anchor={item.id} className="ml-auto w-fit max-w-[min(85%,36rem)] rounded-[20px] rounded-tr-md bg-brand-tint px-4 py-2.5 text-base whitespace-pre-wrap text-ink">
                  {item.text}
                </p>
              ) : item.kind === "compass" ? (
                <div key={item.id} data-anchor={item.id}>
                  <CompassResultCard
                    results={item.results}
                    onAsk={submit}
                    onShowMap={() => props.onCompassMap(item.results)}
                    onRetake={props.onOpenCompass}
                  />
                </div>
              ) : (
                <AssistantMessage
                  key={item.id}
                  item={item}
                  onShowPlace={props.onShowPlace}
                  onRetry={props.onRetry}
                  onFeedback={(reason) => props.onFeedback(item.id, reason)}
                />
              ),
            )}
          </div>
        )}
      </div>

      <div className={`mx-auto w-full px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] lg:px-6 ${empty ? "max-w-[56rem]" : "max-w-[46rem]"}`}>
        {!compact && !empty && chips.length > 0 && (
          // เลื่อนแนวนอนได้: ขอบขวาจางลงเป็นสัญญาณว่ายังมีต่อ
          <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] [scrollbar-width:none]">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={pending}
                onClick={() => submit(chip)}
                className="min-h-11 shrink-0 rounded-full border border-line-strong bg-card px-4 text-sm hover:border-brand/50 disabled:opacity-50 lg:min-h-9"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            submit(draft);
          }}
          className="flex min-h-14 items-end gap-2 rounded-[28px] border border-input-edge bg-card py-1.5 pr-1.5 pl-4 sm:pl-2 shadow-[var(--shadow-float)] focus-within:border-brand-ink focus-within:ring-2 focus-within:ring-brand/25 lg:min-h-[60px] lg:py-2 lg:pr-2"
        >
          <span aria-hidden className="mb-1 grid size-9 shrink-0 place-items-center rounded-full bg-trail-tint text-brand-ink max-sm:hidden lg:mb-0.5">
            <Sparkle size={18} weight="fill" />
          </span>
          <label htmlFor="chat-input" className="sr-only">
            พิมพ์คำถาม
          </label>
          <div className="relative mb-2.5 min-w-0 flex-1 lg:mb-2">
            {/* ตัวอย่างคำถามที่พิมพ์วน (ตกแต่ง) · placeholder จริงยังอยู่ให้ screen reader แต่โปร่งใส */}
            {showExample && (
              <span aria-hidden className="pointer-events-none absolute inset-0 truncate text-base leading-[1.6] text-ink-soft">
                <span className="max-sm:hidden">ถามมดได้เลย </span>เช่น {example}
                {!reduceMotion && <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse rounded-full bg-brand" />}
              </span>
            )}
            <textarea
              id="chat-input"
              rows={1}
              value={draft}
              maxLength={MAX_LEN}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => {
                setFocused(true);
                props.onInputFocus?.();
              }}
              onBlur={() => setFocused(false)}
              placeholder="ถามมดได้เลย เช่น CB2301 อยู่ไหน"
              className="field-sizing-content block max-h-40 min-h-6 w-full resize-none bg-transparent text-base leading-[1.6] outline-none placeholder:text-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="ส่ง"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors disabled:bg-paper-deep disabled:text-ink-soft"
          >
            <PaperPlaneRight size={20} weight="fill" />
          </button>
        </form>
        <p hidden={compact || props.inSheet} className="mt-2 flex items-start justify-center gap-1.5 text-center text-xs text-ink-soft">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>
          โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของ มจธ. · AI อาจตอบผิดได้ เช็กการ์ดและแหล่งที่มาเสมอ ·{" "}
          <Link href="/privacy" className="whitespace-nowrap underline hover:text-ink">
            ความเป็นส่วนตัว
          </Link>
          </span>
        </p>
      </div>
    </section>
  );
}

/** ตัดเครื่องหมาย markdown ออกก่อนให้ screen reader อ่าน (ไม่งั้นจะอ่าน "ดอกจัน ดอกจัน") */
const plainText = (md: string) =>
  md
    .replace(/\*\*|__|[*_`#>]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

"use client";

import { CaretRight, Compass, PaperPlaneRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { assistant } from "@/lib/data";
import type { FeedbackReason } from "@/lib/ai/schema";
import { AntAvatar } from "./AntAvatar";
import { AssistantMessage } from "./AssistantMessage";
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
  onInputFocus?: () => void;
};

const MAX_LEN = 500;

/** คอลัมน์แชทแบบที่คนคุ้นจาก ChatGPT/Claude: ข้อความกว้างไม่เกิน ~720px อยู่กลาง ช่องพิมพ์อยู่ล่าง */
export function ChatColumn(props: Props) {
  const { thread, chips, pending, compact = false } = props;
  const [draft, setDraft] = useState("");
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

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่หรือคำตอบไหลเข้ามา
  const last = thread.at(-1);
  const lastLen = last?.kind === "assistant" ? (last.partial?.message?.length ?? 0) + (last.answer ? 1 : 0) : 0;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length, lastLen]);

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
      <div ref={scrollRef} hidden={compact} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <EmptyState onPick={submit} onOpenCompass={props.onOpenCompass} />
        ) : (
          <div className="mx-auto w-full max-w-[46rem] space-y-6 px-4 py-6 lg:px-6">
            {thread.map((item) =>
              item.kind === "user" ? (
                <p key={item.id} className="ml-auto w-fit max-w-[85%] rounded-[var(--radius-card)] rounded-tr-sm bg-ink px-3.5 py-2 text-[15px] whitespace-pre-wrap text-paper">
                  {item.text}
                </p>
              ) : item.kind === "compass" ? (
                <CompassResultCard
                  key={item.id}
                  results={item.results}
                  onAsk={submit}
                  onShowMap={() => props.onCompassMap(item.results)}
                  onRetake={props.onOpenCompass}
                />
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

      <div className="mx-auto w-full max-w-[46rem] px-4 pt-2 pb-3 lg:px-6">
        {!compact && !empty && chips.length > 0 && (
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={pending}
                onClick={() => submit(chip)}
                className="shrink-0 rounded-full border border-line bg-card px-3 py-1 text-sm hover:border-brand/40 disabled:opacity-50"
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
          className="flex items-end gap-2 rounded-[18px] border border-input-edge bg-card px-3.5 py-2.5 shadow-[var(--shadow-card)] focus-within:border-brand-ink focus-within:ring-2 focus-within:ring-brand/25"
        >
          <label htmlFor="chat-input" className="sr-only">
            พิมพ์คำถาม
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            maxLength={MAX_LEN}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={props.onInputFocus}
            placeholder="ถามน้องมดได้เลย เช่น CB2301 อยู่ไหน"
            className="field-sizing-content max-h-40 min-h-6 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-ink-soft"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="ส่ง"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white transition-opacity disabled:opacity-35"
          >
            <PaperPlaneRight size={16} weight="fill" />
          </button>
        </form>
        <p hidden={compact} className="mt-2 text-center text-[11px] leading-snug text-ink-soft">
          โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของ มจธ. · AI อาจตอบผิดได้ เช็กการ์ดและแหล่งที่มาเสมอ ·{" "}
          <Link href="/privacy" className="underline hover:text-ink">
            ความเป็นส่วนตัว
          </Link>
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

const CHIPS_SHOWN = 6;

/**
 * สุ่มคำถามตัวอย่างครั้งเดียวต่อการโหลดหน้า มีทั้งเรื่องเลือกสาขาและชีวิตนักศึกษา (ดู docs/research/openchat-2569.md)
 * สุ่มใน render ตรง ๆ ไม่ได้: HTML จาก server จะไม่ตรงกับเบราว์เซอร์ จึงอ่านผ่าน useSyncExternalStore
 * ที่ฝั่ง server คืน null (เว้นที่ไว้) แล้วเบราว์เซอร์ค่อยใส่ชุดที่สุ่ม
 */
let pickedChips: string[] | null = null;
function pickChips() {
  if (!pickedChips) {
    const pool = [...assistant.starter_chips];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pickedChips = pool.slice(0, CHIPS_SHOWN);
  }
  return pickedChips;
}
const noSubscribe = () => () => {};

/** หน้าแรกของแชทใหม่: น้องมด + คำทักทาย + เข็มทิศสาขา + คำถามตัวอย่างแบบสุ่ม อยู่กลางจอ */
function EmptyState({ onPick, onOpenCompass }: { onPick: (text: string) => void; onOpenCompass: () => void }) {
  const chips = useSyncExternalStore(noSubscribe, pickChips, () => null);
  return (
    <div className="mx-auto flex h-full w-full max-w-[46rem] flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <AntAvatar size={56} />
      <div className="space-y-1.5">
        <h2 className="font-display text-2xl text-ink">ถามน้องมดได้ทุกเรื่องในบางมด</h2>
        <p className="mx-auto max-w-md text-sm text-ink-soft">{assistant.greeting}</p>
      </div>
      <button
        type="button"
        onClick={onOpenCompass}
        className="flex w-full max-w-xl items-center gap-3 rounded-[var(--radius-card)] border border-brand/30 bg-brand/5 px-4 py-3 text-left hover:border-brand/60"
      >
        <Compass size={28} weight="duotone" className="shrink-0 text-brand-ink" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base text-ink">ยังไม่รู้จะเลือกสาขาไหน?</span>
          <span className="block text-xs text-ink-soft">เข็มทิศสาขา · ตอบ 7 ข้อ ไม่ถึง 1 นาที แล้วมดจัดอันดับสาขาที่เข้ากับเราให้</span>
        </span>
        <CaretRight size={18} className="shrink-0 text-brand-ink" />
      </button>
      <div className={`grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2 ${chips ? "" : "invisible"}`}>
        {(chips ?? assistant.starter_chips.slice(0, CHIPS_SHOWN)).map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onPick(chip)}
            className="rounded-[var(--radius-card)] border border-line bg-card px-3.5 py-2.5 text-left text-sm hover:border-brand/40 hover:bg-paper"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

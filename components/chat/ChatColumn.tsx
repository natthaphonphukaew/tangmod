"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { assistant } from "@/lib/data";
import type { FeedbackReason } from "@/lib/ai/schema";
import { AntAvatar } from "./AntAvatar";
import { AssistantMessage } from "./AssistantMessage";
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
      <div ref={scrollRef} hidden={compact} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {empty ? (
          <EmptyState onPick={submit} />
        ) : (
          <div className="mx-auto w-full max-w-[46rem] space-y-6 px-4 py-6 lg:px-6">
            {thread.map((item) =>
              item.kind === "user" ? (
                <p key={item.id} className="ml-auto w-fit max-w-[85%] rounded-[var(--radius-card)] rounded-tr-sm bg-ink px-3.5 py-2 text-[15px] whitespace-pre-wrap text-paper">
                  {item.text}
                </p>
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
          className="flex items-end gap-2 rounded-[18px] border border-line bg-card px-3.5 py-2.5 shadow-[var(--shadow-card)] focus-within:border-brand/50"
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
            className="field-sizing-content max-h-40 min-h-6 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-ink-soft/70"
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
          โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของ มจธ. · AI อาจตอบผิดได้ เช็กการ์ดและแหล่งที่มาเสมอ
        </p>
      </div>
    </section>
  );
}

/** หน้าแรกของแชทใหม่: น้องมด + คำทักทาย + คำถามตัวอย่าง อยู่กลางจอ */
function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[46rem] flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <AntAvatar size={56} />
      <div className="space-y-1.5">
        <h2 className="font-display text-2xl text-ink">ถามน้องมดได้ทุกเรื่องในบางมด</h2>
        <p className="mx-auto max-w-md text-sm text-ink-soft">{assistant.greeting}</p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {assistant.starter_chips.map((chip) => (
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

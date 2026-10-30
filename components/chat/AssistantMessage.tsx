"use client";

import { ArrowSquareOut, ArrowClockwise, Flag, MapPin, WifiSlash } from "@phosphor-icons/react";
import { Fragment, useState } from "react";
import type { FeedbackReason } from "@/lib/ai/schema";
import { placeById } from "@/lib/data";
import { CompareCard } from "@/components/cards/CompareCard";
import { ProgramCard } from "@/components/cards/ProgramCard";
import { TimelineCard } from "@/components/cards/TimelineCard";
import { TierBadge } from "@/components/ui/TierBadge";
import { AntAvatar } from "./AntAvatar";
import { useRevealText } from "./useRevealText";
import type { ThreadItem } from "./types";

type Props = {
  item: Extract<ThreadItem, { kind: "assistant" }>;
  /** เปิดแผนที่แล้วโฟกัสสถานที่นี้ */
  onShowPlace: (placeId: string) => void;
  onRetry: () => void;
  onFeedback?: (reason: FeedbackReason) => void;
};

export function AssistantMessage({ item, onShowPlace, onRetry, onFeedback }: Props) {
  const answer = item.answer;
  const text = answer?.message ?? item.partial?.message ?? "";
  // ค่อย ๆ แสดงเฉพาะคำตอบที่เพิ่งถามในหน้านี้ แชทเก่าจากประวัติแสดงทันที
  const [fresh] = useState(item.status === "streaming");
  const { shown, revealing } = useRevealText(text, fresh);
  // การ์ด หมุด แหล่งที่มา โผล่หลังข้อความแสดงครบ จะได้ไม่เด้งแทรกระหว่างที่ข้อความยังวิ่ง
  const showExtras = !revealing;

  return (
    // แบบแชท AI ที่คนคุ้น: คำตอบไม่มีกรอบ อ่านยาวสบายตา มีแค่ไอคอนมดนำหน้า
    <div className="flex gap-3">
      <AntAvatar size={28} />
      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        {item.status === "error" ? (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3 text-sm">
            <p>{item.error}</p>
            <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1 text-brand-ink hover:underline">
              <ArrowClockwise size={14} /> ลองใหม่
            </button>
          </div>
        ) : text ? (
          <div className="text-[15px]">
            <LightMarkdown text={shown} />
            {(item.status === "streaming" || revealing) && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-brand align-middle" />}
          </div>
        ) : (
          <ThinkingAnt />
        )}

        {showExtras && answer && answer.places.length > 0 && (
          // รายชื่อสถานที่อยู่ในคำตอบเสมอ กดเพื่อเปิดแผนที่เองได้ แม้คำตอบนี้จะไม่ได้เปิดแผนที่ให้อัตโนมัติ
          <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line">
            {answer.places.map((p, i) => {
              const place = placeById.get(p.place_id);
              return (
                <li key={p.place_id}>
                  <button
                    type="button"
                    onClick={() => onShowPlace(p.place_id)}
                    className="group flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-paper"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-ink font-display text-xs text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{place?.short ?? place?.name_th}</span>
                      {p.place_id.length <= 3 && <span className="font-mono text-xs text-ink-soft"> {p.place_id}</span>}
                      {p.reason && <span className="text-ink-soft"> — {p.reason}</span>}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-brand-ink opacity-80 group-hover:opacity-100">
                      <MapPin size={14} weight="duotone" /> ดูบนแผนที่
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {showExtras &&
          answer?.cards.map((card, i) => (
          <Fragment key={i}>
            {card.type === "program" && <ProgramCard id={card.ids[0]} onShowPlace={onShowPlace} />}
            {card.type === "compare" && <CompareCard ids={card.ids} onShowPlace={onShowPlace} />}
            {card.type === "timeline" && <TimelineCard programIds={card.ids} />}
            {card.type === "place" && (
              <button type="button" onClick={() => onShowPlace(card.ids[0])} className="text-sm text-brand-ink hover:underline">
                ดูข้อมูล {placeById.get(card.ids[0])?.name_th}
              </button>
            )}
          </Fragment>
        ))}

        {showExtras && answer && answer.sources.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
            {answer.sources.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5">
                <TierBadge tier={s.tier} />
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink-soft hover:text-brand-ink hover:underline">
                    {s.title} <ArrowSquareOut size={11} />
                  </a>
                ) : (
                  <span className="text-ink-soft">{s.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {item.model?.includes("offline") && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
            <WifiSlash size={13} />
            {item.model === "offline:rate_limited"
              ? "โควตา AI วันนี้หมดแล้ว มดเลยตอบแบบออฟไลน์ (ชี้หมุดกับการ์ดข้อมูลจริงได้อย่างเดียว)"
              : item.model === "offline:busy"
                ? "AI ตอบช้ากว่าปกติ มดเลยตอบแบบออฟไลน์ไปก่อน"
                : "โหมดออฟไลน์: ยังไม่ได้เชื่อมต่อ AI"}
            {item.model === "offline:busy" && (
              <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-brand-ink hover:underline">
                <ArrowClockwise size={13} /> ถามใหม่
              </button>
            )}
          </p>
        )}

        {onFeedback && item.status === "done" && answer && <FeedbackRow onSend={onFeedback} />}
      </div>
    </div>
  );
}

const REASONS: [FeedbackReason, string][] = [
  ["wrong_info", "ข้อมูลผิด"],
  ["missed_question", "ไม่ตอบที่ถาม"],
  ["wrong_place", "ชี้ตึกผิด"],
  ["other", "อื่น ๆ"],
];

/** ปุ่ม "ตอบไม่ตรง": กดแล้วเลือกเหตุผลสั้น ๆ คำถามนี้จะถูกเก็บไว้เติมข้อมูล (ไม่มีตัวตนผู้ใช้) */
function FeedbackRow({ onSend }: { onSend: (reason: FeedbackReason) => void }) {
  const [state, setState] = useState<"idle" | "choosing" | "sent">("idle");
  if (state === "sent") return <p className="text-xs text-ink-soft">ขอบคุณนะ มดจดไว้แล้ว จะเอาไปเติมข้อมูลให้ตอบได้ดีขึ้น</p>;
  if (state === "idle") {
    return (
      <button type="button" onClick={() => setState("choosing")} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-brand-ink">
        <Flag size={13} /> ตอบไม่ตรง
      </button>
    );
  }
  return (
    <div role="group" aria-label="ตอบไม่ตรงเพราะอะไร" className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-ink-soft">ไม่ตรงเพราะ</span>
      {REASONS.map(([reason, label]) => (
        <button
          key={reason}
          type="button"
          onClick={() => {
            onSend(reason);
            setState("sent");
          }}
          className="rounded-full border border-line bg-paper px-2.5 py-0.5 hover:border-brand/40"
        >
          {label}
        </button>
      ))}
      <button type="button" onClick={() => setState("idle")} className="px-1 text-ink-soft hover:text-ink">
        ยกเลิก
      </button>
    </div>
  );
}

/** มดเดินวน ๆ ระหว่างรอคำตอบ */
function ThinkingAnt() {
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-ink-soft" role="status">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-bounce rounded-full bg-trail" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </span>
      มดกำลังหาคำตอบ…
    </div>
  );
}

/** markdown แบบเบา: **ตัวหนา** และบรรทัดที่ขึ้นต้นด้วย - หรือ • เป็น bullet (React escape ให้แล้ว) */
function LightMarkdown({ text }: { text: string }) {
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const bullet = /^\s*[-•*]\s+/.test(line);
    const last = blocks.at(-1);
    if (bullet) {
      const content = line.replace(/^\s*[-•*]\s+/, "");
      if (last?.type === "ul") last.lines.push(content);
      else blocks.push({ type: "ul", lines: [content] });
    } else blocks.push({ type: "p", lines: [line] });
  }
  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.lines.map((l, j) => (
              <li key={j}>{bold(l)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{bold(b.lines[0])}</p>
        ),
      )}
    </div>
  );
}

function bold(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

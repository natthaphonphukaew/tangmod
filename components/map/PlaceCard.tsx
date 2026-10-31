"use client";

import { ArrowSquareOut, ChatCircleText, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { holidays, placeById } from "@/lib/data";
import type { Place } from "@/lib/data/schemas";
import { holidayOn, isOpenNow } from "@/lib/time";
import { TierBadge } from "@/components/ui/TierBadge";

type Props = {
  placeId: string;
  onClose: () => void;
  /** กดแล้วถามมดเรื่องสถานที่นี้ต่อในแชท */
  onAsk?: (place: Place) => void;
};

export function PlaceCard({ placeId, onClose, onAsk }: Props) {
  const place = placeById.get(placeId);
  // การ์ดนี้ mount หลังผู้ใช้กดเท่านั้น (ไม่ได้ render ฝั่ง server) จึงอ่านเวลาตอน mount ได้
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  // เปิดการ์ดแล้วย้าย focus มาที่การ์ด คนใช้คีย์บอร์ด/screen reader จะได้รู้ว่ามีการ์ดเปิดขึ้น (กด Tab ต่อเข้าไปข้างในได้)
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [placeId]);
  if (!place) return null;

  const open = isOpenNow(place.hours, now);
  // วันหยุดราชการ: เวลาเปิดปกติอาจไม่ใช้ บอกตรง ๆ ดีกว่าขึ้นว่า "เปิดอยู่" ทั้งที่อาจปิด
  const holiday = open !== null ? holidayOn(now, holidays.holidays) : undefined;

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      aria-label={`ข้อมูล ${place.name_th}`}
      className="w-full max-w-[22rem] rounded-[20px] border border-line-strong bg-card p-4 shadow-[var(--shadow-float)]"
    >
      <header className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-brand-tint px-2 py-0.5 font-mono text-sm text-brand-ink">{place.id.length <= 3 ? place.id : "•"}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-[1.4]">{place.name_th}</h2>
          <p className="text-[13px] text-ink-soft">{place.name_en}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="ปิด" className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper hover:text-ink lg:size-9">
          <X size={18} />
        </button>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <TierBadge tier={place.tier} updatedAt={place.updated_at} />
        {holiday ? (
          <span className="rounded-lg bg-warn/10 px-2.5 py-0.5 text-[13px] text-warn">วันนี้{holiday.label} · เวลาเปิดอาจต่างจากปกติ</span>
        ) : (
          open !== null && (
            <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${open ? "bg-ok/10 text-ok" : "bg-slate/10 text-ink-soft"}`}>
              {open ? "เปิดอยู่ตอนนี้" : "ปิดอยู่ตอนนี้"}
            </span>
          )
        )}
      </div>

      <p className="mt-3 text-[15px] leading-[1.6]">{place.description}</p>

      {place.floors && (
        <ul className="mt-3 space-y-1 text-sm">
          {place.floors.map((f) => (
            <li key={f.floor} className="flex gap-2">
              <span className="w-14 shrink-0 text-ink-soft">ชั้น {f.floor}</span>
              <span>{f.what}</span>
            </li>
          ))}
        </ul>
      )}

      {place.hours && (
        <ul className="mt-3 space-y-0.5 text-sm text-ink tabular-nums">
          {place.hours.map((h, i) => (
            <li key={i}>
              {h.label ? `${h.label}: ` : ""}
              {formatDays(h.days)} {h.open}–{h.close}
            </li>
          ))}
        </ul>
      )}

      {place.conflict_note && <p className="mt-2 text-xs text-warn">หมายเหตุ: {place.conflict_note}</p>}
      {place.tier === "mock" && place.source_note && <p className="mt-2 text-xs text-ink-soft">{place.source_note}</p>}

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        {onAsk ? (
          <button
            type="button"
            onClick={() => onAsk(place)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-ink px-4 text-sm font-semibold text-white hover:bg-brand-ink/90 lg:min-h-10"
          >
            <ChatCircleText size={18} weight="fill" /> ถามมดเรื่องที่นี่
          </button>
        ) : (
          <span />
        )}
        {place.source_url && (
          <a
            href={place.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-brand-ink hover:bg-brand-tint lg:min-h-9"
          >
            แหล่งที่มา <ArrowSquareOut size={14} />
          </a>
        )}
      </footer>
    </article>
  );
}

const DAY_TH: Record<string, string> = { mon: "จ.", tue: "อ.", wed: "พ.", thu: "พฤ.", fri: "ศ.", sat: "ส.", sun: "อา." };

function formatDays(days: string[]) {
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const idx = days.map((d) => order.indexOf(d)).sort((a, b) => a - b);
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && idx.length > 2) return `${DAY_TH[order[idx[0]]]}–${DAY_TH[order[idx.at(-1)!]]}`;
  return idx.map((i) => DAY_TH[order[i]]).join(" ");
}

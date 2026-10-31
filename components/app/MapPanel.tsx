"use client";

import { X } from "@phosphor-icons/react";
import { useRef } from "react";
import type { Place } from "@/lib/data/schemas";
import { CampusMap, type MapHighlight } from "@/components/map/CampusMap";
import { PlaceCard } from "@/components/map/PlaceCard";
import { useElementHeight } from "./BottomSheet";

type Props = {
  highlights: MapHighlight[];
  selectedId: string | null;
  onSelect: (placeId: string) => void;
  onCloseCard: () => void;
  onAskPlace: (place: Place) => void;
  onClose: () => void;
  refitKey: string;
};

/** แผงแผนที่: คอม = แผงขวา · มือถือ = ครึ่งบนของจอ (แชทถูกดันลงเป็น sheet) */
export function MapPanel({ highlights, selectedId, onSelect, onCloseCard, onAskPlace, onClose, refitKey }: Props) {
  // วัดการ์ดเพื่อให้แผนที่เลื่อนตึกที่เลือกขึ้นมาเหนือการ์ด (กล่องนี้อยู่ตลอด ref จะได้ไม่เปลี่ยน)
  const cardRef = useRef<HTMLDivElement>(null);
  const cardHeight = useElementHeight(cardRef);
  return (
    <section aria-label="แผนที่แคมปัส" className="relative h-full w-full bg-paper-deep">
      <CampusMap highlights={highlights} selectedId={selectedId} onSelect={onSelect} refitKey={refitKey} avoidBottom={selectedId && cardHeight ? cardHeight + 28 : 0} />
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดแผนที่"
        className="absolute top-3 left-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-sm font-medium text-ink shadow-[var(--shadow-float)] hover:border-brand/50 lg:min-h-9"
      >
        <X size={16} /> ปิดแผนที่
      </button>
      <div ref={cardRef} className="absolute right-3 bottom-7 left-3 z-10 flex justify-end sm:left-auto lg:bottom-3">
        {selectedId && <PlaceCard placeId={selectedId} onClose={onCloseCard} onAsk={onAskPlace} />}
      </div>
    </section>
  );
}

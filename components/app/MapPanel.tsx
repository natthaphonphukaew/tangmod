"use client";

import { X } from "@phosphor-icons/react";
import type { Place } from "@/lib/data/schemas";
import { CampusMap, type MapHighlight } from "@/components/map/CampusMap";
import { PlaceCard } from "@/components/map/PlaceCard";

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
  return (
    <section aria-label="แผนที่แคมปัส" className="relative h-full w-full bg-paper-deep">
      <CampusMap highlights={highlights} selectedId={selectedId} onSelect={onSelect} refitKey={refitKey} />
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดแผนที่"
        className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-xs text-ink-soft shadow-[var(--shadow-card)] hover:text-ink"
      >
        <X size={13} /> ปิดแผนที่
      </button>
      {selectedId && (
        <div className="absolute right-3 bottom-7 left-3 z-10 flex justify-end sm:left-auto lg:bottom-3">
          <PlaceCard placeId={selectedId} onClose={onCloseCard} onAsk={onAskPlace} />
        </div>
      )}
    </section>
  );
}

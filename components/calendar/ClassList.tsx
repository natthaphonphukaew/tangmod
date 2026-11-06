"use client";

import { MapPin } from "@phosphor-icons/react";
import { roomPlaceId, type ClassDay } from "@/lib/calendar/classes";
import { placeById } from "@/lib/data";

/** คาบเรียนของวันหนึ่ง: เวลา รหัสวิชา ห้อง (ชื่อตึก) และคาบที่งดพร้อมเหตุผล */
export function ClassList({ day, compact = false }: { day: ClassDay; compact?: boolean }) {
  if (!day.slots.length && !day.note) return null;
  return (
    <div className={compact ? "" : "mt-2"}>
      {day.note && <p className="text-[13px] text-warn">{day.note}</p>}
      <ul className="space-y-1">
        {day.slots.map(({ entry: e, cancelled, makeup }, i) => {
          const placeId = roomPlaceId(e.room);
          const building = placeId ? placeById.get(placeId) : undefined;
          return (
            <li key={i} className={`flex flex-wrap items-baseline gap-x-2 text-sm ${cancelled ? "text-ink-soft" : "text-ink"}`}>
              <span className="tabular-nums text-ink-soft">
                {e.start}–{e.end}
              </span>
              <span className={`font-semibold ${cancelled ? "line-through" : ""}`}>{e.code}</span>
              {e.name && <span className="text-ink-soft">{e.name}</span>}
              {e.room && (
                <span className="inline-flex items-center gap-0.5 text-ink-soft">
                  <MapPin size={13} aria-hidden /> {e.room}
                  {building && ` · ${building.short ?? building.name_th}`}
                </span>
              )}
              {cancelled && <span className="rounded-full bg-paper-deep px-2 text-xs text-ink">งด: {cancelled}</span>}
              {makeup && <span className="rounded-full bg-trail-tint px-2 text-xs text-[#6b4b00]">เรียนชดเชย</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

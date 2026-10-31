"use client";

import { ArrowRight, ArrowsClockwise, CaretRight, Compass, Sparkle } from "@phosphor-icons/react";
import { AntMascot } from "@/components/brand/AntMascot";
import { assistant } from "@/lib/data";
import { CHIPS_SHOWN, chipMeta, reshuffleChips, TONE_CLASS, useStarterChips } from "./starter-chips";

/*
 * หน้าแรกของแชทใหม่ (อิง ref ที่เจ้าของโปรเจกต์เลือก): หัวข้อสองสี + น้องมด → แบนเนอร์เข็มทิศ → การ์ดคำถามตัวอย่าง
 * ไม่เรียกว่า "คำถามยอดนิยม" เพราะเป็นการสุ่ม ไม่ได้มาจากสถิติจริง
 */
export function HomeScreen({ onPick, onOpenCompass }: { onPick: (text: string) => void; onOpenCompass: () => void }) {
  const chips = useStarterChips();
  return (
    <div className="relative min-h-full overflow-hidden">
      {/* ก้อนสีอุ่นตกแต่ง (สีแบน ไม่ใช่ gradient) */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-28 size-80 rounded-full bg-sun/50" />
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-24 size-64 rounded-full bg-trail-tint/70 max-lg:hidden" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-trail-tint/60 max-lg:hidden" />

      <div className="relative mx-auto w-full max-w-[65rem] px-4 pt-5 pb-8 sm:px-6 lg:px-10 lg:pt-6 xl:pt-10">
        <div className="flex items-center gap-6">
          <div className="min-w-0 flex-1">
            {/* มือถือ: มดตัวเล็กอยู่แถวเดียวกับคำทักทาย หัวข้อจะได้กว้างเต็มจอ ไม่ตัดกลางคำ */}
            <div className="flex items-end justify-between">
              <p className="inline-flex min-h-8 items-center rounded-full bg-trail-tint px-3.5 text-sm font-semibold text-ink">สวัสดีจ้า!</p>
              <AntMascot priority sizes="72px" className="-mb-2 h-24 w-auto sm:hidden" />
            </div>
            {/* บรรทัดแรกห้ามตัด: ตัวตัดคำไทยเคยแยกเป็น "ถามน้องมดได้ทุก / เรื่อง" */}
            <h2 className="mt-3 font-display text-[28px] leading-[1.32] text-ink sm:text-4xl xl:text-5xl">
              <span className="whitespace-nowrap">ถามน้องมดได้ทุกเรื่อง</span>
              <span className="block text-brand">ในบางมด</span>
            </h2>
            <p className="mt-3 max-w-[34rem] text-[15px] leading-[1.7] text-ink-soft sm:text-[17px]">{assistant.greeting}</p>
          </div>
          {/* วงเหลืองอุ่นหลังน้องมด แบบ ref */}
          <div className="relative hidden shrink-0 sm:block">
            <div aria-hidden className="absolute inset-x-[-12%] bottom-[4%] aspect-square rounded-full bg-sun" />
            <AntMascot priority sizes="(min-width: 1280px) 184px, 140px" className="relative h-48 w-auto xl:h-64" />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCompass}
          className="group mt-6 flex w-full items-center gap-4 rounded-[20px] border border-trail/60 bg-trail-tint p-4 text-left transition hover:border-trail sm:px-5 xl:mt-8"
        >
          <span className="hidden size-14 shrink-0 place-items-center rounded-full bg-card text-brand-ink shadow-[var(--shadow-card)] sm:grid">
            <Compass size={28} weight="duotone" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg text-ink sm:text-xl">ยังไม่รู้จะเลือกสาขาไหน?</span>
            <span className="block text-sm text-ink-soft sm:text-[15px]">เข็มทิศสาขา · ตอบ 7 ข้อ ไม่ถึง 1 นาที แล้วมดจัดอันดับสาขาที่เข้ากับเราให้</span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white transition group-hover:translate-x-0.5">
            <ArrowRight size={22} weight="bold" />
          </span>
        </button>

        <div className="mt-6 flex items-center gap-2 xl:mt-8">
          <Sparkle size={22} weight="fill" className="text-trail" />
          <h3 className="flex-1 font-display text-lg text-ink">ลองถามดู</h3>
          <button
            type="button"
            onClick={reshuffleChips}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft hover:bg-card hover:text-ink lg:min-h-9"
          >
            <ArrowsClockwise size={16} /> สุ่มใหม่
          </button>
        </div>

        <ul className={`mt-3 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 ${chips ? "" : "invisible"}`}>
          {(chips ?? assistant.starter_chips.slice(0, CHIPS_SHOWN)).map((chip, i) => {
            const { icon: Icon, tone, tags } = chipMeta(chip);
            return (
              // มือถือแสดง 4 ข้อพอ ไม่ต้องเลื่อนยาวกว่าจะถึงช่องพิมพ์
              <li key={chip} className={i >= 4 ? "max-sm:hidden" : undefined}>
                <button
                  type="button"
                  onClick={() => onPick(chip)}
                  className="group flex h-full min-h-[72px] w-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white px-4 py-3.5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-brand/50 sm:min-h-[88px]"
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${TONE_CLASS[tone]}`}>
                    <Icon size={22} weight="duotone" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-pretty text-ink sm:text-base">{chip}</span>
                    {tags && <span className="block truncate text-[13px] text-ink-soft">{tags}</span>}
                  </span>
                  <CaretRight size={20} className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-brand-ink" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

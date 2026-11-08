"use client";

import { ArrowClockwise, CaretDown, ChatCircleDots, Check, MapPin, Prohibit, Warning } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { AntMascot } from "@/components/brand/AntMascot";
import { catalog, catalogById } from "@/lib/data";
import type { CatalogProgram } from "@/lib/data/schemas";
import type { CompassExcluded, CompassResult } from "@/lib/compass";
import { TcasList } from "./TcasList";
import { CARD, CompareToggle, FactChips, PILL_BTN } from "./shared";

type Props = {
  results: CompassResult[];
  excluded: CompassExcluded[];
  compare: string[];
  onOpen: (p: CatalogProgram) => void;
  onToggleCompare: (id: string) => void;
  onAsk: (id: string) => void;
  onShowMap: () => void;
  onRetake: () => void;
};

const SHOWN = 5;

/** ผลเข็มทิศ: อันดับ 1–5 พร้อมเหตุผล · ดูต่ออีก 5 · สาขาที่ถูกตัดเพราะเงื่อนไข · วันสมัคร TCAS */
export function CompassResults({ results, excluded, compare, onOpen, onToggleCompare, onAsk, onShowMap, onRetake }: Props) {
  const [more, setMore] = useState(false);
  const top = results.slice(0, more ? SHOWN * 2 : SHOWN);
  const first = catalogById.get(results[0]?.programId ?? "");
  // ผลที่บันทึกเก็บแค่ 12 อันดับแรก จำนวนที่จัดอันดับจริงคิดจากสาขาที่เปิดรับลบที่ถูกตัด
  const ranked = catalog.filter((p) => p.status === "open").length - excluded.length;
  const sixthRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (more) sixthRef.current?.focus();
  }, [more]);

  return (
    <section aria-labelledby="result-title" className="space-y-5">
      <div className={`${CARD} flex items-center gap-4 overflow-hidden bg-trail-tint p-4 sm:p-5`}>
        <AntMascot pose="peace" sizes="96px" className="h-20 w-auto shrink-0 sm:h-24" />
        <div className="min-w-0 flex-1">
          <h2 id="result-title" tabIndex={-1} className="font-display text-xl leading-snug text-ink outline-none sm:text-2xl">
            สาขาที่น่าจะเข้ากับเราที่สุด: <span className="text-brand-ink">{first?.short ?? first?.name_th}</span>
          </h2>
          <p className="mt-1 text-sm text-ink">จัดอันดับจาก {ranked} สาขาที่ตรงเงื่อนไขของเรา</p>
          <p className="text-sm text-ink-soft">
            % คือความเข้ากันกับคำตอบของเรา <strong className="font-semibold text-ink">ไม่ใช่โอกาสสอบติด</strong> · ลักษณะของแต่ละสาขาทีมทางมดประเมินจากหลักสูตร ไม่ใช่คะแนนทางการ
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onShowMap} className={`${PILL_BTN} border border-line bg-card text-brand-ink hover:bg-brand-tint`}>
          <MapPin size={16} weight="duotone" /> ดูตึกคณะบนแผนที่
        </button>
        <button type="button" onClick={onRetake} className={`${PILL_BTN} border border-line bg-card text-ink hover:bg-paper-deep`}>
          <ArrowClockwise size={16} /> ทำใหม่
        </button>
      </div>

      <ol className="space-y-3">
        {top.map((r, i) => {
          const p = catalogById.get(r.programId);
          if (!p) return null;
          return (
            <li key={p.id} className={`${CARD} p-4 sm:p-5 ${i === 0 ? "border-brand/40" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-base ${i === 0 ? "bg-brand-ink text-white" : "bg-paper-deep text-ink"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-soft">{p.faculty_th}</p>
                  <h3 ref={i === SHOWN ? sixthRef : undefined} tabIndex={i === SHOWN ? -1 : undefined} className="text-base leading-snug font-semibold text-ink outline-none sm:text-lg">
                    {p.name_th} {p.short && <span className="font-normal text-ink-soft">({p.short})</span>}
                  </h3>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-[11px] text-ink-soft">เข้ากัน</span>
                  <span className="block font-display text-2xl leading-none tabular-nums text-brand-ink">{r.percent}%</span>
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={r.percent}
                aria-valuetext={`เข้ากัน ${r.percent}%`}
                aria-label={`ความเข้ากันกับ ${p.short ?? p.name_th}`}
              >
                <div className="h-full rounded-full bg-brand" style={{ width: `${r.percent}%`, opacity: i === 0 ? 1 : 0.6 }} />
              </div>
              <FactChips p={p} className="mt-3" />
              {(r.pros.length > 0 || r.cons.length > 0) && (
                <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  {r.pros.map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-ink">
                      <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-ok" /> {t}
                    </li>
                  ))}
                  {r.cons.map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-ink-soft">
                      <Warning size={15} className="mt-0.5 shrink-0 text-warn" /> {t}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpen(p)} className={`${PILL_BTN} border border-line-strong bg-card text-ink hover:border-brand/50`}>
                  ดูรายละเอียด<span className="sr-only"> {p.name_th}</span>
                </button>
                <CompareToggle p={p} compare={compare} onToggle={onToggleCompare} />
                <button type="button" onClick={() => onAsk(p.id)} className={`${PILL_BTN} text-brand-ink hover:bg-brand-tint`}>
                  <ChatCircleDots size={16} weight="bold" /> ถามมดเรื่องนี้<span className="sr-only"> {p.name_th}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {!more && results.length > SHOWN && (
        <button type="button" onClick={() => setMore(true)} className={`${PILL_BTN} mx-auto flex text-brand-ink hover:bg-brand-tint`}>
          <CaretDown size={16} /> ดูอันดับ 6–{Math.min(SHOWN * 2, results.length)}
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="tcas-title">
          <h3 id="tcas-title" className="font-display text-lg text-ink">
            วันรับสมัคร TCAS70 ที่ยังไม่ผ่าน
          </h3>
          <TcasList programId={results[0]?.programId} programLabel={first?.short ?? first?.name_th} className="mt-2" />
        </section>
        {excluded.length > 0 && (
          <section aria-labelledby="excluded-title">
            <h3 id="excluded-title" className="font-display text-lg text-ink">
              ไม่ได้จัดอันดับเพราะเงื่อนไข ({excluded.length})
            </h3>
            <p className="text-sm text-ink-soft">เปลี่ยนเงื่อนไขได้โดยกด &ldquo;ทำใหม่&rdquo; หรือดูในส่วนสำรวจทุกสาขา</p>
            <ExcludedList excluded={excluded} onOpen={onOpen} />
          </section>
        )}
      </div>
    </section>
  );
}

function ExcludedList({ excluded, onOpen }: { excluded: CompassExcluded[]; onOpen: (p: CatalogProgram) => void }) {
  // จัดกลุ่มตามเหตุผล (เช่น "เรียนที่บางขุนเทียน" 9 สาขา) อ่านง่ายกว่ารายการยาว
  const groups = new Map<string, CatalogProgram[]>();
  for (const e of excluded) {
    const p = catalogById.get(e.programId);
    if (!p) continue;
    const key = e.reason.startsWith("ค่าเทอม") ? "ค่าเทอมเกินงบมาก" : e.reason;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return (
    <ul className="mt-2 space-y-2">
      {[...groups].map(([reason, items]) => (
        <li key={reason} className={`${CARD} p-3`}>
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Prohibit size={15} className="text-ink-soft" /> {reason} · {items.length} สาขา
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {items.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onOpen(p)} className="min-h-11 rounded-full border border-line-strong px-3 text-left text-sm text-ink hover:border-brand/50">
                  {p.short ?? p.name_th}
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

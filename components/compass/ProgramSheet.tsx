"use client";

import { ArrowSquareOut, ChatCircleDots, MapPin } from "@phosphor-icons/react";
import { DIM_LABEL, feeText } from "@/lib/compass";
import { programById } from "@/lib/data";
import { COMPASS_DIMS, type CatalogProgram } from "@/lib/data/schemas";
import { Dialog } from "@/components/ui/Dialog";
import { TcasList } from "./TcasList";
import { CompareToggle, DIM_ICON, FactChips, PILL_BTN } from "./shared";

type Props = {
  p: CatalogProgram;
  compare: string[];
  onToggleCompare: (id: string) => void;
  onAsk: () => void;
  onShowMap: (() => void) | null;
  onClose: () => void;
};

/** รายละเอียดสาขา: ข้อเท็จจริงทางการ + ข้อมูลลึกถ้ามีใน programs/*.json + คะแนนลักษณะที่ทีมประเมิน */
export function ProgramSheet({ p, compare, onToggleCompare, onAsk, onShowMap, onClose }: Props) {
  const deep = programById.get(p.id);
  const strong = COMPASS_DIMS.filter((d) => p.profile[d] >= 2).sort((a, b) => p.profile[b] - p.profile[a]);
  const careers = deep?.careers.length ? deep.careers : p.careers;

  return (
    <Dialog title={p.short ?? p.name_th} onClose={onClose}>
      <div className="space-y-5 px-5 pt-4 pb-6">
        <div>
          <p className="text-sm text-ink-soft">
            {p.faculty_th} · {p.degree}
            {p.curriculum_year ? ` · หลักสูตร พ.ศ. ${p.curriculum_year}` : ""}
          </p>
          <h2 className="mt-1 font-display text-2xl leading-snug text-ink">{p.name_th}</h2>
          <p className="text-sm text-ink-soft">{p.name_en}</p>
          <FactChips p={p} className="mt-3" />
        </div>

        <p className="text-[15px] leading-relaxed text-ink">{deep?.summary ?? p.summary}</p>

        {deep?.tracks && deep.tracks.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink">แทร็ก / กลุ่มวิชา</h3>
            <p className="mt-1 text-sm text-ink-soft">{deep.tracks.join(" · ")}</p>
          </section>
        )}
        {careers.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink">จบไปทำอะไร</h3>
            <p className="mt-1 text-sm text-ink-soft">{careers.join(" · ")}</p>
          </section>
        )}

        <section className="rounded-[16px] bg-paper-deep p-4">
          <h3 className="text-sm font-semibold text-ink">ค่าเทอม</h3>
          {p.fee.total ? (
            <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-ink-soft">เทอมแรก</dt>
                <dd className="font-display text-base tabular-nums text-ink">{p.fee.first_term ? feeText(p.fee.first_term) : "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">เฉลี่ยต่อเทอม</dt>
                <dd className="font-display text-base tabular-nums text-ink">{p.fee.per_term_est ? feeText(p.fee.per_term_est) : "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">ตลอดหลักสูตร ({p.years * 2} เทอม)</dt>
                <dd className="font-display text-base tabular-nums text-ink">{feeText(p.fee.total)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">ยังไม่มีในตารางค่าเทอมของมหาวิทยาลัย</p>
          )}
          {p.note && <p className="mt-2 text-xs text-ink-soft">{p.note}</p>}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ink">เรียนหนักไปทางไหน</h3>
          <ul className="mt-2 space-y-1.5">
            {strong.map((d) => {
              const Icon = DIM_ICON[d];
              return (
                <li key={d} className="flex items-center gap-2 text-sm">
                  <Icon size={18} weight="duotone" className="shrink-0 text-brand-ink" />
                  <span className="w-44 shrink-0 truncate text-ink sm:w-56">{DIM_LABEL[d].label}</span>
                  <span className="flex gap-1" aria-label={`${p.profile[d]} จาก 3`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`h-2 w-6 rounded-full ${n <= p.profile[d] ? "bg-brand" : "bg-line"}`} />
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">ทีมทางมดประเมินจากคำอธิบายหลักสูตร ไม่ใช่คะแนนทางการ · {p.profile_note}</p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ink">วันรับสมัคร TCAS70 ที่ยังไม่ผ่าน</h3>
          <TcasList programId={p.id} programLabel={p.short ?? p.name_th} limit={4} className="mt-2" />
        </section>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAsk} className={`${PILL_BTN} bg-brand-ink text-white`}>
            <ChatCircleDots size={18} weight="bold" /> ถามมดเรื่องนี้
          </button>
          <CompareToggle p={p} compare={compare} onToggle={onToggleCompare} />
          {onShowMap && (
            <button type="button" onClick={onShowMap} className={`${PILL_BTN} text-brand-ink hover:bg-brand-tint`}>
              <MapPin size={16} weight="duotone" /> ดูตึกบนแผนที่
            </button>
          )}
          <a href={p.source_url} target="_blank" rel="noreferrer" className={`${PILL_BTN} text-ink-soft hover:bg-paper-deep hover:text-ink`}>
            <ArrowSquareOut size={16} /> หลักสูตรบนเว็บ มจธ.
          </a>
        </div>
      </div>
    </Dialog>
  );
}

"use client";

import { ArrowsLeftRight, ChatCircleDots, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { DIM_LABEL, campusLabel, feeText } from "@/lib/compass";
import { catalogById, programById } from "@/lib/data";
import { COMPASS_DIMS, type CatalogProgram } from "@/lib/data/schemas";
import { Dialog } from "./Dialog";
import { MAX_COMPARE, PILL_BTN, langText, toggleCompare } from "./shared";

/** แถบลอยด้านล่าง: สาขาที่เลือกไว้เทียบ + ปุ่มเปิดตาราง */
export function CompareTray({ ids, onAsk }: { ids: string[]; onAsk: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = ids.map((id) => catalogById.get(id)).filter((p): p is CatalogProgram => !!p);
  return (
    <>
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="sticky bottom-3 z-20 mx-auto mt-6 flex w-full max-w-3xl items-center gap-2 rounded-full border border-line bg-card p-2 pl-4 shadow-xl"
            role="region"
            aria-label="สาขาที่เลือกไว้เทียบ"
          >
            <p className="sr-only" aria-live="polite">
              เลือกไว้เทียบ {items.length} จาก {MAX_COMPARE}
            </p>
            {/* มือถือ: บอกจำนวนแทนชิป (เอาออกได้ในตารางเทียบหรือที่ปุ่มเทียบของแต่ละสาขา) */}
            <p className="min-w-0 flex-1 text-sm text-ink sm:hidden">
              {items.length < 2 ? `เลือกอีก ${2 - items.length} สาขาเพื่อเทียบ` : `เลือกไว้ ${items.length} สาขา`}
            </p>
            <ul className="hidden min-w-0 flex-1 gap-1.5 overflow-x-auto sm:flex">
              {items.map((p) => (
                <li key={p.id} className="flex shrink-0 items-center gap-1 rounded-full bg-paper-deep py-1 pr-1 pl-3 text-sm">
                  <span className="max-w-[9rem] truncate">{p.short ?? p.name_th}</span>
                  <button type="button" onClick={() => toggleCompare(p.id)} aria-label={`เอา ${p.short ?? p.name_th} ออกจากรายการเทียบ`} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-card hover:text-ink">
                    <X size={14} />
                  </button>
                </li>
              ))}
              {items.length < MAX_COMPARE && <li className="shrink-0 self-center text-xs text-ink-soft">{items.length < 2 ? "เลือกอีกอย่างน้อย 1 สาขา" : `เลือกได้อีก ${MAX_COMPARE - items.length}`}</li>}
            </ul>
            <button
              type="button"
              disabled={items.length < 2}
              onClick={() => setOpen(true)}
              className={`${PILL_BTN} min-h-11 shrink-0 bg-brand-ink px-5 text-white disabled:opacity-40`}
            >
              <ArrowsLeftRight size={18} weight="bold" /> เทียบ{items.length >= 2 ? ` ${items.length} สาขา` : ""}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{open && items.length >= 2 && <CompareDialog items={items} onClose={() => setOpen(false)} onAsk={onAsk} />}</AnimatePresence>
    </>
  );
}

function CompareDialog({ items, onClose, onAsk }: { items: CatalogProgram[]; onClose: () => void; onAsk: (text: string) => void }) {
  const name = (p: CatalogProgram) => p.short ?? p.name_th;
  const cheapest = Math.min(...items.map((p) => p.fee.total ?? Infinity));
  const rows: { label: string; cell: (p: CatalogProgram) => ReactNode }[] = [
    { label: "คณะ", cell: (p) => p.faculty_th },
    { label: "ปริญญา", cell: (p) => `${p.degree} ${p.years} ปี` },
    { label: "วิทยาเขต", cell: (p) => campusLabel(p.campus) },
    { label: "ภาษา", cell: langText },
    { label: "เทอมแรก", cell: (p) => (p.fee.first_term ? feeText(p.fee.first_term) : "-") },
    {
      label: "ตลอดหลักสูตร",
      cell: (p) =>
        p.fee.total ? (
          <span className={p.fee.total === cheapest ? "font-semibold text-ok" : undefined}>
            {feeText(p.fee.total)}
            {p.fee.total === cheapest && " (ถูกสุด)"}
          </span>
        ) : (
          "ยังไม่มีข้อมูล"
        ),
    },
    {
      label: "เด่นด้าน",
      cell: (p) =>
        COMPASS_DIMS.filter((d) => p.profile[d] === 3)
          .map((d) => DIM_LABEL[d].label.split(" ")[0])
          .join(", ") || "-",
    },
    { label: "สรุป", cell: (p) => programById.get(p.id)?.summary ?? p.summary },
  ];

  return (
    <Dialog title="เทียบสาขา" onClose={onClose} wide>
      {/* คอม: ตาราง · มือถือ: การ์ดเลื่อนแนวนอน */}
      <div className="hidden p-5 md:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">เทียบ {items.map(name).join(" กับ ")}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-32" />
              {items.map((p) => (
                <th key={p.id} scope="col" className="px-3 pb-3 text-left align-bottom">
                  <span className="block font-display text-lg text-ink">{name(p)}</span>
                  {p.short && <span className="block text-xs font-normal text-ink-soft">{p.name_th}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="border-t border-line py-2.5 pr-3 text-left align-top font-medium text-ink-soft">
                  {r.label}
                </th>
                {items.map((p) => (
                  <td key={p.id} className="border-t border-line px-3 py-2.5 align-top text-ink">
                    {r.cell(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto p-4 md:hidden">
        {items.map((p) => (
          <li key={p.id} className="w-[82%] shrink-0 snap-center rounded-[16px] border border-line bg-card p-4">
            <p className="font-display text-lg text-ink">{name(p)}</p>
            {p.short && <p className="text-xs text-ink-soft">{p.name_th}</p>}
            <dl className="mt-3 space-y-2 text-sm">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs text-ink-soft">{r.label}</dt>
                  <dd className="text-ink">{r.cell(p)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            onAsk(`${items.map((p) => p.name_th).join(" กับ ")} ต่างกันยังไง เหมาะกับคนแบบไหน`);
          }}
          className={`${PILL_BTN} bg-brand-ink text-white`}
        >
          <ChatCircleDots size={18} weight="bold" /> ถามมดว่าต่างกันยังไง
        </button>
        <p className="flex-1 text-right text-xs text-ink-soft">ค่าเทอมจากตารางค่าเทอมทางการ · &ldquo;เด่นด้าน&rdquo; ทีมประเมินเอง</p>
      </div>
    </Dialog>
  );
}

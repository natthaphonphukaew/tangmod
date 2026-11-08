"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { catalog } from "@/lib/data";
import type { CatalogFaculty, CatalogProgram } from "@/lib/data/schemas";
import type { CompassResult } from "@/lib/compass";
import { CARD, CompareToggle, FactChips } from "./shared";

/*
 * สำรวจทุกสาขาปริญญาตรีของ มจธ. โดยไม่ต้องทำแบบทดสอบ
 * ตัวกรองเป็น <select> (เข้าถึงง่ายทั้งคีย์บอร์ดและมือถือ) + ช่องค้นหาชื่อ/ชื่อเล่นสาขา
 */

const FACULTIES: { id: CatalogFaculty; label: string }[] = [
  { id: "eng", label: "วิศวกรรมศาสตร์" },
  { id: "sci", label: "วิทยาศาสตร์" },
  { id: "fiet", label: "ครุศาสตร์อุตสาหกรรมฯ" },
  { id: "sit", label: "เทคโนโลยีสารสนเทศ (SIT)" },
  { id: "soad", label: "สถาปัตย์และการออกแบบ / มีเดีย" },
  { id: "cms", label: "วิทยาลัยสหวิทยาการ" },
  { id: "fibo", label: "FIBO หุ่นยนต์" },
  { id: "sola", label: "ศิลปศาสตร์" },
];
const BUDGETS = [30_000, 50_000, 90_000];

type Sort = "match" | "fee" | "name";

export function ProgramExplorer({
  results,
  compare,
  onOpen,
  onToggleCompare,
}: {
  results: CompassResult[] | null;
  compare: string[];
  onOpen: (p: CatalogProgram) => void;
  onToggleCompare: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [faculty, setFaculty] = useState<CatalogFaculty | "">("");
  const [campus, setCampus] = useState("");
  const [lang, setLang] = useState("");
  const [budget, setBudget] = useState(0);
  const [years, setYears] = useState(0);
  // ผลโหลดหลัง mount (และลบได้) ค่าเรียงจึงคิดจาก state ทุกครั้ง: ยังไม่เลือกเอง = ตาม % ถ้ามีผล
  const [pick, setSort] = useState<Sort | null>(null);
  const sort: Sort = pick === "match" && !results ? "name" : (pick ?? (results ? "match" : "name"));
  const percent = useMemo(() => new Map(results?.map((r) => [r.programId, r.percent])), [results]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const shown = catalog.filter(
      (p) =>
        p.status === "open" &&
        (!needle || [p.name_th, p.name_en, p.short ?? "", ...p.aliases, p.faculty_th].some((s) => s.toLowerCase().includes(needle))) &&
        (!faculty || p.faculty === faculty) &&
        (!campus || p.campus === campus) &&
        (!lang || (lang === "en" ? p.language === "en" : p.language !== "en")) &&
        (!budget || (p.fee.per_term_est !== null && p.fee.per_term_est <= budget)) &&
        (!years || p.years === years),
    );
    const byName = (a: CatalogProgram, b: CatalogProgram) => a.name_th.localeCompare(b.name_th, "th");
    return shown.sort(
      sort === "fee"
        ? (a, b) => (a.fee.per_term_est ?? Infinity) - (b.fee.per_term_est ?? Infinity) || byName(a, b)
        : sort === "match" && results
          ? (a, b) => (percent.get(b.id) ?? -1) - (percent.get(a.id) ?? -1) || byName(a, b)
          : byName,
    );
  }, [q, faculty, campus, lang, budget, years, sort, results, percent]);

  const filtered = !!(q || faculty || campus || lang || budget || years);
  const reset = () => {
    setQ("");
    setFaculty("");
    setCampus("");
    setLang("");
    setBudget(0);
    setYears(0);
  };

  return (
    <section aria-labelledby="explore-title">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="explore-title" className="font-display text-xl text-ink sm:text-2xl">
            สำรวจทุกสาขา
          </h2>
          <p className="text-sm text-ink-soft">ปริญญาตรี {catalog.filter((p) => p.status === "open").length} หลักสูตรของ มจธ. กดดูรายละเอียดหรือเลือกไว้เทียบ</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
        <label className="relative col-span-2 lg:col-span-1">
          <span className="sr-only">ค้นหาสาขา</span>
          <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา เช่น เคมี สถาปัตย์ CPE"
            className="min-h-11 w-full rounded-full border border-input-edge bg-card pr-4 pl-10 text-[15px] placeholder:text-ink-soft"
          />
        </label>
        <Select label="คณะ" value={faculty} onChange={(v) => setFaculty(v as CatalogFaculty | "")} options={[["", "ทุกคณะ"], ...FACULTIES.map((f) => [f.id, f.label] as [string, string])]} />
        <Select label="วิทยาเขต" value={campus} onChange={setCampus} options={[["", "ทุกวิทยาเขต"], ["bangmod", "บางมด"], ["bangkhuntien", "บางขุนเทียน"], ["ratchaburi", "ราชบุรี"]]} />
        <Select label="ภาษา" value={lang} onChange={setLang} options={[["", "ทุกภาษา"], ["th", "ภาษาไทย"], ["en", "ภาษาอังกฤษ"]]} />
        <Select label="งบต่อเทอม" value={String(budget)} onChange={(v) => setBudget(Number(v))} options={[["0", "ทุกงบ"], ...BUDGETS.map((b) => [String(b), `ไม่เกิน ${b.toLocaleString("th-TH")}`] as [string, string])]} />
        <Select label="จำนวนปี" value={String(years)} onChange={(v) => setYears(Number(v))} options={[["0", "4 หรือ 5 ปี"], ["4", "4 ปี"], ["5", "5 ปี"]]} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <p className="text-ink-soft" aria-live="polite">
          พบ {list.length} สาขา
        </p>
        {filtered && (
          <button type="button" onClick={reset} className="min-h-11 rounded-full px-2 text-brand-ink hover:underline">
            ล้างตัวกรอง
          </button>
        )}
        <span className="flex-1" />
        <Select
          label="เรียงตาม"
          inline
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[...(results ? [["match", "เข้ากับเรามากสุด"] as [string, string]] : []), ["fee", "ค่าเทอมน้อยไปมาก"], ["name", "ชื่อสาขา"]]}
        />
      </div>

      {list.length === 0 ? (
        <p className={`${CARD} mt-3 p-6 text-center text-sm text-ink-soft`}>ไม่มีสาขาที่ตรงทุกตัวกรอง ลองล้างตัวกรองบางอัน</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const pct = percent.get(p.id);
            return (
              <li key={p.id} className={`${CARD} flex flex-col p-4`}>
                <button type="button" onClick={() => onOpen(p)} className="group -m-1 flex-1 rounded-[14px] p-1 text-left">
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink-soft">{p.faculty_th}</span>
                      <span className="block text-[15px] leading-snug font-semibold text-ink group-hover:text-brand-ink">{p.name_th}</span>
                    </span>
                    {pct !== undefined && (
                      <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 font-display text-sm tabular-nums text-brand-deep">
                        <span className="sr-only">เข้ากัน </span>
                        {pct}%
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{p.summary}</span>
                </button>
                <FactChips p={p} className="mt-3" />
                <div className="mt-3">
                  <CompareToggle p={p} compare={compare} onToggle={onToggleCompare} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Select({ label, value, onChange, options, inline = false }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; inline?: boolean }) {
  return (
    <label className={inline ? "inline-flex items-center gap-2 text-sm text-ink-soft" : "block"}>
      <span className={inline ? "" : "sr-only"}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={inline ? undefined : label}
        className={`min-h-11 rounded-full border bg-card px-3.5 text-[15px] text-ink ${inline ? "" : "w-full"} ${value && value !== "0" && !inline ? "border-brand-ink bg-brand-tint" : "border-input-edge"}`}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

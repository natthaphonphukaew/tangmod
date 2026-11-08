"use client";

import { ArrowRight, CaretRight, Clock, Compass, House, ListBullets, Trash } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AntMascot } from "@/components/brand/AntMascot";
import { saveCompass, useCompass } from "@/lib/client/compass-store";
import { navigate } from "@/lib/client/nav";
import { CONSTRAINTS, STYLE_QUESTIONS, programName, scoreCompass, type CompassAnswers, type CompassResult } from "@/lib/compass";
import { catalog, catalogById } from "@/lib/data";
import type { CatalogProgram } from "@/lib/data/schemas";
import { CompareTray } from "./Compare";
import { CompassQuiz, answersComplete } from "./CompassQuiz";
import { CompassResults } from "./CompassResults";
import { ProgramExplorer } from "./ProgramExplorer";
import { ProgramSheet } from "./ProgramSheet";
import { CARD, PILL_BTN, clearResult, toggleCompare } from "./shared";

/*
 * หน้าเข็มทิศสาขา /compass (อยู่ใน TangmodApp แถบซ้ายไม่หาย)
 *   หน้าเริ่ม: ปุ่มเริ่มทำ + ผลล่าสุด + สำรวจทุกสาขา
 *   แบบทดสอบ: ทีละข้อในหน้า
 *   ผล: อันดับ เหตุผล วันสมัคร TCAS สาขาที่ถูกตัด แล้วต่อด้วยสำรวจทุกสาขา (เรียงตาม % ให้)
 * ผลและรายการเทียบบันทึกในเครื่อง หรือในบัญชีถ้า login (compass-store)
 */

type Mode = "home" | "quiz" | "result";
export type CompassActions = {
  /** ไปแชทใหม่ ใส่ผลเข็มทิศไว้ก่อน แล้วส่งคำถาม */
  onAsk: (text: string, results: CompassResult[] | null) => void;
  /** เปิดแผนที่ ไฮไลต์ตึกคณะตามลำดับ */
  onShowMap: (placeIds: string[]) => void;
  /** ทำแบบทดสอบเสร็จ (จดสาขาอันดับต้นไว้ในความจำของมด) */
  onFinished: (results: CompassResult[]) => void;
};

export function CompassScreen({ onAsk, onShowMap, onFinished }: CompassActions) {
  const { saved, ready } = useCompass();
  const [mode, setMode] = useState<Mode>("home");
  const [open, setOpen] = useState<CatalogProgram | null>(null);
  const results = saved?.answers ? saved.results : null;
  const compare = saved?.compare ?? [];
  const topRef = useRef<HTMLDivElement>(null);

  // เปลี่ยนโหมดแล้วเลื่อนขึ้นบนสุดของหน้า และให้ screen reader เริ่มอ่านจากหัวข้อของโหมดใหม่
  const go = (m: Mode) => {
    setMode(m);
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ block: "start" });
      const target = m === "result" ? document.getElementById("result-title") : m === "home" ? document.getElementById("compass-h1") : null;
      target?.focus({ preventScroll: true });
    });
  };

  const finish = (answers: CompassAnswers) => {
    const outcome = scoreCompass(answers);
    void saveCompass({ v: 2, answers, results: outcome.results.slice(0, 12), excluded: outcome.excluded, compare, updated_at: Date.now() });
    onFinished(outcome.results);
    go("result");
  };

  const askAbout = (id: string) => {
    const p = catalogById.get(id);
    onAsk(`เล่าเรื่อง${p ? p.name_th : programName(id)}${p ? ` (${p.faculty_th})` : ""} ให้ฟังหน่อย เรียนอะไร จบไปทำงานอะไร`, results);
  };
  const placesOf = (ids: string[]) => [...new Set(ids.map((id) => catalogById.get(id)?.place_id).filter((x): x is string => !!x))];

  if (mode === "quiz") {
    return (
      <div ref={topRef} className="px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-8">
        <CompassQuiz initial={saved?.answers && answersComplete(saved.answers as CompassAnswers) ? (saved.answers as CompassAnswers) : null} onDone={finish} onCancel={() => go(results ? "result" : "home")} />
      </div>
    );
  }

  return (
    <div ref={topRef} className="relative mx-auto w-full max-w-[72rem] px-4 pt-4 pb-6 sm:px-6 lg:px-8 lg:pt-6">
      <Header />

      <div className="mt-6 space-y-8">
        {mode === "result" && results ? (
          <CompassResults
            results={results}
            excluded={saved?.excluded ?? []}
            compare={compare}
            onOpen={setOpen}
            onToggleCompare={toggleCompare}
            onAsk={askAbout}
            onShowMap={() => onShowMap(placesOf(results.map((r) => r.programId)))}
            onRetake={() => go("quiz")}
          />
        ) : (
          <Start
            ready={ready}
            results={results}
            updatedAt={saved?.updated_at ?? null}
            onStart={() => go("quiz")}
            onShowResult={() => go("result")}
            onCleared={() => document.getElementById("start-title")?.focus()}
          />
        )}

        <ProgramExplorer results={results} compare={compare} onOpen={setOpen} onToggleCompare={toggleCompare} />
      </div>

      <CompareTray ids={compare} onAsk={(text) => onAsk(text, results)} />

      <AnimatePresence>
        {open && (
          <ProgramSheet
            p={open}
            compare={compare}
            onToggleCompare={toggleCompare}
            onAsk={() => {
              setOpen(null);
              askAbout(open.id);
            }}
            onShowMap={open.place_id ? () => (setOpen(null), onShowMap([open.place_id!])) : null}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const MIN_Q = 2 + STYLE_QUESTIONS.length + CONSTRAINTS.length;

function Start({
  ready,
  results,
  updatedAt,
  onStart,
  onShowResult,
  onCleared,
}: {
  ready: boolean;
  results: CompassResult[] | null;
  updatedAt: number | null;
  onStart: () => void;
  onShowResult: () => void;
  onCleared: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const faculties = new Set(catalog.filter((p) => p.status === "open").map((p) => p.faculty)).size;
  const open = catalog.filter((p) => p.status === "open").length;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className={`${CARD} relative overflow-hidden bg-brand-tint/60 p-5 sm:p-6`} aria-labelledby="start-title">
        <h2 id="start-title" tabIndex={-1} className="font-display outline-none text-2xl leading-snug text-ink sm:text-[28px]">
          ยังไม่รู้จะเลือกสาขาไหน?
        </h2>
        <p className="mt-2 max-w-[34rem] text-[15px] text-ink-soft">
          ตอบเรื่องที่ชอบ สไตล์การเรียน และเงื่อนไขอย่างวิทยาเขต ภาษา งบ แล้วมดจัดอันดับให้จาก {open} หลักสูตรปริญญาตรี {faculties} คณะของ มจธ.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <li className="flex items-center gap-1.5">
            <Clock size={16} /> ประมาณ 2 นาที
          </li>
          <li className="flex items-center gap-1.5">
            <ListBullets size={16} /> {MIN_Q}–{MIN_Q + 2} ข้อ
          </li>
        </ul>
        <button type="button" onClick={onStart} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-ink px-6 text-base font-semibold text-white shadow-[0_8px_20px_-10px_var(--brand)]">
          {results ? "ทำแบบทดสอบอีกครั้ง" : "เริ่มทำแบบทดสอบ"} <ArrowRight size={18} weight="bold" />
        </button>
      </section>

      <section className={`${CARD} p-5`} aria-labelledby="last-title">
        <h2 id="last-title" className="flex items-center gap-2 font-display text-lg text-ink">
          <Compass size={20} weight="duotone" className="text-brand-ink" /> ผลครั้งล่าสุด
        </h2>
        {!ready ? (
          <div aria-hidden className="mt-3 h-28 animate-pulse rounded-[16px] bg-paper-deep" />
        ) : results ? (
          <>
            <ol className="mt-3 space-y-2">
              {results.slice(0, 3).map((r, i) => (
                <li key={r.programId} className="flex items-center gap-2 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-paper-deep text-xs font-semibold">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{catalogById.get(r.programId)?.name_th ?? programName(r.programId)}</span>
                  <span className="font-display tabular-nums text-brand-ink">{r.percent}%</span>
                </li>
              ))}
            </ol>
            {confirming ? (
              <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="ยืนยันการลบผล">
                <p className="w-full text-sm text-ink">ลบผลครั้งล่าสุดไหม (รายการเทียบยังอยู่)</p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    clearResult();
                    setConfirming(false);
                    onCleared();
                  }}
                  className={`${PILL_BTN} bg-brand-ink text-white`}
                >
                  ลบ
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={`${PILL_BTN} text-ink hover:bg-paper-deep`}>
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={onShowResult} className={`${PILL_BTN} bg-brand-ink text-white`}>
                  ดูผลเต็ม <ArrowRight size={14} weight="bold" />
                </button>
                <button type="button" onClick={() => setConfirming(true)} className={`${PILL_BTN} text-ink-soft hover:bg-paper-deep hover:text-ink`}>
                  <Trash size={15} /> ลบผล
                </button>
              </div>
            )}
            {updatedAt && <p className="mt-2 text-xs text-ink-soft">ทำเมื่อ {new Date(updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</p>}
          </>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <AntMascot pose="think" sizes="80px" className="h-20 w-auto shrink-0" />
            <p className="text-sm text-ink-soft">ยังไม่เคยทำ ผลจะเก็บไว้ในเครื่องนี้ หรือในบัญชีของคุณถ้าเข้าสู่ระบบ</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Header() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  // เปิดจากเมนูแล้ว focus ชื่อหน้า (เปิดตรงจาก URL ไม่ต้องย้าย)
  useEffect(() => {
    const active = document.activeElement;
    if (active && active !== document.body) titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="relative flex items-end gap-4">
      <div className="min-w-0 flex-1">
        <nav aria-label="ตำแหน่งหน้า" className="hidden items-center gap-1.5 text-sm text-ink-soft lg:flex">
          <Link
            href="/"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              navigate("/");
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full hover:text-ink"
          >
            <House size={16} /> หน้าแรก
          </Link>
          <CaretRight size={12} aria-hidden />
          <span aria-current="page" className="text-ink">
            เข็มทิศสาขา
          </span>
        </nav>
        <h1 id="compass-h1" ref={titleRef} tabIndex={-1} className="mt-1 font-display text-[28px] leading-tight text-balance text-ink outline-none sm:text-4xl lg:text-[40px]">
          เข็มทิศสาขา
        </h1>
        <p className="mt-2 max-w-[40rem] text-[15px] text-ink-soft sm:text-base">หาสาขาที่เข้ากับเรา สำรวจและเทียบปริญญาตรีทุกคณะของ มจธ.</p>
      </div>
      <div aria-hidden className="relative hidden shrink-0 sm:block">
        <div className="absolute inset-x-[-10%] bottom-[2%] aspect-square rounded-full bg-sun" />
        <AntMascot pose="thumbs" sizes="130px" className="relative h-32 w-auto lg:h-36" />
      </div>
    </div>
  );
}

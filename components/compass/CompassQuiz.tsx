"use client";

import { ArrowLeft, ArrowRight, Check, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  CONSTRAINTS,
  DIM_LABEL,
  STYLE_QUESTIONS,
  followupsFor,
  type CompassAnswers,
  type ConstraintQuestion,
  type FollowupQuestion,
  type ScaleQuestion,
} from "@/lib/compass";
import { COMPASS_DIMS, type CompassDim } from "@/lib/data/schemas";
import { DIM_ICON } from "./shared";

/*
 * แบบทดสอบทีละข้อ (อยู่ในหน้า /compass ไม่ใช่ป๊อปอัป)
 *   1 เรื่องที่ชอบ (เลือก 1–3) · 2 เรื่องที่ไม่อยากเจอ (ข้ามได้) · 3 สไตล์ 5 ข้อ
 *   4 ถามต่อตามเรื่องที่ชอบ 0–2 ข้อ · 5 เงื่อนไข 4 ข้อ
 * ข้อเลือกข้อเดียวกดแล้วไปต่อทันที ข้อเลือกหลายอันต้องกด "ถัดไป"
 */

type Step = { kind: "likes" } | { kind: "avoid" } | ScaleQuestion | FollowupQuestion | ConstraintQuestion;

export const EMPTY_ANSWERS: CompassAnswers = {
  v: 2,
  likes: [],
  avoid: [],
  style: { hands_on: -1, theory: -1, coding: -1, creative: -1, teaching: -1 },
  followups: {},
  campus: -1,
  lang: -1,
  budget: -1,
  years: -1,
};

const MAX_LIKES = 3;

export function CompassQuiz({ initial, onDone, onCancel }: { initial?: CompassAnswers | null; onDone: (a: CompassAnswers) => void; onCancel: () => void }) {
  const [a, setA] = useState<CompassAnswers>(initial ?? EMPTY_ANSWERS);
  const [i, setI] = useState(0);
  const steps: Step[] = [{ kind: "likes" }, { kind: "avoid" }, ...STYLE_QUESTIONS, ...followupsFor(a.likes), ...CONSTRAINTS];
  const step = steps[Math.min(i, steps.length - 1)];
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownAt = useRef(0);

  // ข้อใหม่: ย้าย focus ไปที่คำถาม คนใช้ screen reader จะได้ยินคำถามก่อนตัวเลือก
  useEffect(() => {
    shownAt.current = Date.now();
    titleRef.current?.focus({ preventScroll: true });
    titleRef.current?.scrollIntoView({ block: "nearest" });
  }, [i]);

  const next = (answers = a) => {
    const total = [{}, {}, ...STYLE_QUESTIONS, ...followupsFor(answers.likes), ...CONSTRAINTS].length;
    if (i + 1 < total) setI(i + 1);
    else onDone(answers);
  };

  const choose = (value: number) => {
    let n = a;
    if (step.kind === "scale") n = { ...a, style: { ...a.style, [step.id]: value } };
    else if (step.kind === "followup") n = { ...a, followups: { ...a.followups, [step.id]: value } };
    else if (step.kind === "constraint") n = { ...a, [step.id]: value };
    setA(n);
    next(n);
  };

  const selected =
    step.kind === "scale" ? a.style[step.id] : step.kind === "followup" ? (a.followups[step.id] ?? -1) : step.kind === "constraint" ? a[step.id] : -1;

  const toggleDim = (list: "likes" | "avoid", d: CompassDim) => {
    const cur = a[list];
    if (cur.includes(d)) return setA({ ...a, [list]: cur.filter((x) => x !== d) });
    if (list === "likes" && cur.length >= MAX_LIKES) return;
    // เรื่องเดียวกันจะชอบและไม่อยากเจอพร้อมกันไม่ได้
    const other = list === "likes" ? "avoid" : "likes";
    setA({ ...a, [list]: [...cur, d], [other]: a[other].filter((x) => x !== d) });
  };

  const section = step.kind === "likes" || step.kind === "avoid" ? "สิ่งที่ชอบ" : step.kind === "scale" ? "สไตล์การเรียน" : step.kind === "followup" ? "ถามต่ออีกนิด" : "เงื่อนไข";
  const title =
    step.kind === "likes"
      ? "เรื่องไหนที่ทำแล้วสนุก เลือกได้ 1–3 อย่าง"
      : step.kind === "avoid"
        ? "มีเรื่องไหนที่ไม่อยากเรียนเลยไหม (ข้ามได้)"
        : step.text;

  return (
    <section aria-labelledby="compass-q" className="mx-auto w-full max-w-3xl">
      <h1 className="sr-only">เข็มทิศสาขา แบบทดสอบ</h1>
      <div className="flex items-center gap-2">
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)} aria-label="ข้อก่อนหน้า" className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <span className="size-11" />
        )}
        <p className="flex-1 text-sm font-medium text-ink-soft">
          {section} · <span className="tabular-nums">ข้อ {i + 1}/{steps.length}</span>
        </p>
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-ink-soft hover:bg-paper-deep hover:text-ink">
          <X size={16} /> ออก
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
      </div>

      <h2 id="compass-q" ref={titleRef} tabIndex={-1} className="mt-7 font-display text-[22px] leading-[1.45] text-balance text-ink outline-none sm:text-[26px]">
        <span className="sr-only">
          ข้อ {i + 1} จาก {steps.length}:{" "}
        </span>
        {title}
      </h2>

      {step.kind === "likes" || step.kind === "avoid" ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            {step.kind === "likes" ? `เลือกแล้ว ${a.likes.length}/${MAX_LIKES}` : "สาขาที่มีเรื่องนี้เยอะจะถูกลดอันดับ"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-labelledby="compass-q">
            {COMPASS_DIMS.map((d) => {
              const list = step.kind;
              const on = a[list].includes(d);
              const full = list === "likes" && !on && a.likes.length >= MAX_LIKES;
              const inOther = list === "avoid" && a.likes.includes(d);
              const why = full ? "เลือกครบ 3 แล้ว" : inOther ? "อยู่ในเรื่องที่ชอบแล้ว" : null;
              const Icon = DIM_ICON[d];
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-disabled={!!why}
                  onClick={() => !why && toggleDim(list, d)}
                  className={`relative flex min-h-[76px] items-start gap-2.5 rounded-[16px] border p-3 pr-7 text-left transition aria-disabled:opacity-45 ${
                    on
                      ? list === "likes"
                        ? "border-brand-ink bg-brand-tint"
                        : "border-ink bg-paper-deep"
                      : "border-line-strong bg-card hover:border-brand/50"
                  }`}
                >
                  <Icon size={24} weight="duotone" className={on && list === "likes" ? "mt-0.5 shrink-0 text-brand-ink" : "mt-0.5 shrink-0 text-ink-soft"} />
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-snug font-semibold text-ink">{DIM_LABEL[d].label}</span>
                    <span className="block text-xs text-ink-soft">{why ?? DIM_LABEL[d].hint}</span>
                  </span>
                  {on && (
                    <span className={`absolute top-2 right-2 grid size-5 place-items-center rounded-full text-white ${list === "likes" ? "bg-brand-ink" : "bg-ink"}`}>
                      {list === "likes" ? <Check size={12} weight="bold" /> : <X size={12} weight="bold" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="sticky bottom-0 mt-5 flex justify-end border-t border-line bg-paper pt-3 pb-1">
            <button
              type="button"
              onClick={() => next()}
              disabled={step.kind === "likes" && a.likes.length === 0}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-ink px-6 font-semibold text-white disabled:opacity-40"
            >
              {step.kind === "avoid" && a.avoid.length === 0 ? "ไม่มี ข้ามไป" : "ถัดไป"} <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </>
      ) : (
        // key ผูกกับข้อ: ข้อใหม่ได้ปุ่มใหม่ มือถือจะไม่เห็นสถานะกดค้างจากข้อก่อน · กันแตะสองทีแล้วตอบข้อถัดไปโดยไม่ตั้งใจ
        <div key={step.id} className="mt-5 grid gap-2" role="radiogroup" aria-labelledby="compass-q">
          {(step.kind === "followup" ? step.options.map((o) => o.label) : step.options).map((label, idx) => (
            <button
              key={`${step.id}-${idx}`}
              type="button"
              role="radio"
              onClick={() => Date.now() - shownAt.current > 250 && choose(idx)}
              aria-checked={selected === idx}
              className="min-h-13 rounded-[16px] border border-line-strong bg-card px-4 py-3 text-left text-base shadow-[var(--shadow-card)] hover:border-brand/50 hover:bg-brand-tint/50 aria-checked:border-brand-ink aria-checked:bg-brand-tint"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** คำตอบครบพอจะคิดผลไหม (ใช้ตอนเอาคำตอบเก่ามาเริ่มใหม่) */
export const answersComplete = (a: CompassAnswers) =>
  a.likes.length > 0 && Object.values(a.style).every((v) => v >= 0) && a.campus >= 0 && a.lang >= 0 && a.budget >= 0 && a.years >= 0;

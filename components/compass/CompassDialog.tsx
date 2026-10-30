"use client";

import { ArrowLeft, Compass, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { QUESTIONS, type CompassAnswers } from "@/lib/compass";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: (answers: CompassAnswers) => void;
};

/** ถามทีละข้อ 7 ข้อ · คอม = กล่องกลางจอ · มือถือ = เต็มจอ */
export function CompassDialog({ open, onClose, onDone }: Props) {
  return <AnimatePresence>{open && <Steps onClose={onClose} onDone={onDone} />}</AnimatePresence>;
}

function Steps({ onClose, onDone }: Omit<Props, "open">) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<CompassAnswers>>({});
  const firstOption = useRef<HTMLButtonElement>(null);
  const q = QUESTIONS[step];
  const labels = q.kind === "budget" ? q.options.map((o) => o.label) : q.options;

  // ย้ายโฟกัสไปตัวเลือกแรกทุกข้อ ใช้คีย์บอร์ดตอบต่อได้ทันที · Esc ปิด
  useEffect(() => {
    firstOption.current?.focus();
  }, [step]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choose = (index: number) => {
    const next = { ...answers, [q.id]: index };
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) setStep(step + 1);
    else onDone(next as CompassAnswers);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compass-question"
        className="flex h-[100svh] w-full flex-col bg-paper sm:h-auto sm:max-w-lg sm:rounded-[20px] sm:shadow-xl"
        initial={reduceMotion ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduceMotion ? undefined : { y: 24, opacity: 0 }}
      >
        <header className="flex items-center gap-2 px-4 pt-4">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} aria-label="ข้อก่อนหน้า" className="rounded-md p-1.5 text-ink-soft hover:bg-paper-deep hover:text-ink">
              <ArrowLeft size={18} />
            </button>
          ) : (
            <Compass size={22} weight="duotone" className="m-1 text-brand-ink" />
          )}
          <p className="flex-1 font-display text-base">เข็มทิศสาขา</p>
          <span className="text-xs text-ink-soft">
            ข้อ {step + 1}/{QUESTIONS.length}
          </span>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1.5 text-ink-soft hover:bg-paper-deep hover:text-ink">
            <X size={18} />
          </button>
        </header>
        <div className="mx-4 mt-3 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 py-6 sm:py-8">
          <h2 id="compass-question" className="font-display text-xl leading-snug text-ink">
            {q.text}
          </h2>
          <div className="mt-5 grid gap-2" role="group" aria-labelledby="compass-question">
            {labels.map((label, i) => (
              <button
                key={label}
                ref={i === 0 ? firstOption : undefined}
                type="button"
                onClick={() => choose(i)}
                aria-pressed={answers[q.id] === i}
                className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-left text-[15px] hover:border-brand/50 hover:bg-brand/5 focus-visible:border-brand aria-pressed:border-brand aria-pressed:bg-brand/10"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="px-5 pb-5 text-[11px] leading-snug text-ink-soft">
          ใช้เป็นจุดเริ่มคุยเท่านั้น คะแนนลักษณะสาขาทีมทางมดประเมินจากโครงสร้างหลักสูตร ไม่ใช่คะแนนทางการของมหาวิทยาลัย
        </p>
      </motion.div>
    </motion.div>
  );
}

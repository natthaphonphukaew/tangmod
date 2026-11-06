"use client";

import { CircleNotch, ImageSquare, PencilSimple, Plus, Trash, Warning } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { calendar, placeById } from "@/lib/data";
import type { Day } from "@/lib/data/schemas";
import { roomPlaceId } from "@/lib/calendar/classes";
import { authClient } from "@/lib/client/auth-client";
import { clearTimetable, saveTimetable, useTimetable } from "@/lib/client/timetable-store";
import { DAY_ORDER, DAY_TH, TimetableEntry, sortEntries, type Timetable } from "@/lib/timetable/schema";

/*
 * ตารางเรียนของฉัน: อัปรูป → AI อ่าน → ผู้ใช้ตรวจแก้ → บันทึก (หรือกรอกเองตั้งแต่ต้น)
 * ผลจาก AI ไม่บันทึกเองอัตโนมัติ ต้องกดบันทึกหลังตรวจทุกครั้ง
 */

type Draft = { code: string; name: string; day: Day; start: string; end: string; room: string; note: string };
const EMPTY: Draft = { code: "", name: "", day: "mon", start: "", end: "", room: "", note: "" };
const toDraft = (e: TimetableEntry): Draft => ({ ...EMPTY, ...e, name: e.name ?? "", room: e.room ?? "", note: e.note ?? "" });
const fromDraft = (d: Draft) =>
  TimetableEntry.safeParse({
    code: d.code.replace(/\s+/g, "").toUpperCase(),
    name: d.name.trim() || undefined,
    day: d.day,
    start: d.start,
    end: d.end,
    room: d.room.replace(/\s+/g, "") || undefined,
    note: d.note.trim() || undefined,
  });

/** ภาคที่ตารางนี้น่าจะเป็น: ภาคที่กำลังเรียนอยู่ หรือภาคถัดไป */
function defaultTerm(today: string): string {
  return (calendar.terms.find((t) => today <= t.end) ?? calendar.terms.at(-1)!).id;
}

/** ย่อรูปในเบราว์เซอร์ก่อนส่ง (ด้านยาวไม่เกิน 1600px, JPEG) ส่งไวขึ้นและไม่ติดขนาดคำขอของ Vercel */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85));
}

export function TimetablePanel({ today }: { today: string | null }) {
  const { timetable, ready } = useTimetable();
  const loggedIn = !!authClient.useSession().data?.user;
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"reading" | "saving" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const term = termId ?? timetable?.term_id ?? (today ? defaultTerm(today) : calendar.terms[0].id);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy("reading");
    setMessage(null);
    try {
      const form = new FormData();
      form.append("image", await shrink(file), "timetable.jpg");
      const res = await fetch("/api/timetable/extract", { method: "POST", body: form });
      const body = (await res.json()) as { entries?: TimetableEntry[]; dropped?: number; message?: string };
      if (!res.ok || !body.entries) throw new Error(body.message ?? "อ่านรูปไม่สำเร็จ");
      setDrafts(body.entries.length ? sortEntries(body.entries).map(toDraft) : [{ ...EMPTY }]);
      setMessage(
        body.entries.length
          ? `มดอ่านได้ ${body.entries.length} คาบ${body.dropped ? ` (อีก ${body.dropped} คาบอ่านไม่ครบ กรอกเพิ่มเองได้)` : ""} ตรวจให้ตรงกับตารางจริงก่อนกดบันทึก`
          : "มดหาคาบเรียนในรูปไม่เจอ ลองรูปที่ชัดขึ้น หรือกรอกเอง",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "อ่านรูปไม่สำเร็จ");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave() {
    if (!drafts) return;
    const parsed = drafts.map(fromDraft);
    if (parsed.some((p) => !p.success)) return setMessage("ยังมีช่องที่ไม่ครบหรือเวลาไม่ถูก (ช่องที่ขอบแดง)");
    const next: Timetable = { v: 1, term_id: term, entries: sortEntries(parsed.map((p) => p.data!)), updated_at: Date.now() };
    setBusy("saving");
    try {
      await saveTimetable(next);
      setDrafts(null);
      setMessage(null);
    } catch {
      setMessage("บันทึกขึ้นบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
    }
  }

  const upload = (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="timetable-file" onChange={(e) => onFile(e.target.files?.[0])} />
      <label
        htmlFor="timetable-file"
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-ink ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        {busy === "reading" ? <CircleNotch size={18} className="animate-spin" /> : <ImageSquare size={18} weight="bold" />}
        {busy === "reading" ? "มดกำลังอ่านตาราง…" : timetable ? "อัปรูปใหม่" : "อัปรูปตารางเรียน"}
      </label>
    </>
  );

  return (
    <section aria-label="ตารางเรียนของฉัน" className="rounded-[var(--radius-card)] border border-line bg-card p-3 shadow-[var(--shadow-card)] sm:p-4">
      <h2 className="font-display text-lg text-ink">ตารางเรียนของฉัน</h2>
      {!ready ? (
        <div className="mt-2 h-24 animate-pulse rounded-xl bg-paper" aria-hidden />
      ) : drafts ? (
        <Editor drafts={drafts} setDrafts={setDrafts} term={term} setTerm={setTermId} busy={busy} onSave={onSave} onCancel={() => {
            setDrafts(null);
            setMessage(null);
          }} message={message} />
      ) : (
        <>
          {timetable ? (
            <Summary timetable={timetable} />
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              ใส่ตารางเรียนแล้วปฏิทินจะบอกว่าวันไหนเรียนอะไร ห้องไหน คาบไหนงดเพราะวันหยุดหรือช่วงสอบ และถามน้องมดได้ว่า &quot;พรุ่งนี้เรียนอะไร&quot;
            </p>
          )}
          {message && <p className="mt-2 text-sm text-warn">{message}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {upload}
            <button
              type="button"
              onClick={() => setDrafts(timetable ? timetable.entries.map(toDraft) : [{ ...EMPTY }])}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-ink hover:bg-paper"
            >
              <PencilSimple size={18} /> {timetable ? "แก้ไข" : "กรอกเอง"}
            </button>
            {timetable && (
              <button
                type="button"
                onClick={() => void clearTimetable()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-ink-soft hover:bg-paper hover:text-ink"
              >
                <Trash size={18} /> ลบตาราง
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            รูปจะถูกส่งให้ Google Gemini อ่านแล้วทิ้ง ไม่ถูกเก็บไว้ · ตัดชื่อและรหัสนักศึกษาออกจากรูปก่อนได้ · ตารางเก็บ{loggedIn ? "ในบัญชีของคุณ" : "ในเครื่องนี้"} ไม่เก็บชื่ออาจารย์
          </p>
        </>
      )}
    </section>
  );
}

function Summary({ timetable }: { timetable: Timetable }) {
  const termLabel = calendar.terms.find((t) => t.id === timetable.term_id)?.label ?? timetable.term_id;
  return (
    <div className="mt-1">
      <p className="text-sm text-ink-soft">{termLabel} · {timetable.entries.length} คาบต่อสัปดาห์</p>
      <ul className="mt-2 space-y-2">
        {DAY_ORDER.filter((d) => timetable.entries.some((e) => e.day === d)).map((d) => (
          <li key={d}>
            <p className="text-[13px] font-semibold text-ink">{DAY_TH[d]}</p>
            <ul className="mt-0.5 space-y-0.5">
              {timetable.entries
                .filter((e) => e.day === d)
                .map((e, i) => (
                  <li key={i} className="text-sm text-ink">
                    <span className="tabular-nums text-ink-soft">
                      {e.start}–{e.end}
                    </span>{" "}
                    <span className="font-medium">{e.code}</span>
                    {e.name && <span className="text-ink-soft"> {e.name}</span>}
                    {e.room && <span className="text-ink-soft"> · {e.room}{buildingOf(e.room)}</span>}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

const buildingOf = (room: string) => {
  const id = roomPlaceId(room);
  const place = id ? placeById.get(id) : undefined;
  return place ? ` (${place.short ?? place.name_th})` : "";
};

const INPUT = "min-h-10 w-full rounded-lg border bg-card px-2 text-sm text-ink";

function Editor({
  drafts,
  setDrafts,
  term,
  setTerm,
  busy,
  onSave,
  onCancel,
  message,
}: {
  drafts: Draft[];
  setDrafts: (d: Draft[]) => void;
  term: string;
  setTerm: (t: string) => void;
  busy: string | null;
  onSave: () => void;
  onCancel: () => void;
  message: string | null;
}) {
  const update = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const edge = (bad: boolean) => (bad ? "border-brand" : "border-input-edge/50");
  return (
    <div className="mt-2">
      {message && (
        <p className="flex gap-1.5 rounded-lg bg-trail-tint p-2 text-sm text-ink">
          <Warning size={18} className="mt-0.5 shrink-0 text-warn" /> {message}
        </p>
      )}
      <label className="mt-2 block text-sm text-ink">
        ภาคการศึกษา
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={`${INPUT} mt-1 border-input-edge/50`}>
          {calendar.terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <ul className="mt-3 space-y-3">
        {drafts.map((d, i) => {
          const bad = new Set(fromDraft(d).error?.issues.map((x) => String(x.path[0])) ?? []);
          return (
            <li key={i} className="rounded-xl border border-line bg-paper p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="รหัสวิชา" placeholder="รหัสวิชา เช่น DSI122" value={d.code} onChange={(e) => update(i, { code: e.target.value })} className={`${INPUT} ${edge(bad.has("code"))}`} />
                <select aria-label="วัน" value={d.day} onChange={(e) => update(i, { day: e.target.value as Day })} className={`${INPUT} ${edge(false)}`}>
                  {DAY_ORDER.map((day) => (
                    <option key={day} value={day}>
                      {DAY_TH[day]}
                    </option>
                  ))}
                </select>
                <input aria-label="เวลาเริ่ม" type="time" value={d.start} onChange={(e) => update(i, { start: e.target.value })} className={`${INPUT} ${edge(bad.has("start"))}`} />
                <input aria-label="เวลาจบ" type="time" value={d.end} onChange={(e) => update(i, { end: e.target.value })} className={`${INPUT} ${edge(bad.has("end"))}`} />
                <input aria-label="ห้อง" placeholder="ห้อง เช่น CB2306" value={d.room} onChange={(e) => update(i, { room: e.target.value })} className={`${INPUT} ${edge(bad.has("room"))}`} />
                <input aria-label="ชื่อวิชา" placeholder="ชื่อวิชา (ไม่ใส่ก็ได้)" value={d.name} onChange={(e) => update(i, { name: e.target.value })} className={`${INPUT} ${edge(bad.has("name"))}`} />
                <input aria-label="หมายเหตุ" placeholder="หมายเหตุ (ไม่ใส่ก็ได้)" value={d.note} onChange={(e) => update(i, { note: e.target.value })} className={`${INPUT} col-span-2 ${edge(bad.has("note"))}`} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-ink-soft">
                <span>{d.room && buildingOf(d.room) ? `ตึก${buildingOf(d.room).replace(/[()]/g, "")}` : ""}</span>
                <button type="button" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))} className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 hover:bg-card hover:text-ink">
                  <Trash size={14} /> ลบคาบนี้
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setDrafts([...drafts, { ...EMPTY }])}
        disabled={drafts.length >= 40}
        className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline disabled:opacity-40"
      >
        <Plus size={16} weight="bold" /> เพิ่มคาบ
      </button>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onSave} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-ink disabled:opacity-60">
          {busy === "saving" && <CircleNotch size={18} className="animate-spin" />} บันทึก
        </button>
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-ink hover:bg-paper">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

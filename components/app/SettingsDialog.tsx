"use client";

import { Brain, CalendarDots, Compass, Database, Eye, GoogleLogo, ShieldCheck, SignOut, Trash, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { clearResult } from "@/components/compass/shared";
import { Dialog } from "@/components/ui/Dialog";
import type { Profile } from "@/lib/ai/schema";
import { useCompass } from "@/lib/client/compass-store";
import { setPrefs, usePrefs } from "@/lib/client/prefs";
import { clearTimetable, useTimetable } from "@/lib/client/timetable-store";
import { programById } from "@/lib/data";
import { ProfilePhoto, type AccountProps } from "./Sidebar";

/*
 * การตั้งค่า (เปิดจากปุ่มโปรไฟล์ท้ายแถบซ้าย)
 *   บัญชี · ความจำของน้องมด · ข้อมูลของฉัน (ตารางเรียน ผลเข็มทิศ) · การแสดงผล · ความเป็นส่วนตัว
 * ทุกปุ่มลบมีขั้นยืนยันในบรรทัด (ยกเว้นลบบัญชีที่ใช้ confirm เดิมของระบบ)
 */
export function SettingsDialog({ account, profile, onForget, onClose }: { account: AccountProps; profile: Profile; onForget: () => void; onClose: () => void }) {
  const prefs = usePrefs();
  const { timetable } = useTimetable();
  const { saved } = useCompass();
  const memory = [
    ...new Set([...profile.considering_programs.map((id) => programById.get(id)?.short ?? id), ...profile.interests, ...profile.visited_places.slice(0, 3)]),
  ];
  const { user, busy, options } = account;

  return (
    <Dialog title="การตั้งค่า" onClose={onClose}>
      <div className="divide-y divide-line">
        <Section icon={<UserCircle size={20} weight="duotone" />} title="บัญชี">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <ProfilePhoto name={user.name} image={user.image} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-sm text-ink-soft">{user.email}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-soft">ประวัติแชท ตารางเรียน และผลเข็มทิศเก็บในบัญชีนี้ เปิดจากเครื่องไหนก็เห็น</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={account.onSignOut} disabled={busy} className={`${BTN} border border-line-strong bg-card text-ink hover:border-brand/50`}>
                  <SignOut size={16} /> ออกจากระบบ
                </button>
                <button type="button" onClick={account.onDeleteAccount} disabled={busy} className={`${BTN} text-brand-ink hover:bg-brand-tint`}>
                  <Trash size={16} /> ลบบัญชีและข้อมูลทั้งหมด
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">
                ยังไม่ได้เข้าสู่ระบบ ข้อมูลทั้งหมดเก็บไว้ในเครื่องนี้ {options.google || options.devLogin ? "เข้าสู่ระบบ (ไม่บังคับ) แล้วประวัติแชทจะตามไปทุกเครื่อง" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {options.google && (
                  <button type="button" onClick={account.onSignInGoogle} disabled={busy} className={`${BTN} border border-line-strong bg-card text-ink hover:border-brand/50`}>
                    <GoogleLogo size={18} weight="bold" /> เข้าสู่ระบบด้วย Google
                  </button>
                )}
                {options.devLogin && (
                  <button type="button" onClick={account.onSignInDev} disabled={busy} className={`${BTN} border border-dashed border-line-strong text-ink-soft hover:text-ink`}>
                    ล็อกอินทดสอบ (เฉพาะตอน dev)
                  </button>
                )}
              </div>
            </>
          )}
        </Section>

        <Section icon={<Brain size={20} weight="duotone" />} title="ความจำของน้องมด">
          <p className="text-sm text-ink-soft">มดจดสิ่งที่คุณสนใจไว้ เพื่อตอบให้ตรงขึ้นในแชทถัดไป</p>
          {memory.length ? (
            <>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {memory.map((m) => (
                  <li key={m} className="rounded-full bg-trail-tint px-3 py-1 text-sm text-ink">
                    {m}
                  </li>
                ))}
              </ul>
              <ConfirmButton label="ล้างความจำ" confirm="ล้างสิ่งที่มดจำไว้ทั้งหมด?" onConfirm={onForget} />
            </>
          ) : (
            <p className="mt-2 text-sm text-ink">ตอนนี้ยังไม่ได้จำอะไร</p>
          )}
        </Section>

        <Section icon={<Database size={20} weight="duotone" />} title="ข้อมูลของฉัน">
          <Row
            icon={<CalendarDots size={18} weight="duotone" />}
            label="ตารางเรียน"
            status={timetable ? `${timetable.entries.length} วิชา` : "ยังไม่มี"}
            action={timetable ? <ConfirmButton label="ลบ" confirm="ลบตารางเรียน?" onConfirm={() => void clearTimetable()} compact /> : null}
          />
          <Row
            icon={<Compass size={18} weight="duotone" />}
            label="ผลเข็มทิศสาขา"
            status={saved?.answers ? "มีผลล่าสุด" : "ยังไม่ได้ทำ"}
            action={saved?.answers ? <ConfirmButton label="ลบ" confirm="ลบผลเข็มทิศ?" onConfirm={clearResult} compact /> : null}
          />
        </Section>

        <Section icon={<Eye size={20} weight="duotone" />} title="การแสดงผล">
          <Toggle
            label="ลดภาพเคลื่อนไหว"
            hint="ปิดการเลื่อนและเฟดของแผนที่ เมนู และกล่องต่าง ๆ (ปกติทำตามการตั้งค่าของเครื่อง)"
            checked={prefs.reduceMotion}
            onChange={(v) => setPrefs({ reduceMotion: v })}
          />
          <Toggle
            label="พับแถบซ้ายบนคอมพิวเตอร์"
            hint="เหลือแค่ไอคอน แชทและแผนที่จะกว้างขึ้น"
            checked={prefs.sidebarCollapsed}
            onChange={(v) => setPrefs({ sidebarCollapsed: v })}
          />
        </Section>

        <Section icon={<ShieldCheck size={20} weight="duotone" />} title="ความเป็นส่วนตัว">
          <p className="text-sm text-ink-soft">ทางมดเป็นโปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของ มจธ. คำตอบจาก AI อาจผิดได้</p>
          <Link href="/privacy" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-brand-ink underline">
            อ่านนโยบายความเป็นส่วนตัว
          </Link>
        </Section>
      </div>
    </Dialog>
  );
}

const BTN = "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium disabled:opacity-50";

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="px-5 py-4">
      <h2 className="mb-2 flex items-center gap-2 font-display text-base text-ink [&>svg]:text-brand-ink">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ icon, label, status, action }: { icon: ReactNode; label: string; status: string; action: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center gap-3 text-sm [&>svg]:text-ink-soft">
      {icon}
      <span className="flex-1 text-ink">{label}</span>
      <span className="text-ink-soft">{status}</span>
      {action}
    </div>
  );
}

/** ปุ่มลบสองจังหวะ: กดครั้งแรกถาม กดยืนยันอีกครั้งถึงลบ */
function ConfirmButton({ label, confirm, onConfirm, compact = false }: { label: string; confirm: string; onConfirm: () => void; compact?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={`${BTN} ${compact ? "px-3" : "mt-3"} text-brand-ink hover:bg-brand-tint`}>
        <Trash size={16} /> {label}
      </button>
    );
  }
  return (
    <span role="group" aria-label={confirm} className={`inline-flex flex-wrap items-center gap-1 ${compact ? "" : "mt-3"}`}>
      <span className="text-sm text-ink">{confirm}</span>
      <button
        type="button"
        autoFocus
        onClick={() => {
          onConfirm();
          setAsking(false);
        }}
        className={`${BTN} bg-brand-ink px-3 text-white`}
      >
        ยืนยัน
      </button>
      <button type="button" onClick={() => setAsking(false)} className={`${BTN} px-3 text-ink hover:bg-paper-deep`}>
        ยกเลิก
      </button>
    </span>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-line-strong transition peer-checked:bg-brand-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-ink after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}

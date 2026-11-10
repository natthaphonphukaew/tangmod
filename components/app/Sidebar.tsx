"use client";

import { CalendarDots, ClockCounterClockwise, Compass, GearSix, NotePencil, SidebarSimple, Trash, UserCircle, X } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { AntAvatar, AntMascot } from "@/components/brand/AntMascot";
import type { AuthOptions } from "@/lib/auth-options";
import type { ConversationMeta } from "@/lib/client/history-store";

export type AccountProps = {
  user: { name: string; email: string; image: string | null } | null;
  /** ยังไม่รู้ว่า login อยู่ไหม */
  loading: boolean;
  busy: boolean;
  options: AuthOptions;
  onSignInGoogle: () => void;
  onSignInDev: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

type Props = {
  conversations: ConversationMeta[];
  currentId: string | null;
  /** เวลาที่โหลดรายการล่าสุด (ใช้แบ่ง "วันนี้"/"ก่อนหน้านี้" โดยไม่อ่านนาฬิกาตอน render) */
  listedAt: number;
  account: AccountProps;
  /** หน้าที่เปิดอยู่: แชท หรือ ปฏิทิน (ไฮไลต์เมนู) */
  view: "chat" | "calendar" | "compass";
  onNew: () => void;
  onOpenCompass: () => void;
  onOpenCalendar: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  /** มือถือ: ปุ่มปิด drawer */
  onClose?: () => void;
  /** คอม: พับแถบเหลือไอคอน (ไม่มีใน drawer มือถือ) */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

const dayKey = (t: number) => new Date(t).toDateString();

/*
 * แถบซ้าย: โลโก้ + ปุ่มพับ → เมนูหลัก → ประวัติแชท → ปุ่มโปรไฟล์ (เปิดการตั้งค่า)
 * ปุ่มทุกอันสูง ≥44px บนมือถือ (40 บนคอมสำหรับแถวประวัติ) · รายการที่เปิดอยู่เป็นแคปซูลสีส้มอ่อน
 * พับแล้ว (คอม): เหลือแถบไอคอนกว้าง 72px แบบแอป AI ทั่วไป ประวัติแชทซ่อนไว้จนกว่าจะกางกลับ
 */
export function Sidebar(props: Props) {
  if (props.collapsed) return <Rail {...props} />;
  const { conversations, currentId, listedAt, account, view, onNew, onOpenCompass, onOpenCalendar, onOpen, onDelete, onOpenSettings, onClose, onToggleCollapse } = props;
  const today = dayKey(listedAt);
  const groups = [
    { label: "วันนี้", items: conversations.filter((c) => dayKey(c.updatedAt) === today) },
    { label: "ก่อนหน้านี้", items: conversations.filter((c) => dayKey(c.updatedAt) !== today) },
  ].filter((g) => g.items.length);

  return (
    <nav aria-label="เมนูหลัก" className="flex h-full w-full flex-col bg-paper-deep">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <AntAvatar size={40} />
        <p className="flex-1 font-display text-[22px] leading-none text-ink">ทางมด</p>
        {onToggleCollapse && (
          <button type="button" onClick={onToggleCollapse} aria-label="พับแถบข้าง" title="พับแถบข้าง" className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-card hover:text-ink">
            <SidebarSimple size={22} />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="ปิดเมนู" autoFocus className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-card hover:text-ink">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="space-y-1 px-3">
        {/* แชทใหม่ = หน้าแรก: ไฮไลต์เมื่อยังไม่ได้เปิดแชทไหน */}
        <NavItem icon={<NotePencil size={20} />} label="แชทใหม่" active={view === "chat" && currentId === null} onClick={onNew} />
        <NavItem icon={<Compass size={20} weight="duotone" />} label="เข็มทิศสาขา" active={view === "compass"} onClick={onOpenCompass} />
        <NavItem icon={<CalendarDots size={20} weight="duotone" />} label="ปฏิทินนักศึกษา" active={view === "calendar"} onClick={onOpenCalendar} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {groups.length === 0 && (
          <div className="flex flex-col items-center px-3 py-4 text-center text-sm text-ink-soft">
            <AntMascot pose="laptop" className="mb-2 h-24 w-auto opacity-90" />
            ยังไม่มีประวัติแชท คำถามที่ถามจะเก็บไว้{account.user ? "ในบัญชีของคุณ" : "ในเครื่องนี้"}
          </div>
        )}
        {groups.map((g) => (
          <section key={g.label} className="mb-3">
            <h3 className="px-3 pb-1 text-[13px] font-semibold text-ink-soft">{g.label}</h3>
            <ul className="space-y-0.5">
              {g.items.map((c) => {
                const current = view === "chat" && c.id === currentId;
                return (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      aria-current={current ? "page" : undefined}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 pr-12 text-left text-sm text-ink hover:bg-card aria-[current=page]:bg-brand-tint-strong aria-[current=page]:font-semibold aria-[current=page]:text-brand-deep aria-[current=page]:shadow-[inset_3px_0_0_var(--brand)] active:bg-brand-tint-strong lg:min-h-10"
                    >
                      <ClockCounterClockwise size={18} className={`shrink-0 ${current ? "text-brand-ink" : "text-ink-soft"}`} />
                      <span className="truncate">{c.title}</span>
                    </button>
                    {/* ลบแล้วมีปุ่มเลิกทำใน toast · บนคอมโชว์ตอนชี้ */}
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      aria-label={`ลบแชท ${c.title}`}
                      className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-paper hover:text-ink focus-visible:opacity-100 lg:size-8 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-line p-3">
        <ProfileButton account={account} onClick={onOpenSettings} />
      </div>
    </nav>
  );
}

const NAV_CLASS =
  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink hover:bg-card aria-[current=page]:bg-brand-tint-strong aria-[current=page]:font-semibold aria-[current=page]:text-brand-deep aria-[current=page]:shadow-[inset_3px_0_0_var(--brand)] active:bg-brand-tint-strong [&>svg]:text-brand-ink";

function NavItem({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={NAV_CLASS}>
      {icon}
      {label}
    </button>
  );
}

/** แถบพับ (คอม): ปุ่มกาง → เมนูหลักแบบไอคอน → ปุ่มโปรไฟล์ */
function Rail({ account, view, currentId, onNew, onOpenCompass, onOpenCalendar, onOpenSettings, onToggleCollapse }: Props) {
  const item = (label: string, icon: ReactNode, active: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={RAIL_BTN}>
      {icon}
    </button>
  );
  return (
    <nav aria-label="เมนูหลัก" className="flex h-full w-full flex-col items-center gap-1 bg-paper-deep py-3">
      <button type="button" onClick={onToggleCollapse} aria-label="กางแถบข้าง" title="กางแถบข้าง" className="group relative mb-2 grid size-11 place-items-center rounded-full hover:bg-card">
        <span className="transition group-hover:opacity-0 group-focus-visible:opacity-0">
          <AntAvatar size={36} />
        </span>
        <SidebarSimple size={22} className="absolute text-ink opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
      </button>
      {item("แชทใหม่", <NotePencil size={22} />, view === "chat" && currentId === null, onNew)}
      {item("เข็มทิศสาขา", <Compass size={22} weight="duotone" />, view === "compass", onOpenCompass)}
      {item("ปฏิทินนักศึกษา", <CalendarDots size={22} weight="duotone" />, view === "calendar", onOpenCalendar)}
      <span className="flex-1" />
      <button type="button" onClick={onOpenSettings} aria-label="การตั้งค่าและบัญชี" title="การตั้งค่าและบัญชี" className="grid size-12 place-items-center rounded-full hover:bg-card">
        <Avatar account={account} />
      </button>
    </nav>
  );
}

const RAIL_BTN =
  "grid size-11 place-items-center rounded-xl text-brand-ink hover:bg-card aria-[current=page]:bg-brand-tint-strong aria-[current=page]:text-brand-deep";

/** ท้ายแถบซ้าย: รูปโปรไฟล์ + ชื่อ กดแล้วเปิดการตั้งค่า (เข้าสู่ระบบ ความจำของมด ข้อมูลของฉัน ฯลฯ) */
function ProfileButton({ account, onClick }: { account: AccountProps; onClick: () => void }) {
  const { user, loading } = account;
  if (loading) return <div className="h-14" aria-hidden />;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card)] px-2.5 py-2 text-left hover:bg-card"
    >
      <Avatar account={account} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{user ? user.name : "ผู้ใช้ทั่วไป"}</span>
        <span className="block truncate text-xs text-ink-soft">{user ? "ข้อมูลเก็บในบัญชีนี้" : "ยังไม่ได้เข้าสู่ระบบ"}</span>
      </span>
      <GearSix size={20} className="shrink-0 text-ink-soft" aria-hidden />
      <span className="sr-only">เปิดการตั้งค่า</span>
    </button>
  );
}

function Avatar({ account }: { account: AccountProps }) {
  if (account.user) return <ProfilePhoto name={account.user.name} image={account.user.image} />;
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-ink-soft">
      <UserCircle size={26} weight="duotone" />
    </span>
  );
}

/** รูปโปรไฟล์ Google · ไม่มีรูปหรือโหลดไม่ขึ้น ใช้ตัวอักษรแรกของชื่อบนพื้นส้มอ่อนแทน */
export function ProfilePhoto({ name, image, size = "md" }: { name: string; image: string | null; size?: "md" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "lg" ? "size-12 text-lg" : "size-9 text-base";
  if (image && !broken) {
    return (
      // รูปจาก Google (โดเมนภายนอก) ใช้ img ธรรมดา ไม่ผ่าน next/image
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" onError={() => setBroken(true)} className={`${box} shrink-0 rounded-full object-cover`} referrerPolicy="no-referrer" />
    );
  }
  return (
    <span aria-hidden className={`grid ${box} shrink-0 place-items-center rounded-full bg-brand-tint font-display text-brand-ink`}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

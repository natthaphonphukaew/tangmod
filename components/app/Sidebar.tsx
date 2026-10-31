"use client";

import { Brain, ClockCounterClockwise, Compass, GoogleLogo, NotePencil, SignOut, Trash, UserCircle, X } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AntAvatar } from "@/components/brand/AntMascot";
import type { AuthOptions } from "@/lib/auth-options";
import { programById } from "@/lib/data";
import type { Profile } from "@/lib/ai/schema";
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
  profile: Profile;
  account: AccountProps;
  onNew: () => void;
  onOpenCompass: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onForget: () => void;
  /** มือถือ: ปุ่มปิด drawer */
  onClose?: () => void;
};

const dayKey = (t: number) => new Date(t).toDateString();

/*
 * แถบซ้าย: โลโก้ → เมนูหลัก → ประวัติแชท → ความจำ + บัญชี
 * ปุ่มทุกอันสูง ≥44px บนมือถือ (40 บนคอมสำหรับแถวประวัติ) · รายการที่เปิดอยู่เป็นแคปซูลสีส้มอ่อน
 */
export function Sidebar({ conversations, currentId, listedAt, profile, account, onNew, onOpenCompass, onOpen, onDelete, onForget, onClose }: Props) {
  const today = dayKey(listedAt);
  const groups = [
    { label: "วันนี้", items: conversations.filter((c) => dayKey(c.updatedAt) === today) },
    { label: "ก่อนหน้านี้", items: conversations.filter((c) => dayKey(c.updatedAt) !== today) },
  ].filter((g) => g.items.length);

  return (
    <nav aria-label="ประวัติแชท" className="flex h-full w-full flex-col bg-paper-deep">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <AntAvatar size={40} />
        <p className="flex-1 font-display text-[22px] leading-none text-ink">ทางมด</p>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="ปิดเมนู" autoFocus className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-card hover:text-ink">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="space-y-1 px-3">
        {/* แชทใหม่ = หน้าแรก: ไฮไลต์เมื่อยังไม่ได้เปิดแชทไหน */}
        <NavItem icon={<NotePencil size={20} />} label="แชทใหม่" active={currentId === null} onClick={onNew} />
        <NavItem icon={<Compass size={20} weight="duotone" />} label="เข็มทิศสาขา" onClick={onOpenCompass} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {groups.length === 0 && (
          <p className="px-3 py-2 text-sm text-ink-soft">
            ยังไม่มีประวัติแชท คำถามที่ถามจะเก็บไว้{account.user ? "ในบัญชีของคุณ" : "ในเครื่องนี้"}
          </p>
        )}
        {groups.map((g) => (
          <section key={g.label} className="mb-3">
            <h3 className="px-3 pb-1 text-[13px] font-semibold text-ink-soft">{g.label}</h3>
            <ul className="space-y-0.5">
              {g.items.map((c) => {
                const current = c.id === currentId;
                return (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      aria-current={current ? "page" : undefined}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 pr-12 text-left text-sm text-ink hover:bg-card aria-[current=page]:bg-brand-tint aria-[current=page]:font-semibold lg:min-h-10"
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

      <div className="space-y-2 border-t border-line p-3">
        <MemoryStrip profile={profile} onForget={onForget} />
        <AccountBox {...account} />
      </div>
    </nav>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink hover:bg-card aria-[current=page]:bg-brand-tint aria-[current=page]:font-semibold [&>svg]:text-brand-ink"
    >
      {icon}
      {label}
    </button>
  );
}

/** ท้ายแถบซ้าย: login ไม่บังคับ — login แล้วประวัติแชทตามไปทุกเครื่อง */
function AccountBox({ user, loading, busy, options, onSignInGoogle, onSignInDev, onSignOut, onDeleteAccount }: AccountProps) {
  if (loading) return <div className="h-[68px]" aria-hidden />;
  if (user) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card p-2.5 shadow-[var(--shadow-card)]">
        {user.image ? (
          // รูปโปรไฟล์จาก Google (โดเมนภายนอก) ใช้ img ธรรมดา ไม่ผ่าน next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="size-10 shrink-0 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <UserCircle size={40} weight="duotone" className="shrink-0 text-ink-soft" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{user.name}</p>
          <p className="truncate text-xs text-ink-soft">ประวัติแชทเก็บในบัญชีนี้</p>
          <p className="text-xs">
            <Link href="/privacy" className="inline-flex min-h-8 items-center whitespace-nowrap text-ink-soft underline hover:text-ink">
              ความเป็นส่วนตัว
            </Link>
            <span className="text-ink-soft"> · </span>
            <button type="button" onClick={onDeleteAccount} disabled={busy} className="inline-flex min-h-8 items-center text-ink-soft underline hover:text-brand-ink disabled:opacity-50">
              ลบบัญชี
            </button>
          </p>
        </div>
        <button type="button" onClick={onSignOut} disabled={busy} aria-label="ออกจากระบบ" title="ออกจากระบบ" className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-50">
          <SignOut size={18} />
        </button>
      </div>
    );
  }
  const canLogin = options.google || options.devLogin;
  return (
    <div className="space-y-2">
      {options.google && (
        <button
          type="button"
          onClick={onSignInGoogle}
          disabled={busy}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-medium shadow-[var(--shadow-card)] hover:border-brand/50 disabled:opacity-50"
        >
          <GoogleLogo size={18} weight="bold" /> เข้าสู่ระบบด้วย Google
        </button>
      )}
      {options.devLogin && (
        <button
          type="button"
          onClick={onSignInDev}
          disabled={busy}
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-xs text-ink-soft hover:text-ink disabled:opacity-50"
        >
          ล็อกอินทดสอบ (เฉพาะตอน dev)
        </button>
      )}
      <p className="px-1 text-xs text-ink-soft">
        {canLogin ? "ไม่บังคับ · " : ""}ประวัติแชทเก็บไว้ในเครื่องนี้ ·{" "}
        <Link href="/privacy" className="whitespace-nowrap underline hover:text-ink">
          ความเป็นส่วนตัว
        </Link>
      </p>
    </div>
  );
}

/** ความจำที่โปร่งใส: ผู้ใช้เห็นว่ามดจำอะไร และลบได้ (มีปุ่มเลิกทำใน toast) */
function MemoryStrip({ profile, onForget }: { profile: Profile; onForget: () => void }) {
  // AI มักใส่ชื่อสาขาซ้ำใน interests ("CS") จึงตัดคำที่ซ้ำกับชื่อสาขาออก
  const bits = [
    ...new Set([
      ...profile.considering_programs.slice(0, 3).map((id) => programById.get(id)?.short ?? id),
      ...profile.interests.slice(0, 2),
    ]),
  ];
  if (!bits.length) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-trail-tint py-0.5 pr-0.5 pl-3 text-xs text-ink-soft">
      <Brain size={16} weight="duotone" className="shrink-0 text-brand-ink" />
      <span className="min-w-0 flex-1 truncate" title={bits.join(" · ")}>
        มดจำว่าสนใจ: {bits.join(" · ")}
      </span>
      <button type="button" onClick={onForget} className="min-h-11 min-w-11 shrink-0 rounded-full px-3 font-medium hover:bg-card hover:text-ink lg:min-h-8" title="ลบความจำทั้งหมด">
        ลืม
      </button>
    </div>
  );
}

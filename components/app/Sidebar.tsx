"use client";

import { Brain, ChatCircleText, GoogleLogo, NotePencil, SignOut, Trash, UserCircle, X } from "@phosphor-icons/react";
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
};

type Props = {
  conversations: ConversationMeta[];
  currentId: string | null;
  /** เวลาที่โหลดรายการล่าสุด (ใช้แบ่ง "วันนี้"/"ก่อนหน้านี้" โดยไม่อ่านนาฬิกาตอน render) */
  listedAt: number;
  profile: Profile;
  account: AccountProps;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onForget: () => void;
  /** มือถือ: ปุ่มปิด drawer */
  onClose?: () => void;
};

const dayKey = (t: number) => new Date(t).toDateString();

/** แถบซ้าย: แชทใหม่ + ประวัติแชท + ความจำที่โปร่งใส */
export function Sidebar({ conversations, currentId, listedAt, profile, account, onNew, onOpen, onDelete, onForget, onClose }: Props) {
  const today = dayKey(listedAt);
  const groups = [
    { label: "วันนี้", items: conversations.filter((c) => dayKey(c.updatedAt) === today) },
    { label: "ก่อนหน้านี้", items: conversations.filter((c) => dayKey(c.updatedAt) !== today) },
  ].filter((g) => g.items.length);

  return (
    <nav aria-label="ประวัติแชท" className="flex h-full w-full flex-col bg-paper-deep">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <p className="flex-1 px-1 font-display text-xl text-ink">ทางมด</p>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="ปิดเมนู" className="rounded-md p-1.5 text-ink-soft hover:bg-card hover:text-ink">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="px-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-[10px] border border-line bg-card px-3 py-2 text-sm hover:border-brand/40"
        >
          <NotePencil size={16} /> แชทใหม่
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 && (
          <p className="px-2 py-3 text-xs text-ink-soft">
            ยังไม่มีประวัติแชท คำถามที่ถามจะเก็บไว้{account.user ? "ในบัญชีของคุณ" : "ในเครื่องนี้"}
          </p>
        )}
        {groups.map((g) => (
          <section key={g.label} className="mb-3">
            <h3 className="px-2 pb-1 text-[11px] text-ink-soft">{g.label}</h3>
            <ul>
              {g.items.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpen(c.id)}
                    aria-current={c.id === currentId ? "page" : undefined}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 pr-8 text-left text-sm hover:bg-card aria-[current=page]:bg-card aria-[current=page]:font-medium"
                  >
                    <ChatCircleText size={15} className="shrink-0 text-ink-soft" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    aria-label={`ลบแชท ${c.title}`}
                    className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1 text-ink-soft opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100 max-lg:opacity-60"
                  >
                    <Trash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <MemoryStrip profile={profile} onForget={onForget} />
      <AccountBox {...account} />
    </nav>
  );
}

/** ท้ายแถบซ้าย: login ไม่บังคับ — login แล้วประวัติแชทตามไปทุกเครื่อง */
function AccountBox({ user, loading, busy, options, onSignInGoogle, onSignInDev, onSignOut }: AccountProps) {
  if (loading) return <div className="h-[72px] border-t border-line" aria-hidden />;
  if (user) {
    return (
      <div className="flex items-center gap-2.5 border-t border-line px-3 py-2.5">
        {user.image ? (
          // รูปโปรไฟล์จาก Google (โดเมนภายนอก) ใช้ img ธรรมดา ไม่ผ่าน next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="size-8 shrink-0 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <UserCircle size={32} weight="duotone" className="shrink-0 text-ink-soft" />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm">{user.name}</p>
          <p className="truncate text-[11px] text-ink-soft">ประวัติแชทเก็บในบัญชีนี้</p>
        </div>
        <button type="button" onClick={onSignOut} disabled={busy} aria-label="ออกจากระบบ" title="ออกจากระบบ" className="rounded-md p-1.5 text-ink-soft hover:bg-card hover:text-ink disabled:opacity-50">
          <SignOut size={16} />
        </button>
      </div>
    );
  }
  const canLogin = options.google || options.devLogin;
  return (
    <div className="space-y-2 border-t border-line px-3 py-3">
      {canLogin && (
        <p className="px-1 text-[11px] leading-snug text-ink-soft">เข้าสู่ระบบเพื่อเก็บประวัติแชทไว้ใช้ได้ทุกเครื่อง (ไม่บังคับ)</p>
      )}
      {options.google && (
        <button
          type="button"
          onClick={onSignInGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-line bg-card px-3 py-2 text-sm hover:border-brand/40 disabled:opacity-50"
        >
          <GoogleLogo size={16} weight="bold" /> เข้าสู่ระบบด้วย Google
        </button>
      )}
      {options.devLogin && (
        <button
          type="button"
          onClick={onSignInDev}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line px-3 py-1.5 text-xs text-ink-soft hover:text-ink disabled:opacity-50"
        >
          ล็อกอินทดสอบ (เฉพาะตอน dev)
        </button>
      )}
      <p className="px-1 text-[11px] leading-snug text-ink-soft">
        {canLogin ? "ยังไม่ได้เข้าสู่ระบบ: " : ""}ประวัติแชทเก็บไว้ในเครื่องนี้ · อย่าพิมพ์ข้อมูลส่วนตัว
      </p>
    </div>
  );
}

/** ความจำที่โปร่งใส: ผู้ใช้เห็นว่ามดจำอะไร และลบได้ทันที */
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
    <div className="flex items-start gap-2 border-t border-line px-4 py-2.5 text-xs text-ink-soft">
      <Brain size={14} weight="duotone" className="mt-0.5 shrink-0 text-brand-ink" />
      <span className="min-w-0 flex-1">มดจำว่าสนใจ: {bits.join(" · ")}</span>
      <button type="button" onClick={onForget} className="shrink-0 hover:text-ink" title="ลบความจำทั้งหมด">
        ลืม
      </button>
    </div>
  );
}

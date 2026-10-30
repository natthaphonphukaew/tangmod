"use client";

import { ChatsCircle, Flask, SealCheck } from "@phosphor-icons/react";
import type { Tier } from "@/lib/data/schemas";

const TIERS = {
  official: { label: "ทางการ", Icon: SealCheck, className: "text-brand-ink border-brand/30 bg-brand/5" },
  student: { label: "ไม่เป็นทางการ", Icon: ChatsCircle, className: "text-warn border-warn/30 bg-trail/10" },
  mock: { label: "ข้อมูลตัวอย่าง", Icon: Flask, className: "text-ink-soft border-slate/40 bg-slate/5" },
} satisfies Record<Tier, unknown>;

export function TierBadge({ tier, updatedAt }: { tier: Tier; updatedAt?: string }) {
  const { label, Icon, className } = TIERS[tier];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${className}`}>
      <Icon size={14} weight="duotone" aria-hidden />
      {label}
      {updatedAt && <span className="text-ink-soft">· {formatThaiDate(updatedAt)}</span>}
    </span>
  );
}

export function formatThaiDate(iso: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(iso));
}

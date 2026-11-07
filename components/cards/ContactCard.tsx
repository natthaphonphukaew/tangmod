"use client";

import { AddressBook, ArrowSquareOut, ChatCircleDots, EnvelopeSimple, Phone } from "@phosphor-icons/react";
import { contactById } from "@/lib/data";

/*
 * การ์ดช่องทางติดต่อหน่วยงาน (จาก content/contacts.json ไม่ใช่ข้อความที่ AI เขียน)
 * ปุ่มใหญ่กดได้ทันที: โทร (tel:) อีเมล (mailto:) เว็บ · LINE/Facebook แสดงเป็นข้อความ เพราะเก็บแค่ชื่อบัญชี
 */

/** "02-470-8460-3, 097-205-4526" → [{ label, tel }] · ช่วงเบอร์ 8460-3 โทรเบอร์แรก */
function phones(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(/[,/]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((label) => {
      const digits = label.replace(/^(\d{1,3}-\d{3}-\d{4})-\d+$/, "$1").replace(/[^\d]/g, "");
      return { label, tel: digits.length >= 9 ? digits : null };
    });
}

export function ContactCard({ id }: { id: string }) {
  const c = contactById.get(id);
  if (!c) return null;
  const nums = phones(c.phone);
  return (
    <article className="rounded-[var(--radius-card)] border border-line-strong bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand-ink">
          <AddressBook size={22} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-soft">ช่องทางติดต่อ</p>
          <p className="font-display text-lg leading-snug text-pretty text-ink">{c.label}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {nums.map((n) =>
          n.tel ? (
            <a
              key={n.label}
              href={`tel:${n.tel}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-ink px-4 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              <Phone size={16} weight="bold" aria-hidden /> <span className="sr-only">โทร </span>
              {n.label}
            </a>
          ) : (
            <span key={n.label} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-ink">
              <Phone size={16} aria-hidden /> {n.label}
            </span>
          ),
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-sm font-medium text-ink hover:border-brand/50">
            <EnvelopeSimple size={16} aria-hidden /> {c.email}
          </a>
        )}
        {c.web && (
          <a
            href={c.web}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-sm font-medium text-ink hover:border-brand/50"
          >
            เว็บไซต์ <ArrowSquareOut size={14} aria-hidden />
          </a>
        )}
      </div>
      {c.social && (
        <p className="mt-2.5 flex items-start gap-1.5 text-sm text-ink-soft">
          <ChatCircleDots size={16} className="mt-0.5 shrink-0" aria-hidden /> {c.social}
        </p>
      )}
    </article>
  );
}

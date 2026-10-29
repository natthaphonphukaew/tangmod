/*
 * น้องมดแบบเรขาคณิต สไตล์เดียวกับแผนที่ (แบน สีน้อย) ถือธงไกด์
 */
export function AntAvatar({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <circle cx="20" cy="20" r="20" fill="var(--trail)" />
      {/* หนวด */}
      <path d="M16 13 C14 8 11 7 9 8 M24 13 C26 8 29 7 31 8" stroke="var(--ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* หัว + ตัว */}
      <ellipse cx="20" cy="34" rx="8" ry="6" fill="var(--ink)" />
      <circle cx="20" cy="20" r="8.5" fill="var(--ink)" />
      <circle cx="17" cy="19" r="1.7" fill="var(--paper)" />
      <circle cx="23" cy="19" r="1.7" fill="var(--paper)" />
      <path d="M17.5 23.2 Q20 25 22.5 23.2" stroke="var(--paper)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* ธงไกด์ */}
      <path d="M31 31 L31 15" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M31 15 L37 17.5 L31 20 Z" fill="var(--brand)" />
    </svg>
  );
}

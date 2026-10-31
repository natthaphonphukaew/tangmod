/*
 * น้องมดสีส้ม (สีหลัก มจธ.) วาดเป็น SVG แบน ไม่มีเส้นขอบ — ใช้สี token เดียวกับทั้งแอป
 * AntMascot = ภาพประกอบใหญ่หน้าแรก (โบกมือ ถือธงไกด์) · AntAvatar = หัวมดในวงกลม ใช้ในแชทและโลโก้
 */

const ORANGE = "var(--ant)";
const ORANGE_DEEP = "var(--ant-deep)";
const ORANGE_LIGHT = "var(--ant-light)";
const CHEEK = "#ff9f86";

/** ภาพหน้าแรก: น้องมดโบกมือ ถือธง มีวงพื้นหลัง ประกายดาว และกล่องคำพูด */
export function AntMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 240" className={className} aria-hidden>
      {/* พื้นหลัง: วงอุ่น + ก้อนเล็ก */}
      <circle cx="134" cy="132" r="96" fill="var(--sun)" />
      <circle cx="214" cy="186" r="30" fill="var(--sun)" opacity="0.7" />

      {/* ประกาย */}
      <Sparkle x={42} y={92} r={10} />
      <Sparkle x={226} y={128} r={7} />
      <Sparkle x={64} y={182} r={6} />

      {/* กล่องคำพูด */}
      <g>
        <rect x="176" y="34" width="62" height="40" rx="16" fill="var(--card)" />
        <path d="M190 72 L184 86 L202 73 Z" fill="var(--card)" />
        <circle cx="194" cy="54" r="4.2" fill={ORANGE} />
        <circle cx="207" cy="54" r="4.2" fill={ORANGE} />
        <circle cx="220" cy="54" r="4.2" fill={ORANGE} />
      </g>

      {/* เงาที่พื้น */}
      <ellipse cx="134" cy="226" rx="58" ry="7" fill="var(--ink)" opacity="0.08" />

      {/* ขา (หลังลำตัว) */}
      <g stroke={ORANGE_DEEP} strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M112 186 Q96 202 92 222" />
        <path d="M124 192 Q120 210 118 224" />
        <path d="M146 192 Q152 210 156 224" />
        <path d="M160 186 Q176 200 182 220" />
      </g>

      {/* ท้อง (ปล้องหลัง) */}
      <ellipse cx="174" cy="168" rx="34" ry="28" fill={ORANGE_DEEP} />
      <path d="M160 146 Q170 168 160 192" stroke={ORANGE} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.55" />
      {/* อก */}
      <ellipse cx="136" cy="172" rx="26" ry="27" fill={ORANGE} />
      <ellipse cx="134" cy="180" rx="14" ry="13" fill={ORANGE_LIGHT} />

      {/* แขนขวาถือธง */}
      <path d="M156 162 Q172 150 176 132" stroke={ORANGE} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M180 154 L184 84" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
      <path d="M184 86 L214 98 L183 110 Z" fill="var(--trail)" />
      <circle cx="177" cy="131" r="7" fill={ORANGE} />

      {/* แขนซ้ายโบก */}
      <path d="M116 160 Q96 150 88 124" stroke={ORANGE} strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="87" cy="120" r="8" fill={ORANGE} />
      <path d="M72 112 Q68 120 72 128 M64 108 Q58 120 64 132" stroke={ORANGE_DEEP} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* หนวด */}
      <g stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M116 76 Q104 52 90 44" />
        <path d="M148 76 Q158 50 174 42" />
      </g>
      <circle cx="88" cy="43" r="7" fill={ORANGE_DEEP} />
      <circle cx="176" cy="41" r="7" fill={ORANGE_DEEP} />

      {/* หัว */}
      <circle cx="132" cy="114" r="44" fill={ORANGE} />
      <ellipse cx="118" cy="88" rx="14" ry="8" fill={ORANGE_LIGHT} opacity="0.7" transform="rotate(-20 118 88)" />
      <Eyes cx={132} cy={114} />
      <ellipse cx="104" cy="130" rx="8" ry="5" fill={CHEEK} opacity="0.75" />
      <ellipse cx="160" cy="130" rx="8" ry="5" fill={CHEEK} opacity="0.75" />
      <path d="M122 134 Q132 143 142 134" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** หัวน้องมดในวงกลม สำหรับข้อความในแชท โลโก้ และการ์ด */
export function AntAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={`shrink-0 ${className}`}>
      <circle cx="24" cy="24" r="24" fill="var(--sun)" />
      <g stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M19 14 Q16 8 11 7" />
        <path d="M29 14 Q32 8 37 7" />
      </g>
      <circle cx="11" cy="7" r="2.6" fill={ORANGE_DEEP} />
      <circle cx="37" cy="7" r="2.6" fill={ORANGE_DEEP} />
      <circle cx="24" cy="27" r="15" fill={ORANGE} />
      <Eyes cx={24} cy={26} scale={0.36} />
      <path d="M20.5 32.5 Q24 35.5 27.5 32.5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Eyes({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const dx = 15 * scale;
  return (
    <g>
      {[-1, 1].map((side) => (
        <g key={side}>
          <ellipse cx={cx + side * dx} cy={cy} rx={11 * scale} ry={13 * scale} fill="white" />
          <circle cx={cx + side * dx + 1.5 * scale} cy={cy + 2 * scale} r={7.5 * scale} fill="var(--ink)" />
          <circle cx={cx + side * dx + 4 * scale} cy={cy - 1.5 * scale} r={2.6 * scale} fill="white" />
        </g>
      ))}
    </g>
  );
}

function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  const k = r * 0.28;
  return (
    <path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`}
      fill="var(--trail)"
    />
  );
}

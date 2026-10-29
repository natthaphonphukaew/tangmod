/*
 * ด่านหน้าของ /api/chat: ตัดข้อมูลส่วนตัว + จำกัดจำนวนคำขอต่อ IP
 * rate limit นี้อยู่ในหน่วยความจำของ instance เดียว พอสำหรับ dev/เดโม
 * ตอน deploy จริงให้ย้ายไป Upstash หรือ Postgres (สเปกหัวข้อ 8)
 */

const PII_PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[อีเมล]"],
  [/(?:\+66|0)\d(?:[\s-]?\d){7,8}/g, "[เบอร์โทร]"],
  [/\b\d(?:[\s-]?\d){12}\b/g, "[เลขบัตร]"],
];

export function scrubPII(text: string): string {
  return PII_PATTERNS.reduce((t, [re, label]) => t.replace(re, label), text);
}

const WINDOW_MS = 60_000;
const LIMIT = Number(process.env.CHAT_RATE_LIMIT_PER_MIN ?? 12);
const hits = new Map<string, number[]>();

export function rateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

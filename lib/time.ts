import type { Day } from "./data/schemas";

type Hours = { days: Day[]; open: string; close: string; label?: string };

const DAY_KEYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** วันและนาทีของวันตามเวลากรุงเทพ ไม่ขึ้นกับ timezone ของเครื่องที่รัน */
export function bangkokClock(now: Date): { day: Day; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const day = get("weekday").slice(0, 3).toLowerCase() as Day;
  return { day: DAY_KEYS.includes(day) ? day : "mon", minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** null = ไม่มีข้อมูลเวลา */
export function isOpenNow(hours: Hours[] | undefined, now: Date): boolean | null {
  if (!hours?.length) return null;
  const { day, minutes } = bangkokClock(now);
  return hours.some(
    (h) => h.days.includes(day) && minutes >= toMinutes(h.open) && minutes < toMinutes(h.close),
  );
}

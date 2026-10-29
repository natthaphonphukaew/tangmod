import { describe, expect, it } from "vitest";
import { bangkokClock, isOpenNow } from "./time";

const kfc = [{ days: ["mon", "tue", "wed", "thu", "fri", "sat"] as const, open: "06:00", close: "20:00" }].map(
  (h) => ({ ...h, days: [...h.days] }),
);

describe("time", () => {
  it("แปลงเป็นเวลากรุงเทพ (UTC+7)", () => {
    // 2026-10-28T23:30Z = พฤหัส 29 ต.ค. 06:30 ที่กรุงเทพ
    expect(bangkokClock(new Date("2026-10-28T23:30:00Z"))).toEqual({ day: "thu", minutes: 390 });
  });

  it("KFC เปิดตอนเช้าวันธรรมดา และปิดวันอาทิตย์", () => {
    expect(isOpenNow(kfc, new Date("2026-10-28T23:30:00Z"))).toBe(true);
    expect(isOpenNow(kfc, new Date("2026-11-01T03:00:00Z"))).toBe(false);
  });

  it("ปิดตรงเวลาปิด และไม่มีข้อมูลคืน null", () => {
    expect(isOpenNow(kfc, new Date("2026-10-29T13:00:00Z"))).toBe(false); // พฤหัส 20:00
    expect(isOpenNow(undefined, new Date())).toBeNull();
  });
});

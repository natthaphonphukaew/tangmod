import { describe, expect, it } from "vitest";
import { bangkokClock, holidayOn, isOpenNow } from "./time";

const kfc = [{ days: ["mon", "tue", "wed", "thu", "fri", "sat"] as const, open: "06:00", close: "20:00" }].map(
  (h) => ({ ...h, days: [...h.days] }),
);

describe("time", () => {
  it("รู้ว่าวันนี้เป็นวันหยุดตามวันที่ของกรุงเทพ ไม่ใช่ UTC", () => {
    const list = [{ date: "2026-12-07", label: "วันหยุดชดเชยวันพ่อแห่งชาติ" }];
    // 2026-12-06T17:30Z = จันทร์ 7 ธ.ค. 00:30 ที่กรุงเทพ (UTC ยังเป็นวันที่ 6)
    expect(holidayOn(new Date("2026-12-06T17:30:00Z"), list)?.label).toBe("วันหยุดชดเชยวันพ่อแห่งชาติ");
    expect(holidayOn(new Date("2026-12-06T16:30:00Z"), list)).toBeUndefined();
  });

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

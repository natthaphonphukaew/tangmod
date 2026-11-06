import { describe, expect, it } from "vitest";
import { changeDate, cleanEntries, normalizeTime } from "./extract";
import { roomOn, weeklyConflicts, type TimetableEntry } from "./schema";

describe("อ่านผลจาก AI", () => {
  it("แปลงเวลาแบบไทย", () => {
    expect(normalizeTime("9.30")).toBe("09:30");
    expect(normalizeTime("13:30 น.")).toBe("13:30");
    expect(normalizeTime("25.00")).toBeUndefined();
  });

  it("วันย้ายห้อง: แก้ปี พ.ศ. และแปลงสัปดาห์เป็นวันที่", () => {
    expect(changeDate({ from_date: "2026-10-02" }, undefined)).toBe("2026-10-02");
    expect(changeDate({ from_date: "2569-10-02" }, undefined)).toBe("2026-10-02");
    expect(changeDate({ from_week: 9 }, "2026-08-03")).toBe("2026-09-28");
    expect(changeDate({ from_week: 9 }, undefined)).toBeUndefined();
    expect(changeDate({ from_date: "2023-10-02" }, "2026-08-03")).toBe("2026-10-02"); // ปีพิมพ์ผิดในตาราง
  });

  it("ช่องที่เขียนสองห้อง แยกเป็นห้องแรกกับการย้ายห้อง", () => {
    const { entries, dropped } = cleanEntries([
      { code: "dsi 111", day: "fri", start: "13.30", end: "16.30", room: "CB2308 / LX11/1-2", room_changes: [{ from_week: 9, room: "LX11/1-2" }] },
      { code: "X", day: "mon", start: "10.00", end: "09.00" },
    ], "2026-08-03");
    expect(dropped).toBe(1);
    expect(entries[0]).toMatchObject({ code: "DSI111", start: "13:30", room: "CB2308", room_changes: [{ from: "2026-09-28", room: "LX11/1-2" }] });
  });
});

describe("ตารางรายสัปดาห์", () => {
  const e = (code: string, day: TimetableEntry["day"], start: string, end: string): TimetableEntry => ({ code, day, start, end });

  it("หาคาบเวลาชน (ต่อกันพอดีไม่นับ)", () => {
    const clashes = weeklyConflicts([e("A", "mon", "09:00", "12:00"), e("B", "mon", "11:00", "13:00"), e("C", "mon", "13:00", "14:00"), e("D", "tue", "09:00", "12:00")]);
    expect(clashes.map((c) => `${c.a.code}-${c.b.code}`)).toEqual(["A-B"]);
  });

  it("roomOn ใช้การย้ายล่าสุดที่ถึงวันแล้ว", () => {
    const x: TimetableEntry = { ...e("A", "mon", "09:00", "10:00"), room: "R1", room_changes: [{ from: "2026-11-01", room: "R3" }, { from: "2026-10-01", room: "R2" }] };
    expect(roomOn(x, "2026-09-30")).toBe("R1");
    expect(roomOn(x, "2026-10-15")).toBe("R2");
    expect(roomOn(x, "2026-11-01")).toBe("R3");
  });
});

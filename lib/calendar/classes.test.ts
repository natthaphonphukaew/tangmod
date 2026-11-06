import { describe, expect, it } from "vitest";
import type { Timetable } from "@/lib/timetable/schema";
import { classesOn, roomPlaceId } from "./classes";

// ตารางตัวอย่าง: DSI ปี 3 ภาค 1/2569 (จากรูปตารางจริงที่ผู้ใช้ให้มา ไม่เก็บชื่ออาจารย์)
const dsi3: Timetable = {
  v: 1,
  term_id: "1-2569",
  updated_at: 0,
  entries: [
    { code: "LNG323", day: "tue", start: "09:30", end: "12:30", room: "CB2504" },
    { code: "DSI209", day: "tue", start: "13:30", end: "16:30", room: "CB2304" },
    { code: "DSI122", day: "wed", start: "09:00", end: "10:30", room: "CB2306" },
    { code: "DSI210", day: "wed", start: "13:30", end: "16:30", room: "CB2308" },
    { code: "DSI121", name: "Data Analytic", day: "thu", start: "13:30", end: "16:30", room: "CB2312" },
    { code: "DSI122", day: "fri", start: "10:30", end: "12:00", room: "CB2306" },
    { code: "DSI111", day: "fri", start: "13:30", end: "16:30", room: "LX11/1-2", note: "สัปดาห์ที่ 1–8 เรียน CB2308" },
    { code: "DSI121", name: "Start-up", day: "sat", start: "08:00", end: "11:00", room: "CB2312" },
  ],
};

const codes = (iso: string) => classesOn(iso, dsi3).slots.map((s) => `${s.entry.code}${s.cancelled ? "×" : ""}${s.makeup ? "+" : ""}`);

describe("กางตารางเรียนลงวันจริง", () => {
  it("วันเรียนปกติ เรียงตามเวลา", () => {
    expect(codes("2026-11-04")).toEqual(["DSI122", "DSI210"]); // พุธ
  });

  it("วันหยุดและช่วงสอบ คาบงด", () => {
    expect(codes("2026-12-10")).toEqual(["DSI121×"]); // พฤ. วันรัฐธรรมนูญ (อยู่ในช่วงไฟนอลด้วย แต่วันหยุดมาก่อน)
    expect(codes("2026-12-01")).toEqual(["LNG323×", "DSI209×"]); // อ. ช่วงไฟนอล
    expect(classesOn("2026-12-01", dsi3).slots[0].cancelled).toContain("สอบ");
  });

  it("เสาร์เรียนชดเชย: มีคาบของวันที่ปฏิทินบอก รวมกับคาบเสาร์ของตัวเอง", () => {
    expect(codes("2026-11-07")).toEqual(["DSI121", "LNG323+", "DSI209+"]); // ชดเชยของวันอังคาร
    expect(codes("2026-10-31")).toEqual(["DSI121"]); // ชดเชยของวันจันทร์ ซึ่งไม่มีคาบ
  });

  it("นอกภาคของตาราง หรือไม่มีตาราง ไม่มีคาบ", () => {
    expect(codes("2026-12-20")).toEqual([]);
    expect(codes("2027-01-19")).toEqual([]); // ภาค 2 ไม่ใช่ตารางนี้
    expect(classesOn("2026-11-04", null).slots).toEqual([]);
  });

  it("ห้องเรียน → ตึกบนแผนที่", () => {
    expect(roomPlaceId("CB2504")).toBe("N17");
    expect(roomPlaceId("LX11/1-2")).toBe("N16");
    expect(roomPlaceId("ห้องแลป")).toBeUndefined();
  });
});

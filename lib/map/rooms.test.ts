import { describe, expect, it } from "vitest";
import { findRooms, parseRoom } from "./rooms";

describe("เลขห้อง CB", () => {
  it("CB2301 = CB2 (N17) ชั้น 3 ห้อง 01", () => {
    expect(parseRoom("CB2301 อยู่ไหน")).toEqual({ code: "CB2301", building: "CB2", placeId: "N17", floor: 3, room: "01" });
  });

  it("รับตัวพิมพ์เล็ก ช่องว่าง และขีด", () => {
    expect(parseRoom("cb 4205")?.placeId).toBe("S12");
    expect(parseRoom("เรียนห้อง CB2 301")?.code).toBe("CB2301");
    expect(parseRoom("CB5-1102")).toMatchObject({ placeId: "S11", floor: 11, room: "02" });
  });

  it("คลินิกห้อง 2101 อยู่ชั้น 1 ของ CB2 ตามข้อมูลทางการ", () => {
    expect(parseRoom("CB2101")).toMatchObject({ placeId: "N17", floor: 1 });
  });

  it("ไม่จับเลขที่ผิดรูปหรือไม่มีตึก", () => {
    expect(parseRoom("CB6301")).toBeUndefined();
    expect(parseRoom("CB2001")).toBeUndefined();
    expect(parseRoom("ค่าเทอม 57000")).toBeUndefined();
  });

  it("หลายห้องในข้อความเดียว ไม่ซ้ำ", () => {
    expect(findRooms("CB1201 ไป CB4302 แล้วกลับ CB1201").map((r) => r.code)).toEqual(["CB1201", "CB4302"]);
  });
});

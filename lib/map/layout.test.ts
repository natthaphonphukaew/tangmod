import { describe, expect, it } from "vitest";
import { places } from "@/lib/data";
import { anchorOf, focusBoxOf, mapLayout, trailPath } from "./layout";

describe("map layout", () => {
  it("ทุกสถานที่ใน places.json มีตำแหน่งบนแผนที่", () => {
    const missing = places.filter((p) => !anchorOf(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it("ไม่มีตึกที่ id ซ้ำกัน", () => {
    const ids = mapLayout.buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ตึกที่ไม่มีใน places.json ต้องมีชื่อไว้แสดงเป็น tooltip", () => {
    const placeIds = new Set(places.map((p) => p.id));
    const unnamed = mapLayout.buildings.filter((b) => !placeIds.has(b.id) && !b.name).map((b) => b.id);
    expect(unnamed).toEqual([]);
  });

  it("ทุกตึกอยู่ใน viewBox", () => {
    const [w, h] = mapLayout.viewBox;
    for (const b of mapLayout.buildings) {
      expect(b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h, b.id).toBe(true);
    }
  });

  it("รอยทางมด: น้อยกว่า 2 จุดไม่ต้องวาด, 3 จุดได้ 2 ช่วงโค้ง", () => {
    expect(trailPath([{ x: 0, y: 0 }])).toBe("");
    const d = trailPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d.match(/Q/g)?.length).toBe(2);
  });

  it("กรอบซูมครอบตัวตึกและเผื่อที่ด้านบนให้หมุด", () => {
    const b = mapLayout.buildings.find((x) => x.id === "N11")!;
    const box = focusBoxOf("N11")!;
    expect(box.x).toBeLessThan(b.x);
    expect(box.x + box.w).toBeGreaterThan(b.x + b.w);
    expect(box.y).toBeLessThan(anchorOf("N11")!.y - 50);
    expect(focusBoxOf("main_gate")).toBeDefined();
    expect(focusBoxOf("nowhere")).toBeUndefined();
  });
});

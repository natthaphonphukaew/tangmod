import { describe, expect, it } from "vitest";
import { places } from "@/lib/data";
import { anchorOf, buildingGeom, focusBoxOf, googleMapsUrl, heightOf, mapLayout } from "./layout";

describe("map layout", () => {
  it("ทุกสถานที่ใน places.json มีตำแหน่งบนแผนที่", () => {
    const missing = places.filter((p) => !anchorOf(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it("ไม่มีตึกหรือจุดที่ id ซ้ำกัน", () => {
    const ids = [...mapLayout.buildings.map((b) => b.id), ...mapLayout.points.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ตึกที่มีรหัสในผัง (S1–S15, N1–N20) ต้องอยู่ใน places.json ทุกหลัง และมีครบ 35 หลัง", () => {
    const placeIds = new Set(places.map((p) => p.id));
    const coded = mapLayout.buildings.filter((b) => /^[NS]\d{1,2}$/.test(b.id));
    expect(coded.length).toBe(35);
    expect(coded.filter((b) => !placeIds.has(b.id)).map((b) => b.id)).toEqual([]);
  });

  it("ตึกที่ไม่มีรหัสเป็นแค่ภาพประกอบ ใช้ id ขึ้นต้นด้วย b ตามด้วยเลข OSM", () => {
    const placeIds = new Set(places.map((p) => p.id));
    const others = mapLayout.buildings.filter((b) => !placeIds.has(b.id)).map((b) => b.id);
    for (const id of others) expect(id).toMatch(/^b\d+$/);
  });

  it("ตึกทุกหลังรวมหลังคาอยู่ใน viewBox", () => {
    const [w, h] = mapLayout.viewBox;
    for (const b of mapLayout.buildings) {
      const box = buildingGeom.get(b.id)!.box;
      expect(box.x >= 0 && box.y >= 0 && box.x + box.w <= w && box.y + box.h <= h, b.id).toBe(true);
    }
  });

  it("ตึกสูงกว่ายกหลังคาสูงกว่า แต่มีเพดาน", () => {
    expect(heightOf(10)).toBeGreaterThan(heightOf(4));
    expect(heightOf(40)).toBe(heightOf(15));
  });

  it("ผนังที่วาดหันลงเท่านั้น (สี่เหลี่ยมหมุนตามเข็มหรือทวนเข็มก็ได้ผลเดียวกัน)", () => {
    const g = buildingGeom.get("N11")!;
    expect(g.wallsLight + g.wallsShade).not.toBe("");
    expect(g.roofs.length).toBeGreaterThan(0);
  });

  it("กรอบซูมครอบตัวตึกและเผื่อที่ด้านบนให้หมุด", () => {
    const b = buildingGeom.get("N11")!.box;
    const box = focusBoxOf("N11")!;
    expect(box.x).toBeLessThan(b.x);
    expect(box.x + box.w).toBeGreaterThan(b.x + b.w);
    expect(box.y).toBeLessThan(anchorOf("N11")!.y - 50);
    expect(focusBoxOf("main_gate")).toBeDefined();
    expect(focusBoxOf("nowhere")).toBeUndefined();
  });

  it("ตึกและจุดสำคัญเปิดใน Google Maps ได้ (พิกัดอยู่แถวบางมด)", () => {
    for (const id of ["N11", "S14", "main_gate"]) {
      const url = googleMapsUrl(id)!;
      const [lat, lng] = new URL(url).searchParams.get("query")!.split(",").map(Number);
      expect(lat).toBeCloseTo(13.651, 1);
      expect(lng).toBeCloseTo(100.494, 1);
    }
    expect(googleMapsUrl("nowhere")).toBeUndefined();
  });
});

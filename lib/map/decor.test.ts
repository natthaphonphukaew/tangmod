import { describe, expect, it } from "vitest";
import { buildingShapes, campusTrees, computeTrees, distToSegment, pointInPolygon, polylinePoints } from "./decor";
import { mapLayout } from "./layout";

describe("ต้นไม้บนแผนที่", () => {
  it("ได้ตำแหน่งเดิมทุกครั้ง (seed คงที่) และมีจำนวนพอให้ดูร่มรื่นแต่ไม่หนักเครื่อง", () => {
    expect(computeTrees()).toEqual(campusTrees);
    expect(campusTrees.length).toBeGreaterThan(200);
    expect(campusTrees.length).toBeLessThan(700);
  });

  it("ไม่ล้นขอบแผนที่และไม่ทับตึก (รวมผนังและหลังคาที่ยกขึ้น)", () => {
    const [W, H] = mapLayout.viewBox;
    const shapes = buildingShapes(mapLayout);
    for (const t of campusTrees) {
      expect(t.x - t.r).toBeGreaterThan(0);
      expect(t.y - t.r).toBeGreaterThan(0);
      expect(t.x + t.r).toBeLessThan(W);
      expect(t.y + t.r).toBeLessThan(H);
      for (const s of shapes) expect(pointInPolygon(t, s), `ต้นไม้ (${t.x},${t.y}) ทับตึก`).toBe(false);
    }
  });

  it("ไม่ทับถนน", () => {
    for (const road of mapLayout.roads) {
      const pts = polylinePoints(road.d);
      for (const t of campusTrees) {
        for (let i = 0; i + 1 < pts.length; i++) {
          // ปัดพิกัดต้นไม้เป็นจำนวนเต็มแล้ว เผื่อ 1 หน่วย
          expect(distToSegment(t, pts[i], pts[i + 1])).toBeGreaterThan(road.width / 2 + t.r - 1);
        }
      }
    }
  });

  it("ไม่อยู่ในสระ สนาม หรือลานจอดรถ", () => {
    const blocked = mapLayout.areas.filter((a) => ["water", "track", "field", "court", "parking"].includes(a.kind)).map((a) => polylinePoints(a.d));
    for (const t of campusTrees) for (const b of blocked) expect(pointInPolygon(t, b)).toBe(false);
  });
});

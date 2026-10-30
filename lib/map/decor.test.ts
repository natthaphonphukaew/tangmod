import { describe, expect, it } from "vitest";
import { campusTrees, computeTrees, polylinePoints } from "./decor";
import { mapLayout } from "./layout";

describe("ต้นไม้บนแผนที่", () => {
  it("ได้ตำแหน่งเดิมทุกครั้ง (seed คงที่) และมีจำนวนพอให้ดูมีชีวิต", () => {
    expect(computeTrees()).toEqual(campusTrees);
    expect(campusTrees.length).toBeGreaterThan(40);
    expect(campusTrees.length).toBeLessThan(160);
  });

  it("ไม่ทับตึกและไม่ล้นขอบแผนที่", () => {
    const [W, H] = mapLayout.viewBox;
    for (const t of campusTrees) {
      expect(t.x - t.r).toBeGreaterThan(0);
      expect(t.y - t.r).toBeGreaterThan(0);
      expect(t.x + t.r).toBeLessThan(W);
      expect(t.y + t.r).toBeLessThan(H);
      for (const b of mapLayout.buildings) {
        const inside = t.x > b.x - t.r && t.x < b.x + b.w + t.r && t.y > b.y - t.r && t.y < b.y + b.h + t.r;
        expect(inside, `ต้นไม้ (${t.x},${t.y}) ทับตึก ${b.id}`).toBe(false);
      }
    }
  });

  it("ไม่บังป้ายชื่อพื้นที่", () => {
    const near = campusTrees.filter((t) => Math.abs(t.x - 440) < 30 && Math.abs(t.y - 596) < 9 + t.r);
    expect(near).toEqual([]);
  });

  it("ไม่ทับถนน", () => {
    for (const road of mapLayout.roads) {
      const pts = polylinePoints(road.d);
      for (const t of campusTrees) {
        for (let i = 0; i + 1 < pts.length; i++) {
          const [a, b] = [pts[i], pts[i + 1]];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const k = Math.max(0, Math.min(1, ((t.x - a.x) * dx + (t.y - a.y) * dy) / (dx * dx + dy * dy)));
          const dist = Math.hypot(t.x - (a.x + k * dx), t.y - (a.y + k * dy));
          expect(dist).toBeGreaterThan(road.width / 2 + t.r - 1);
        }
      }
    }
  });
});

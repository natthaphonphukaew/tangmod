import { describe, expect, it } from "vitest";
import { places } from "@/lib/data";
import { mapLayout } from "./layout";
import { routeLength, routePath, walkingRoute } from "./route";

const nodeKeys = new Set(mapLayout.walk.nodes.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`));

describe("เส้นทางเดินของรอยทางมด", () => {
  it("สถานที่เดียวไม่ต้องมีเส้นทาง", () => {
    expect(walkingRoute(["N11"])).toEqual([]);
    expect(routePath([])).toBe("");
  });

  it("เดินจาก S14 ไป N11 ตามทาง: ยาวกว่าเส้นตรง แต่ไม่อ้อมเกินเหตุ และจุดกลางทางเป็นจุดบนทางเดินจริง", () => {
    const route = walkingRoute(["S14", "N11"]);
    expect(route.length).toBeGreaterThan(3);
    const first = route[0];
    const last = route.at(-1)!;
    const straight = Math.hypot(last.x - first.x, last.y - first.y);
    expect(routeLength(route)).toBeGreaterThanOrEqual(straight);
    expect(routeLength(route)).toBeLessThan(straight * 2.5);
    // ตัดหัวท้าย (ขอบตึก และจุดที่ต่อเข้าทางเดิน) ที่เหลือต้องเป็นจุดของกราฟทางเดิน
    const middle = route.slice(2, -2);
    expect(middle.length).toBeGreaterThan(0);
    for (const p of middle) expect(nodeKeys.has(`${p.x},${p.y}`), `${p.x},${p.y}`).toBe(true);
  });

  it("ผ่านหลายจุดตามลำดับ รวมจุดที่ไม่ใช่ตึก (ประตูหน้า)", () => {
    const route = walkingRoute(["main_gate", "N16", "S14"]);
    expect(route.length).toBeGreaterThan(4);
    const gate = mapLayout.points.find((p) => p.id === "main_gate")!;
    expect(route[0]).toEqual({ x: gate.x, y: gate.y });
  });

  it("ทุกสถานที่อยู่ไม่ไกลจากทางเดิน (ไม่มีตึกที่ต้องเดินตัดสนามไปไกล)", () => {
    for (const p of places) {
      const route = walkingRoute([p.id, "N11"]);
      if (p.id === "N11") continue;
      expect(route.length, p.id).toBeGreaterThan(1);
      // ช่วงแรก: จากขอบตึกถึงทางเดิน (จุดอย่างสนามฟุตบอลหมุดอยู่กลางสนาม เผื่อระยะมากกว่า)
      const isPoint = mapLayout.points.some((x) => x.id === p.id);
      expect(Math.hypot(route[1].x - route[0].x, route[1].y - route[0].y), p.id).toBeLessThan(isPoint ? 100 : 60);
    }
  });
});

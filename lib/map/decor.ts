import { heightOf, mapLayout, type MapLayout } from "./layout";

/*
 * ของตกแต่งแผนที่ (ต้นไม้) คำนวณจากผังแบบกฎตายตัว — สุ่มด้วย seed คงที่ จะได้ภาพเดิมทุกครั้งและเทสต์ได้
 * กติกา: ไม่ทับตึก ไม่ทับถนน/คลอง/สนาม/สระ ไม่ล้นขอบแผนที่ และไม่อยู่ชิดกันเกินไป
 */

export type Tree = { x: number; y: number; r: number };
type Pt = { x: number; y: number };

/** PRNG ขนาดเล็กที่ให้ลำดับเดิมทุกครั้งเมื่อ seed เดิม */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** แปลง path แบบเส้นตรง ("M x y L x y ... Z") เป็นจุด — ทุก path ในผังเป็นแบบนี้ */
export function polylinePoints(d: string): Pt[] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

export function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const distToRing = (p: Pt, ring: Pt[]) => Math.min(...ring.map((a, i) => distToSegment(p, a, ring[(i + 1) % ring.length])));

/** รูปตึกทั้งฐานและหลังคา (ต้นไม้ห้ามทับส่วนไหนของตึกเลย) */
export function buildingShapes(layout: MapLayout): Pt[][] {
  return layout.buildings.flatMap((b) =>
    b.polys.flatMap((poly) => {
      const base = poly.pts.map(([x, y]) => ({ x, y }));
      const h = heightOf(poly.floors);
      // ผนังที่ยกขึ้นอยู่ระหว่างฐานกับหลังคา: ใช้กล่องรวมของทั้งสองเป็นพื้นที่ห้าม
      const xs = base.map((q) => q.x);
      const ys = base.map((q) => q.y);
      const box = [
        { x: Math.min(...xs), y: Math.min(...ys) - h },
        { x: Math.max(...xs), y: Math.min(...ys) - h },
        { x: Math.max(...xs), y: Math.max(...ys) },
        { x: Math.min(...xs), y: Math.max(...ys) },
      ];
      return [base, box];
    }),
  );
}

/** จุดนี้วางต้นไม้ได้ไหม */
function makeFreeCheck(layout: MapLayout) {
  const [W, H] = layout.viewBox;
  const shapes = buildingShapes(layout);
  const lines = [
    ...layout.roads.map((r) => ({ pts: polylinePoints(r.d), half: r.width / 2 })),
    ...layout.canals.map((c) => ({ pts: polylinePoints(c.d), half: c.width / 2 + 2 })),
  ];
  // พื้นที่ที่ต้นไม้ห้ามลง: สนาม ลู่ สระ ลานจอด
  const blocked = layout.areas.filter((a) => ["water", "track", "field", "court", "parking"].includes(a.kind)).map((a) => polylinePoints(a.d));
  const labels: Pt[] = layout.areas.flatMap((a) => (a.label && a.label_at ? [{ x: a.label_at[0], y: a.label_at[1] }] : []));
  return (p: Pt, r: number, placed: Tree[]) => {
    if (p.x < r + 2 || p.y < r + 2 || p.x > W - r - 2 || p.y > H - r - 2) return false;
    for (const s of shapes) if (pointInPolygon(p, s) || distToRing(p, s) < r + 2) return false;
    for (const l of lines) {
      for (let i = 0; i + 1 < l.pts.length; i++) if (distToSegment(p, l.pts[i], l.pts[i + 1]) < l.half + r + 1.5) return false;
    }
    for (const b of blocked) if (pointInPolygon(p, b) || distToRing(p, b) < r + 1) return false;
    for (const q of layout.points) if (Math.hypot(p.x - q.x, p.y - q.y) < r + 14) return false;
    for (const q of layout.gates) if (Math.hypot(p.x - q[0], p.y - q[1]) < r + 6) return false;
    for (const l of labels) if (Math.abs(p.x - l.x) < 45 + r && Math.abs(p.y - l.y) < 10 + r) return false;
    return placed.every((t) => Math.hypot(p.x - t.x, p.y - t.y) > t.r + r + 1);
  };
}

export function computeTrees(layout: MapLayout = mapLayout): Tree[] {
  const rand = mulberry32(2026);
  const free = makeFreeCheck(layout);
  const trees: Tree[] = [];
  const add = (p: Pt, r: number) => {
    if (free(p, r, trees)) trees.push({ x: Math.round(p.x), y: Math.round(p.y), r });
  };
  const [W, H] = layout.viewBox;

  // 1) ต้นไม้ริมถนนในมอและริมถนนใหญ่ สองข้างทาง เว้นระยะเท่า ๆ กัน
  for (const road of layout.roads.filter((r) => r.kind === "service" || r.kind === "main")) {
    const pts = polylinePoints(road.d);
    const gap = road.kind === "main" ? 26 : 20;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 8) continue;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const offset = road.width / 2 + 6;
      for (let s = 6; s < len - 4; s += gap) {
        for (const side of [1, -1]) add({ x: a.x + ((b.x - a.x) * s) / len + nx * offset * side, y: a.y + ((b.y - a.y) * s) / len + ny * offset * side }, 4 + Math.round(rand()));
      }
    }
  }

  // 2) สวนและสนามหญ้า: ปลูกหนาแบบสุ่มในรูปพื้นที่
  for (const a of layout.areas.filter((x) => x.kind === "park" || x.kind === "lawn")) {
    const poly = polylinePoints(a.d);
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.max(0, Math.min(...xs)), Math.min(W, Math.max(...xs)), Math.max(0, Math.min(...ys)), Math.min(H, Math.max(...ys))];
    const want = Math.min(220, Math.round(((x1 - x0) * (y1 - y0)) / 900));
    for (let n = 0, tries = 0; n < want && tries < want * 12; tries++) {
      const p = { x: x0 + rand() * (x1 - x0), y: y0 + rand() * (y1 - y0) };
      if (!pointInPolygon(p, poly)) continue;
      const before = trees.length;
      add(p, 5 + Math.round(rand() * 3));
      if (trees.length > before) n++;
    }
  }

  // 3) กระจายในพื้นที่ว่างของแคมปัส
  const ground = layout.areas.find((a) => a.kind === "ground");
  if (ground) {
    const poly = polylinePoints(ground.d);
    for (let placed = 0, tries = 0; placed < 140 && tries < 4000; tries++) {
      const p = { x: rand() * W, y: rand() * H };
      if (!pointInPolygon(p, poly)) continue;
      const before = trees.length;
      add(p, 4 + Math.round(rand() * 2));
      if (trees.length > before) placed++;
    }
  }
  return trees;
}

/** คำนวณครั้งเดียวตอนโหลด module (ผังไม่เปลี่ยนระหว่างใช้งาน) */
export const campusTrees = computeTrees();

import { mapLayout, type MapLayout } from "./layout";

/*
 * ของตกแต่งแผนที่ (ต้นไม้) คำนวณจากผังแบบกฎตายตัว — สุ่มด้วย seed คงที่ จะได้ภาพเดิมทุกครั้งและเทสต์ได้
 * กติกา: ไม่ทับตึก ไม่ทับถนน/คลอง ไม่ล้นขอบแผนที่ และไม่อยู่ชิดกันเกินไป
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

/** แปลง path แบบเส้นตรง ("M x y L x y ...") เป็นจุด — ถนนทุกเส้นในผังเป็นแบบนี้ */
export function polylinePoints(d: string): Pt[] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** จุดนี้วางต้นไม้ได้ไหม (ไม่ทับตึก ถนน คลอง ลู่วิ่ง สระ และต้นอื่น) */
function makeFreeCheck(layout: MapLayout) {
  const [W, H] = layout.viewBox;
  const roads = layout.roads.map((r) => ({ pts: polylinePoints(r.d), half: r.width / 2 }));
  const ellipses = layout.areas.filter((a) => a.type === "ellipse" && a.kind !== "lawn");
  // คลองเป็นเส้นโค้ง ใช้จุดปลาย/จุดควบคุมประมาณเป็นเส้นหักก็พอสำหรับเว้นระยะ
  const canals = layout.canals.map((c) => ({ pts: polylinePoints(c.d), half: c.width / 2 + 10 }));
  // ป้ายชื่อพื้นที่ (สวน สระน้ำ สนามกีฬา) ต้องอ่านออก: กันพื้นที่รอบป้ายไว้
  const labels: Pt[] = layout.areas.flatMap((a) =>
    !a.label ? [] : a.type === "ellipse" ? [{ x: a.cx, y: a.cy + a.ry + 9 }] : a.label_at ? [{ x: a.label_at[0], y: a.label_at[1] - 4 }] : [],
  );
  return (p: Pt, r: number, placed: Tree[]) => {
    if (p.x < r + 4 || p.y < r + 4 || p.x > W - r - 4 || p.y > H - r - 4) return false;
    for (const b of layout.buildings) {
      const m = r + 5;
      if (p.x > b.x - m && p.x < b.x + b.w + m && p.y > b.y - m && p.y < b.y + b.h + m) return false;
    }
    for (const road of [...roads, ...canals]) {
      for (let i = 0; i + 1 < road.pts.length; i++) {
        if (distToSegment(p, road.pts[i], road.pts[i + 1]) < road.half + r + 3) return false;
      }
    }
    for (const e of ellipses) {
      if (e.type !== "ellipse") continue;
      const nx = (p.x - e.cx) / (e.rx + r + 4);
      const ny = (p.y - e.cy) / (e.ry + r + 4);
      if (nx * nx + ny * ny < 1) return false;
    }
    for (const point of layout.points) if (Math.hypot(p.x - point.x, p.y - point.y) < r + 16) return false;
    for (const l of labels) if (Math.abs(p.x - l.x) < 30 + r && Math.abs(p.y - l.y) < 9 + r) return false;
    return placed.every((t) => Math.hypot(p.x - t.x, p.y - t.y) > t.r + r + 3);
  };
}

export function computeTrees(layout: MapLayout = mapLayout): Tree[] {
  const rand = mulberry32(2026);
  const free = makeFreeCheck(layout);
  const trees: Tree[] = [];
  const add = (p: Pt, r: number) => {
    if (free(p, r, trees)) trees.push({ x: Math.round(p.x), y: Math.round(p.y), r });
  };
  const center = { x: layout.viewBox[0] / 2, y: layout.viewBox[1] / 2 };

  // 1) ต้นไม้ริมถนนสายหลัก ฝั่งที่หันเข้าแคมปัส เว้นระยะเท่า ๆ กัน
  for (const road of layout.roads.filter((r) => r.major)) {
    const pts = polylinePoints(road.d);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      let nx = -(b.y - a.y) / len;
      let ny = (b.x - a.x) / len;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if ((center.x - mid.x) * nx + (center.y - mid.y) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      const offset = road.width / 2 + 11;
      for (let s = 18; s < len - 10; s += 38) {
        add({ x: a.x + ((b.x - a.x) * s) / len + nx * offset, y: a.y + ((b.y - a.y) * s) / len + ny * offset }, 6);
      }
    }
  }

  // 2) แนวต้นไม้สองข้างลานหญ้ากลางแคมปัส
  for (const area of layout.areas) {
    if (area.type !== "path" || area.kind !== "lawn") continue;
    const pts = polylinePoints(area.d);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    for (let y = y0 + 14; y < y1 - 8; y += 30) {
      add({ x: x0 - 9, y }, 5);
      add({ x: x1 + 9, y: y + 15 }, 5);
    }
  }

  // 3) สวน: ต้นไม้หนาตาเป็นวงรอบสระน้ำ
  const pond = layout.areas.find((a) => a.type === "ellipse" && a.kind === "pond");
  if (pond && pond.type === "ellipse") {
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 + rand() * 0.2;
      const ring = 1.55 + rand() * 0.9;
      add({ x: pond.cx + Math.cos(angle) * pond.rx * ring, y: pond.cy + Math.sin(angle) * pond.ry * ring * 1.5 }, 5 + Math.round(rand() * 3));
    }
  }

  // 4) กระจายบาง ๆ ในพื้นที่แคมปัสที่ว่าง
  const ground = layout.areas.find((a) => a.type === "path" && a.kind === "ground");
  if (ground && ground.type === "path") {
    const poly = polylinePoints(ground.d);
    let tries = 0;
    let placed = 0;
    while (placed < 22 && tries < 900) {
      tries++;
      const p = { x: 40 + rand() * 800, y: 10 + rand() * 740 };
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

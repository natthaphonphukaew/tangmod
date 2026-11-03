import { mapLayout, type Point } from "./layout";

/*
 * หาเส้นทางเดินจริงระหว่างสถานที่ บนกราฟถนนและทางเดินจาก OSM (mapLayout.walk)
 * ตึก: ออกจากขอบตึกด้านที่ใกล้ทางเดินที่สุด (ไม่มีข้อมูลประตูจริง) แล้วเดินตามทางไปถึงตึกถัดไป
 * จุด (ประตู ป้ายรถ): เริ่มที่ตัวจุดเลย
 */

type XY = [number, number];
type Snap = { edge: number; at: XY; t: number; dist: number };

const { nodes, edges } = mapLayout.walk;
const edgeLen = edges.map(([a, b]) => Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]));
const neighbors: { to: number; w: number }[][] = nodes.map(() => []);
edges.forEach(([a, b], i) => {
  neighbors[a].push({ to: b, w: edgeLen[i] });
  neighbors[b].push({ to: a, w: edgeLen[i] });
});

function closestOnSegment(p: XY, a: XY, b: XY): { at: XY; t: number; dist: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  const at: XY = [a[0] + t * dx, a[1] + t * dy];
  return { at, t, dist: Math.hypot(p[0] - at[0], p[1] - at[1]) };
}

/** จุดบนทางเดินที่ใกล้ p ที่สุด */
function snap(p: XY): Snap {
  let best: Snap = { edge: 0, at: p, t: 0, dist: Infinity };
  edges.forEach(([a, b], i) => {
    const c = closestOnSegment(p, nodes[a], nodes[b]);
    if (c.dist < best.dist) best = { edge: i, ...c };
  });
  return best;
}

/** ขอบตึก (ฐาน) กับจุดบนทางเดินที่ใกล้กันที่สุด: ใช้แทนประตูตึก */
function doorOf(polys: XY[][]): { door: XY; snap: Snap } {
  let best: { door: XY; snap: Snap } | undefined;
  for (const pts of polys) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      // ลองหลายจุดตามแนวผนัง เลือกจุดที่ใกล้ทางเดินสุด
      for (let k = 0; k <= 4; k++) {
        const p: XY = [a[0] + ((b[0] - a[0]) * k) / 4, a[1] + ((b[1] - a[1]) * k) / 4];
        const s = snap(p);
        if (!best || s.dist < best.snap.dist) best = { door: p, snap: s };
      }
    }
  }
  return best!;
}

type Stop = { door: XY; snap: Snap };

const stopCache = new Map<string, Stop | undefined>();
function stopOf(placeId: string): Stop | undefined {
  if (stopCache.has(placeId)) return stopCache.get(placeId);
  const b = mapLayout.buildings.find((x) => x.id === placeId);
  const p = b ? undefined : mapLayout.points.find((x) => x.id === placeId);
  const stop = b ? doorOf(b.polys.map((poly) => poly.pts)) : p ? { door: [p.x, p.y] as XY, snap: snap([p.x, p.y]) } : undefined;
  stopCache.set(placeId, stop);
  return stop;
}

/** Dijkstra จากจุดบนเส้น edge หนึ่ง ไปจุดบนอีก edge หนึ่ง คืนลำดับจุดตามทาง */
function walkBetween(from: Snap, to: Snap): XY[] {
  if (from.edge === to.edge) return [from.at, to.at];
  const [fa, fb] = edges[from.edge];
  const [ta, tb] = edges[to.edge];
  const dist = new Map<number, number>([
    [fa, from.t * edgeLen[from.edge]],
    [fb, (1 - from.t) * edgeLen[from.edge]],
  ]);
  const prev = new Map<number, number>();
  const done = new Set<number>();
  // คิวขนาดเล็ก (กราฟมีไม่กี่ร้อยจุด) ใช้ array หา min ก็เร็วพอ
  const open = new Set([fa, fb]);
  while (open.size) {
    let u = -1;
    for (const n of open) if (u < 0 || dist.get(n)! < dist.get(u)!) u = n;
    open.delete(u);
    done.add(u);
    if (done.has(ta) && done.has(tb)) break;
    for (const { to, w } of neighbors[u]) {
      if (done.has(to)) continue;
      const nd = dist.get(u)! + w;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, u);
        open.add(to);
      }
    }
  }
  const viaA = (dist.get(ta) ?? Infinity) + to.t * edgeLen[to.edge];
  const viaB = (dist.get(tb) ?? Infinity) + (1 - to.t) * edgeLen[to.edge];
  const end = viaA <= viaB ? ta : tb;
  if (!Number.isFinite(Math.min(viaA, viaB))) return [from.at, to.at];
  const chain: number[] = [];
  for (let n: number | undefined = end; n !== undefined; n = prev.get(n)) chain.unshift(n);
  return [from.at, ...chain.map((n) => nodes[n]), to.at];
}

/** ตัดจุดที่อยู่แนวเดียวกันและจุดซ้ำ ให้เส้นเรียบและ path สั้น */
function tidy(pts: XY[]): XY[] {
  const out: XY[] = [];
  for (const p of pts) {
    const last = out.at(-1);
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.5) continue;
    if (out.length >= 2) {
      const a = out.at(-2)!;
      const b = out.at(-1)!;
      const cross = (b[0] - a[0]) * (p[1] - b[1]) - (b[1] - a[1]) * (p[0] - b[0]);
      if (Math.abs(cross) < 0.3) out.pop();
    }
    out.push(p);
  }
  return out;
}

/** เส้นทางเดินผ่านสถานที่ตามลำดับ (ตั้งแต่ 2 แห่งขึ้นไป) เป็นลำดับจุด */
export function walkingRoute(placeIds: string[]): Point[] {
  const stops = placeIds.map(stopOf).filter((s): s is Stop => s !== undefined);
  if (stops.length < 2) return [];
  const pts: XY[] = [stops[0].door];
  for (let i = 0; i + 1 < stops.length; i++) {
    pts.push(...walkBetween(stops[i].snap, stops[i + 1].snap), stops[i + 1].door);
  }
  return tidy(pts).map(([x, y]) => ({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }));
}

/** path ของเส้นทาง: เส้นตรงต่อกัน หักมุมโค้งมนด้วย stroke-linejoin ตอนวาด */
export function routePath(points: Point[]): string {
  if (points.length < 2) return "";
  return "M" + points.map((p) => `${p.x} ${p.y}`).join(" L");
}

export function routeLength(points: Point[]): number {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return n;
}

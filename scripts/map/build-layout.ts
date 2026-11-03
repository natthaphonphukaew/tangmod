/**
 * สร้าง content/map-layout.json จากข้อมูล OpenStreetMap + พิกัดตึกจากผัง MapNavi ของ มจธ.
 *
 *   npx tsx scripts/map/build-layout.ts
 *
 * อินพุต (ดึงครั้งเดียวแล้วเก็บไว้ใน repo ดู docs/research/osm/README.md):
 *   docs/research/osm/campus.json        ตึก ถนน สนาม สระ ประตู ภายในขอบเขต มจธ. บางมด (Overpass)
 *   docs/research/osm/surroundings.json  ถนนและคลองรอบมอ (Overpass)
 *   docs/research/osm/mapnavi-pins.json  พิกัดหมุด Google Maps ของตึก S1–S15, N1–N20 จากหน้า MapNavi
 *
 * ข้อมูล OSM ใช้ภายใต้ ODbL: แผนที่ต้องแสดง "© OpenStreetMap contributors"
 */
import fs from "node:fs";
import path from "node:path";
import { BUILDING_OSM, CAMPUS_WAY, EXTRA_FLOORS, POINTS, SPLITS, SYNTH_SIZE } from "./osm-ids";

type LL = { lat: number; lon: number };
type XY = [number, number];
type OsmEl = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: LL[];
  members?: { role: string; geometry?: LL[] }[];
  nodes?: number[];
};

const root = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const campus: OsmEl[] = read("docs/research/osm/campus.json").elements;
const around: OsmEl[] = read("docs/research/osm/surroundings.json").elements;
const pins: Record<string, { lat: number; lng: number; url: string }> = read("docs/research/osm/mapnavi-pins.json");

// ---------- การฉายพิกัด: equirectangular รอบกลางมอ ทิศเหนือขึ้นบน ----------
const BOUNDS = { south: 13.6481, north: 13.6553, west: 100.4906, east: 100.4971 };
const LAT0 = (BOUNDS.south + BOUNDS.north) / 2;
const KX = Math.cos((LAT0 * Math.PI) / 180) * 111320; // เมตรต่อองศาลองจิจูด
const KY = 110574; // เมตรต่อองศาละติจูด
const W = 1000;
const S = W / ((BOUNDS.east - BOUNDS.west) * KX); // หน่วย viewBox ต่อเมตร
const H = Math.round((BOUNDS.north - BOUNDS.south) * KY * S);

const r1 = (n: number) => Math.round(n * 10) / 10;
const proj = (p: LL): XY => [r1((p.lon - BOUNDS.west) * KX * S), r1((BOUNDS.north - p.lat) * KY * S)];

// ---------- เรขาคณิต ----------
function simplify(pts: XY[], tol: number): XY[] {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1;
    let bestD = tol;
    for (let i = a + 1; i < b; i++) {
      const d = distSeg(pts[i], pts[a], pts[b]);
      if (d > bestD) [best, bestD] = [i, d];
    }
    if (best >= 0) {
      keep[best] = true;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function distSeg(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** ตัดรูปหลายเหลี่ยมด้วยครึ่งระนาบ ฝั่งที่ใกล้ keep มากกว่า other (เส้นแบ่งครึ่งตั้งฉาก) */
function clipCloser(poly: XY[], keep: XY, other: XY): XY[] {
  const side = (p: XY) => (p[0] - keep[0]) ** 2 + (p[1] - keep[1]) ** 2 - ((p[0] - other[0]) ** 2 + (p[1] - other[1]) ** 2);
  const out: XY[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if (sa < 0 !== sb < 0) {
      const t = sa / (sa - sb);
      out.push([r1(a[0] + t * (b[0] - a[0])), r1(a[1] + t * (b[1] - a[1]))]);
    }
  }
  return out;
}

const ring = (g: LL[]): XY[] => {
  const pts = g.map(proj);
  if (pts.length > 1 && pts[0][0] === pts.at(-1)![0] && pts[0][1] === pts.at(-1)![1]) pts.pop();
  return pts;
};
const pathOf = (pts: XY[], closed: boolean) => "M" + pts.map((p) => `${p[0]} ${p[1]}`).join(" L") + (closed ? " Z" : "");
const inView = (pts: XY[], m = 40) => pts.some(([x, y]) => x > -m && y > -m && x < W + m && y < H + m);

function outerOf(el: OsmEl): LL[] {
  if (el.type === "relation") return (el.members ?? []).filter((m) => m.role === "outer").flatMap((m) => m.geometry ?? []);
  return el.geometry ?? [];
}

const byId = new Map(campus.map((e) => [`${e.type[0]}${e.id}`, e]));
const osm = (key: string) => {
  const e = byId.get(key);
  if (!e) throw new Error(`ไม่พบ ${key} ในข้อมูล OSM`);
  return e;
};

// ---------- พื้นที่ ----------
type Area = { kind: string; d: string; label?: string; label_at?: XY };
const areas: Area[] = [];
const centroid = (pts: XY[]): XY => [r1(pts.reduce((s, p) => s + p[0], 0) / pts.length), r1(pts.reduce((s, p) => s + p[1], 0) / pts.length)];
function addArea(el: OsmEl, kind: string, label?: string) {
  const pts = simplify(ring(outerOf(el)), 0.8);
  if (pts.length < 3 || !inView(pts)) return;
  areas.push({ kind, d: pathOf(pts, true), ...(label ? { label, label_at: centroid(pts) } : {}) });
}

const all = [...around, ...campus];
for (const e of all.filter((e) => e.type === "way" && e.tags?.leisure === "park" && e.tags.name === "สวนธนบุรีรมย์")) addArea(e, "park", "สวนธนบุรีรมย์");
addArea(osm(`w${CAMPUS_WAY}`), "ground");
for (const e of campus) {
  const t = e.tags ?? {};
  if (e.type !== "way" || t.building) continue;
  if (t.leisure === "park") addArea(e, "lawn", t.name);
  else if (t.amenity === "parking" || t.amenity === "motorcycle_parking") addArea(e, "parking");
}
for (const e of all) {
  const t = e.tags ?? {};
  if (e.type === "way" && t.natural === "water") addArea(e, "water", t.name === "สระมรกต" ? "สระมรกต" : undefined);
}
for (const e of campus) {
  const t = e.tags ?? {};
  if (e.type !== "way") continue;
  if (t.leisure === "track") addArea(e, "track");
}
for (const e of campus) {
  const t = e.tags ?? {};
  if (e.type !== "way") continue;
  if (t.landuse === "recreation_ground") addArea(e, "field");
  if (t.leisure === "pitch") addArea(e, t.sport === "soccer" ? "field" : "court");
}

// ---------- ถนน คลอง ----------
type Road = { d: string; width: number; kind: "main" | "street" | "service" | "footway"; name?: string };
const roads: Road[] = [];
const seen = new Set<number>();
for (const e of all) {
  const t = e.tags ?? {};
  if (e.type !== "way" || !t.highway || !e.geometry || seen.has(e.id)) continue;
  seen.add(e.id);
  const pts = simplify(e.geometry.map(proj), 0.6);
  if (pts.length < 2 || !inView(pts)) continue;
  const hw = t.highway;
  let r: Road | undefined;
  if (["primary", "secondary", "trunk", "tertiary"].includes(hw)) r = { d: pathOf(pts, false), width: 22, kind: "main", name: t.name };
  else if (["residential", "unclassified"].includes(hw)) r = { d: pathOf(pts, false), width: 9, kind: "street" };
  else if (hw === "service") r = { d: pathOf(pts, false), width: t.service === "parking_aisle" ? 6 : 10, kind: "service" };
  else if (["footway", "pedestrian", "path", "steps"].includes(hw)) r = { d: pathOf(pts, false), width: 3, kind: "footway" };
  if (r) roads.push(r);
}
const order = { main: 0, street: 1, service: 2, footway: 3 };
roads.sort((a, b) => order[a.kind] - order[b.kind]);
// ป้ายชื่อถนนประชาอุทิศ: ใส่ชื่อที่เส้นยาวที่สุดเส้นเดียว
const mains = roads.filter((r) => r.kind === "main");
for (const r of mains) if (r.name !== "ถนนประชาอุทิศ") delete r.name;
const longest = mains.filter((r) => r.name).sort((a, b) => b.d.length - a.d.length)[0];
for (const r of mains) if (r !== longest) delete r.name;

// ---------- กราฟทางเดิน (ใช้หาเส้นทางเดินจริงให้รอยทางมด) ----------
// ถนน/ทางเดินใน OSM ใช้ node ร่วมกันตรงทางแยก จึงต่อเป็นกราฟได้ตรง ๆ จากรายการ node ของแต่ละเส้น
// น้ำหนักต่อระยะทาง: ทางเดินคนถูกสุด ถนนในมอปกติ ซอยและถนนใหญ่แพงขึ้น
// ช่วงที่อยู่นอกรั้วมหาวิทยาลัยคูณเพิ่มอีก 3 เท่า เส้นทางระหว่างตึกในมอจะไม่ออกไปเดินนอกมอ
const WALK_COST: Record<string, number> = {
  footway: 0.85,
  pedestrian: 0.85,
  path: 0.9,
  steps: 1,
  service: 1,
  living_street: 1.5,
  residential: 2,
  unclassified: 2,
  tertiary: 2.5,
  secondary: 2.5,
  primary: 2.5,
};
const OUTSIDE_CAMPUS = 3;
const campusRing = ring(outerOf(osm(`w${CAMPUS_WAY}`)));
const insideCampus = ([x, y]: XY) => {
  let inside = false;
  for (let i = 0, j = campusRing.length - 1; i < campusRing.length; j = i++) {
    const [xi, yi] = campusRing[i];
    const [xj, yj] = campusRing[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const walkIndex = new Map<number, number>();
const walkNodes: XY[] = [];
/** key "a,b" (a < b) → น้ำหนัก */
const walkEdges = new Map<string, number>();
const seenWalk = new Set<number>();
for (const e of all) {
  const typeCost = WALK_COST[e.tags?.highway ?? ""];
  if (e.type !== "way" || !typeCost || !e.geometry || !e.nodes || seenWalk.has(e.id)) continue;
  seenWalk.add(e.id);
  const ids = e.nodes.map((nodeId, i) => {
    if (!walkIndex.has(nodeId)) {
      walkIndex.set(nodeId, walkNodes.length);
      walkNodes.push(proj(e.geometry![i]));
    }
    return walkIndex.get(nodeId)!;
  });
  for (let i = 0; i + 1 < ids.length; i++) {
    const [a, b] = ids[i] < ids[i + 1] ? [ids[i], ids[i + 1]] : [ids[i + 1], ids[i]];
    if (a === b) continue;
    const mid: XY = [(walkNodes[a][0] + walkNodes[b][0]) / 2, (walkNodes[a][1] + walkNodes[b][1]) / 2];
    walkEdges.set(`${a},${b}`, typeCost * (insideCampus(mid) ? 1 : OUTSIDE_CAMPUS));
  }
}
// ทางเดินบางช่วงใน OSM ไม่ได้ต่อกับถนนหลัก (เช่น ทางเดินรอบสระ): ต่อกลุ่มย่อยเข้ากลุ่มใหญ่ที่จุดใกล้สุด ถ้าห่างไม่เกิน ~20 ม.
{
  const adj = new Map<number, number[]>();
  for (const k of walkEdges.keys()) {
    const [a, b] = k.split(",").map(Number);
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const comp = new Map<number, number>();
  const sizes: number[] = [];
  for (const s of adj.keys()) {
    if (comp.has(s)) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [s];
    comp.set(s, id);
    while (stack.length) {
      const x = stack.pop()!;
      n++;
      for (const y of adj.get(x) ?? []) {
        if (comp.has(y)) continue;
        comp.set(y, id);
        stack.push(y);
      }
    }
    sizes.push(n);
  }
  const main = sizes.indexOf(Math.max(...sizes));
  const inMain = [...comp].filter(([, c]) => c === main).map(([n]) => n);
  for (let c = 0; c < sizes.length; c++) {
    if (c === main) continue;
    let best = { d: Infinity, a: -1, b: -1 };
    for (const [n, cc] of comp) {
      if (cc !== c) continue;
      for (const m of inMain) {
        const d = Math.hypot(walkNodes[n][0] - walkNodes[m][0], walkNodes[n][1] - walkNodes[m][1]);
        if (d < best.d) best = { d, a: n, b: m };
      }
    }
    if (best.d <= 20 * S) walkEdges.set(best.a < best.b ? `${best.a},${best.b}` : `${best.b},${best.a}`, 1);
  }
}
// ตัด node ที่อยู่นอกแผนที่ไกล ๆ ออก แล้วจัดเลขใหม่
const keepNode = walkNodes.map(([x, y]) => x > -60 && y > -60 && x < W + 60 && y < H + 60);
const renumber = new Map<number, number>();
const walk = { nodes: [] as XY[], edges: [] as [number, number, number][] };
walkNodes.forEach((p, i) => {
  if (!keepNode[i]) return;
  renumber.set(i, walk.nodes.length);
  walk.nodes.push(p);
});
for (const [k, cost] of walkEdges) {
  const [a, b] = k.split(",").map(Number);
  if (renumber.has(a) && renumber.has(b)) walk.edges.push([renumber.get(a)!, renumber.get(b)!, Math.round(cost * 100) / 100]);
}

const canals: { d: string; width: number }[] = [];
for (const e of all) {
  if (e.type !== "way" || !e.tags?.waterway || !e.geometry) continue;
  const pts = simplify(e.geometry.map(proj), 0.8);
  if (pts.length < 2 || !inView(pts)) continue;
  canals.push({ d: pathOf(pts, false), width: e.tags.waterway === "canal" ? 9 : 4 });
}

// ---------- ตึก ----------
type Poly = { pts: XY[]; floors: number };
type Building = { id: string; polys: Poly[]; name?: string; approx?: boolean; ll?: [number, number] };
const buildings: Building[] = [];
const used = new Set<string>();
const floorsOf = (el: OsmEl, fallback: number) => Number(el.tags?.["building:levels"]) || fallback;

for (const [code, keys] of Object.entries(BUILDING_OSM)) {
  const pin = pins[code];
  const polys: Poly[] = keys.map((k) => {
    used.add(k);
    const el = osm(k);
    return { pts: simplify(ring(outerOf(el)), 0.5), floors: floorsOf(el, EXTRA_FLOORS[code] ?? 4) };
  });
  const split = SPLITS[code];
  if (split) {
    const me = proj({ lat: pin.lat, lon: pin.lng });
    const other = proj({ lat: pins[split].lat, lon: pins[split].lng });
    for (const p of polys) p.pts = clipCloser(p.pts, me, other);
  }
  buildings.push({ id: code, polys, ll: [pin.lat, pin.lng] });
}

// ตึกที่ OSM ไม่มีรูปร่าง: กล่องรอบหมุด MapNavi (approx) ขนาดในหน่วยเมตร
for (const [code, [wm, hm]] of Object.entries(SYNTH_SIZE)) {
  const pin = pins[code];
  const [cx, cy] = proj({ lat: pin.lat, lon: pin.lng });
  const w = (wm * S) / 2;
  const h = (hm * S) / 2;
  const pts: XY[] = [
    [r1(cx - w), r1(cy - h)],
    [r1(cx + w), r1(cy - h)],
    [r1(cx + w), r1(cy + h)],
    [r1(cx - w), r1(cy + h)],
  ];
  buildings.push({ id: code, polys: [{ pts, floors: EXTRA_FLOORS[code] ?? 3 }], approx: true, ll: [pin.lat, pin.lng] });
}

for (const e of campus) {
  const key = `${e.type[0]}${e.id}`;
  if (!e.tags?.building || used.has(key)) continue;
  const pts = simplify(ring(outerOf(e)), 0.5);
  if (pts.length < 3) continue;
  const name = e.tags.name ?? e.tags["name:en"];
  buildings.push({ id: `b${e.id}`, polys: [{ pts, floors: e.tags.building === "roof" ? 1 : floorsOf(e, 2) }], ...(name ? { name } : {}) });
}

const missing = Object.keys(pins).filter((c) => !buildings.some((b) => b.id === c));
if (missing.length) throw new Error(`ตึกที่ยังไม่มีรูปร่าง: ${missing.join(", ")}`);

// ---------- จุด ----------
const points = POINTS.map((p) => {
  const ll = p.osm ? (() => {
    const e = osm(p.osm);
    if (e.type === "node") return { lat: e.lat!, lon: e.lon! };
    const g = outerOf(e);
    return { lat: g.reduce((s, q) => s + q.lat, 0) / g.length, lon: g.reduce((s, q) => s + q.lon, 0) / g.length };
  })() : { lat: p.lat!, lon: p.lon! };
  const [x, y] = proj(ll);
  return { id: p.id, kind: p.kind, x, y, ll: [Math.round(ll.lat * 1e6) / 1e6, Math.round(ll.lon * 1e6) / 1e6] };
});
const gates: XY[] = campus
  .filter((e) => e.type === "node" && e.tags?.barrier === "gate" && !POINTS.some((p) => p.osm === `n${e.id}`))
  .map((e) => proj({ lat: e.lat!, lon: e.lon! }));

const layout = {
  viewBox: [W, H],
  reference: {
    title: "OpenStreetMap (ODbL) และผังอาคาร MapNavi มจธ.",
    url: "https://bgm.kmutt.ac.th/MapNavi/MAPNAVI.html",
    date: "2026-11",
  },
  attribution: "© OpenStreetMap contributors",
  north_deg: 0,
  areas,
  roads,
  canals,
  buildings,
  points,
  gates,
  walk,
};

// ตัวเลขยาวทำให้ไฟล์ใหญ่ เขียนแบบ 1 รายการต่อบรรทัด อ่าน diff ง่าย
const lines = (arr: unknown[]) => "[\n" + arr.map((x) => "    " + JSON.stringify(x)).join(",\n") + "\n  ]";
const out =
  "{\n" +
  Object.entries(layout)
    .map(([k, v]) => {
      if (k === "walk") return `  "walk": {
    "nodes": ${JSON.stringify(walk.nodes)},
    "edges": ${JSON.stringify(walk.edges)}
  }`;
      return `  ${JSON.stringify(k)}: ${Array.isArray(v) && typeof v[0] === "object" ? lines(v) : JSON.stringify(v)}`;
    })
    .join(",\n") +
  "\n}\n";
fs.writeFileSync(path.join(root, "content/map-layout.json"), out);
console.log(`viewBox ${W}x${H} · ตึก ${buildings.length} · ถนน ${roads.length} · พื้นที่ ${areas.length} · จุด ${points.length} · ประตูอื่น ${gates.length} · ทางเดิน ${walk.nodes.length} จุด ${walk.edges.length} ช่วง`);

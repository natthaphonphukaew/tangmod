import { z } from "zod";
import layoutJson from "@/content/map-layout.json";

/*
 * เรขาคณิตของแผนที่ แยกจาก places.json (ซึ่งเก็บแค่ข้อเท็จจริง)
 * สร้างด้วย scripts/map/build-layout.ts จาก OpenStreetMap (รูปตึก ถนน สนาม สระ) + หมุดตึกจากผัง MapNavi ของ มจธ.
 * ฉายพิกัดจริงแบบ equirectangular ทิศเหนือขึ้นบน (ตรงกับ Google Maps) หน่วยเป็นหน่วยของ viewBox
 */

const XY = z.tuple([z.number(), z.number()]);
const LatLng = z.tuple([z.number(), z.number()]);

const Building = z.object({
  id: z.string(),
  /** ตึกหนึ่งอาจมีหลายปีก แต่ละปีกมีจำนวนชั้นของตัวเอง (ใช้กำหนดความสูงของภาพ) */
  polys: z.array(z.object({ pts: z.array(XY).min(3), floors: z.number().int().positive() })).min(1),
  /** ชื่อจาก OSM ของตึกที่ไม่มีใน places.json (tooltip) */
  name: z.string().optional(),
  /** OSM ไม่มีรูปตึกนี้ วาดเป็นกล่องประมาณรอบหมุดของผังทางการ */
  approx: z.boolean().optional(),
  /** หมุด Google Maps ของตึกจากผัง MapNavi */
  ll: LatLng.optional(),
});
export type MapBuilding = z.infer<typeof Building>;

const Area = z.object({
  kind: z.enum(["ground", "park", "lawn", "water", "parking", "track", "field", "court"]),
  d: z.string(),
  label: z.string().optional(),
  label_at: XY.optional(),
});
export type MapArea = z.infer<typeof Area>;

const MapLayout = z.object({
  viewBox: z.tuple([z.number(), z.number()]),
  reference: z.object({ title: z.string(), url: z.url(), date: z.string() }),
  attribution: z.string(),
  north_deg: z.number(),
  areas: z.array(Area),
  roads: z.array(
    z.object({
      d: z.string(),
      width: z.number(),
      kind: z.enum(["main", "street", "service", "footway"]),
      /** ชื่อถนน (ใส่เฉพาะที่ยืนยันได้) วาดตามแนวถนน */
      name: z.string().optional(),
    }),
  ),
  canals: z.array(z.object({ d: z.string(), width: z.number() })),
  buildings: z.array(Building),
  points: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["gate", "bus", "shuttle", "shop", "landmark", "sport"]),
      x: z.number(),
      y: z.number(),
      ll: LatLng,
    }),
  ),
  /** ประตูอื่น ๆ ในมอ (ตกแต่ง ไม่มีข้อมูลให้กด) */
  gates: z.array(XY),
  /** กราฟทางเดิน (ถนน ทางเดิน บันได จาก OSM) สำหรับหาเส้นทางเดินจริง ดู lib/map/route.ts */
  /** edges: [จุด a, จุด b, น้ำหนักต่อระยะ] ทางเดินคนถูกกว่าถนน และนอกรั้วมอแพงกว่าในมอ */
  walk: z.object({ nodes: z.array(XY), edges: z.array(z.tuple([z.number().int(), z.number().int(), z.number().positive()])) }),
});
export type MapLayout = z.infer<typeof MapLayout>;
export type MapPoint = MapLayout["points"][number];

export const mapLayout = MapLayout.parse(layoutJson);

export type Point = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };

/** ความสูงของภาพตึก (หน่วย viewBox) จากจำนวนชั้น — บีบไว้ ไม่งั้นตึก 15 ชั้นบังตึกข้างหลังหมด */
export const heightOf = (floors: number) => 4 + Math.min(floors, 15) * 1.3;

const shift = (pts: [number, number][], dy: number): [number, number][] => pts.map(([x, y]) => [x, y - dy]);
const toPath = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${x} ${y}`).join(" L") + " Z";

function bboxOf(pts: [number, number][]): Box {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function area(pts: [number, number][]) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return a / 2;
}

/** จุดศูนย์ถ่วงของรูปหลายเหลี่ยม (ใช้วางป้ายกลางหลังคา) */
function centroidOf(pts: [number, number][]): Point {
  const a = area(pts);
  if (Math.abs(a) < 1e-6) {
    const b = bboxOf(pts);
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    cx += (pts[j][0] + pts[i][0]) * f;
    cy += (pts[j][1] + pts[i][1]) * f;
  }
  return { x: cx / (6 * -a), y: cy / (6 * -a) };
}

export type BuildingGeom = {
  /** ผนังด้านที่หันลง (หันเข้าหาคนดู) แยกตามแสง: ซ้าย/ขวา */
  wallsLight: string;
  wallsShade: string;
  roofs: string[];
  /** กรอบรวมฐานและหลังคา */
  box: Box;
  /** กลางหลังคาปีกที่ใหญ่สุด สำหรับป้ายชื่อ */
  labelAt: Point;
  /** ขอบล่างของฐาน ใช้เรียงลำดับการวาด (ตึกที่อยู่ล่างวาดทีหลัง ทับตึกข้างหลัง) */
  baseY: number;
};

/**
 * 2.5D แบบแผนที่ภาพวาด: ยกหลังคาขึ้นตามความสูง แล้ววาดผนังเฉพาะด้านที่หันลง (ด้านที่คนดูเห็น)
 * ด้านที่หันซ้ายสว่างกว่าด้านที่หันขวาเล็กน้อย ให้ดูมีแสงเงา
 */
function geomOf(b: MapBuilding): BuildingGeom {
  let light = "";
  let shade = "";
  const roofs: string[] = [];
  const all: [number, number][] = [];
  let best = { a: -1, at: { x: 0, y: 0 } };
  for (const poly of b.polys) {
    const h = heightOf(poly.floors);
    const pts = poly.pts;
    const ccw = area(pts) > 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const c = pts[(i + 1) % pts.length];
      const dx = c[0] - a[0];
      const dy = c[1] - a[1];
      // normal ด้านนอก (ทิศขึ้นกับการวนของจุด) · y ชี้ลง
      const nx = ccw ? -dy : dy;
      const ny = ccw ? dx : -dx;
      if (ny <= 0) continue;
      const quad = `M${a[0]} ${a[1]} L${c[0]} ${c[1]} L${c[0]} ${c[1] - h} L${a[0]} ${a[1] - h} Z`;
      if (nx <= 0) light += quad;
      else shade += quad;
    }
    const roof = shift(pts, h);
    roofs.push(toPath(roof));
    all.push(...pts, ...roof);
    const a = Math.abs(area(pts));
    if (a > best.a) best = { a, at: centroidOf(roof) };
  }
  return { wallsLight: light, wallsShade: shade, roofs, box: bboxOf(all), labelAt: best.at, baseY: Math.max(...b.polys.flatMap((p) => p.pts.map((q) => q[1]))) };
}

export const buildingGeom = new Map(mapLayout.buildings.map((b) => [b.id, geomOf(b)]));

/** ตึกเรียงตามลำดับการวาด: ไกล (บน) ก่อน ใกล้ (ล่าง) ทีหลัง */
export const buildingsInDrawOrder = [...mapLayout.buildings].sort((a, b) => buildingGeom.get(a.id)!.baseY - buildingGeom.get(b.id)!.baseY);

// ปักหมุดกลางหลังคา เยื้องขึ้นเหนือป้ายชื่อเล็กน้อย (ตึกรูปตัว L ถ้าใช้ขอบบนของกรอบ หมุดจะลอยไปนอกตึก)
const anchors = new Map<string, Point>([
  ...mapLayout.buildings.map((b) => {
    const g = buildingGeom.get(b.id)!;
    return [b.id, { x: g.labelAt.x, y: Math.max(g.box.y + 2, g.labelAt.y - 14) }] as const;
  }),
  ...mapLayout.points.map((p) => [p.id, { x: p.x, y: p.y }] as const),
]);

/** จุดปักหมุดของสถานที่บนแผนที่ (ขอบบนของหลังคา หรือตัวจุด) */
export function anchorOf(placeId: string): Point | undefined {
  return anchors.get(placeId);
}

export function hasAnchor(placeId: string): boolean {
  return anchors.has(placeId);
}

const latLngs = new Map<string, [number, number]>([
  ...mapLayout.buildings.flatMap((b) => (b.ll ? [[b.id, b.ll] as const] : [])),
  ...mapLayout.points.map((p) => [p.id, p.ll] as const),
]);

/** ลิงก์เปิดตำแหน่งใน Google Maps (พิกัดจากผัง MapNavi หรือ OSM) */
export function googleMapsUrl(placeId: string): string | undefined {
  const ll = latLngs.get(placeId);
  return ll && `https://www.google.com/maps/search/?api=1&query=${ll[0]},${ll[1]}`;
}

/** id ของ element ใน DOM สำหรับใช้ซูมไปหา */
export const domIdOf = (placeId: string) => `map-${placeId}`;

/** id ของกรอบโปร่งใสรอบสถานที่ (เผื่อที่ให้หมุด) ที่ใช้เป็นเป้าตอนซูม */
export const focusIdOf = (placeId: string) => `focus-${placeId}`;

// zoomToElement ไม่มี padding ซูมไปที่ตัวตึกตรง ๆ หมุดจะชิดขอบจอ จึงขยายกรอบเอง (ด้านบนเผื่อความสูงหมุดและป้าย)
const PAD = { side: 50, top: 80, bottom: 40 };

/** กรอบสำหรับซูมไปหาสถานที่ หน่วยเดียวกับ viewBox */
export function focusBoxOf(placeId: string): Box | undefined {
  const g = buildingGeom.get(placeId);
  const p = g ? undefined : mapLayout.points.find((x) => x.id === placeId);
  const r = g?.box ?? (p && { x: p.x, y: p.y, w: 0, h: 0 });
  if (!r) return undefined;
  return { x: r.x - PAD.side, y: r.y - PAD.top, w: r.w + PAD.side * 2, h: r.h + PAD.top + PAD.bottom };
}

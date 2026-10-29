import { z } from "zod";
import layoutJson from "@/content/map-layout.json";

/*
 * เรขาคณิตของแผนที่ แยกจาก places.json (ซึ่งเก็บแค่ข้อเท็จจริง)
 * พิกัดเป็นหน่วยของ viewBox วางตามผังจาก master plan ทางการ (ส.ค. 2563) แบบประมาณ
 * ทิศเหนือของผังทางการชี้ไปทางขวา เราวาดตามนั้น คนที่เคยเห็นผังจะได้คุ้นตา
 */

const Rect = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() });

const Building = Rect.extend({
  id: z.string(),
  /** ชื่อสำหรับตึกที่ไม่มีใน places.json (แสดงเป็น tooltip เท่านั้น) */
  name: z.string().optional(),
});
export type MapBuilding = z.infer<typeof Building>;

const Area = z.discriminatedUnion("type", [
  z.object({ type: z.literal("path"), kind: z.enum(["ground", "park", "lawn", "water", "plaza"]), d: z.string() }),
  z.object({
    type: z.literal("ellipse"),
    kind: z.enum(["track", "field", "pond", "lawn"]),
    cx: z.number(),
    cy: z.number(),
    rx: z.number(),
    ry: z.number(),
  }),
]);
export type MapArea = z.infer<typeof Area>;

const MapLayout = z.object({
  viewBox: z.tuple([z.number(), z.number()]),
  reference: z.object({ title: z.string(), url: z.url(), date: z.string() }),
  north_deg: z.number(),
  areas: z.array(Area),
  roads: z.array(z.object({ d: z.string(), width: z.number(), major: z.boolean().default(false) })),
  canals: z.array(z.object({ d: z.string(), width: z.number() })),
  buildings: z.array(Building),
  points: z.array(z.object({ id: z.string(), x: z.number(), y: z.number() })),
});
export type MapLayout = z.infer<typeof MapLayout>;

export const mapLayout = MapLayout.parse(layoutJson);

export type Point = { x: number; y: number };

// ปักหมุดที่ขอบบนของตึก หมุดจะได้ไม่บังรหัสตึกที่อยู่กลางตึก
const anchors = new Map<string, Point>([
  ...mapLayout.buildings.map((b) => [b.id, { x: b.x + b.w / 2, y: b.y + 4 }] as const),
  ...mapLayout.points.map((p) => [p.id, { x: p.x, y: p.y }] as const),
]);

/** จุดปักหมุดของสถานที่บนแผนที่ (ขอบบนกลางตึก หรือตัวจุด) */
export function anchorOf(placeId: string): Point | undefined {
  return anchors.get(placeId);
}

export function hasAnchor(placeId: string): boolean {
  return anchors.has(placeId);
}

/** id ของ element ใน DOM สำหรับใช้ซูมไปหา */
export const domIdOf = (placeId: string) => `map-${placeId}`;

/**
 * เส้นรอยทางมดที่ผ่านจุดตามลำดับ: โค้งเล็กน้อยแบบ quadratic
 * ทุกช่วงโค้งไปทางเดียวกัน เพื่อให้ดูเหมือนทางเดินมากกว่าเส้นตรง
 */
export function trailPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const bend = 0.18;
    d += ` Q${(mx - dy * bend).toFixed(1)} ${(my + dx * bend).toFixed(1)} ${b.x} ${b.y}`;
  }
  return d;
}

/** id ของกรอบโปร่งใสรอบสถานที่ (เผื่อที่ให้หมุด) ที่ใช้เป็นเป้าตอนซูม */
export const focusIdOf = (placeId: string) => `focus-${placeId}`;

// zoomToElement ไม่มี padding ซูมไปที่ตัวตึกตรง ๆ หมุดจะชิดขอบจอ จึงขยายกรอบเอง (ด้านบนเผื่อความสูงหมุด)
const PAD = { side: 36, top: 72, bottom: 28 };

/** กรอบสำหรับซูมไปหาสถานที่ หน่วยเดียวกับ viewBox */
export function focusBoxOf(placeId: string): { x: number; y: number; w: number; h: number } | undefined {
  const b = mapLayout.buildings.find((x) => x.id === placeId);
  const p = b ? undefined : mapLayout.points.find((x) => x.id === placeId);
  const r = b ?? (p && { x: p.x, y: p.y, w: 0, h: 0 });
  if (!r) return undefined;
  return { x: r.x - PAD.side, y: r.y - PAD.top, w: r.w + PAD.side * 2, h: r.h + PAD.top + PAD.bottom };
}

"use client";

import { Bus, Door, Minus, Plus, ArrowsIn, SoccerBall, Star, Storefront, Van, type Icon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { placeById } from "@/lib/data";
import { campusTrees } from "@/lib/map/decor";
import {
  anchorOf,
  buildingGeom,
  buildingsInDrawOrder,
  domIdOf,
  focusBoxOf,
  focusIdOf,
  mapLayout,
  trailPath,
  type MapArea,
  type MapBuilding,
  type MapPoint,
} from "@/lib/map/layout";

export type MapHighlight = { placeId: string; n: number };

type Props = {
  /** สถานที่จากคำตอบ เรียงตามลำดับที่ต้องการให้มดพาไป */
  highlights: MapHighlight[];
  selectedId?: string | null;
  onSelect?: (placeId: string) => void;
  /** เปลี่ยนเมื่อขนาดกรอบแผนที่เปลี่ยน (เช่น bottom sheet บนมือถือขยับ) เพื่อซูมหาหมุดใหม่ */
  refitKey?: string;
  /** ความสูงของสิ่งที่บังขอบล่างของแผนที่ (การ์ดสถานที่) — เลื่อนแผนที่ให้ตึกที่เลือกอยู่เหนือมัน */
  avoidBottom?: number;
};

const [VB_W, VB_H] = mapLayout.viewBox;

const AREA_FILL: Record<MapArea["kind"], string> = {
  ground: "var(--map-ground)",
  park: "var(--map-lawn)",
  lawn: "var(--map-lawn)",
  water: "var(--map-water)",
  parking: "var(--map-parking)",
  track: "var(--map-track)",
  field: "var(--map-field)",
  court: "var(--map-court)",
};

const POINT_ICON: Record<MapPoint["kind"], Icon> = {
  gate: Door,
  bus: Bus,
  shuttle: Van,
  shop: Storefront,
  landmark: Star,
  sport: SoccerBall,
};

/** ตึกสำคัญ (คณะ อาหาร ที่อ่านหนังสือ หอ) ทาสีส้มและขึ้นป้ายก่อน แบบแผนที่ท่องเที่ยว */
const isKey = (id: string) => {
  const kind = placeById.get(id)?.kind;
  return kind === "faculty" || kind === "food" || kind === "study" || kind === "dorm";
};

export function CampusMap({ highlights, selectedId, onSelect, refitKey, avoidBottom = 0 }: Props) {
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");

  const lit = useMemo(() => new Set(highlights.map((h) => h.placeId)), [highlights]);
  const focusKey = highlights.map((h) => h.placeId).join(",");

  // ป้ายชื่อและไอคอนต้องมีขนาดบนจอคงที่ ไม่ว่าจะซูมแค่ไหน: เก็บ "พิกเซลต่อหน่วย viewBox" ไว้คำนวณ
  const [fit, setFit] = useState(0.5);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect();
      const s = zoomRef.current?.instance.state.scale ?? 1;
      if (r.width) setFit(Math.min(r.width / s / VB_W, r.height / s / VB_H));
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);
  // ปัดค่า scale เป็นขั้น ไม่ให้ป้ายคำนวณใหม่ทุกเฟรมระหว่างซูม
  const px = fit * (Math.round(scale * 8) / 8);

  // ซูมให้เห็นทุกหมุดของคำตอบ หรือกลับไปภาพรวมเมื่อไม่มีหมุด
  useEffect(() => {
    const ref = zoomRef.current;
    if (!ref) return;
    const time = reduceMotion ? 0 : 650;
    if (focusKey) {
      ref.zoomToElement(focusKey.split(",").map(focusIdOf), { maxScale: 2.6, animationTime: time, animationType: "easeOut" });
    } else {
      ref.centerView(1, time, "easeOut");
    }
  }, [focusKey, refitKey, reduceMotion]);

  // การ์ดสถานที่ลอยอยู่ล่างแผนที่: ถ้าบังตึกที่เลือก เลื่อนแผนที่ขึ้นให้ตึกอยู่เหนือการ์ด
  // หน่วงไว้ให้การซูมหาหมุด (650ms) จบก่อน ไม่งั้นอ่านตำแหน่งระหว่างแอนิเมชัน
  useEffect(() => {
    if (!selectedId || !avoidBottom) return;
    const timer = setTimeout(() => {
      const ref = zoomRef.current;
      const frame = frameRef.current?.getBoundingClientRect();
      const target = document.getElementById(domIdOf(selectedId))?.getBoundingClientRect();
      if (!ref || !frame || !target) return;
      const limit = frame.bottom - avoidBottom - 24;
      if (target.bottom <= limit) return;
      // ref.state เป็นค่าตอนสร้าง ref ค่าปัจจุบันอยู่ที่ instance.state
      const { positionX, positionY, scale } = ref.instance.state;
      ref.setTransform(positionX, positionY - (target.bottom - limit), scale, reduceMotion ? 0 : 300, "easeOut");
    }, reduceMotion ? 0 : 700);
    return () => clearTimeout(timer);
    // refitKey/focusKey: แผนที่ซูมหาหมุดใหม่ (เช่น sheet มือถือยุบตอนเปิดการ์ด) ต้องเลื่อนหลบการ์ดใหม่หลังซูมเสร็จ
  }, [selectedId, avoidBottom, refitKey, focusKey, reduceMotion]);

  const trailPoints = highlights.map((h) => anchorOf(h.placeId)).filter((p) => p !== undefined);
  const trail = trailPath(trailPoints);
  const trailId = `trail-${uid}-${focusKey}`;

  return (
    // container query: มือถือให้แผนที่กว้างเต็มจอ แล้วสูงตามสัดส่วนผัง (ปัดดูขึ้นลงได้) แทนการย่อจนอ่านไม่ออก
    <div ref={frameRef} className="relative h-full w-full overflow-hidden bg-[var(--map-bg)] [container-type:size]" style={{ "--map-ratio": VB_W / VB_H } as CSSProperties}>
      <TransformWrapper
        ref={zoomRef}
        minScale={1}
        maxScale={5}
        centerOnInit
        limitToBounds
        wheel={{ step: 0.12 }}
        doubleClick={{ mode: "zoomIn", step: 0.6 }}
        onTransform={(_, s) => setScale(s.scale)}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%", height: "100%" }}
          contentClass="max-lg:h-[max(100cqh,calc(100cqw/var(--map-ratio)))]!"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full select-none"
            // ห้ามใช้ role="img": จะทำให้ปุ่มตึกข้างในถูกซ่อนจาก screen reader
            role="group"
            aria-label="แผนที่แคมปัส มจธ. บางมด กดตึกเพื่อดูรายละเอียด"
          >
            <WindowPattern />
            <StaticLayers />

            <g>
              {buildingsInDrawOrder.map((b) => (
                <BuildingShape
                  key={b.id}
                  building={b}
                  dimmed={lit.size > 0 && !lit.has(b.id)}
                  lit={lit.has(b.id)}
                  selected={selectedId === b.id}
                  onSelect={onSelect}
                />
              ))}
            </g>

            {trail && (
              <g key={trailId} pointerEvents="none">
                <defs>
                  <mask id={`${trailId}-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={VB_W} height={VB_H}>
                    <motion.path
                      d={trail}
                      fill="none"
                      stroke="white"
                      strokeWidth={18}
                      strokeLinecap="round"
                      initial={{ pathLength: reduceMotion ? 1 : 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35 * trailPoints.length + 0.3, ease: "easeInOut", delay: 0.25 }}
                    />
                  </mask>
                </defs>
                <path id={trailId} d={trail} fill="none" stroke="none" />
                <g mask={`url(#${trailId}-mask)`}>
                  <path d={trail} className="ant-march" fill="none" stroke="var(--ink)" strokeOpacity={0.55} strokeWidth={8} strokeDasharray="1 11" strokeLinecap="round" />
                  <path d={trail} className="ant-march" fill="none" stroke="var(--trail)" strokeWidth={5} strokeDasharray="1 11" strokeLinecap="round" />
                </g>
                {!reduceMotion && (
                  <g>
                    <Ant />
                    <animateMotion dur={`${2.2 * trailPoints.length}s`} repeatCount="indefinite" rotate="auto" begin="1s">
                      <mpath href={`#${trailId}`} />
                    </animateMotion>
                  </g>
                )}
              </g>
            )}

            <PointMarkers px={px} lit={lit} onSelect={onSelect} />
            <Labels px={px} lit={lit} selectedId={selectedId ?? null} />

            {highlights.map((h) => {
              const box = focusBoxOf(h.placeId);
              return box && <rect key={h.placeId} id={focusIdOf(h.placeId)} x={box.x} y={box.y} width={box.w} height={box.h} fill="none" pointerEvents="none" />;
            })}

            {highlights.map((h, i) => {
              const at = anchorOf(h.placeId);
              if (!at) return null;
              return <Pin key={`${focusKey}-${h.placeId}`} x={at.x} y={at.y} n={h.n} size={Math.min(1.4, Math.max(0.55, 1 / (px * 1.6)))} delay={reduceMotion ? 0 : 0.12 * i} />;
            })}
          </svg>
        </TransformComponent>
      </TransformWrapper>

      <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-[var(--radius-sm)] border border-line-strong bg-card shadow-[var(--shadow-float)]">
        <ZoomButton label="ซูมเข้า" onClick={() => zoomRef.current?.zoomIn(0.5)}>
          <Plus size={18} />
        </ZoomButton>
        <ZoomButton label="ซูมออก" onClick={() => zoomRef.current?.zoomOut(0.5)}>
          <Minus size={18} />
        </ZoomButton>
        <ZoomButton label="ดูทั้งแคมปัส" onClick={() => zoomRef.current?.centerView(1, 400)}>
          <ArrowsIn size={18} />
        </ZoomButton>
      </div>

      <Legend hidden={Boolean(selectedId)} />
    </div>
  );
}

/** พื้น สวน สระ คลอง ถนน ต้นไม้ ประตู — ไม่เปลี่ยนตามคำตอบ วาดครั้งเดียว */
const StaticLayers = memo(function StaticLayers() {
  const named = mapLayout.roads.filter((r) => r.name);
  const labelled = mapLayout.areas.filter((a) => a.label && a.label_at);
  return (
    <g aria-hidden pointerEvents="none">
      {mapLayout.areas.map((a, i) => (
        <path
          key={i}
          d={a.d}
          fill={AREA_FILL[a.kind]}
          stroke={a.kind === "ground" ? "var(--map-road-edge)" : a.kind === "field" || a.kind === "court" ? "white" : "none"}
          strokeOpacity={a.kind === "ground" ? 0.8 : 0.7}
          strokeWidth={a.kind === "ground" ? 1.5 : 1}
        />
      ))}

      {mapLayout.canals.map((c, i) => (
        <g key={i}>
          <path d={c.d} fill="none" stroke="var(--map-water)" strokeWidth={c.width} strokeLinecap="round" strokeLinejoin="round" />
          <path d={c.d} fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="6 12" strokeLinecap="round" />
        </g>
      ))}

      {/* ขอบถนนทุกเส้นก่อน แล้วค่อยเนื้อถนน ทางแยกจะได้ต่อกันเนียน */}
      {mapLayout.roads.map((r, i) =>
        r.kind === "footway" ? null : (
          <path key={`e${i}`} d={r.d} fill="none" stroke="var(--map-road-edge)" strokeWidth={r.width + 2.5} strokeLinejoin="round" strokeLinecap="round" />
        ),
      )}
      {mapLayout.roads.map((r, i) =>
        r.kind === "footway" ? (
          <path key={i} d={r.d} fill="none" stroke="var(--map-footway)" strokeWidth={r.width} strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
        ) : (
          <path key={i} d={r.d} fill="none" stroke="var(--map-road)" strokeWidth={r.width} strokeLinejoin="round" strokeLinecap="round" />
        ),
      )}
      {mapLayout.roads
        .filter((r) => r.kind === "main")
        .map((r, i) => (
          <path key={`c${i}`} d={r.d} fill="none" stroke="var(--map-road-edge)" strokeWidth={1.2} strokeDasharray="10 9" strokeLinejoin="round" />
        ))}

      {campusTrees.map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${t.y})`}>
          <ellipse cx={1.2} cy={t.r * 0.75} rx={t.r * 0.9} ry={t.r * 0.32} fill="var(--ink)" opacity={0.12} />
          <circle r={t.r} fill="var(--map-tree)" />
          <circle cx={-t.r * 0.32} cy={-t.r * 0.32} r={t.r * 0.55} fill="var(--map-tree-light)" />
        </g>
      ))}

      {mapLayout.gates.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x={-4} y={-2} width={8} height={4} rx={1} fill="var(--slate)" opacity={0.7} />
        </g>
      ))}

      {labelled.map((a, i) => (
        <text key={i} x={a.label_at![0]} y={a.label_at![1]} textAnchor="middle" dominantBaseline="central" fontSize={15} fill="#2f6b52" className="map-label" paintOrder="stroke" stroke="white" strokeWidth={3} strokeOpacity={0.7}>
          {a.label}
        </text>
      ))}
      {named.map((r, i) => (
        <g key={i}>
          <path id={`road-name-${i}`} d={r.d} fill="none" stroke="none" />
          <text fontSize={13} fill="var(--ink-soft)" dominantBaseline="central">
            <textPath href={`#road-name-${i}`} startOffset="50%" textAnchor="middle">
              {r.name}
            </textPath>
          </text>
        </g>
      ))}
    </g>
  );
});

function BuildingShape({
  building: b,
  dimmed,
  lit,
  selected,
  onSelect,
}: {
  building: MapBuilding;
  dimmed: boolean;
  lit: boolean;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const place = placeById.get(b.id);
  const g = buildingGeom.get(b.id)!;
  const interactive = Boolean(place && onSelect);
  const key = isKey(b.id);
  const roof = lit ? "var(--building-lit)" : key ? "var(--map-roof-key)" : "var(--map-roof)";
  const wall = key ? "var(--map-wall-key)" : "var(--map-wall)";
  const wallShade = key ? "var(--map-wall-key-shade)" : "var(--map-wall-shade)";
  const edge = key ? "var(--map-wall-key-shade)" : "var(--map-wall-shade)";

  const activate = () => interactive && onSelect!(b.id);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <g
      id={domIdOf(b.id)}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${b.id} ${place!.name_th}` : undefined}
      onClick={activate}
      onKeyDown={onKeyDown}
      className={`outline-none transition-opacity duration-500 ${interactive ? "cursor-pointer [&:focus-visible_.roof]:stroke-[var(--brand-ink)] [&:focus-visible_.roof]:[stroke-width:3] [&:hover_.roof]:brightness-[1.03]" : ""}`}
      opacity={dimmed ? 0.6 : 1}
    >
      <title>{place ? `${b.id} ${place.name_th}` : (b.name ?? "อาคาร")}</title>
      {/* เงาที่พื้น */}
      {b.polys.map((p, i) => (
        <path key={`s${i}`} d={"M" + p.pts.map(([x, y]) => `${x + 3} ${y + 2}`).join(" L") + " Z"} fill="var(--ink)" opacity={0.1} />
      ))}
      <path d={g.wallsLight} fill={wall} />
      <path d={g.wallsShade} fill={wallShade} />
      <path d={g.wallsLight + g.wallsShade} fill="url(#map-windows)" opacity={0.55} />
      {g.roofs.map((d, i) => (
        <path
          key={i}
          d={d}
          className="roof"
          fill={roof}
          stroke={selected ? "var(--brand-ink)" : edge}
          strokeWidth={selected ? 3 : 1}
          strokeDasharray={b.approx && !selected ? "4 3" : undefined}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

/** ลายหน้าต่างบนผนังตึก */
function WindowPattern() {
  return (
    <defs>
      <pattern id="map-windows" width={5} height={4} patternUnits="userSpaceOnUse">
        <rect x={1} y={1} width={3} height={1.6} rx={0.4} fill="white" />
      </pattern>
    </defs>
  );
}

type Placed = { x: number; y: number; w: number; h: number };
const overlaps = (a: Placed, b: Placed) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * ป้ายชื่อตึกแบบการ์ด (รหัสส้ม + ชื่อย่อ) ขนาดบนจอคงที่ทุกระดับซูม
 * วางตามลำดับความสำคัญ ป้ายที่ชนกับป้ายที่วางไปแล้วจะไม่แสดง (ซูมเข้าแล้วจะมีที่พอให้โผล่)
 * ตึกที่ไฮไลต์จากคำตอบแสดงเสมอ
 */
const Labels = memo(function Labels({ px, lit, selectedId }: { px: number; lit: Set<string>; selectedId: string | null }) {
  const u = 1 / px; // หน่วย viewBox ต่อ 1 พิกเซลบนจอ
  const items = useMemo(() => {
    const rank = (id: string) => (lit.has(id) || id === selectedId ? 0 : isKey(id) ? 1 : placeById.has(id) ? 2 : 3);
    const candidates = mapLayout.buildings
      .filter((b) => placeById.has(b.id))
      .sort((a, b) => rank(a.id) - rank(b.id) || buildingGeom.get(b.id)!.box.w * buildingGeom.get(b.id)!.box.h - buildingGeom.get(a.id)!.box.w * buildingGeom.get(a.id)!.box.h);
    const placed: Placed[] = [];
    const out: { id: string; short?: string; x: number; y: number; w: number; h: number; strong: boolean }[] = [];
    for (const b of candidates) {
      const place = placeById.get(b.id)!;
      const at = buildingGeom.get(b.id)!.labelAt;
      const strong = rank(b.id) === 0;
      const short = place.short && place.short !== b.id ? place.short : undefined;
      // ซูมไกลมาก ตึกรองแสดงแค่รหัส
      const showName = Boolean(short) && (strong || rank(b.id) === 1 || px > 0.9);
      const wPx = Math.max(b.id.length * 8.5, showName ? short!.length * 7 : 0) + 14;
      const hPx = showName ? 34 : 20;
      const box = { x: at.x - (wPx * u) / 2, y: at.y - (hPx * u) / 2, w: wPx * u, h: hPx * u };
      if (!strong && placed.some((p) => overlaps(p, box))) continue;
      placed.push(box);
      out.push({ id: b.id, short: showName ? short : undefined, ...box, strong });
    }
    return out;
  }, [u, px, lit, selectedId]);

  return (
    <g aria-hidden pointerEvents="none">
      {items.map((l) => (
        <g key={l.id} transform={`translate(${l.x} ${l.y}) scale(${u})`}>
          <rect
            width={l.w / u}
            height={l.h / u}
            rx={7}
            fill={l.strong ? "var(--trail-tint)" : "white"}
            stroke={isKey(l.id) || l.strong ? "var(--brand)" : "var(--line-strong)"}
            strokeWidth={l.strong ? 2 : 1.3}
          />
          <text x={l.w / u / 2} y={l.short ? 11 : 10.5} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="var(--brand-ink)" className="font-mono">
            {l.id}
          </text>
          {l.short && (
            <text x={l.w / u / 2} y={25} textAnchor="middle" dominantBaseline="central" fontSize={11.5} fill="var(--ink)">
              {l.short}
            </text>
          )}
        </g>
      ))}
    </g>
  );
});

/** จุดสำคัญที่ไม่ใช่ตึก (ประตู ป้ายรถ ร้าน สนาม) เป็นไอคอนกลม ขนาดบนจอคงที่ */
const PointMarkers = memo(function PointMarkers({ px, lit, onSelect }: { px: number; lit: Set<string>; onSelect?: (id: string) => void }) {
  const u = 1 / px;
  return (
    <g>
      {mapLayout.points.map((p) => {
        const place = placeById.get(p.id);
        if (!place) return null;
        const IconC = POINT_ICON[p.kind];
        const showName = lit.has(p.id) || px > 1.1;
        return (
          <g
            key={p.id}
            id={domIdOf(p.id)}
            role="button"
            tabIndex={0}
            aria-label={place.name_th}
            onClick={() => onSelect?.(p.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(p.id)}
            className="cursor-pointer outline-none transition-opacity duration-500 [&:focus-visible>g>circle]:stroke-[var(--brand-ink)] [&:focus-visible>g>circle]:[stroke-width:3]"
            opacity={lit.size > 0 && !lit.has(p.id) ? 0.6 : 1}
          >
            <title>{place.name_th}</title>
            <g transform={`translate(${p.x} ${p.y}) scale(${u})`}>
              <circle r={11} fill="white" stroke="var(--slate)" strokeWidth={1.5} />
              <IconC size={14} x={-7} y={-7} color="var(--ink-soft)" weight="bold" />
              {showName && (
                <text x={15} y={0} dominantBaseline="central" fontSize={12} fill="var(--ink)" paintOrder="stroke" stroke="white" strokeWidth={3}>
                  {place.short ?? place.name_th}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
});

function Legend({ hidden }: { hidden: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`absolute bottom-3 left-3 ${hidden ? "hidden" : "flex"} max-w-[15rem] flex-col gap-1 rounded-[var(--radius-sm)] bg-card/95 px-2 py-1.5 text-xs sm:gap-1.5 sm:px-2.5 sm:py-2 text-ink-soft shadow-[var(--shadow-card)]`}>
      <div className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden>
          <circle cx="13" cy="13" r="12" fill="none" stroke="var(--line)" />
          <g transform={`rotate(${mapLayout.north_deg} 13 13)`}>
            <path d="M13 4 L17 15 L13 13 L9 15 Z" fill="var(--brand-ink)" />
          </g>
        </svg>
        <span className="max-sm:sr-only">ทิศเหนือขึ้นบน</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto -my-1 min-h-8 rounded-full px-2 font-medium text-brand-ink hover:bg-brand-tint"
        >
          {open ? "ซ่อน" : "สัญลักษณ์"}
        </button>
      </div>
      {open && (
        <ul className="grid gap-1 pt-0.5">
          <LegendRow swatch="var(--map-roof-key)" edge="var(--map-wall-key-shade)" label="คณะ อาหาร ที่เรียน หอพัก" />
          <LegendRow swatch="var(--map-roof)" edge="var(--map-wall-shade)" label="อาคารอื่น" />
          <LegendRow swatch="var(--map-roof)" edge="var(--map-wall-shade)" dashed label="ตำแหน่งโดยประมาณ" />
          <LegendRow swatch="var(--map-lawn)" label="สวน สนามหญ้า" />
          <LegendRow swatch="var(--map-water)" label="สระน้ำ คลอง" />
          <LegendRow swatch="var(--map-footway)" label="ทางเดิน" />
        </ul>
      )}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-[10px] underline-offset-2 hover:underline sm:text-[11px]">
        {mapLayout.attribution}
      </a>
    </div>
  );
}

function LegendRow({ swatch, edge, dashed, label }: { swatch: string; edge?: string; dashed?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="inline-block size-3.5 shrink-0 rounded-[3px]"
        style={{ background: swatch, border: edge ? `1.5px ${dashed ? "dashed" : "solid"} ${edge}` : undefined }}
      />
      {label}
    </li>
  );
}

function Pin({ x, y, n, size, delay }: { x: number; y: number; n: number; size: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`} pointerEvents="none">
      <motion.g
        initial={{ opacity: 0, y: -26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 22, delay }}
      >
        <ellipse cx={0} cy={1} rx={7} ry={2.5} fill="var(--ink)" opacity={0.25} />
        <path
          d="M0 0 C-4 -10 -15 -18 -15 -31 A15 15 0 1 1 15 -31 C15 -18 4 -10 0 0 Z"
          fill="var(--brand-ink)"
          stroke="var(--card)"
          strokeWidth={2.5}
        />
        <text x={0} y={-31} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={600} fill="white" className="font-display">
          {n}
        </text>
      </motion.g>
    </g>
  );
}

/** มดตัวจิ๋วที่เดินตามรอยทาง หันหัวไปทาง +x */
function Ant() {
  return (
    <g fill="var(--ink)" stroke="var(--ink)" strokeWidth={1.1} strokeLinecap="round">
      <path d="M-3 -1 L-6 -6 M-3 1 L-6 6 M0 -1 L0 -6 M0 1 L0 6 M3 -1 L6 -6 M3 1 L6 6" fill="none" />
      <ellipse cx={-6} cy={0} rx={4.2} ry={3.2} stroke="none" />
      <ellipse cx={0} cy={0} rx={2.6} ry={2.2} stroke="none" />
      <circle cx={4.8} cy={0} r={2.6} stroke="none" />
      <path d="M6.6 -1.4 L9.5 -4 M6.6 1.4 L9.5 4" fill="none" strokeWidth={0.8} />
    </g>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center text-ink-soft transition-colors hover:bg-paper hover:text-ink not-last:border-b not-last:border-line lg:size-10"
    >
      {children}
    </button>
  );
}

"use client";

import { Minus, Plus, ArrowsIn } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, type CSSProperties, type KeyboardEvent } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { placeById } from "@/lib/data";
import { campusTrees } from "@/lib/map/decor";
import { anchorOf, domIdOf, focusBoxOf, focusIdOf, mapLayout, trailPath, type MapArea, type MapBuilding } from "@/lib/map/layout";

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
  ground: "var(--road)",
  park: "var(--park)",
  lawn: "var(--park)",
  water: "var(--water)",
  pond: "var(--water)",
  plaza: "var(--paper-deep)",
  track: "#d98e6c",
  field: "var(--park-deep)",
};

export function CampusMap({ highlights, selectedId, onSelect, refitKey, avoidBottom = 0 }: Props) {
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");

  const lit = useMemo(() => new Set(highlights.map((h) => h.placeId)), [highlights]);
  const focusKey = highlights.map((h) => h.placeId).join(",");

  // ซูมให้เห็นทุกหมุดของคำตอบ หรือกลับไปภาพรวมเมื่อไม่มีหมุด
  useEffect(() => {
    const ref = zoomRef.current;
    if (!ref) return;
    const time = reduceMotion ? 0 : 650;
    if (focusKey) {
      ref.zoomToElement(focusKey.split(",").map(focusIdOf), { maxScale: 1.8, animationTime: time, animationType: "easeOut" });
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
    // container query: มือถือแนวตั้งให้แผนที่กว้างเท่าความสูง×อัตราส่วนผัง (ปัดดูซ้ายขวาได้) แทนการย่อจนอ่านไม่ออก
    <div ref={frameRef} className="relative h-full w-full overflow-hidden [container-type:size]" style={{ "--map-ratio": VB_W / VB_H } as CSSProperties}>
      <TransformWrapper
        ref={zoomRef}
        minScale={1}
        maxScale={4}
        centerOnInit
        limitToBounds
        wheel={{ step: 0.12 }}
        doubleClick={{ mode: "zoomIn", step: 0.6 }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ height: "100%" }}
          contentClass="w-full! max-lg:w-[max(100cqw,var(--map-ratio)*100cqh)]!"
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full select-none"
            // ห้ามใช้ role="img": จะทำให้ปุ่มตึกข้างในถูกซ่อนจาก screen reader
            role="group"
            aria-label="แผนที่แคมปัส มจธ. บางมด กดตึกเพื่อดูรายละเอียด"
          >
            {mapLayout.areas.map((area, i) => (
              <AreaShape key={i} area={area} />
            ))}

            {mapLayout.canals.map((c, i) => (
              <g key={i}>
                <path d={c.d} fill="none" stroke="var(--water)" strokeWidth={c.width} strokeLinecap="round" />
                {/* ระลอกน้ำ */}
                <path d={c.d} fill="none" stroke="var(--card)" strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="7 13" strokeLinecap="round" />
              </g>
            ))}

            {mapLayout.roads.map((r, i) => (
              <g key={i}>
                <path d={r.d} fill="none" stroke="var(--building-edge)" strokeOpacity={0.35} strokeWidth={r.width + 3} strokeLinejoin="round" strokeLinecap="round" />
                <path d={r.d} fill="none" stroke={r.major ? "#e2d4bd" : "var(--card)"} strokeWidth={r.width} strokeLinejoin="round" strokeLinecap="round" />
                {r.major && (
                  <path d={r.d} fill="none" stroke="var(--card)" strokeOpacity={0.85} strokeWidth={1.4} strokeDasharray="11 10" strokeLinejoin="round" />
                )}
              </g>
            ))}

            <MapDecor />

            <g className="transition-opacity duration-500">
              {mapLayout.buildings.map((b) => (
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

            {mapLayout.points.map((p) => (
              <PointMarker key={p.id} id={p.id} x={p.x} y={p.y} dimmed={lit.size > 0 && !lit.has(p.id)} onSelect={onSelect} />
            ))}

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

            <g aria-hidden="true" pointerEvents="none">
              {mapLayout.buildings
                .filter((b) => lit.has(b.id))
                .map((b) => (
                  <BuildingLabel key={b.id} building={b} lit />
                ))}
            </g>

            {highlights.map((h) => {
              const box = focusBoxOf(h.placeId);
              return box && <rect key={h.placeId} id={focusIdOf(h.placeId)} x={box.x} y={box.y} width={box.w} height={box.h} fill="none" pointerEvents="none" />;
            })}

            {highlights.map((h, i) => {
              const at = anchorOf(h.placeId);
              if (!at) return null;
              return <Pin key={`${focusKey}-${h.placeId}`} x={at.x} y={at.y} n={h.n} delay={reduceMotion ? 0 : 0.12 * i} />;
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

      <div className={`pointer-events-none absolute bottom-3 left-3 items-center gap-2 ${selectedId ? "hidden" : "flex"} rounded-[var(--radius-sm)] bg-card/95 px-2.5 py-1.5 text-xs text-ink-soft shadow-[var(--shadow-card)]`}>
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
          <circle cx="13" cy="13" r="12" fill="none" stroke="var(--line)" />
          <g transform={`rotate(${mapLayout.north_deg} 13 13)`}>
            <path d="M13 4 L17 15 L13 13 L9 15 Z" fill="var(--brand-ink)" />
          </g>
        </svg>
        <span className="max-sm:sr-only">
          ทิศเหนือชี้ไปทางขวาเหมือนผังทางการ
          <br />
          ผังโดยประมาณ ไม่ตามสเกลจริง
        </span>
      </div>
    </div>
  );
}

/**
 * รายละเอียดแบบแผนที่วาดมือ: ต้นไม้ เส้นสนาม ลู่วิ่ง ระลอกสระน้ำ ป้ายชื่อพื้นที่และถนน
 * ทั้งหมดเป็นของตกแต่ง ซ่อนจาก screen reader และกดไม่ได้ (ข้อมูลจริงอยู่ที่ตึกและป้ายตึก)
 */
function MapDecor() {
  const field = mapLayout.areas.find((a) => a.type === "ellipse" && a.kind === "field");
  const track = mapLayout.areas.find((a) => a.type === "ellipse" && a.kind === "track");
  const pond = mapLayout.areas.find((a) => a.type === "ellipse" && a.kind === "pond");
  const labelled = mapLayout.areas.filter((a) => a.label);
  const named = mapLayout.roads.filter((r) => r.name);
  return (
    <g aria-hidden pointerEvents="none">
      {track?.type === "ellipse" &&
        [0.88, 0.94].map((k) => (
          <ellipse key={k} cx={track.cx} cy={track.cy} rx={track.rx * k} ry={track.ry * k} fill="none" stroke="var(--card)" strokeOpacity={0.45} strokeWidth={0.8} />
        ))}
      {field?.type === "ellipse" && (
        <g stroke="var(--card)" strokeOpacity={0.7} strokeWidth={1.1} fill="none">
          <line x1={field.cx} y1={field.cy - field.ry * 0.82} x2={field.cx} y2={field.cy + field.ry * 0.82} />
          <circle cx={field.cx} cy={field.cy} r={field.ry * 0.32} />
        </g>
      )}
      {pond?.type === "ellipse" && (
        <g stroke="var(--card)" strokeOpacity={0.7} strokeWidth={1.1} strokeLinecap="round" fill="none">
          <path d={`M${pond.cx - pond.rx * 0.5} ${pond.cy - 3} q6 -4 12 0 t12 0`} />
          <path d={`M${pond.cx + pond.rx * 0.05} ${pond.cy + 7} q6 -4 12 0 t12 0`} />
        </g>
      )}

      {campusTrees.map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${t.y})`}>
          <ellipse cx={1.5} cy={t.r * 0.7} rx={t.r * 0.9} ry={t.r * 0.35} fill="var(--ink)" opacity={0.12} />
          <circle r={t.r} fill="var(--park-deep)" />
          <circle cx={-t.r * 0.3} cy={-t.r * 0.32} r={t.r * 0.55} fill="var(--park)" opacity={0.9} />
        </g>
      ))}

      {labelled.map((a, i) => {
        const at = a.type === "ellipse" ? [a.cx, a.cy + a.ry + 13] : a.label_at;
        if (!at) return null;
        return (
          <text key={i} x={at[0]} y={at[1]} textAnchor="middle" fontSize={13} fill="var(--ink-soft)" className="map-label">
            {a.label}
          </text>
        );
      })}
      {named.map((r, i) => (
        <g key={i}>
          <path id={`road-name-${i}`} d={r.d} fill="none" stroke="none" />
          {/* ชิดครึ่งบนของถนน: ถนนประชาอุทิศอยู่ขอบล่างของผัง ครึ่งล่างถูกตัด */}
          <text fontSize={11} fill="var(--ink-soft)" dy={-3}>
            <textPath href={`#road-name-${i}`} startOffset="62%" textAnchor="middle">
              {r.name}
            </textPath>
          </text>
        </g>
      ))}
    </g>
  );
}

function AreaShape({ area }: { area: MapArea }) {
  const fill = AREA_FILL[area.kind];
  if (area.type === "ellipse") {
    return <ellipse cx={area.cx} cy={area.cy} rx={area.rx} ry={area.ry} fill={fill} />;
  }
  return <path d={area.d} fill={fill} stroke={area.kind === "ground" ? "var(--building-edge)" : "none"} strokeOpacity={0.4} />;
}

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
  const interactive = Boolean(place && onSelect);
  // ตึกคณะเด่นกว่าตึกอื่นเล็กน้อย ให้หาจุดหลักบนแผนที่ได้เร็ว
  const key = place?.kind === "faculty" || place?.kind === "food";
  const top = lit ? "var(--building-lit)" : key ? "var(--building-persona)" : "var(--building)";
  const edge = key ? "var(--building-persona-edge)" : "var(--building-edge)";

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
      className={`outline-none transition-opacity duration-500 ${interactive ? "cursor-pointer [&:focus-visible>rect:nth-child(2)]:stroke-[var(--brand-ink)] [&:hover>rect:nth-child(2)]:brightness-[1.04]" : ""}`}
      opacity={dimmed ? 0.55 : 1}
    >
      <title>{place?.name_th ?? b.name ?? b.id}</title>
      {/* ฐานสีเข้มเลื่อนลง = ความหนาของตึก (2.5D แบบแผนที่ท่องเที่ยว) */}
      <rect x={b.x} y={b.y + 5} width={b.w} height={b.h} rx={5} fill={edge} />
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={5}
        fill={top}
        stroke={selected ? "var(--brand-ink)" : edge}
        strokeWidth={selected ? 3 : 1}
      />
      {/* ตึกที่ไฮไลต์วาดป้ายในเลเยอร์บนรอยทางมดแทน (ดู BuildingLabel ใน CampusMap) */}
      {!lit && <BuildingLabel building={b} />}
    </g>
  );
}

/**
 * รหัสตึก + ชื่อย่อ · ตึกที่ไฮไลต์ใช้ halo สีพื้นตึก แล้ววาดทับรอยทางมด
 * ไม่งั้นเส้นประกับตัวมดที่เดินผ่านกลางตึกจะทับรหัสตึกจนอ่านไม่ออก
 */
function BuildingLabel({ building: b, lit = false }: { building: MapBuilding; lit?: boolean }) {
  const place = placeById.get(b.id);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const showName = Boolean(place?.short) && b.w >= 60;
  const halo = lit ? { paintOrder: "stroke" as const, stroke: "var(--building-lit)", strokeWidth: 4, strokeLinejoin: "round" as const } : {};
  return (
    <>
      <text
        x={cx}
        y={showName ? cy - 7 : cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono"
        fontSize={place ? 15 : 12}
        fill={lit ? "var(--ink)" : place ? "var(--brand-deep)" : "var(--ink-soft)"}
        {...halo}
      >
        {b.id}
      </text>
      {showName && (
        <text x={cx} y={cy + 11} textAnchor="middle" dominantBaseline="central" fontSize={13} fill="var(--ink)" {...halo}>
          {place!.short}
        </text>
      )}
    </>
  );
}

function PointMarker({
  id,
  x,
  y,
  dimmed,
  onSelect,
}: {
  id: string;
  x: number;
  y: number;
  dimmed: boolean;
  onSelect?: (id: string) => void;
}) {
  const place = placeById.get(id);
  if (!place) return null;
  return (
    <g
      id={domIdOf(id)}
      role="button"
      tabIndex={0}
      aria-label={place.name_th}
      onClick={() => onSelect?.(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(id)}
      className="cursor-pointer outline-none transition-opacity duration-500 [&:focus-visible>circle:nth-of-type(1)]:stroke-[var(--brand-ink)] [&:focus-visible>circle:nth-of-type(1)]:[stroke-width:3.5]"
      opacity={dimmed ? 0.55 : 1}
    >
      <title>{place.name_th}</title>
      <circle cx={x} cy={y} r={9} fill="var(--card)" stroke="var(--slate)" strokeWidth={2} />
      <circle cx={x} cy={y} r={3.5} fill="var(--slate)" />
      <text x={x + 14} y={y} dominantBaseline="central" fontSize={12} fill="var(--ink-soft)">
        {place.short}
      </text>
    </g>
  );
}

function Pin({ x, y, n, delay }: { x: number; y: number; n: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
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

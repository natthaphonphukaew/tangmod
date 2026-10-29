import fs from "node:fs";
import path from "node:path";
import {
  admissionEvents,
  calendar,
  contacts,
  places,
  programs,
} from "@/lib/data";
import type { Fee, Program, Tier } from "@/lib/data/schemas";

/*
 * Knowledge corpus = chunk ข้อความที่ LLM อ่านได้ พร้อม id สำหรับอ้างอิง
 * แหล่ง: (1) สร้างจาก JSON ที่มีโครงสร้าง (2) Markdown ใน content/kb/<namespace>/*.md
 * ขนาดยังเล็ก จึงเก็บในหน่วยความจำ ถ้าข้อมูลโตขึ้นค่อยย้ายไป pgvector (สเปกหัวข้อ 7)
 */

export type Namespace = "general" | "sit" | "eng" | "food" | "admission";

export type Chunk = {
  id: string;
  namespace: Namespace;
  title: string;
  text: string;
  tier: Tier;
  source_url?: string;
  updated_at: string;
};

const baht = (n: number) => n.toLocaleString("th-TH");

export function describeFee(fee: Fee): string {
  if (fee.model === "flat") {
    return `เหมาจ่ายเทอมละ ${baht(fee.per_semester)} บาท ทั้งหลักสูตรประมาณ ${baht(fee.total_est)} บาท`;
  }
  const confirm = fee.confirm_fee ? ` ค่ายืนยันสิทธิ์ (เทอมแรก) ${baht(fee.confirm_fee)} บาท` : "";
  return `ค่าบำรุง ${baht(fee.base)} บาท + หน่วยกิตละ ${baht(fee.per_credit)} บาท${confirm} ทั้งหลักสูตรประมาณ ${baht(fee.total_est)} บาท`;
}

function programChunk(p: Program): Chunk {
  const lines = [
    `${p.name_th} (${p.name_en}) ชื่อย่อ ${p.short} [program id: ${p.id}]`,
    `ปริญญา ${p.degree} · ภาษา ${p.language === "en" ? "อังกฤษ" : p.language === "th" ? "ไทย" : "ไทย/อังกฤษ"}${p.international ? " · หลักสูตรนานาชาติ" : ""}${p.credits ? ` · ${p.credits} หน่วยกิต` : ""}${p.place_id ? ` · ตึก ${p.place_id}` : ""}`,
    `ค่าเทอม: ${describeFee(p.fee)}`,
    p.summary,
    p.tracks?.length ? `แทร็ก/กลุ่มวิชา: ${p.tracks.join(", ")}` : "",
    p.signature_courses?.length
      ? `วิชาเด่น: ${p.signature_courses.map((c) => `${c.code} ${c.name} (ปี ${c.year})`).join(", ")}`
      : "",
    p.careers.length ? `อาชีพ: ${p.careers.join(", ")}` : "",
    p.admission_ar
      ? `เกณฑ์ Active Recruitment: ${[
          p.admission_ar.gpax && `GPAX ≥${p.admission_ar.gpax.toFixed(2)}`,
          p.admission_ar.math && `คณิต ≥${p.admission_ar.math.toFixed(2)}`,
          p.admission_ar.sci && `วิทย์ ≥${p.admission_ar.sci.toFixed(2)}`,
          p.admission_ar.lang && `ภาษา ≥${p.admission_ar.lang.toFixed(2)}`,
          p.admission_ar.extra,
        ]
          .filter(Boolean)
          .join(", ")}${p.admission_ar.tier !== "official" ? " (แหล่งไม่เป็นทางการ)" : ""}`
      : "",
    p.conflict_note ? `หมายเหตุ: ${p.conflict_note}` : "",
    p.contact ? `ติดต่อ: ${p.contact}` : "",
  ];
  return {
    id: `program:${p.id}`,
    namespace: p.faculty === "sit" ? "sit" : "eng",
    title: `หลักสูตร ${p.short}`,
    text: lines.filter(Boolean).join("\n"),
    tier: p.tier,
    source_url: p.source_url,
    updated_at: p.updated_at,
  };
}

const THAI_DAY: Record<string, string> = { mon: "จ.", tue: "อ.", wed: "พ.", thu: "พฤ.", fri: "ศ.", sat: "ส.", sun: "อา." };

function structuredChunks(): Chunk[] {
  const chunks: Chunk[] = programs.map(programChunk);

  for (const p of places) {
    const lines = [
      `${p.name_th} (${p.name_en}) [place id: ${p.id}]`,
      p.aliases.length ? `ชื่อเรียก: ${p.aliases.join(", ")}` : "",
      p.description,
      p.tags.length ? `จุดเด่น: ${p.tags.join(", ")}` : "",
      p.floors?.map((f) => `ชั้น ${f.floor}: ${f.what}`).join("\n") ?? "",
      p.hours
        ?.map((h) => `เวลาเปิดของ${h.label ?? p.name_th}: ${h.days.map((d) => THAI_DAY[d]).join(" ")} ${h.open}–${h.close}`)
        .join("\n") ?? "",
      // กัน LLM เอาเวลาโรงอาหารไปตอบเป็นเวลาฟิตเนสที่อยู่ตึกเดียวกัน
      p.hours ? "สิ่งอื่นในตึกนี้ที่ไม่ได้ระบุเวลาไว้ข้างบน ยังไม่มีข้อมูลเวลาเปิด" : "",
      p.conflict_note ? `หมายเหตุ: ${p.conflict_note}` : "",
      p.tier === "mock" && p.source_note ? `ข้อมูลยังไม่ยืนยัน: ${p.source_note}` : "",
    ];
    chunks.push({
      id: `place:${p.id}`,
      namespace: p.kind === "food" ? "food" : "general",
      title: p.name_th,
      text: lines.filter(Boolean).join("\n"),
      tier: p.tier,
      source_url: p.source_url,
      updated_at: p.updated_at,
    });
  }

  for (const e of admissionEvents) {
    chunks.push({
      id: `tcas:${e.id}`,
      namespace: "admission",
      title: `TCAS70 รอบ ${e.round}: ${e.title}`,
      text: `TCAS70 (เข้าเรียนปีการศึกษา 2570) รอบ ${e.round} ${e.title} วันที่ ${e.start} ถึง ${e.end}${e.program_ids.length ? ` (หลักสูตร ${e.program_ids.join(", ")})` : ""}${e.conflict_note ? `\nหมายเหตุ: ${e.conflict_note}` : ""}`,
      tier: e.tier,
      source_url: e.source_url,
      updated_at: e.updated_at,
    });
  }

  chunks.push({
    id: "calendar:2569",
    namespace: "general",
    title: "ปฏิทินการศึกษา 2569",
    text: [
      ...calendar.terms.map(
        (t) => `${t.label}: ${t.start} ถึง ${t.end}${t.milestones.map((m) => ` · ${m.label} ${m.start}${m.end !== m.start ? `–${m.end}` : ""}`).join("")}`,
      ),
      ...calendar.rules,
    ].join("\n"),
    tier: calendar.tier,
    source_url: calendar.source_url,
    updated_at: calendar.updated_at,
  });

  for (const c of contacts) {
    chunks.push({
      id: `contact:${c.id}`,
      namespace: "general",
      title: `ติดต่อ ${c.label}`,
      text: `ช่องทางติดต่อ ${c.label} (เรื่อง: ${c.topics.join(", ")}): ${[c.phone && `โทร ${c.phone}`, c.email, c.social, c.web].filter(Boolean).join(" · ")}`,
      tier: "official",
      source_url: c.source_url,
      updated_at: "2026-10-28",
    });
  }
  return chunks;
}

/** frontmatter แบบ key: value บรรทัดเดียว (พอสำหรับไฟล์ KB ของเรา) */
export function parseMarkdownKb(fileId: string, raw: string): Chunk[] {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`KB ${fileId}: ไม่มี frontmatter`);
  const meta = Object.fromEntries(
    match[1].split(/\r?\n/).map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
  );
  for (const key of ["namespace", "tier", "title", "updated_at"]) {
    if (!meta[key]) throw new Error(`KB ${fileId}: ขาด ${key}`);
  }
  const sections = match[2].split(/^## /m).filter((s) => s.trim());
  return sections.map((section, i) => {
    const [heading, ...body] = section.split(/\r?\n/);
    return {
      id: `kb:${fileId}#${i + 1}`,
      namespace: meta.namespace as Namespace,
      title: `${meta.title} — ${heading.trim()}`,
      text: body.join("\n").trim(),
      tier: meta.tier as Tier,
      source_url: meta.source_url || undefined,
      updated_at: meta.updated_at,
    };
  });
}

function markdownChunks(): Chunk[] {
  const root = path.join(process.cwd(), "content", "kb");
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((dir) => {
    if (!dir.isDirectory()) return [];
    return fs
      .readdirSync(path.join(root, dir.name))
      .filter((f) => f.endsWith(".md"))
      .flatMap((file) =>
        parseMarkdownKb(`${dir.name}/${file.replace(/\.md$/, "")}`, fs.readFileSync(path.join(root, dir.name, file), "utf8")),
      );
  });
}

let cache: { chunks: Chunk[]; byId: Map<string, Chunk> } | null = null;

export function corpus() {
  if (!cache) {
    const chunks = [...structuredChunks(), ...markdownChunks()];
    cache = { chunks, byId: new Map(chunks.map((c) => [c.id, c])) };
  }
  return cache;
}

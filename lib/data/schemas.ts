import { z } from "zod";

/** ความน่าเชื่อถือของข้อมูล — UI แสดงเป็นป้ายในทุกคำตอบ */
export const Tier = z.enum(["official", "student", "mock"]);
export type Tier = z.infer<typeof Tier>;

const isoDate = z.iso.date();
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ต้องเป็นรูปแบบ HH:MM");

/** ทุก record ที่เป็นข้อเท็จจริงต้องบอกที่มา */
const Provenance = z.object({
  tier: Tier,
  source_url: z.url().optional(),
  source_note: z.string().optional(),
  updated_at: isoDate,
  conflict_note: z.string().optional(),
});

export const Day = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type Day = z.infer<typeof Day>;

export const OpeningHours = z.object({
  days: z.array(Day).min(1),
  open: hhmm,
  close: hhmm,
  label: z.string().optional(),
});

export const PlaceKind = z.enum([
  "faculty",
  "food",
  "study",
  "dorm",
  "service",
  "transport",
  "landmark",
]);

export const Place = Provenance.extend({
  /** รหัสตึกทางการ (N11, S4) หรือ slug สำหรับจุดที่ไม่มีรหัส */
  id: z.string().regex(/^([NS]\d{1,2}|[a-z][a-z0-9_]*)$/),
  name_th: z.string(),
  name_en: z.string(),
  short: z.string().optional(),
  kind: PlaceKind,
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  hours: z.array(OpeningHours).optional(),
  floors: z.array(z.object({ floor: z.string(), what: z.string() })).optional(),
  description: z.string(),
});
export type Place = z.infer<typeof Place>;

export const Fee = z.discriminatedUnion("model", [
  z.object({
    model: z.literal("flat"),
    per_semester: z.number().int().positive(),
    total_est: z.number().int().positive(),
    summer_per_credit: z.number().int().positive().optional(),
  }),
  z.object({
    model: z.literal("per_credit"),
    base: z.number().int().positive(),
    per_credit: z.number().int().positive(),
    /** ค่ายืนยันสิทธิ์ = ค่าลงทะเบียนเทอมแรก */
    confirm_fee: z.number().int().positive().optional(),
    total_est: z.number().int().positive(),
    summer_base: z.number().int().positive().optional(),
  }),
]);
export type Fee = z.infer<typeof Fee>;

/** 0–3 ใช้กับการ์ดเปรียบเทียบและ Major Compass */
const Level = z.number().int().min(0).max(3);
export const Vibe = z.object({
  hardware: Level,
  math_theory: Level,
  design_ux: Level,
  business: Level,
  coding: Level,
  note: z.string(),
});

export const Program = Provenance.extend({
  id: z.string().regex(/^(sit|eng|fibo)-[a-z0-9-]+$/),
  faculty: z.enum(["sit", "eng", "fibo"]),
  name_th: z.string(),
  name_en: z.string(),
  short: z.string(),
  aliases: z.array(z.string()).default([]),
  degree: z.enum(["วท.บ.", "ศศ.บ.", "วศ.บ."]),
  language: z.enum(["th", "en", "th/en"]),
  international: z.boolean(),
  depth: z.enum(["deep", "overview"]),
  credits: z.number().int().positive().optional(),
  curriculum_year: z.number().int().optional(),
  fee: Fee,
  fee_source_url: z.url(),
  place_id: z.string().optional(),
  summary: z.string(),
  tracks: z.array(z.string()).optional(),
  signature_courses: z
    .array(z.object({ code: z.string(), name: z.string(), year: z.number().int().min(1).max(4) }))
    .optional(),
  careers: z.array(z.string()).default([]),
  admission_ar: z
    .object({
      gpax: z.number().optional(),
      math: z.number().optional(),
      sci: z.number().optional(),
      lang: z.number().optional(),
      extra: z.string().optional(),
      tier: Tier,
      source_url: z.url(),
    })
    .optional(),
  vibe: Vibe.optional(),
  contact: z.string().optional(),
});
export type Program = z.infer<typeof Program>;

export const AdmissionEvent = Provenance.extend({
  id: z.string(),
  round: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  kind: z.enum(["apply", "exam", "announce", "confirm", "pay"]),
  title: z.string(),
  /** ว่าง = ทุกคณะ */
  program_ids: z.array(z.string()).default([]),
  faculty: z.enum(["sit", "eng", "fibo"]).optional(),
  start: isoDate,
  end: isoDate,
});
export type AdmissionEvent = z.infer<typeof AdmissionEvent>;

/** น้องมด: ผู้ช่วยตัวเดียวที่ตอบทุกเรื่อง (เดิมมี 5 ตัวละคร ยุบรวมเมื่อ 29 ต.ค. 69 เพราะสลับไปมาใช้งานยาก) */
export const Assistant = z.object({
  display_name: z.string(),
  role: z.string(),
  avatar: z.literal("ant-guide"),
  scope: z.array(z.string()).min(1),
  tone: z.string(),
  greeting: z.string(),
  /** คำถามตัวอย่างหน้าแรก สุ่มขึ้นมาทีละ 6 อัน (ChatColumn) มีทั้งเรื่องเลือกสาขาและชีวิตนักศึกษา */
  starter_chips: z.array(z.string()).min(6).max(20),
});
export type Assistant = z.infer<typeof Assistant>;

export const Contact = z.object({
  id: z.string(),
  label: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  web: z.url().optional(),
  social: z.string().optional(),
  topics: z.array(z.string()),
  source_url: z.url(),
});
export type Contact = z.infer<typeof Contact>;

export const AcademicCalendar = Provenance.extend({
  year_be: z.number().int(),
  terms: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      start: isoDate,
      end: isoDate,
      milestones: z.array(z.object({ label: z.string(), start: isoDate, end: isoDate })).default([]),
    }),
  ),
  rules: z.array(z.string()),
});
export type AcademicCalendar = z.infer<typeof AcademicCalendar>;

/** วันหยุดราชการ — ป้าย "เปิดอยู่ตอนนี้" และคำตอบเรื่องเวลาเปิดต้องรู้ ไม่งั้นจะบอกว่าเปิดในวันหยุด */
export const Holidays = Provenance.extend({
  year_be: z.number().int(),
  holidays: z.array(z.object({ date: isoDate, label: z.string() })),
});
export type Holidays = z.infer<typeof Holidays>;
export type Holiday = Holidays["holidays"][number];

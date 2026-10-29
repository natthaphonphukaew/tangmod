import { z } from "zod";

/*
 * LLM Response Contract v3 (ดูสเปกหัวข้อ 6) — น้องมดตัวเดียว ไม่มี handoff · แผนที่โชว์เฉพาะเมื่อ show_map
 * ลำดับ field สำคัญ: message มาก่อนเพื่อให้ข้อความ stream ขึ้นจอได้เร็ว
 * ใช้ schema ให้เรียบที่สุด เพราะ Gemini ทิ้ง keyword บางตัว (minLength ฯลฯ) — ตรวจจริงที่ validate.ts
 */
export const CardType = z.enum(["program", "compare", "place", "timeline"]);
export type CardType = z.infer<typeof CardType>;

export const RoleGuess = z.enum(["highschool", "student", "parent", "unknown"]);

export const ChatAnswer = z.object({
  message: z
    .string()
    .describe("คำตอบภาษาไทยที่แสดงในแชท สั้น กระชับ ไม่เกิน ~120 คำ ใช้ markdown แบบเบา (ตัวหนา, bullet) ได้ ห้ามใส่ URL"),
  places: z
    .array(z.object({ place_id: z.string(), reason: z.string().describe("เหตุผลสั้น ๆ ไม่เกิน 12 คำ") }))
    .describe("สถานที่ที่ช่วยตอบคำถาม เรียงตามลำดับที่ควรไป ใช้ id จาก PLACES เท่านั้น ถ้าคำถามไม่เกี่ยวกับที่ตั้งให้เป็น []"),
  show_map: z
    .boolean()
    .describe("true เมื่อการเห็นแผนที่ช่วยให้เข้าใจคำตอบ เช่น ถามว่าตึก ห้อง ร้าน อยู่ไหน หรือไปยังไง · ถามค่าเทอม หน่วยกิต รอบสมัคร ให้เป็น false"),
  cards: z
    .array(z.object({ type: CardType, ids: z.array(z.string()) }))
    .describe("การ์ดข้อมูลจริงที่ต้องแนบ: program=[program id], compare=[program id 2–4 ตัว], place=[place id], timeline=[] หรือ [program id]"),
  chips: z.array(z.string()).describe("คำถามถัดไปที่ผู้ใช้น่าจะถาม 2–3 ข้อ แต่ละข้อไม่เกิน 6 คำ"),
  profile_update: z
    .object({
      interests_add: z.array(z.string()),
      considering_add: z.array(z.string()).describe("program id ที่ผู้ใช้กำลังสนใจ"),
      role_guess: RoleGuess,
    })
    .nullable(),
  source_ids: z.array(z.string()).describe("id ของ CONTEXT ที่ใช้ตอบจริง"),
  confidence: z.enum(["high", "low"]).describe("low เมื่อ CONTEXT ไม่มีข้อมูลพอจะตอบ"),
});
export type ChatAnswer = z.infer<typeof ChatAnswer>;

/** ความจำของผู้ใช้ เก็บใน localStorage ไม่ผูกตัวตน */
export const Profile = z.object({
  v: z.literal(1),
  role_guess: RoleGuess,
  interests: z.array(z.string().max(40)).max(12),
  considering_programs: z.array(z.string()).max(8),
  visited_places: z.array(z.string()).max(30),
});
export type Profile = z.infer<typeof Profile>;

export const emptyProfile = (): Profile => ({
  v: 1,
  role_guess: "unknown",
  interests: [],
  considering_programs: [],
  visited_places: [],
});

export const ChatTurn = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(2000),
});
export type ChatTurn = z.infer<typeof ChatTurn>;

export const ChatRequest = z.object({
  /** เทิร์นล่าสุดก่อนหน้า (ไม่รวมข้อความใหม่) */
  history: z.array(ChatTurn).max(16),
  message: z.string().min(1).max(500),
  profile: Profile,
});
export type ChatRequest = z.infer<typeof ChatRequest>;

/** ปุ่ม "ตอบไม่ตรง": เก็บคำถาม+คำตอบที่ผิดไว้เติมข้อมูลและทำชุด eval (ไม่มีตัวตนผู้ใช้) */
export const FeedbackReason = z.enum(["wrong_info", "missed_question", "wrong_place", "other"]);
export type FeedbackReason = z.infer<typeof FeedbackReason>;
export const FeedbackRequest = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().max(3000),
  model: z.string().max(80).optional(),
  reason: FeedbackReason,
  place_ids: z.array(z.string().max(40)).max(5),
  card_ids: z.array(z.string().max(40)).max(8),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequest>;

/** แหล่งที่มาที่ server แปลงจาก source_ids แล้ว — LLM ไม่ได้เขียนเอง */
export type ResolvedSource = {
  id: string;
  title: string;
  url?: string;
  tier: "official" | "student" | "mock";
  updated_at: string;
};

export type ValidatedAnswer = Omit<ChatAnswer, "source_ids"> & {
  sources: ResolvedSource[];
};

/** บรรทัดของ NDJSON stream จาก /api/chat */
export type StreamEvent =
  | { type: "partial"; data: Partial<ChatAnswer> }
  /** โมเดลล้มกลางคำตอบ: ทิ้งข้อความที่ไหลมาแล้ว รอคำตอบจากโมเดลถัดไป */
  | { type: "reset" }
  | { type: "final"; data: ValidatedAnswer; model: string }
  | { type: "error"; code: "rate_limited" | "unavailable" | "bad_request"; message: string };

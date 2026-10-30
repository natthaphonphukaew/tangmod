import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/*
 * ชุดคำถาม eval อยู่ที่ eval/questions/*.json (หนึ่งไฟล์ต่อหมวดหรือต่อหัวข้อ) แยกไฟล์ไว้ให้สองคนเพิ่มข้อพร้อมกันได้โดยไม่ชนกัน
 * id ต้องไม่ซ้ำกันข้ามไฟล์ — npm test ตรวจให้
 */

export const Expect = z
  .object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
    places_any: z.array(z.string()).optional(),
    places_all: z.array(z.string()).optional(),
    cards_any: z.array(z.string()).optional(),
    cards_all: z.array(z.string()).optional(),
    card_types_any: z.array(z.string()).optional(),
    /** true = คำถามต้องการเห็นตำแหน่ง แผนที่ต้องเปิด · false = ไม่ควรเปิดแผนที่ */
    show_map: z.boolean().optional(),
    refuse: z.boolean().optional(),
    admits_unknown: z.boolean().optional(),
  })
  .strict();
export type Expect = z.infer<typeof Expect>;

export const Question = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "id ใช้ a-z 0-9 และ - เท่านั้น"),
    cat: z.enum(["official", "niche", "unknown", "out_of_scope", "map"]),
    q: z.string().min(1),
    expect: Expect,
  })
  .strict();
export type Question = z.infer<typeof Question>;

export const QUESTIONS_DIR = path.join(process.cwd(), "eval", "questions");

/** อ่านทุกไฟล์ เรียงตามชื่อไฟล์ จะได้ลำดับเดิมทุกเครื่อง · ไฟล์ผิดรูปแบบ throw พร้อมชื่อไฟล์ */
export function loadQuestions(dir = QUESTIONS_DIR): (Question & { file: string })[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((file) => {
      const parsed = z.array(Question).safeParse(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
      if (!parsed.success) throw new Error(`eval/questions/${file}: ${z.prettifyError(parsed.error)}`);
      return parsed.data.map((q) => ({ ...q, file }));
    });
}

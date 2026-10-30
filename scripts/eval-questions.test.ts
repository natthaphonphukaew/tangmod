import { describe, expect, it } from "vitest";
import { placeById, programById } from "@/lib/data";
import { loadQuestions } from "./eval-questions";

describe("ชุดคำถาม eval/questions", () => {
  const questions = loadQuestions();

  it("อ่านได้ทุกไฟล์และมีคำถาม", () => {
    expect(questions.length).toBeGreaterThan(50);
  });

  it("id ไม่ซ้ำกันข้ามไฟล์", () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const q of questions) {
      if (seen.has(q.id)) dupes.push(`${q.id} (${seen.get(q.id)} กับ ${q.file})`);
      seen.set(q.id, q.file);
    }
    expect(dupes).toEqual([]);
  });

  it("หมุดและการ์ดที่คาดหวังมีอยู่จริงในข้อมูล", () => {
    const bad: string[] = [];
    for (const q of questions) {
      for (const id of [...(q.expect.places_any ?? []), ...(q.expect.places_all ?? [])]) if (!placeById.has(id)) bad.push(`${q.id}: ไม่มีสถานที่ ${id}`);
      for (const id of [...(q.expect.cards_any ?? []), ...(q.expect.cards_all ?? [])])
        if (!programById.has(id) && !placeById.has(id)) bad.push(`${q.id}: ไม่มีการ์ด ${id}`);
    }
    expect(bad).toEqual([]);
  });

  it("regex ใน include/exclude ใช้ได้", () => {
    const bad: string[] = [];
    for (const q of questions)
      for (const p of [...(q.expect.include ?? []), ...(q.expect.exclude ?? [])]) {
        try {
          new RegExp(p, "i");
        } catch {
          bad.push(`${q.id}: /${p}/`);
        }
      }
    expect(bad).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { buildSystemPrompt, admissionNow, schemaInstructions } from "./prompt";
import { offlineAnswer } from "./mock-model";
import { ChatAnswer, emptyProfile } from "./schema";
import { cleanMessage, salvageAnswer, validateAnswer } from "./validate";

const base: ChatAnswer = {
  message: "ดูที่ https://evil.example ได้เลย",
  places: [],
  show_map: false,
  cards: [],
  chips: [],
  profile_update: null,
  source_ids: [],
  confidence: "high",
};

describe("validateAnswer", () => {
  it("ตัด place_id ปลอม และเก็บลำดับของที่ถูกต้อง", () => {
    const v = validateAnswer(
      { ...base, places: [{ place_id: "N99", reason: "x" }, { place_id: "N10", reason: "เงียบ" }, { place_id: "N10", reason: "ซ้ำ" }] },
      "ห้องสมุดอยู่ไหน",
    );
    expect(v.places).toEqual([{ place_id: "N10", reason: "เงียบ" }]);
  });

  it("ลบ URL ที่ LLM เขียนเองออกจากข้อความ", () => {
    expect(validateAnswer(base, "q").message).not.toMatch(/https?:/);
  });

  it("กู้คำตอบที่ JSON ท้ายเสียได้ เฉพาะเมื่อข้อความจบแล้ว", () => {
    expect(salvageAnswer({ message: "ข้อความถูกตัดกลา" })).toBeNull();
    const s = salvageAnswer({ message: "ตึก SIT อยู่ N11", places: [{ place_id: "N11" }, {}], cards: [{ type: "program", ids: ["sit-it"] }], chips: ["ไปยังไง"] });
    expect(s).toMatchObject({ places: [{ place_id: "N11", reason: "" }], cards: [{ type: "program", ids: ["sit-it"] }], show_map: false, confidence: "low" });
  });

  it("ลบ id ของ chunk ที่ LLM แปะไว้ในข้อความ แต่ไม่แตะวงเล็บทั่วไป", () => {
    expect(cleanMessage("ค่าเทอม 30,000 บาท [kb:eng/cpe-vs-sit#1, program:eng-cpe] จบ")).toBe("ค่าเทอม 30,000 บาท จบ");
    expect(cleanMessage("ตึก N11 (SIT) ใกล้ [tcas:sit-ar-2]")).toBe("ตึก N11 (SIT) ใกล้");
  });

  it("compare ที่เหลือหลักสูตรจริงตัวเดียวกลายเป็นการ์ด program", () => {
    const v = validateAnswer({ ...base, cards: [{ type: "compare", ids: ["eng-cpe", "sit-fake"] }] }, "q");
    expect(v.cards).toEqual([{ type: "program", ids: ["eng-cpe"] }]);
  });

  it("ถามค่าเทอม → ไม่เปิดแผนที่ และไม่ปักหมุดตึกของสาขาเอง แม้มีการ์ด", () => {
    const v = validateAnswer({ ...base, cards: [{ type: "compare", ids: ["sit-it", "sit-cs"] }] }, "ค่าเทอม IT กับ CS เท่าไหร่");
    expect(v.places).toEqual([]);
    expect(v.show_map).toBe(false);
  });

  it("LLM ใส่หมุดแต่ตั้ง show_map=false และคำถามไม่ได้ถามหาที่ตั้ง → ไม่เปิดแผนที่ (หมุดยังอยู่ให้กดดูเอง)", () => {
    const v = validateAnswer({ ...base, places: [{ place_id: "N11", reason: "ตึก SIT" }] }, "SIT มีกี่สาขา");
    expect(v.places).toHaveLength(1);
    expect(v.show_map).toBe(false);
  });

  it("ถามหาเลขห้องแต่ LLM ลืมใส่หมุด → ปักจากคำถามเองและเปิดแผนที่", () => {
    const v = validateAnswer(base, "CB2301 อยู่ตรงไหน");
    expect(v.places.map((p) => p.place_id)).toEqual(["N17"]);
    expect(v.show_map).toBe(true);
  });

  it("ถามเวลาเปิด → ไม่เปิดแผนที่แม้ LLM ขอ (แต่ถามว่าอยู่ไหนด้วยก็เปิด)", () => {
    const withPin = { ...base, places: [{ place_id: "N10", reason: "ห้องสมุด" }], show_map: true };
    expect(validateAnswer(withPin, "ห้องสมุดเปิดกี่โมง").show_map).toBe(false);
    expect(validateAnswer(withPin, "ห้องสมุดอยู่ไหน เปิดกี่โมง").show_map).toBe(true);
    expect(validateAnswer(withPin, "มาจาก BTS ยังไง").show_map).toBe(true);
  });

  it("ถามว่าอยู่ไหน + มีหมุด → เปิดแผนที่แม้ LLM ตั้ง show_map=false", () => {
    const v = validateAnswer({ ...base, places: [{ place_id: "S14", reason: "KFC" }] }, "โรงอาหารอยู่ไหน");
    expect(v.show_map).toBe(true);
  });

  it("การ์ดหลักสูตรมีแหล่งที่มาเสมอ แม้ LLM ไม่อ้าง และ source_id ปลอมถูกทิ้ง", () => {
    const v = validateAnswer({ ...base, cards: [{ type: "program", ids: ["sit-cs"] }], source_ids: ["made-up"] }, "q");
    expect(v.sources.map((s) => s.id)).toEqual(["program:sit-cs"]);
    expect(v.sources[0].url).toContain("sit.kmutt.ac.th");
  });
});

describe("offline mode", () => {
  it("ถาม CPE vs CS ได้การ์ด compare โดยไม่เปิดแผนที่", () => {
    const q = "คอมวิศวะ กับ CS ต่างกันยังไง";
    const a = validateAnswer(offlineAnswer(q), q);
    expect(a.cards[0]).toEqual({ type: "compare", ids: expect.arrayContaining(["eng-cpe", "sit-cs"]) });
    expect(a.show_map).toBe(false);
  });

  it("ถามเลขห้องตอบชั้นได้แม้ออฟไลน์ และเปิดแผนที่", () => {
    const q = "CB2301 อยู่ไหน";
    const a = validateAnswer(offlineAnswer(q), q);
    expect(a.message).toContain("ชั้น 3");
    expect(a.places.map((p) => p.place_id)).toContain("N17");
    expect(a.show_map).toBe(true);
  });
});

describe("prompt", () => {
  it("บอกรอบที่เปิดอยู่ ณ วันนั้น (28 ต.ค. 69 → AR รอบ 2 ของ SIT)", () => {
    const lines = admissionNow(new Date("2026-10-28T05:00:00Z"));
    expect(lines.some((l) => l.includes("r1-sit-ar-2") && l.startsWith("เปิดอยู่"))).toBe(true);
  });

  it("schema ใน prompt (สำหรับ MiniMax) เป็น JSON Schema ที่มี message มาก่อน", () => {
    const text = schemaInstructions(ChatAnswer);
    const schema = JSON.parse(text.slice(text.indexOf("{")));
    expect(Object.keys(schema.properties)[0]).toBe("message");
    expect(schema.required).toContain("confidence");
  });

  it("ประกอบ prompt ได้ครบทุกส่วน", () => {
    const p = buildSystemPrompt({
      profile: emptyProfile(),
      chunks: [],
      now: new Date("2026-10-28T05:00:00Z"),
    });
    for (const section of ["# กติกา", "# PLACES", "# PROGRAMS", "# NOW", "# CONTEXT"]) expect(p).toContain(section);
    expect(p).toContain("น้องมด");
    expect(p).not.toContain("handoff");
  });
});

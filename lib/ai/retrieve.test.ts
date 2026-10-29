import { describe, expect, it } from "vitest";
import { corpus, parseMarkdownKb } from "./knowledge";
import { detectEntities, retrieve, tokenize } from "./retrieve";

describe("tokenize", () => {
  it("ตัดคำภาษาไทยที่ไม่เว้นวรรคได้", () => {
    const tokens = tokenize("ค่าเทอมวิศวะคอมเท่าไหร่");
    expect(tokens).toContain("ค่า");
    expect(tokens.length).toBeGreaterThan(2);
  });
});

describe("detectEntities", () => {
  it("เจอสาขาจากชื่อเล่น", () => {
    expect(detectEntities("คอมวิศวะ กับ CS ต่างกันยังไง").programIds.sort()).toEqual(["eng-cpe", "sit-cs"]);
  });

  it("ไม่เอา IT ที่ซ่อนอยู่ในคำอื่น แต่เจอ SIT เป็นตึก", () => {
    const e = detectEntities("ตึก SIT อยู่ไหน");
    expect(e.programIds).not.toContain("sit-it");
    expect(e.placeIds).toContain("N11");
  });

  it("เจอรหัสตึกและชื่อเรียกอย่าง KFC", () => {
    expect(detectEntities("จาก N10 ไป KFC ไกลไหม").placeIds.sort()).toEqual(["N10", "S14"]);
  });
});

describe("retrieve", () => {
  it("คำถามค่าเทอม CPE ดึงการ์ดหลักสูตร CPE มาก่อน", () => {
    const r = retrieve({ message: "ค่าเทอมคอมวิศวะเท่าไหร่" });
    expect(r.chunks[0].id).toBe("program:eng-cpe");
  });

  it("คำถามต่อเนื่องใช้ entity จากคำถามก่อนหน้า", () => {
    const r = retrieve({
      message: "แล้วต้องใช้ GPAX เท่าไหร่",
      previousUserMessage: "สนใจ DSI",
    });
    expect(r.programIds).toContain("sit-dsi");
    expect(r.chunks.map((c) => c.id)).toContain("program:sit-dsi");
  });

  it("คำถามเรื่องรถดึงเอกสารการเดินทาง", () => {
    const r = retrieve({ message: "มาจาก BTS ยังไง นั่งรถเมล์สายอะไร" });
    expect(r.chunks.some((c) => c.id.startsWith("kb:general/transport"))).toBe(true);
  });

  it("เลขห้อง CB2301 → ดึงตึก N17 และ chunk อธิบายห้องมาก่อน", () => {
    const r = retrieve({ message: "CB2301 อยู่ตรงไหน" });
    expect(r.placeIds).toContain("N17");
    expect(r.chunks[0].id).toBe("room:CB2301");
    expect(r.chunks[0].text).toContain("ชั้น 3");
    expect(r.chunks.map((c) => c.id)).toContain("place:N17");
  });
});

describe("knowledge corpus", () => {
  it("ไม่มี chunk id ซ้ำ และทุก chunk มีเนื้อหา", () => {
    const { chunks } = corpus();
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length);
    for (const c of chunks) expect(c.text.length, c.id).toBeGreaterThan(10);
  });

  it("parseMarkdownKb แยก section ตาม ## และอ่าน frontmatter", () => {
    const chunks = parseMarkdownKb(
      "x/y",
      "---\nnamespace: food\ntier: mock\ntitle: T\nupdated_at: 2026-10-28\n---\n\n## A\nข้อความ A\n\n## B\nข้อความ B\n",
    );
    expect(chunks.map((c) => [c.id, c.tier, c.text])).toEqual([
      ["kb:x/y#1", "mock", "ข้อความ A"],
      ["kb:x/y#2", "mock", "ข้อความ B"],
    ]);
  });
});

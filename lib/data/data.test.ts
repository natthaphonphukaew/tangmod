import { describe, expect, it } from "vitest";
import {
  admissionEvents,
  findIntegrityProblems,
  assistant,
  placeById,
  programById,
  programs,
} from "./index";

describe("content", () => {
  it("ไม่มี id ที่อ้างถึงกันแล้วหาไม่เจอ", () => {
    expect(findIntegrityProblems()).toEqual([]);
  });

  it("น้องมดมีชิปเริ่มต้นและคำทักทาย", () => {
    expect(assistant.starter_chips.length).toBeGreaterThanOrEqual(4);
    expect(assistant.greeting).toContain("มด");
  });

  it("ค่าเทอมหลักตรงกับตารางค่าเทอมทางการ", () => {
    const totals = Object.fromEntries(
      ["eng-cpe", "sit-cs", "sit-it", "sit-dsi"].map((id) => [id, programById.get(id)?.fee.total_est]),
    );
    expect(totals).toEqual({
      "eng-cpe": 240000,
      "sit-cs": 456000,
      "sit-it": 346400,
      "sit-dsi": 380000,
    });
  });

  it("หลักสูตรแบบ deep ทุกตัวมีรายวิชาเด่นและเกณฑ์ AR", () => {
    for (const p of programs.filter((p) => p.depth === "deep")) {
      expect(p.signature_courses?.length, p.id).toBeGreaterThan(0);
      expect(p.admission_ar, p.id).toBeDefined();
    }
  });

  it("ไทม์ไลน์ TCAS70 ไม่มีวันจบที่มาก่อนวันเริ่ม", () => {
    for (const e of admissionEvents) expect(e.start <= e.end, e.id).toBe(true);
  });

  it("ข้อมูล mock ต้องบอกเหตุผลไว้เสมอ", () => {
    for (const place of placeById.values()) {
      if (place.tier === "mock") expect(place.source_note, place.id).toBeTruthy();
    }
  });
});

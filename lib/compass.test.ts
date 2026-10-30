import { describe, expect, it } from "vitest";
import { compassPrograms, compassSummary, feePerTerm, QUESTIONS, scoreCompass, type CompassAnswers } from "./compass";

const base: CompassAnswers = { coding: 1, hardware: 1, math_theory: 1, design_ux: 1, business: 1, lang: 1, budget: 3 };
const top = (a: Partial<CompassAnswers>) => scoreCompass({ ...base, ...a })[0];

describe("เข็มทิศสาขา", () => {
  it("ครอบคลุมสาขาที่มีคะแนนลักษณะครบ 6 สาขา และคำถาม 7 ข้อ", () => {
    expect(compassPrograms().map((p) => p.id).sort()).toEqual(["eng-cpe", "eng-cpe-inter", "fibo-rai", "sit-cs", "sit-dsi", "sit-it"]);
    expect(QUESTIONS).toHaveLength(7);
  });

  it("ชอบโค้ด + คณิต + ฮาร์ดแวร์ → CPE อันดับต้น", () => {
    expect(["eng-cpe", "eng-cpe-inter"]).toContain(top({ coding: 3, math_theory: 3, hardware: 3, lang: 0 }).programId);
  });

  it("ชอบโค้ด + คณิต ไม่ชอบฮาร์ดแวร์ อยากเรียนอังกฤษ → CS พร้อมเหตุผลเรื่อง Seneca", () => {
    const r = top({ coding: 3, math_theory: 3, hardware: 0, design_ux: 1, business: 0, lang: 2 });
    expect(r.programId).toBe("sit-cs");
    expect(r.pros.join()).toContain("Seneca");
  });

  it("ชอบออกแบบ + ธุรกิจ โค้ดน้อย → DSI", () => {
    expect(top({ coding: 1, design_ux: 3, business: 3, hardware: 0, math_theory: 1 }).programId).toBe("sit-dsi");
  });

  it("ชอบโค้ด + ออกแบบ ไม่เอาคณิตหนัก → IT", () => {
    expect(top({ coding: 3, design_ux: 2, math_theory: 1, hardware: 0, business: 1 }).programId).toBe("sit-it");
  });

  it("งบไม่เกิน 35,000 → สาขาที่แพงกว่าถูกหักคะแนนและบอกเหตุผล", () => {
    const results = scoreCompass({ ...base, budget: 0 });
    const cs = results.find((r) => r.programId === "sit-cs")!;
    expect(cs.cons.join()).toContain("เกินงบ");
    const cpe = results.find((r) => r.programId === "eng-cpe")!;
    expect(cpe.cons.join()).not.toContain("เกินงบ");
    expect(feePerTerm(compassPrograms().find((p) => p.id === "eng-cpe")!)).toBe(30000);
  });

  it("ไม่อยากเรียนภาษาอังกฤษ → หลักสูตรภาษาอังกฤษถูกหักคะแนน", () => {
    const th = scoreCompass({ ...base, lang: 0 }).find((r) => r.programId === "sit-cs")!;
    const ok = scoreCompass({ ...base, lang: 1 }).find((r) => r.programId === "sit-cs")!;
    expect(th.percent).toBeLessThan(ok.percent);
  });

  it("คะแนนอยู่ในช่วง 0–100 และสรุปเป็นข้อความได้", () => {
    const results = scoreCompass(base);
    expect(results.every((r) => r.percent >= 0 && r.percent <= 95)).toBe(true);
    expect(top({ coding: 3, math_theory: 3, hardware: 1, design_ux: 1, business: 0, lang: 2 }).percent).toBe(95);
    expect(compassSummary(results)).toMatch(/^ผลเข็มทิศสาขาของผู้ใช้ .+: .+% .+เข้ากันเพราะ/);
  });
});

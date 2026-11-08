import { describe, expect, it } from "vitest";
import { catalog, catalogById } from "@/lib/data";
import { COMPASS_DIMS, type CompassDim } from "@/lib/data/schemas";
import { compassPlaceIds, compassSummary, followupsFor, programName, scoreCompass, type CompassAnswers } from "./compass";

const base: CompassAnswers = {
  v: 2,
  likes: [],
  avoid: [],
  style: { hands_on: 2, theory: 2, coding: 1, creative: 1, teaching: 0 },
  followups: {},
  campus: 2,
  lang: 1,
  budget: 3,
  years: 1,
};
const run = (a: Partial<Omit<CompassAnswers, "style">> & { style?: Partial<CompassAnswers["style"]> }) =>
  scoreCompass({ ...base, ...a, style: { ...base.style, ...a.style } });
const topIds = (a: Parameters<typeof run>[0], n = 3) => run(a).results.slice(0, n).map((r) => r.programId);

describe("เข็มทิศสาขา v2", () => {
  it("จัดอันดับทุกสาขาที่เปิดรับใน catalog และผลซ้ำได้", () => {
    const a = { likes: ["computing"] as CompassDim[] };
    const { results, excluded } = run(a);
    expect(results.length + excluded.length).toBe(catalog.filter((p) => p.status === "open").length);
    expect(run(a)).toEqual(run(a));
    for (const r of results) expect(r.percent).toBeLessThanOrEqual(95);
  });

  it("ชอบเคมีและแล็บ → เคมี จุลชีวะ อาหาร หรือวิศวะเคมี ขึ้นต้น", () => {
    const top = topIds({ likes: ["chem_bio"], style: { hands_on: 3, theory: 2, coding: 0 }, followups: { fu_science: 0 } });
    expect(top.every((id) => ["sci-chem", "sci-micro", "sci-food", "eng-che", "eng-che-inter"].includes(id))).toBe(true);
  });

  it("ชอบออกแบบและสร้างสรรค์ → สถาปัตย์หรือมีเดียขึ้นต้น", () => {
    const top = topIds({ likes: ["design_art"], style: { creative: 3, theory: 1, coding: 0 }, followups: { fu_design: 0 } });
    expect(top[0]).toMatch(/^soad-/);
  });

  it("ชอบคอม + ฮาร์ดแวร์ → CPE หรือสายอิเล็กทรอนิกส์ขึ้นต้น", () => {
    const top = topIds({ likes: ["computing", "electronics"], style: { coding: 3, theory: 2 }, followups: { fu_computing: 0 }, lang: 0 });
    expect(top).toContain("eng-cpe");
  });

  it("อยากเป็นครูช่าง → ค.อ.บ. ขึ้นต้น", () => {
    const top = topIds({ likes: ["machines"], style: { teaching: 3, hands_on: 3, theory: 1 }, followups: { fu_engineering: 1 } });
    expect(top[0]).toMatch(/^fiet-/);
  });

  it("บางมดเท่านั้น → ไม่มีสาขาบางขุนเทียนหรือราชบุรี และบอกเหตุผลที่ตัดออก", () => {
    const { results, excluded } = run({ likes: ["design_art"], campus: 0 });
    for (const r of results) expect(["bangmod", null]).toContain(catalogById.get(r.programId)?.campus);
    expect(excluded.find((e) => e.programId === "soad-arch")?.reason).toContain("บางขุนเทียน");
  });

  it("ขอภาษาไทย → ตัดหลักสูตรนานาชาติ · ขอ 4 ปี → ตัดหลักสูตร 5 ปี", () => {
    const { results } = run({ likes: ["computing"], lang: 0, years: 0 });
    expect(results.some((r) => catalogById.get(r.programId)?.language === "en")).toBe(false);
    expect(results.some((r) => catalogById.get(r.programId)?.years === 5)).toBe(false);
  });

  it("งบไม่เกิน 30,000 → สาขาที่เกินนิดหน่อยมีคำเตือน ที่เกินมากถูกตัด", () => {
    const { results, excluded } = run({ likes: ["computing"], budget: 0 });
    const cpe = results.find((r) => r.programId === "eng-cpe");
    expect(cpe?.cons.join()).not.toContain("เกินงบ");
    expect(results.find((r) => r.programId === "sit-it")?.cons[0]).toContain("เกินงบ");
    expect(excluded.some((e) => e.programId === "sit-cs")).toBe(true);
  });

  it("ไม่อยากเจอโค้ดแต่ชอบคอม → สาขาโค้ดหนักมีคำเตือน", () => {
    const r = run({ likes: ["computing"], style: { coding: 0 } }).results.find((x) => x.programId === "sit-cs");
    expect(r?.cons).toContain("เขียนโปรแกรมหนัก");
  });

  it("ทุกสาขาที่เปิดรับมีคำตอบสักชุดที่ทำให้ติด 3 อันดับแรก", () => {
    for (const p of catalog.filter((x) => x.status === "open")) {
      const likes = [...COMPASS_DIMS].filter((d) => p.profile[d] >= 2).sort((a, b) => p.profile[b] - p.profile[a]).slice(0, 3);
      const answers = {
        likes,
        style: { hands_on: p.profile.hands_on, theory: p.profile.theory, creative: p.profile.creative, coding: p.profile.computing, teaching: p.profile.teaching },
        lang: p.language === "en" ? 2 : p.language === "th" ? 0 : 1,
      };
      // ลองทุกตัวเลือกของคำถามต่อยอด (สาขาที่ด้านความสนใจเหมือนกันแยกกันด้วยข้อนี้)
      const tries = [{}, ...followupsFor(likes).flatMap((q) => q.options.map((_, i) => ({ [q.id]: i })))];
      expect(tries.some((followups) => topIds({ ...answers, followups }).includes(p.id)), p.id).toBe(true);
    }
  });

  it("คำถามต่อยอดเลือกตามเรื่องที่ชอบ ไม่ซ้ำ และไม่เกิน 2 ข้อ", () => {
    expect(followupsFor(["computing", "design_art", "chem_bio"]).map((q) => q.id)).toEqual(["fu_computing", "fu_design"]);
    expect(followupsFor(["electronics", "machines"]).map((q) => q.id)).toEqual(["fu_engineering"]);
    expect(followupsFor(["teaching"])).toEqual([]);
  });

  it("สรุปให้ LLM มีชื่อเต็มและคณะ · ผลเก่าในประวัติแชทยังอ่านชื่อได้ · ตึกไม่ซ้ำ", () => {
    const { results } = run({ likes: ["computing"], lang: 2 });
    expect(compassSummary(results)).toContain("คณะ");
    expect(programName("sit-cs")).toBe("CS");
    expect(new Set(compassPlaceIds(results)).size).toBe(compassPlaceIds(results).length);
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Tier } from "@/lib/data/schemas";
import { corpus, NAMESPACES, parseMarkdownKb, thaiRange } from "./knowledge";

const KB = path.join(process.cwd(), "content", "kb");
const kbFiles = fs
  .readdirSync(KB, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => fs.readdirSync(path.join(KB, d.name)).filter((f) => f.endsWith(".md")).map((f) => `${d.name}/${f}`));

describe("ไฟล์ความรู้ content/kb", () => {
  it("โฟลเดอร์ทุกอันเป็น namespace ที่ระบบรู้จัก", () => {
    const dirs = fs.readdirSync(KB, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(dirs.filter((d) => !(NAMESPACES as readonly string[]).includes(d))).toEqual([]);
  });

  it.each(kbFiles)("%s มี frontmatter ครบและถูกต้อง", (file) => {
    const raw = fs.readFileSync(path.join(KB, file), "utf8");
    const chunks = parseMarkdownKb(file.replace(/\.md$/, ""), raw);
    expect(chunks.length, "ต้องมีหัวข้อ ## อย่างน้อย 1 หัวข้อ").toBeGreaterThan(0);
    const [c] = chunks;
    expect(c.namespace, "namespace ต้องตรงกับชื่อโฟลเดอร์").toBe(file.split("/")[0]);
    expect(Tier.safeParse(c.tier).success, `tier ต้องเป็น ${Tier.options.join(" / ")}`).toBe(true);
    expect(c.updated_at, "updated_at ต้องเป็น YYYY-MM-DD").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (c.tier === "official") expect(c.source_url, "ข้อมูล official ต้องมี source_url").toMatch(/^https?:\/\//);
    for (const chunk of chunks) expect(chunk.text.length, `หัวข้อ "${chunk.title}" ว่าง`).toBeGreaterThan(20);
  });

  it("id ของ chunk ไม่ซ้ำกัน", () => {
    const ids = corpus().chunks.map((c) => c.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

describe("วันที่ภาษาไทยใน CONTEXT", () => {
  it("เขียนเดือนไทยและ พ.ศ. กำกับค่า ISO (กันโมเดลแปลงเลขเดือนผิด)", () => {
    expect(thaiRange("2027-05-07", "2027-05-11")).toBe("7 พฤษภาคม 2570 ถึง 11 พฤษภาคม 2570 (2027-05-07 ถึง 2027-05-11)");
    expect(thaiRange("2026-08-20", "2026-08-20")).toBe("20 สิงหาคม 2569 (2026-08-20)");
  });

  it("chunk รอบสมัคร TCAS และปฏิทินการศึกษามีวันที่ภาษาไทย", () => {
    const chunks = corpus().chunks;
    expect(chunks.find((c) => c.id === "tcas:r3-admission")!.text).toContain("7 พฤษภาคม 2570");
    expect(chunks.find((c) => c.id === "calendar:2569")!.text).toContain("ธันวาคม 2569");
  });
});

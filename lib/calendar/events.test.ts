import { describe, expect, it } from "vitest";
import { academicMonths, allEvents, dayOf, dayStatus, eventsInMonth, eventsOn, monthGrid, upcoming } from "./events";

describe("ปฏิทินนักศึกษา", () => {
  it("รวมทุกแหล่งและ id ไม่ซ้ำ", () => {
    const events = allEvents();
    const kinds = new Set(events.map((e) => e.kind));
    for (const k of ["term", "register", "pay", "exam", "holiday", "makeup", "admission"]) expect(kinds.has(k as never), k).toBe(true);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it("ม.ค. 2570 มีลงทะเบียน จ่ายเงิน และเปิดภาค 2", () => {
    const titles = eventsInMonth(2027, 1).map((e) => `${e.start} ${e.title}`);
    expect(titles.some((t) => t.startsWith("2027-01-04") && t.includes("ลงทะเบียน"))).toBe(true);
    expect(titles.some((t) => t.startsWith("2027-01-11") && t.includes("ชำระ"))).toBe(true);
    expect(titles.some((t) => t.startsWith("2027-01-13") && t.includes("เปิดภาค"))).toBe(true);
  });

  it("ตารางเดือนเริ่มวันจันทร์", () => {
    const grid = monthGrid(2026, 11); // 1 พ.ย. 2569 เป็นวันอาทิตย์
    expect(grid[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(grid[0][6]).toBe("2026-11-01");
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(dayOf("2026-11-02")).toBe("mon");
  });

  it("ปีการศึกษามี 12 เดือน ส.ค. 2569 ถึง ก.ค. 2570", () => {
    const months = academicMonths();
    expect(months[0]).toEqual({ year: 2026, month: 8 });
    expect(months.at(-1)).toEqual({ year: 2027, month: 7 });
    expect(months).toHaveLength(12);
  });

  it("สถานะของวัน", () => {
    expect(dayStatus("2026-12-10").tone).toBe("holiday"); // วันรัฐธรรมนูญ
    expect(dayStatus("2026-12-01").tone).toBe("exam"); // ไฟนอล
    expect(dayStatus("2026-10-31")).toMatchObject({ tone: "makeup", followsDay: "mon" });
    expect(dayStatus("2026-11-04").tone).toBe("class");
    expect(dayStatus("2026-11-08").tone).toBe("weekend");
    expect(dayStatus("2026-12-20").tone).toBe("break");
    expect(dayStatus("2027-04-14").tone).toBe("holiday"); // สงกรานต์
    expect(dayStatus("2026-09-17").tone).toBe("holiday"); // ไหว้ครู งดเรียน
  });

  it("upcoming ไม่เอารายการที่จบไปแล้ว", () => {
    const next = upcoming("2026-11-06", 3, ["pay", "register", "withdraw", "exam"]);
    expect(next.length).toBe(3);
    for (const e of next) expect(e.end >= "2026-11-06", e.id).toBe(true);
    expect(eventsOn("2026-11-13").some((e) => e.kind === "withdraw")).toBe(true);
  });
});

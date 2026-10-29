import { describe, expect, it } from "vitest";
import type { ThreadItem } from "@/components/chat/types";
import type { ValidatedAnswer } from "@/lib/ai/schema";
import { createLocalHistoryStore, titleOf } from "./history-store";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

const answer = { message: "ตอบ", places: [], show_map: false, cards: [], chips: [], profile_update: null, confidence: "high", sources: [] } as ValidatedAnswer;
const thread = (q: string): ThreadItem[] => [
  { kind: "user", id: "u1", text: q },
  { kind: "assistant", id: "a1", status: "done", answer },
  { kind: "user", id: "u2", text: "ต่อ" },
  { kind: "assistant", id: "a2", status: "streaming", partial: { message: "กำลังพิม" } },
];

describe("history store (local)", () => {
  it("เก็บ เรียงล่าสุดก่อน และไม่เก็บคำตอบที่ยังไหลอยู่", async () => {
    const store = createLocalHistoryStore(memory());
    await store.save({ id: "c1", title: "เก่า", updatedAt: 1, thread: thread("CS ค่าเทอม") });
    await store.save({ id: "c2", title: "ใหม่", updatedAt: 2, thread: thread("CB2301 อยู่ไหน") });
    expect((await store.list()).map((c) => c.id)).toEqual(["c2", "c1"]);
    const c1 = await store.get("c1");
    expect(c1?.thread.map((i) => i.id)).toEqual(["u1", "a1", "u2"]);
  });

  it("แชทที่ยังไม่มีคำถามไม่ถูกเก็บ และลบได้", async () => {
    const store = createLocalHistoryStore(memory());
    await store.save({ id: "empty", title: "แชทใหม่", updatedAt: 1, thread: [] });
    await store.save({ id: "c1", title: "x", updatedAt: 1, thread: thread("q") });
    expect((await store.list()).map((c) => c.id)).toEqual(["c1"]);
    await store.remove("c1");
    expect(await store.list()).toEqual([]);
  });

  it("ข้อมูลใน storage เสียไม่ทำให้พัง", async () => {
    const kv = memory();
    kv.setItem("tangmod.chats.v1", "{not json");
    expect(await createLocalHistoryStore(kv).list()).toEqual([]);
  });

  it("ชื่อแชทมาจากคำถามแรก", () => {
    expect(titleOf(thread("  CB2301   อยู่ไหน "))).toBe("CB2301 อยู่ไหน");
    expect(titleOf([])).toBe("แชทใหม่");
  });
});

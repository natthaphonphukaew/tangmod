import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { mockChatModel } from "@/lib/ai/mock-model";
import { emptyProfile, type StreamEvent } from "@/lib/ai/schema";

// โมเดลแรกส่งข้อความมาครึ่งประโยคแล้วล้ม (แบบที่ gateway ตอบ 502 กลางทาง) → ต้องล้างแล้วไปตัวถัดไป
const breaksMidStream = new MockLanguageModelV4({
  doStream: async () => ({
    stream: new ReadableStream({
      start(c) {
        c.enqueue({ type: "text-start", id: "t" });
        c.enqueue({ type: "text-delta", id: "t", delta: '{"message":"ครึ่งประโยคที่' });
        c.enqueue({ type: "error", error: new Error("502 Bad Gateway") });
        c.close();
      },
    }),
  }),
});

vi.mock("@/lib/ai/models", () => ({
  chatModels: () => [
    { id: "broken", model: breaksMidStream },
    { id: "backup", model: mockChatModel() },
  ],
}));

const { POST } = await import("./route");
const { getDb } = await import("@/lib/db");
const { feedback } = await import("@/lib/db/schema");
const { UNANSWERED_REASON } = await import("@/lib/unanswered");

const unanswered = async () =>
  (await getDb().select().from(feedback)).filter((r) => r.reason === UNANSWERED_REASON).map((r) => r.question);

async function events(message: string) {
  const res = await POST(
    new Request("http://test/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `test-${Math.random()}` },
      body: JSON.stringify({ history: [], message, profile: emptyProfile() }),
    }),
  );
  return (await res.text())
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as StreamEvent);
}

describe("/api/chat", () => {
  it("โมเดลล้มกลางคำตอบ → ส่ง reset แล้วตอบด้วยโมเดลถัดไป แทนการโชว์ error", async () => {
    const evs = await events("CS ค่าเทอมเท่าไหร่");
    const types = evs.map((e) => e.type);
    expect(types).toContain("reset");
    expect(types.indexOf("reset")).toBeLessThan(types.lastIndexOf("partial"));
    const last = evs.at(-1)!;
    expect(last.type).toBe("final");
    expect(last.type === "final" && last.model).toBe("backup");
  });

  it("คำถามที่ข้อมูลไม่พอ (confidence low) ถูกเก็บไว้ให้เติมข้อมูล คำถามที่ตอบได้ไม่เก็บ", async () => {
    const before = await unanswered();
    const evs = await events("วันนี้ร้านขนมจีนลานปูนเปิดไหม โทร 0812345678");
    const last = evs.at(-1)!;
    expect(last.type === "final" && last.data.confidence).toBe("low");
    const after = await unanswered();
    expect(after.length).toBe(before.length + 1);
    // เบอร์โทรถูกลบก่อนเก็บ
    expect(after.at(-1)).toContain("ขนมจีน");
    expect(after.at(-1)).not.toContain("0812345678");
    expect(after).not.toContain("CS ค่าเทอมเท่าไหร่");
  });

  it("คำขอผิดรูปแบบ → 400", async () => {
    const res = await POST(new Request("http://test/api/chat", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
});

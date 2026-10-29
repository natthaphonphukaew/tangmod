import { beforeAll, describe, expect, it } from "vitest";

// ใช้ Postgres ในหน่วยความจำ (PGlite) ไม่แตะไฟล์ .data
process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;

const { ensureSchema, getDb } = await import("@/lib/db");
const { user } = await import("@/lib/db/schema");
const { ConversationInput, deleteConversation, getConversation, listConversations, saveConversation } = await import("./history-server");

const convo = (id: string, updatedAt: number, title = "CB2301 อยู่ไหน") => ({
  id,
  title,
  updatedAt,
  thread: [
    { kind: "user" as const, id: "u1", text: title },
    { kind: "assistant" as const, id: "a1", status: "done", answer: { message: "อาคารเรียนรวม 2 ชั้น 3" } },
  ],
});

beforeAll(async () => {
  await ensureSchema();
  await ensureSchema(); // เรียกซ้ำได้ ไม่พัง
  await getDb()
    .insert(user)
    .values([
      { id: "alice", name: "Alice", email: "alice@tangmod.test" },
      { id: "bob", name: "Bob", email: "bob@tangmod.test" },
    ]);
});

describe("history (server)", () => {
  it("บันทึก แก้ และเรียงล่าสุดก่อน", async () => {
    expect(await saveConversation("alice", convo("chat-0001", 1))).toBe(true);
    expect(await saveConversation("alice", convo("chat-0002", 2, "ค่าเทอม CS"))).toBe(true);
    expect(await saveConversation("alice", convo("chat-0001", 3, "แก้ชื่อแล้ว"))).toBe(true);
    const list = await listConversations("alice");
    expect(list.map((c) => [c.id, c.title])).toEqual([
      ["chat-0001", "แก้ชื่อแล้ว"],
      ["chat-0002", "ค่าเทอม CS"],
    ]);
    const got = await getConversation("alice", "chat-0001");
    expect((got?.thread as { id: string }[]).map((i) => i.id)).toEqual(["u1", "a1"]);
  });

  it("คนอื่นอ่าน เขียนทับ หรือลบแชทของเราไม่ได้", async () => {
    expect(await getConversation("bob", "chat-0002")).toBeNull();
    expect(await saveConversation("bob", convo("chat-0002", 9, "แอบเขียนทับ"))).toBe(false);
    await deleteConversation("bob", "chat-0002");
    expect((await getConversation("alice", "chat-0002"))?.title).toBe("ค่าเทอม CS");
    expect(await listConversations("bob")).toEqual([]);
  });

  it("ลบได้เฉพาะของตัวเอง", async () => {
    await deleteConversation("alice", "chat-0002");
    expect((await listConversations("alice")).map((c) => c.id)).toEqual(["chat-0001"]);
  });

  it("ตรวจรูปแบบแชทที่ส่งมา", () => {
    expect(ConversationInput.safeParse(convo("chat-0003", 1)).success).toBe(true);
    expect(ConversationInput.safeParse({ ...convo("bad id!", 1) }).success).toBe(false);
    expect(ConversationInput.safeParse({ ...convo("chat-0004", 1), thread: [{ kind: "system", id: "x" }] }).success).toBe(false);
    const huge = { ...convo("chat-0005", 1), thread: [{ kind: "user", id: "u", text: "ก".repeat(210_000) }] };
    expect(ConversationInput.safeParse(huge).success).toBe(false);
  });
});

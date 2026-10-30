import { hasContent, type ThreadItem } from "@/components/chat/types";

/*
 * ประวัติแชท (แถบซ้าย) — UI คุยผ่าน interface HistoryStore เท่านั้น
 *   ไม่ได้ login → localHistoryStore (localStorage ในเครื่อง)
 *   login แล้ว   → serverHistoryStore (/api/history ผูกกับบัญชี ใช้ได้ทุกเครื่อง)
 */

export type Conversation = { id: string; title: string; updatedAt: number; thread: ThreadItem[] };
export type ConversationMeta = Omit<Conversation, "thread">;

export interface HistoryStore {
  list(): Promise<ConversationMeta[]>;
  get(id: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "tangmod.chats.v1";
const MAX_CONVERSATIONS = 50;
const MAX_ITEMS = 60;

type KV = Pick<Storage, "getItem" | "setItem">;

/** ชื่อแชท = คำถามแรก (ตัดให้สั้น) */
export function titleOf(thread: ThreadItem[]): string {
  const first = thread.find((i) => i.kind === "user" || i.kind === "compass");
  if (first?.kind === "compass") return "เข็มทิศสาขา";
  const text = first?.kind === "user" ? first.text.trim().replace(/\s+/g, " ") : "";
  return text.length > 40 ? `${text.slice(0, 40)}…` : text || "แชทใหม่";
}

/** เก็บเฉพาะข้อความที่จบแล้ว คำตอบที่กำลังไหลหรือ error ไม่ต้องจำ */
function storable(thread: ThreadItem[]): ThreadItem[] {
  return thread
    .filter((i) => i.kind !== "assistant" || (i.status === "done" && i.answer))
    .map((i) => (i.kind === "assistant" ? { ...i, partial: undefined } : i))
    .slice(-MAX_ITEMS);
}

function isConversation(x: unknown): x is Conversation {
  const c = x as Conversation;
  return !!c && typeof c.id === "string" && typeof c.title === "string" && typeof c.updatedAt === "number" && Array.isArray(c.thread);
}

/** storage ส่งเข้ามาได้เพื่อเทสต์ · ค่าเริ่มต้นคือ localStorage (อาจใช้ไม่ได้ในโหมดส่วนตัว จึงครอบ try/catch ทุกจุด) */
export function createLocalHistoryStore(storage?: KV): HistoryStore {
  const kv = (): KV | null => {
    try {
      return storage ?? window.localStorage;
    } catch {
      return null;
    }
  };
  const readAll = (): Conversation[] => {
    try {
      const raw = kv()?.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isConversation) : [];
    } catch {
      return [];
    }
  };
  const writeAll = (items: Conversation[]) => {
    try {
      kv()?.setItem(KEY, JSON.stringify(items));
    } catch {
      // เต็มหรือถูกปิดไว้: ทิ้งแชทเก่าครึ่งหนึ่งแล้วลองอีกครั้ง
      try {
        kv()?.setItem(KEY, JSON.stringify(items.slice(0, Math.ceil(items.length / 2))));
      } catch {
        /* เก็บไม่ได้จริง ๆ ก็ใช้งานต่อแบบไม่มีประวัติ */
      }
    }
  };

  return {
    async list() {
      return readAll()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
    },
    async get(id) {
      return readAll().find((c) => c.id === id) ?? null;
    },
    async save(conversation) {
      const thread = storable(conversation.thread);
      if (!hasContent(thread)) return;
      const rest = readAll().filter((c) => c.id !== conversation.id);
      writeAll([{ ...conversation, thread }, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS));
    },
    async remove(id) {
      writeAll(readAll().filter((c) => c.id !== id));
    },
  };
}

export const localHistoryStore: HistoryStore = createLocalHistoryStore();

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`history ${res.status}`);
  return res.status === 204 ? null : ((await res.json()) as T);
}

export const serverHistoryStore: HistoryStore = {
  async list() {
    return (await api<ConversationMeta[]>("/api/history")) ?? [];
  },
  async get(id) {
    return api<Conversation>(`/api/history/${encodeURIComponent(id)}`);
  },
  async save(conversation) {
    const thread = storable(conversation.thread);
    if (!hasContent(thread)) return;
    await api(`/api/history/${encodeURIComponent(conversation.id)}`, {
      method: "PUT",
      body: JSON.stringify({ ...conversation, title: conversation.title.slice(0, 80), thread }),
    });
  },
  async remove(id) {
    await api(`/api/history/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

/**
 * login ครั้งแรกบนเครื่องนี้: ย้ายแชทที่เก็บในเครื่องขึ้นบัญชี แล้วลบออกจากเครื่อง (ไม่ให้ซ้ำสองที่)
 * คืนจำนวนแชทที่ย้าย · ย้ายไม่สำเร็จจะไม่ลบของในเครื่อง
 */
export async function moveLocalHistoryToServer(): Promise<number> {
  const metas = await localHistoryStore.list();
  if (!metas.length) return 0;
  const conversations = (await Promise.all(metas.map((m) => localHistoryStore.get(m.id)))).filter((c): c is Conversation => c !== null);
  const res = await api<{ imported: number }>("/api/history/import", {
    method: "POST",
    body: JSON.stringify({ conversations: conversations.map((c) => ({ ...c, title: c.title.slice(0, 80), thread: storable(c.thread) })) }),
  });
  await Promise.all(metas.map((m) => localHistoryStore.remove(m.id)));
  return res?.imported ?? 0;
}

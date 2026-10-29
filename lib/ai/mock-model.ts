import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { placeById, programById } from "@/lib/data";
import { findRooms } from "@/lib/map/rooms";
import { detectEntities } from "./retrieve";
import { locationIntent } from "./validate";
import type { ChatAnswer } from "./schema";

/*
 * โหมดออฟไลน์: ใช้ตอนยังไม่ได้ตั้ง API key หรือตอนที่โมเดลจริงล่มหมดทุกตัว
 * ไม่ได้ "คิด" อะไร แค่ชี้หมุดและดึงการ์ดข้อมูลจริงจากชื่อที่เจอในคำถาม
 * UI ทั้งหมดจึงพัฒนาและเดโมต่อได้โดยไม่ต้องใช้โควตา
 */
export type OfflineReason = "no_key" | "busy" | "rate_limited";

const OFFLINE_LEAD: Record<OfflineReason, string> = {
  no_key: "ตอนนี้มดอยู่ในโหมดออฟไลน์ (ยังไม่ได้เชื่อมต่อ AI) เลยยังเรียบเรียงคำตอบเองไม่ได้",
  busy: "ตอนนี้ AI ตอบช้ากว่าปกติ มดเลยยังเรียบเรียงคำตอบเองไม่ได้",
  rate_limited: "โควตา AI วันนี้หมดแล้ว มดเลยยังเรียบเรียงคำตอบเองไม่ได้",
};

export function offlineAnswer(question: string, reason: OfflineReason = "no_key"): ChatAnswer {
  const { programIds, placeIds } = detectEntities(question);
  const wantsAdmission = /สมัคร|tcas|รอบ|portfolio|พอร์ต|ทุน/i.test(question);
  const rooms = findRooms(question);
  // ตึกของสาขาปักเฉพาะเมื่อถามหาที่ตั้ง ถามค่าเทอมแล้วไม่ต้องมีหมุด
  const programPlaces = locationIntent(question)
    ? programIds.map((id) => programById.get(id)?.place_id).filter((id): id is string => !!id)
    : [];
  const pins = [...new Set([...placeIds, ...programPlaces])];

  const cards: ChatAnswer["cards"] = [];
  if (programIds.length >= 2) cards.push({ type: "compare", ids: programIds.slice(0, 4) });
  else if (programIds.length === 1) cards.push({ type: "program", ids: programIds });
  if (wantsAdmission) cards.push({ type: "timeline", ids: programIds });

  const found = pins.length || cards.length;
  const names = pins.map((id) => placeById.get(id)?.short ?? id).join(", ");
  // เลขห้องตอบได้แม้ออฟไลน์ เพราะอ่านจากกติกาเลขห้องตรง ๆ
  const roomLine = rooms.map((r) => `${r.code} อยู่${placeById.get(r.placeId)?.name_th} (${r.building}) ชั้น ${r.floor}`).join(" · ");

  return {
    message: found
      ? `${roomLine ? `${roomLine}

` : ""}${OFFLINE_LEAD[reason]} แต่${names ? `ชี้ตำแหน่ง ${names} และ` : ""}ดึงข้อมูลจริงมาให้ดูได้ ลองกดดูการ์ดด้านล่างนะ`
      : `${OFFLINE_LEAD[reason]} ลองพิมพ์ชื่อสาขา (เช่น CS, คอมวิศวะ) ชื่อตึก หรือเลขห้อง (เช่น CB2301) แล้วมดจะชี้ให้ดูบนแผนที่`,
    places: pins.map((id) => ({ place_id: id, reason: placeById.get(id)?.name_th ?? id })),
    show_map: pins.length > 0,
    cards,
    chips: ["คอมวิศวะ กับ CS ต่างกันยังไง", "CB2301 อยู่ตรงไหน", "รอบสมัครที่เปิดอยู่"],
    profile_update: programIds.length ? { interests_add: [], considering_add: programIds, role_guess: "unknown" } : null,
    source_ids: programIds.map((id) => `program:${id}`),
    confidence: found ? "high" : "low",
  };
}

function lastUserText(prompt: unknown): string {
  if (!Array.isArray(prompt)) return "";
  for (let i = prompt.length - 1; i >= 0; i--) {
    const msg = prompt[i] as { role?: string; content?: unknown };
    if (msg.role !== "user") continue;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content.map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text : "")).join(" ");
    }
  }
  return "";
}

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

export function mockChatModel() {
  return new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      const json = JSON.stringify(offlineAnswer(lastUserText(prompt)));
      // แบ่งเป็นท่อน ๆ ให้เหมือน stream จริง UI จะได้ทดสอบ partial ได้
      const chars = Array.from(json);
      const pieces = Array.from({ length: Math.ceil(chars.length / 24) }, (_, i) => chars.slice(i * 24, i * 24 + 24).join(""));
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 250,
          chunkDelayInMs: 12,
          chunks: [
            { type: "text-start" as const, id: "t" },
            ...pieces.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
            { type: "text-end" as const, id: "t" },
            { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, logprobs: undefined, usage },
          ],
        }),
      };
    },
  });
}

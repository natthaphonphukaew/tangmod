import { placeById, programById } from "@/lib/data";
import { findRooms } from "@/lib/map/rooms";
import { corpus } from "./knowledge";
import { detectEntities } from "./retrieve";
import type { ChatAnswer, ResolvedSource, ValidatedAnswer } from "./schema";

/*
 * ด่านสุดท้ายก่อนถึงผู้ใช้: LLM อาจแต่ง id ขึ้นมาเอง
 * ทุก id ต้องมีอยู่จริง ค่าที่ไม่มีอยู่จะถูกตัดทิ้ง และ URL มาจาก server เท่านั้น
 */

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const URL_RE = /\bhttps?:\/\/\S+/gi;
// โมเดลบางตัวชอบแปะ id ของ chunk ท้ายประโยค เช่น "[kb:eng/cpe-vs-sit#1, program:eng-cpe]"
const CHUNK_REF_RE = /\s*[[(](?:\s*,?\s*(?:kb|program|place|tcas|calendar|contact):[^\]),]+)+\s*[\])]/gi;

export const cleanMessage = (text: string) =>
  text.replace(URL_RE, "").replace(CHUNK_REF_RE, "").replace(/[ \t]+\n/g, "\n").trim();

// คำถามแบบนี้ต้องการเห็นตำแหน่ง (ไม่ใส่คำว่า "ห้อง" เดี่ยว ๆ เพราะ "ห้องสมุดเปิดกี่โมง" ไม่ต้องใช้แผนที่)
const LOCATION_RE = /อยู่ไหน|อยู่ตรงไหน|ตรงไหน|ที่ไหน|ตึกไหน|ชั้นไหน|อยู่ชั้น|อยู่ตึก|ไปยังไง|ไปไง|ไปทางไหน|เดินไป|ทางไป|ใกล้ที่สุด|แถวไหน|แผนที่|where|location/i;

/** ผู้ใช้ถามหาตำแหน่งไหม (คำถามเชิงที่ตั้ง หรือมีเลขห้องอย่าง CB2301) */
export const locationIntent = (question: string) => LOCATION_RE.test(question) || findRooms(question).length > 0;

// ถามเวลา ราคา หลักสูตร การสมัคร: ต่อให้ LLM ขอเปิดแผนที่ก็ไม่เปิด (ยกเว้นถามหาที่ตั้งด้วย) — MiniMax ชอบตั้ง show_map=true เกินจำเป็น
const NON_LOCATION_RE = /กี่โมง|เปิดกี่|ปิดกี่|เปิดไหม|ค่าเทอม|ราคา|เท่าไหร่|เท่าไร|หน่วยกิต|เกรด|gpax|สมัคร|tcas|รอบ/i;

/**
 * question = คำถามของผู้ใช้ ใช้ตัดสินว่าควรเปิดแผนที่ไหม เพราะ LLM ตั้ง show_map ไม่สม่ำเสมอ
 * แผนที่เปิดเมื่อมีหมุด และ (LLM ขอ หรือคำถามถามหาตำแหน่ง) — ถามค่าเทอมแล้วแผนที่ไม่ควรเด้ง
 */
export function validateAnswer(raw: ChatAnswer, question: string): ValidatedAnswer {
  const wantsLocation = locationIntent(question);
  const placeList = uniq(raw.places.map((p) => p.place_id))
    .filter((id) => placeById.has(id))
    .slice(0, 5)
    .map((id) => ({ place_id: id, reason: raw.places.find((p) => p.place_id === id)!.reason.slice(0, 80) }));

  const cards = raw.cards
    .map((card) => {
      const validPrograms = uniq(card.ids).filter((id) => programById.has(id));
      switch (card.type) {
        case "compare":
          if (validPrograms.length >= 2) return { type: "compare" as const, ids: validPrograms.slice(0, 4) };
          if (validPrograms.length === 1) return { type: "program" as const, ids: validPrograms };
          return null;
        case "program":
          return validPrograms.length ? { type: "program" as const, ids: validPrograms.slice(0, 1) } : null;
        case "timeline":
          return { type: "timeline" as const, ids: validPrograms };
        case "place": {
          const ids = uniq(card.ids).filter((id) => placeById.has(id)).slice(0, 1);
          return ids.length ? { type: "place" as const, ids } : null;
        }
      }
    })
    .filter((c) => c !== null)
    .slice(0, 3);

  // ถามหาตำแหน่งแต่โมเดลลืมใส่ places (MiniMax เป็นบ่อย): ปักจากชื่อตึก/เลขห้องที่อยู่ในคำถามเอง
  if (placeList.length === 0 && wantsLocation) {
    for (const id of detectEntities(question).placeIds.slice(0, 5)) {
      const place = placeById.get(id)!;
      placeList.push({ place_id: id, reason: place.short ?? place.name_th });
    }
  }

  const profile_update = raw.profile_update && {
    interests_add: raw.profile_update.interests_add.map((s) => s.trim().slice(0, 30)).filter(Boolean).slice(0, 3),
    considering_add: raw.profile_update.considering_add.filter((id) => programById.has(id)).slice(0, 3),
    role_guess: raw.profile_update.role_guess,
  };

  return {
    message: cleanMessage(raw.message),
    places: placeList,
    show_map: placeList.length > 0 && (wantsLocation || (raw.show_map && !NON_LOCATION_RE.test(question))),
    cards,
    chips: raw.chips.map((c) => c.trim()).filter((c) => c && c.length <= 40).slice(0, 3),
    profile_update,
    confidence: raw.confidence,
    sources: resolveSources(raw.source_ids, cards),
  };
}

type Loose<T> = { [K in keyof T]?: unknown };
const strings = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);

/**
 * โมเดลตอบมาเกือบครบแต่ JSON ท้ายเสีย (เจอกับ Gemini บ้าง): ใช้ส่วนที่ parse ได้แล้วแทนการโชว์ error
 * ใช้ได้เมื่อมี field หลัง message แล้วเท่านั้น เพื่อให้แน่ใจว่าข้อความไม่ได้ถูกตัดกลางประโยค
 */
export function salvageAnswer(partial: Loose<ChatAnswer> | undefined): ChatAnswer | null {
  if (!partial || typeof partial.message !== "string" || !partial.message.trim() || partial.places === undefined) return null;
  const objects = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);
  return {
    message: partial.message,
    places: objects(partial.places)
      .filter((p) => typeof p.place_id === "string")
      .map((p) => ({ place_id: p.place_id as string, reason: typeof p.reason === "string" ? p.reason : "" })),
    cards: objects(partial.cards)
      .filter((c) => ["program", "compare", "place", "timeline"].includes(c.type as string))
      .map((c) => ({ type: c.type as ChatAnswer["cards"][number]["type"], ids: strings(c.ids) })),
    show_map: partial.show_map === true,
    chips: strings(partial.chips),
    profile_update: null,
    source_ids: strings(partial.source_ids),
    confidence: partial.confidence === "high" ? "high" : "low",
  };
}

function resolveSources(sourceIds: string[], cards: { type: string; ids: string[] }[]): ResolvedSource[] {
  const { byId } = corpus();
  // การ์ดที่แสดงตัวเลขต้องมีแหล่งที่มาเสมอ แม้ LLM จะลืมอ้าง
  const fromCards = cards.flatMap((c) =>
    c.type === "program" || c.type === "compare" ? c.ids.map((id) => `program:${id}`) : [],
  );
  const out: ResolvedSource[] = [];
  const seenUrls = new Set<string>();
  for (const id of uniq([...sourceIds, ...fromCards])) {
    const chunk = byId.get(id);
    if (!chunk) continue;
    const key = chunk.source_url ?? chunk.id;
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    out.push({ id: chunk.id, title: chunk.title, url: chunk.source_url, tier: chunk.tier, updated_at: chunk.updated_at });
  }
  return out.slice(0, 5);
}

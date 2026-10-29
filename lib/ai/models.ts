import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { mockChatModel } from "./mock-model";

/*
 * ลำดับโมเดลที่จะลอง: CHAT_MODELS="minimax:minimax-m3,google:gemini-3.5-flash-lite,..."
 * ถ้าตัวแรกโดน 429 / ล่ม / ช้า จะลองตัวถัดไป (route.ts) · ตัวที่ไม่มี key จะถูกข้ามไปเอง
 * ไม่มี API key เลย → ใช้ mock เพื่อให้พัฒนา UI ได้
 * MiniMax ผ่าน gateway ของ SIT (key จากอาจารย์) = ตัวหลัก · Gemini/Typhoon = ฟรี (สำรอง)
 * gateway มี minimax-m2.7, minimax-m3, minimax-m3.1-flash · m3.1-flash คิดก่อนตอบนาน (~18 วิ) จึงไม่ใช้
 */
const DEFAULT_CHAIN =
  "minimax:minimax-m3,google:gemini-3.5-flash-lite,google:gemini-3.5-flash,typhoon:typhoon-v2.5-30b-a3b-instruct";

export type ChatModel = {
  id: string;
  model: LanguageModel;
  /** API ไม่รองรับ JSON schema แบบบังคับ → ต้องแนบ schema ไว้ใน system prompt แทน */
  schemaInPrompt?: boolean;
};

export function chatModels(): ChatModel[] {
  const chain = (process.env.CHAT_MODELS ?? DEFAULT_CHAIN)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const models = chain.flatMap((id): ChatModel[] => {
    const [provider, ...rest] = id.split(":");
    const name = rest.join(":");
    if (provider === "minimax" && process.env.MINIMAX_API_KEY) {
      // gateway ของ SIT เปิดแค่ Anthropic API (/v1/messages) และไม่รองรับ JSON schema แบบบังคับ
      // ถ้าบังคับผ่าน tool คำตอบจะมาก้อนเดียวตอนจบ จึงให้ตอบ JSON เป็นข้อความ (schema อยู่ใน prompt) เพื่อให้ stream ได้
      const gateway = createAnthropic({
        baseURL: process.env.MINIMAX_BASE_URL ?? "https://nrrai2-model.sit.kmutt.ac.th/api/v1",
        authToken: process.env.MINIMAX_API_KEY,
      });
      return [{ id, model: gateway(name), schemaInPrompt: true }];
    }
    if (provider === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return [{ id, model: createGoogleGenerativeAI()(name) }];
    }
    if (provider === "typhoon" && process.env.TYPHOON_API_KEY) {
      const typhoon = createOpenAICompatible({
        name: "typhoon",
        baseURL: process.env.TYPHOON_BASE_URL ?? "https://api.opentyphoon.ai/v1",
        apiKey: process.env.TYPHOON_API_KEY,
        supportsStructuredOutputs: true,
      });
      return [{ id, model: typhoon(name) }];
    }
    if (provider === "mock") return [{ id, model: mockChatModel() }];
    return [];
  });

  return models.length ? models : [{ id: "mock:offline", model: mockChatModel() }];
}

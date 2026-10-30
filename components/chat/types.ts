import type { ChatAnswer, ValidatedAnswer } from "@/lib/ai/schema";
import type { CompassAnswers, CompassResult } from "@/lib/compass";

export type ThreadItem =
  | { kind: "user"; id: string; text: string }
  | {
      kind: "assistant";
      id: string;
      status: "streaming" | "done" | "error";
      partial?: Partial<ChatAnswer>;
      answer?: ValidatedAnswer;
      model?: string;
      error?: string;
    }
  /** ผลเข็มทิศสาขา (คิดในเครื่อง ไม่ผ่าน LLM) */
  | { kind: "compass"; id: string; answers: CompassAnswers; results: CompassResult[] };

/** มีอะไรควรเก็บเป็นประวัติไหม (คำถาม หรือผลเข็มทิศ) */
export const hasContent = (thread: ThreadItem[]) => thread.some((i) => i.kind === "user" || i.kind === "compass");

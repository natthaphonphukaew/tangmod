import type { ChatAnswer, ValidatedAnswer } from "@/lib/ai/schema";

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
    };

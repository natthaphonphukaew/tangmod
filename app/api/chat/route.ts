import { APICallError, Output, streamText } from "ai";
import { scrubPII } from "@/lib/ai/guard";
import { offlineAnswer } from "@/lib/ai/mock-model";
import { chatModels } from "@/lib/ai/models";
import { buildSystemPrompt, schemaInstructions } from "@/lib/ai/prompt";
import { retrieve } from "@/lib/ai/retrieve";
import { ChatAnswer, ChatRequest, type StreamEvent } from "@/lib/ai/schema";
import { salvageAnswer, validateAnswer } from "@/lib/ai/validate";
import { isRateLimited } from "@/lib/rate-limit";
import { recordUnanswered } from "@/lib/unanswered";

export const maxDuration = 60;

// Gemini ฟรีเริ่มตอบเร็วสุดราว 1 วิ แต่ช่วงคนใช้เยอะค้างได้ถึง 15 วิ (วัดเมื่อ 28 ต.ค. 69)
// โมเดลที่ยังมีตัวสำรองต่อท้ายได้ 8 วิ ตัวสุดท้ายได้เวลาที่เหลือจนครบ 20 วิ แล้วจึงตกไปโหมดออฟไลน์
const FALLBACK_AFTER_MS = 8_000;
const START_DEADLINE_MS = 20_000;
const REST_OUTPUT_MS = 15_000;

/*
 * POST /api/chat → NDJSON stream: {type:"partial"}* แล้วตามด้วย {type:"final"} หรือ {type:"error"}
 * 1 ข้อความ = เรียก LLM 1 ครั้ง (ประหยัดโควตาฟรี) · ถ้าโมเดลแรกล้มก่อนส่งอะไรออกไป จะลองตัวถัดไป
 * ถ้าล้มหมดทุกตัว → ตอบด้วยโหมดออฟไลน์ ผู้ใช้จะได้หมุดและการ์ดอยู่ดี
 * คำตอบที่ confidence = low (ข้อมูลไม่พอ) เก็บคำถามไว้ให้ทีมเติมข้อมูล (lib/unanswered.ts)
 */
export async function POST(req: Request) {
  const parsed = ChatRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ type: "error", code: "bad_request", message: "รูปแบบคำขอไม่ถูกต้อง" } satisfies StreamEvent, {
      status: 400,
    });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (await isRateLimited(`chat:${ip}`)) {
    return Response.json(
      { type: "error", code: "rate_limited", message: "ถามถี่ไปนิด รอสักครู่แล้วลองใหม่นะ" } satisfies StreamEvent,
      { status: 429 },
    );
  }

  const body = parsed.data;
  const message = scrubPII(body.message);
  const history = body.history.slice(-8);
  const previousUserMessage = [...history].reverse().find((t) => t.role === "user")?.text;

  const retrieved = retrieve({ message, previousUserMessage });
  const system = buildSystemPrompt({ profile: body.profile, chunks: retrieved.chunks, now: new Date() });
  const messages = [
    ...history.map((t) => ({ role: t.role, content: scrubPII(t.text) })),
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let lastError: unknown;

      const candidates = chatModels();
      for (const [i, candidate] of candidates.entries()) {
        let emitted = false;
        let lastPartial: Partial<ChatAnswer> | undefined;
        let streamError: unknown;
        // จับเวลาเอง เพราะ timeout.firstChunkMs ของ SDK นับ metadata เป็น chunk แรก จึงไม่ทำงานกับเคสนี้
        const remaining = START_DEADLINE_MS - (Date.now() - startedAt);
        const waitMs = i < candidates.length - 1 ? Math.min(FALLBACK_AFTER_MS, remaining) : remaining;
        if (waitMs <= 0) break;
        const stall = new AbortController();
        let timer = setTimeout(() => stall.abort(new Error(`no output within ${waitMs}ms`)), waitMs);
        try {
          const result = streamText({
            model: candidate.model,
            system: candidate.schemaInPrompt ? system + schemaInstructions(ChatAnswer) : system,
            messages,
            output: Output.object({ schema: ChatAnswer }),
            temperature: 0.3,
            maxRetries: 0,
            // คำตอบจริงยาวไม่เกิน ~120 คำ กันไว้ไม่ให้โมเดลพูดยาวจนเปลืองโควตา (SDK ไม่รู้จักชื่อ minimax จึงต้องตั้งเอง)
            maxOutputTokens: 1500,
            providerOptions: {
              // Gemini 3.x คิดก่อนตอบเป็นค่าเริ่มต้น ทำให้ข้อความแรกช้าไปหลายวินาที คำถามแคมปัสไม่ต้องคิดนาน
              google: { thinkingConfig: { thinkingLevel: "minimal" } },
              // ไม่ใช้ jsonTool เพราะ gateway ส่ง tool input มาก้อนเดียวตอนจบ (ไม่ stream) — ให้ตอบ JSON เป็นข้อความแทน
              anthropic: { structuredOutputMode: "outputFormat" },
            },
            abortSignal: AbortSignal.any([req.signal, stall.signal]),
            // error จาก provider (เช่น 429) มาทาง stream แล้ว SDK โยนแค่ "No output generated" จึงเก็บตัวจริงไว้เอง
            onError: ({ error }) => {
              streamError = error;
            },
          });
          for await (const partial of result.partialOutputStream) {
            lastPartial = partial as Partial<ChatAnswer>;
            // ยังไม่มีข้อความให้โชว์ = ยังไม่ส่งอะไรออกไป ถ้าล้มตอนนี้ยังสลับโมเดลได้ (Gemini ส่ง {} มาก่อนแล้วค่อย 503)
            if (!lastPartial.message) continue;
            if (!emitted) {
              clearTimeout(timer);
              timer = setTimeout(() => stall.abort(new Error("output stalled")), REST_OUTPUT_MS);
            }
            emitted = true;
            send({ type: "partial", data: lastPartial });
          }
          const answer = validateAnswer(await result.output, message);
          send({ type: "final", data: answer, model: candidate.id });
          const usage = await result.usage;
          log({ model: candidate.id, map: answer.show_map, confidence: answer.confidence, ms: Date.now() - startedAt, tokens: { in: usage.inputTokens, out: usage.outputTokens, think: usage.outputTokenDetails?.reasoningTokens }, context: retrieved.chunks.map((c) => c.id) });
          // บันทึกก่อนปิด stream: บน serverless งานที่ค้างหลังส่ง response จบอาจถูกตัด (ผู้ใช้เห็นคำตอบไปแล้วตั้งแต่ final)
          if (answer.confidence === "low") await recordUnanswered({ question: message, answer, model: candidate.id });
          controller.close();
          return;
        } catch (error) {
          lastError = streamError ?? error;
          console.warn(`[chat] ${candidate.id} failed`, describeError(lastError));
          // ล้มหลังส่ง partial ไปแล้ว: ถ้าข้อความจบแล้วใช้ส่วนที่ได้ ไม่งั้นสั่งให้หน้าเว็บล้างข้อความครึ่ง ๆ แล้วลองตัวถัดไป
          if (emitted) {
            const salvaged = salvageAnswer(lastPartial);
            if (salvaged) {
              const answer = validateAnswer(salvaged, message);
              send({ type: "final", data: answer, model: candidate.id });
              log({ model: candidate.id, salvaged: true, confidence: answer.confidence, ms: Date.now() - startedAt });
              if (answer.confidence === "low") await recordUnanswered({ question: message, answer, model: candidate.id });
              controller.close();
              return;
            }
            send({ type: "reset" });
          }
        } finally {
          clearTimeout(timer);
        }
        if (req.signal.aborted) return;
      }

      const reason = isRateLimit(lastError) ? "rate_limited" : "busy";
      const offline = validateAnswer(offlineAnswer(message, reason), message);
      send({ type: "final", data: offline, model: `offline:${reason}` });
      log({ model: `offline:${reason}`, confidence: offline.confidence, ms: Date.now() - startedAt, context: [] });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // no-transform: ห้าม proxy/CDN บีบอัด (Vercel บีบด้วย brotli แล้วพักข้อมูลไว้ส่งก้อนเดียว ข้อความเลยไม่ไหล)
      "Cache-Control": "no-store, no-transform",
      "Content-Encoding": "identity",
      "X-Accel-Buffering": "no",
    },
  });
}

function isRateLimit(error: unknown) {
  return APICallError.isInstance(error) && error.statusCode === 429;
}

function describeError(error: unknown) {
  if (APICallError.isInstance(error)) return `${error.statusCode} ${error.message.slice(0, 200)}`;
  return error instanceof Error ? error.message.slice(0, 200) : String(error);
}

/** log แบบไม่ผูกตัวตน: ไม่มีข้อความผู้ใช้ ไม่มี IP */
function log(entry: Record<string, unknown>) {
  console.info(`[chat] ${JSON.stringify(entry)}`);
}

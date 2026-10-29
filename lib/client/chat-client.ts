import type { ChatRequest, FeedbackRequest, StreamEvent } from "@/lib/ai/schema";

/** เรียก /api/chat แล้วส่ง event ทีละบรรทัด (NDJSON) */
export async function streamChat(req: ChatRequest, onEvent: (e: StreamEvent) => void, signal?: AbortSignal) {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
  } catch {
    onEvent({ type: "error", code: "unavailable", message: "เชื่อมต่อไม่ได้ เช็กอินเทอร์เน็ตแล้วลองใหม่นะ" });
    return;
  }

  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as StreamEvent | null;
    onEvent(
      body?.type === "error"
        ? body
        : { type: "error", code: "unavailable", message: "เซิร์ฟเวอร์ไม่ตอบ ลองใหม่อีกครั้งนะ" },
    );
    return;
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as StreamEvent);
    }
  }
}

/** ส่ง feedback แบบไม่รอผล (keepalive: ส่งได้แม้ผู้ใช้ปิดหน้าไปแล้ว) */
export function sendFeedback(req: FeedbackRequest) {
  void fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    keepalive: true,
  }).catch(() => {});
}

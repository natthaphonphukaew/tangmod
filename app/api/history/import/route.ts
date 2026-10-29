import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { ConversationInput, saveConversation } from "@/lib/history-server";

/** POST /api/history/import — ตอน login ครั้งแรก ย้ายแชทที่เคยเก็บในเครื่องขึ้นบัญชี */
const ImportBody = z.object({ conversations: z.array(ConversationInput).max(50) });

export async function POST(req: Request) {
  await ensureSchema();
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = ImportBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  let imported = 0;
  for (const c of parsed.data.conversations) if (await saveConversation(user.id, c)) imported++;
  return Response.json({ imported });
}

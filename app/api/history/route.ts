import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { listConversations } from "@/lib/history-server";

/** GET /api/history — รายการแชทของผู้ใช้ที่ login (ไม่ login = 401 หน้าเว็บจะใช้ประวัติในเครื่องแทน) */
export async function GET(req: Request) {
  await ensureSchema();
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await listConversations(user.id), { headers: { "Cache-Control": "no-store" } });
}

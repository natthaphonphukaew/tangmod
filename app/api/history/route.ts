import { connection } from "next/server";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { listConversations } from "@/lib/history-server";

/** GET /api/history — รายการแชทของผู้ใช้ที่ login (ไม่ login = 401 หน้าเว็บจะใช้ประวัติในเครื่องแทน) */
export async function GET(req: Request) {
  // ต้องมาก่อนทุกอย่าง: บอก Next ว่าเป็นข้อมูลตอนมีคำขอ ไม่งั้นตอน build จะพยายามสร้างล่วงหน้าแล้วเปิดฐานข้อมูล
  await connection();
  await ensureSchema();
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await listConversations(user.id), { headers: { "Cache-Control": "no-store" } });
}

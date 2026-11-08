import { connection } from "next/server";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { SavedCompass } from "@/lib/compass-saved";
import { deleteCompass, getCompass, saveCompass } from "@/lib/compass-server";

/*
 * ผลเข็มทิศสาขาของผู้ใช้ที่ login: GET อ่าน · PUT บันทึกทับ · DELETE ลบ
 * ไม่ login = 401 หน้าเว็บจะใช้ผลในเครื่องแทน
 */
async function auth(req: Request) {
  await connection();
  await ensureSchema();
  return currentUser(req);
}

const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  const user = await auth(req);
  if (!user) return unauthorized();
  return Response.json({ compass: await getCompass(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const user = await auth(req);
  if (!user) return unauthorized();
  const parsed = SavedCompass.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  await saveCompass(user.id, parsed.data);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await auth(req);
  if (!user) return unauthorized();
  await deleteCompass(user.id);
  return Response.json({ ok: true });
}

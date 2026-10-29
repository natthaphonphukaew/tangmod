import { connection } from "next/server";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { ConversationInput, deleteConversation, getConversation, saveConversation } from "@/lib/history-server";

/** GET / PUT / DELETE /api/history/:id — แชทหนึ่งอันของผู้ใช้ที่ login */

async function userOr401(req: Request) {
  await connection(); // ห้ามสร้างล่วงหน้าตอน build (ดู app/api/history/route.ts)
  await ensureSchema();
  return currentUser(req);
}

export async function GET(req: Request, ctx: RouteContext<"/api/history/[id]">) {
  const user = await userOr401(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const c = await getConversation(user.id, (await ctx.params).id);
  return c ? Response.json(c, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/history/[id]">) {
  const user = await userOr401(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = ConversationInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.id !== id) return Response.json({ error: "bad_request" }, { status: 400 });
  const saved = await saveConversation(user.id, parsed.data);
  return saved ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/history/[id]">) {
  const user = await userOr401(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  await deleteConversation(user.id, (await ctx.params).id);
  return new Response(null, { status: 204 });
}

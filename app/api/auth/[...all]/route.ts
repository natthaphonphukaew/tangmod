import { toNextJsHandler } from "better-auth/next-js";
import { connection } from "next/server";
import { getAuth } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";

// Better Auth จัดการทุก path ใต้ /api/auth (login Google, callback, session, logout)
// สร้าง handler ตอนมีคำขอ (getAuth ไม่สร้าง auth ตอน import)
const handle = (method: "GET" | "POST") => async (req: Request) => {
  await connection(); // ห้ามสร้างล่วงหน้าตอน build
  await ensureSchema();
  return toNextJsHandler(getAuth())[method](req);
};

export const GET = handle("GET");
export const POST = handle("POST");

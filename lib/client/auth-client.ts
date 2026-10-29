import { createAuthClient } from "better-auth/react";

/** ฝั่งหน้าเว็บของ Better Auth: useSession, login Google, logout */
export const authClient = createAuthClient();

/** ล็อกอินด้วยบัญชีทดสอบ (ใช้ได้เฉพาะ dev — production ตอบ 404) */
export async function devLogin() {
  const res = await fetch("/api/dev-login", { method: "POST" });
  if (!res.ok) throw new Error("dev login failed");
}

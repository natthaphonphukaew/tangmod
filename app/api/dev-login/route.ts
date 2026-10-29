import { authOptions, DEV_TEST_USER, getAuth } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";

/*
 * POST /api/dev-login — ล็อกอินด้วยบัญชีทดสอบ (สร้างให้ถ้ายังไม่มี) ใช้ทดสอบระบบประวัติแชทโดยไม่ต้องมี Google OAuth
 * ใช้ได้เฉพาะตอน dev เท่านั้น production ตอบ 404
 */
export async function POST() {
  if (!authOptions.devLogin) return new Response(null, { status: 404 });
  await ensureSchema();
  const body = { email: DEV_TEST_USER.email, password: DEV_TEST_USER.password };
  const auth = getAuth();
  const signIn = await auth.api.signInEmail({ body, asResponse: true });
  if (signIn.ok) return signIn;
  return auth.api.signUpEmail({ body: { ...body, name: DEV_TEST_USER.name }, asResponse: true });
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getAuthOptions } from "@/lib/auth-options";
import { getDb } from "@/lib/db";
import { schema } from "@/lib/db/schema";

/*
 * Login แบบไม่บังคับ: ถามได้เลยโดยไม่ต้อง login (ประวัติอยู่ในเครื่อง)
 * login ด้วย Google แล้วประวัติแชทย้ายขึ้น server และตามไปทุกเครื่อง
 * ตอน dev มี "ล็อกอินทดสอบ" (อีเมล + รหัสผ่านของบัญชีทดสอบ) ไว้ทดสอบโดยไม่ต้องมี Google OAuth — ปิดเสมอบน production
 */

const isProd = process.env.NODE_ENV === "production";

export const authOptions = getAuthOptions();

export const DEV_TEST_USER = {
  email: "tester@tangmod.test",
  name: "บัญชีทดสอบ (dev)",
  // ค่าเริ่มต้นอยู่ใน .env.example — ใช้ได้เฉพาะเครื่อง dev
  password: process.env.DEV_TEST_PASSWORD ?? "tangmod-dev-only-password",
};

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    // production ต้องตั้ง BETTER_AUTH_SECRET เอง (Better Auth จะไม่ยอมใช้ค่า dev บน production)
    secret: process.env.BETTER_AUTH_SECRET ?? (isProd ? undefined : "tangmod-dev-secret-not-for-production-use-0001"),
    baseURL: process.env.BETTER_AUTH_URL ?? (isProd ? undefined : "http://localhost:3000"),
    emailAndPassword: { enabled: authOptions.devLogin },
    socialProviders: authOptions.google
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : {},
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 วัน
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
/**
 * สร้างตอนมีคำขอจริงเท่านั้น (ไม่สร้างตอน import) — ตอน next build เก็บข้อมูลหน้าเว็บ
 * จะได้ไม่เปิดฐานข้อมูลหรือฟ้องเรื่อง BETTER_AUTH_SECRET
 */
export const getAuth = () => (instance ??= createAuth());

/** ผู้ใช้ที่ login อยู่ของคำขอนี้ (null = ไม่ได้ login) */
export async function currentUser(req: Request) {
  const s = await getAuth().api.getSession({ headers: req.headers });
  return s?.user ?? null;
}

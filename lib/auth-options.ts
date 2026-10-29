/** วิธี login ที่เปิดใช้อยู่ (แยกจาก lib/auth.ts เพื่อให้หน้าเว็บอ่านได้โดยไม่ต้องโหลดฐานข้อมูล) */
export type AuthOptions = { google: boolean; devLogin: boolean };

export const getAuthOptions = (): AuthOptions => ({
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  // ล็อกอินทดสอบใช้ได้เฉพาะตอน dev
  devLogin: process.env.NODE_ENV !== "production",
});

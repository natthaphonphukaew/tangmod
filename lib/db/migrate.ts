/*
 * สร้างตารางถ้ายังไม่มี (idempotent) — ต้องตรงกับ schema.ts
 * ไม่ใช้ drizzle-kit เพราะตารางมีไม่กี่ตัว และ drizzle-kit ลากช่องโหว่ของ esbuild เก่าเข้ามา
 * ถ้าวันหลังต้องแก้คอลัมน์ ให้เพิ่มคำสั่ง ALTER ... IF NOT EXISTS ต่อท้ายรายการ อย่าแก้ของเดิม
 */
export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "email_verified" boolean NOT NULL DEFAULT false,
    "image" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY,
    "expires_at" timestamp NOT NULL,
    "token" text NOT NULL UNIQUE,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" timestamp,
    "refresh_token_expires_at" timestamp,
    "scope" text,
    "password" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`,
  `CREATE TABLE IF NOT EXISTS "conversation" (
    "id" text PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "updated_at" bigint NOT NULL,
    "thread" jsonb NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "conversation_user_updated_idx" ON "conversation" ("user_id", "updated_at")`,
  `CREATE TABLE IF NOT EXISTS "rate_limit" (
    "key" text PRIMARY KEY,
    "window_start" bigint NOT NULL,
    "count" integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "feedback" (
    "id" serial PRIMARY KEY,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "reason" text NOT NULL,
    "question" text NOT NULL,
    "answer" text NOT NULL,
    "model" text,
    "place_ids" jsonb NOT NULL,
    "card_ids" jsonb NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "feedback_created_idx" ON "feedback" ("created_at")`,
];

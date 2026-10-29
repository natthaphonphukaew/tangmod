import { bigint, boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/*
 * ตารางของ Better Auth (user / session / account / verification) + ประวัติแชท
 * ชื่อ key ใน TS ต้องตรงกับชื่อ field ของ Better Auth (camelCase) ส่วนชื่อคอลัมน์ใน DB เป็น snake_case
 * SQL ที่สร้างตารางจริงอยู่ใน migrate.ts — แก้ที่นี่ต้องแก้ที่นั่นด้วย
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** ประวัติแชทของผู้ใช้ที่ login (ผู้ใช้ที่ไม่ login เก็บใน localStorage) */
export const conversation = pgTable(
  "conversation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** ms ตาม Date.now() ของฝั่งผู้ใช้ ใช้เรียงรายการ */
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    /** ThreadItem[] เก็บเป็นก้อน JSON เพราะอ่าน/เขียนทั้งแชททีเดียวเสมอ */
    thread: jsonb("thread").notNull(),
  },
  (t) => [index("conversation_user_updated_idx").on(t.userId, t.updatedAt)],
);

/**
 * ตัวนับ rate limit แบบ fixed window ใช้ร่วมกันทุก instance ของ serverless
 * key เป็น hash ของ IP (ไม่เก็บ IP จริง) · แถวเก่าถูกลบเป็นระยะใน lib/rate-limit.ts
 */
export const rateLimit = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
  count: integer("count").notNull(),
});

/** ปุ่ม "ตอบไม่ตรง" — ไม่ผูกตัวตนผู้ใช้ ตัดข้อมูลส่วนตัวออกก่อนเก็บ */
export const feedback = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reason: text("reason").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    model: text("model"),
    placeIds: jsonb("place_ids").notNull(),
    cardIds: jsonb("card_ids").notNull(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt)],
);

export const schema = { user, session, account, verification, conversation, rateLimit, feedback };

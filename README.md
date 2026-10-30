# ทางมด (Tangmod)

ผู้ช่วยแชทประจำแคมปัส มจธ. บางมด — ถามน้องมดได้ทุกเรื่อง ตั้งแต่สาขา ค่าเทอม รอบสมัคร ไปจนถึงห้องเรียนอยู่ตึกไหน (เช่น CB2301) คำถามเรื่องที่ตั้งจะเปิดแผนที่ให้ดูเอง
โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของมหาวิทยาลัย

- สเปก: [kmutt-campus-chatbot-spec.md](kmutt-campus-chatbot-spec.md)
- ข้อมูลที่ค้นมาพร้อมแหล่งที่มา: [docs/research/](docs/research/)
- สถานะข้อมูลและสิ่งที่ยังต้องเก็บ: [content/DATA_STATUS.md](content/DATA_STATUS.md)
- ทำงานร่วมกัน (branch, PR, ใครดูแลไฟล์ไหน, วิธีเพิ่มข้อมูล): [CONTRIBUTING.md](CONTRIBUTING.md)

## เริ่มใช้งาน

ใช้ Node 22 หรือ 24 (LTS)

```bash
npm install
cp .env.example .env.local   # ใส่ MINIMAX_API_KEY (gateway ของ SIT จากอาจารย์) และ/หรือ GOOGLE_GENERATIVE_AI_API_KEY (ฟรี)
npm run dev
```

ไม่ใส่ key ก็รันได้ — แชทจะอยู่ในโหมดออฟไลน์ (ชี้หมุดและแสดงการ์ดข้อมูลจริง แต่ไม่เรียบเรียงคำตอบ)

ใส่ key แล้ว แชทจะลอง MiniMax-M3 (ผ่าน gateway ของ SIT) → Gemini 3.5 Flash-Lite → 3.5 Flash → Typhoon ตามลำดับ (ข้ามตัวที่ไม่มี key) ตัวไหนล่มหรือไม่เริ่มตอบใน 8 วิจะข้ามไปตัวถัดไป ดูว่าคำตอบมาจากโมเดลไหนได้ใน log ของ dev server (`[chat] {...}`)

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เปิด dev server ที่ http://localhost:3000 |
| `npm test` | ตรวจรูปแบบข้อมูลใน `content/` และ id ที่อ้างถึงกัน |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run build` | build สำหรับ production |
| `npm run feedback` | ดึงรายการ "ตอบไม่ตรง" จากฐานข้อมูล (ตั้ง `DATABASE_URL` ของ Neon ก่อน หรือ `-- --local` สำหรับฐานในเครื่องโดยปิด dev server) → `.data/feedback-export.ndjson` |
| `npm run eval` | ยิงชุดคำถาม 87 ข้อใน `eval/questions/*.json` ผ่าน `/api/chat` จริง แล้วตรวจคำตอบ (ใช้โควตา AI จริง ~4 นาที) ดู `--only=id1,id2` / `--cat=unknown` / `--file=map` |
| `npm run retrieve -- "คำถาม"` | ดูว่าคำถามนี้ระบบดึงข้อมูลชิ้นไหนให้ AI (ไม่เรียก AI) ใช้แยกว่าตอบผิดเพราะขาดข้อมูลหรือค้นไม่เจอ |

## Login + ประวัติแชทบน server

login ไม่บังคับ: ไม่ login ก็ถามได้ (ประวัติอยู่ในเครื่อง) · login ด้วย Google แล้วแชทในเครื่องย้ายขึ้นบัญชีและตามไปทุกเครื่อง

**ตอน dev ไม่ต้องตั้งอะไร:** ฐานข้อมูลใช้ Postgres ในเครื่อง (PGlite เก็บที่ `.data/pglite`) และมีปุ่ม "ล็อกอินทดสอบ" ในแถบซ้าย (ปิดเสมอบน production)

**เปิดปุ่ม "เข้าสู่ระบบด้วย Google":**
1. https://console.cloud.google.com/apis/credentials → Create credentials → OAuth client ID → Web application
2. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (และ `https://<โดเมนจริง>/api/auth/callback/google` ตอน deploy)
3. ใส่ `GOOGLE_CLIENT_ID` กับ `GOOGLE_CLIENT_SECRET` ใน `.env.local` แล้วรีสตาร์ท dev server

**ตอน deploy (Vercel):**
1. สร้างฐานข้อมูล Neon (ฟรี) ผ่านแท็บ Storage ของ Vercel หรือ https://neon.tech แล้วตั้ง `DATABASE_URL`
2. ตั้ง `BETTER_AUTH_SECRET` (สุ่มด้วย `openssl rand -base64 32`) และ `BETTER_AUTH_URL=https://<โดเมนจริง>`
3. ตั้ง `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` · ตารางถูกสร้างเองตอนมีคำขอแรก ([lib/db/migrate.ts](lib/db/migrate.ts))

## โครงสร้าง

```
app/api/chat/   POST → NDJSON stream (retrieve → prompt → LLM → validate)
app/api/feedback/  ปุ่ม "ตอบไม่ตรง" → ตาราง feedback · lib/rate-limit.ts นับคำขอต่อนาทีใน Postgres (ทุก instance ใช้ร่วมกัน)
app/api/auth/   Better Auth (login Google, session) · app/api/history/ ประวัติแชทของผู้ใช้ที่ login · app/api/dev-login/ ล็อกอินทดสอบ (dev)
lib/db/         Drizzle schema + สร้างตาราง + เชื่อม Neon (production) / PGlite (dev)
lib/auth.ts     ตั้งค่า Better Auth · lib/history-server.ts query ประวัติแชท (ผูกกับ userId เสมอ)
lib/ai/         schema (contract), models (Gemini/Typhoon/mock), knowledge + retrieve, prompt, validate
lib/data/       Zod schemas + loader ของข้อมูล (schemas.ts เป็น source of truth)
lib/map/        เรขาคณิตแผนที่ + รอยทางมด + อ่านเลขห้อง CB (rooms.ts)
lib/client/     เรียก API, ความจำผู้ใช้, ประวัติแชท (history-store.ts: local ↔ server), auth-client
components/     app (Sidebar, TopBar, MapPanel, bottom sheet มือถือ), chat (ChatColumn, AssistantMessage), cards (ตัวเลขจริง), map
content/        ข้อมูลจริง: places, assistant (น้องมด), programs/, admission/, contacts, calendar, map-layout
content/kb/     ความรู้แบบ Markdown แยก namespace (general/sit/eng/food/admission) แต่ละ ## = 1 chunk
eval/questions/ ชุดคำถามทดสอบ แยกไฟล์ตามหมวด (official / niche / unknown / out_of_scope / map) · scripts/eval.ts ตัวรัน
docs/           ผลค้นคว้าและสเปกเวอร์ชันเก่า
```

เพิ่มความรู้ (เช่น บทสัมภาษณ์รุ่นพี่): สร้าง `content/kb/<namespace>/<ชื่อ>.md` ใส่ frontmatter `namespace, tier, title, source_url, updated_at` แล้วแบ่งหัวข้อด้วย `##`

ทุก record ใน `content/` ต้องมี `tier` (`official` / `student` / `mock`), `source_url` และ `updated_at` ถ้าแหล่งข้อมูลขัดกันให้จดไว้ใน `conflict_note`

## ปรับคำตอบ

1. ผู้ใช้กด "ตอบไม่ตรง" → คำถามกับคำตอบไปอยู่ในตาราง `feedback` (ไม่ผูกตัวตน) แล้วดึงออกมาด้วย `npm run feedback`
2. ถ้าขาดข้อมูล เติมใน `content/` ถ้าตอบผิดแนว แก้กฎใน `lib/ai/prompt.ts`
3. เพิ่มคำถามนั้นเข้า `eval/questions/<หัวข้อ>.json` แล้วรัน `npm run eval` ให้ผ่านโดยข้ออื่นไม่ตก

ผลล่าสุด (29 ต.ค. 69, v3, minimax-m3): 86/87 = 98.9% · หมวดแผนที่ 9/9 · p50 4.2 วิ · p90 8.0 วิ

## เครดิต

- ฟอนต์หัวข้อ: LINE Seed Sans TH © LY Corporation — SIL Open Font License 1.1 ([app/fonts/OFL.txt](app/fonts/OFL.txt))
- ฟอนต์เนื้อหา: Anuphan (Cadson Demak) และ IBM Plex Mono — SIL Open Font License 1.1 ผ่าน Google Fonts
- ไอคอน: Phosphor Icons (MIT)

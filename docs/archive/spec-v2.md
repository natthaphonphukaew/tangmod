# ทางมด (Tangmod) — Project Spec v2

> แคมปัส มจธ. บางมด ที่คุยได้ · "ถามมา เดี๋ยวมดพาไป"
> v2 · 2026-10-28 · สเปกเดิมเก็บไว้ที่ [docs/archive/spec-v1.md](docs/archive/spec-v1.md)
> ข้อมูลจริงและแหล่งที่มา: [docs/research/kmutt-facts.md](docs/research/kmutt-facts.md) · สถานะข้อมูล: [content/DATA_STATUS.md](content/DATA_STATUS.md)
> โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของมหาวิทยาลัย และไม่ใช้โลโก้หรือตรามหาวิทยาลัยจนกว่าจะได้รับอนุญาต

---

## 1. แนวคิดหลัก

**ทางมด** เล่นคำมาจาก บาง**มด** → **ทาง**มด
- มาสคอต **น้องมด** เป็นไกด์หลัก
- ทุกคำตอบปรากฏบน**แผนที่แคมปัสที่วาดเอง** เป็นหมุดมีเลข และมี **"รอยทางมด"** (เส้นประที่วิ่งเชื่อมสถานที่ตามลำดับ)
- กดตึกเพื่อคุยกับ**ตัวละครประจำตึก** (รุ่นพี่ SIT, รุ่นพี่วิศวะคอม, ป้าโรงอาหาร, พี่รับสมัคร)
- ตัวละครทั้งหมดใช้ความจำร่วมกัน และส่งต่อผู้ใช้ให้กันได้

### กลุ่มผู้ใช้
1. นักเรียน ม.ปลายที่กำลังเลือกสาขา (กลุ่มหลัก — ช่วงนี้อยู่ใน TCAS70 พอดี)
2. นักศึกษาปัจจุบัน (ที่อ่านหนังสือ ของกิน การเดินทาง)
3. ผู้ปกครอง (ค่าเทอม หอพัก ความปลอดภัย)

### ขอบเขตคณะของ MVP
- **SIT:** IT / CS / DSI ลงลึกทุกสาขา
- **วิศวะ:** CPE ลงลึกเท่ากับ SIT · อีก 20 หลักสูตรมีข้อมูลระดับภาพรวม (ค่าเทอม หน่วยกิต สายอาชีพ ตึก)
- **FIBO:** เป็นตึกข้อมูล + มีข้อมูลหลักสูตร (ยังไม่มี persona)

### สิ่งที่ทำให้ต่างจาก chatbot ทั่วไป
1. **แผนที่คือคำตอบ** — หมุดมีเลข + รอยทางมด, ตึกที่ไม่เกี่ยวข้องจางลง, กดการ์ดแล้วแผนที่บินไปที่ตึกนั้น
2. **ตัวเลขสำคัญไม่ได้มาจาก LLM** — ค่าเทอม, GPAX, หน่วยกิต, วันรับสมัคร แสดงผ่าน*การ์ด*ที่ดึงจากข้อมูลจริงโดยตรง LLM ทำแค่เลือกว่าจะโชว์การ์ดไหน
3. **การ์ดเปรียบเทียบสาขาที่คนสับสน** — CPE vs CS vs IT vs DSI
4. **นับถอยหลัง TCAS70** จากวันที่จริง
5. **ป้ายความน่าเชื่อถือ** ในทุกคำตอบ: ทางการ / เสียงรุ่นพี่ (ไม่เป็นทางการ) / ข้อมูลตัวอย่าง พร้อมวันที่อัปเดตและลิงก์
6. **รู้ว่า "ตอนนี้"** — ป้ายเปิดอยู่/ปิดแล้ว, รู้ปฏิทินการศึกษา (เช่น บ่ายวันจันทร์ไม่มีเรียน)
7. **ความจำที่โปร่งใส** — ผู้ใช้เห็นว่ามดจำอะไรไว้ แก้หรือลบได้ทันที
8. **เข็มทิศสาขา (Major Compass)** — ตอบคำถามเชิงความชอบ แล้วตึกคณะเรืองแสงตามคะแนน (stretch goal ของ MVP)

---

## 2. โครงสร้างระบบ

```
┌──────────────────────────────────────────────┐
│ แชท (เธรดเดียวต่อเนื่อง)                        │ ← persona ปัจจุบันอยู่บน header
│ น้องมด ⇄ พี่ไอที ⇄ พี่วิศวะคอม ⇄ ป้า ⇄ พี่รับสมัคร  │
└───────────────┬──────────────────────────────┘
                │ places / cards / handoff
┌───────────────▼──────────────────────────────┐
│ แผนที่แคมปัส (SVG วาดเอง, ตึก = <g id>)          │ ← กดตึก = เข้าตึก
└──────────────────────────────────────────────┘
         ทุกชั้นอ่านและเขียน User Profile ก้อนเดียวกัน
```

### กติกาการเชื่อมต่อ
- **แชท → แผนที่:** คำตอบมี `places[]` → frontend ปักหมุดเรียงลำดับ วาดรอยทางมด และทำให้ตึกอื่นจางลง
- **แผนที่ → แชท:** กดตึกที่มี persona → แทรกเส้นคั่น "เข้าตึก N11 · พี่ไอที" แล้วเปลี่ยน persona · กดตึกข้อมูล (ไม่มี persona) → แสดงการ์ดสถานที่ แต่ persona เดิมยังคุยต่อ
- **การ์ด → แผนที่:** กดการ์ดสถานที่ แผนที่จะโฟกัสไปที่ตึกนั้น
- **Handoff:** persona เสนอปุ่ม "→ คุยกับ ... ต่อ" · ทุก persona ส่งกลับมาหาน้องมดได้ · มีปุ่ม "ออกจากตึก"
- **ประวัติแชท:** เป็นเธรดเดียวต่อเนื่อง ส่งเทิร์นล่าสุด (สูงสุด 8 เทิร์น) + profile ให้ LLM

---

## 3. ฟีเจอร์

### MVP (1 เดือน)
- [ ] แชท + แผนที่ที่เชื่อมกันสองทาง พร้อมหมุดมีเลขและรอยทางมด
- [ ] Persona 5 ตัว (น้องมด + 4 ตึก) + handoff
- [ ] การ์ด: สาขา / เปรียบเทียบ / สถานที่ / ไทม์ไลน์ TCAS / เมนูอาหาร
- [ ] ความจำร่วม (ดูได้ แก้ได้ ลบได้)
- [ ] แหล่งที่มา + ป้ายความน่าเชื่อถือ + วันที่อัปเดต
- [ ] Quick reply chips
- [ ] ป้ายเปิด/ปิดตามเวลาจริง
- [ ] ปุ่ม "ตอบไม่ตรง" + log คำถามที่ตอบไม่ได้
- [ ] รองรับมือถือ (bottom sheet)
- [ ] (stretch) Major Compass

### เฟส 2
- สะสมแสตมป์ตึกที่แวะ → สรุปสาขาที่น่าจะเหมาะ
- Mini challenge 5 นาทีของแต่ละสาขา
- เพิ่ม persona: FIBO, ห้องสมุด, สาขาวิศวะอื่น ๆ
- โหมดกลางคืน (แผนที่ตอนกลางคืน หน้าต่างตึกมีไฟ)

### เฟส 3
- แดชบอร์ดฝั่งมหาวิทยาลัยหรือคณะ (คำถามยอดนิยม, คำถามที่ตอบไม่ได้, ให้คณะแก้ข้อมูลเอง)
- เลเยอร์กิจกรรม (Open House, วันสัมภาษณ์)
- เส้นทางเดิน (มีหลังคา / รถเข็นผ่านได้)
- ภาษาอังกฤษ (ใช้กับ CS ที่เป็นหลักสูตรภาษาอังกฤษได้ด้วย)
- LINE OA

---

## 4. Persona

| id | ชื่อ | ตึก | ขอบเขต | ส่งต่อเมื่อ |
|---|---|---|---|---|
| `guide` | น้องมด | — | ทุกเรื่อง, ปักหมุดเสมอเมื่อคำถามเกี่ยวกับสถานที่ | คำถามลึกเฉพาะทาง → ตอบสั้น ๆ แล้วส่งต่อ |
| `sit_senior` | พี่ไอที | N11 | IT/CS/DSI, Seneca 3+1, ชีวิตใน SIT, ที่อ่านหนังสือ 24 ชม. | CPE → `eng_senior` · สมัคร → `admission` · อาหาร → `canteen_aunt` |
| `eng_senior` | พี่วิศวะคอม | S4 | CPE ลงลึก, ภาพรวมวิศวะ 21 หลักสูตร, FIBO | SIT → `sit_senior` |
| `canteen_aunt` | ป้าโรงอาหาร | S14 | ร้านใน KFC, ราคา, โรงอาหารใต้หอ, ของกินหน้ามอ, หอพัก | |
| `admission` | พี่รับสมัคร | N1 (ยังไม่ยืนยัน) | TCAS70, ทุนเพชรพระจอมเกล้า, portfolio, เกณฑ์ AR | |

- ทุก persona ระบุชัดว่าเป็น **"ตัวละคร AI"** ไม่แอบอ้างเป็นรุ่นพี่หรือเจ้าหน้าที่ตัวจริง
- **ตึกข้อมูล (ไม่มี persona):** N10 ห้องสมุด, N16 LX, N9 FIBO, S5/S6 หอพัก, N17 CB2 (คลินิก), S2 ที่จอดรถ, CB1–CB5, ป้ายรถเมล์

---

## 5. Data Models (Zod เป็น source of truth)

### Place
```ts
{
  id: "N11",                      // ใช้รหัสตึกทางการเป็น id; จุดที่ไม่มีรหัสใช้ slug เช่น "bus_stop_front"
  name_th: "อาคารคณะเทคโนโลยีสารสนเทศ", name_en: "SIT Building", short: "SIT",
  kind: "faculty" | "food" | "study" | "dorm" | "service" | "transport" | "landmark",
  persona_id?: "sit_senior",
  map: { x, y, w, h },            // พิกัดแบบสัดส่วน 0–1 บน SVG
  tags: ["เปิด 24 ชม. (ชั้น 1–2)", "มีปลั๊ก"],
  hours?: [{ days: "mon-fri", open: "08:00", close: "17:00", note?: string }],
  floors?: [{ floor: "10–13", what: "ห้องเรียน SIT", building: "N16" }],
  tier: "official" | "student" | "mock",
  source_url?: string, updated_at: "YYYY-MM-DD"
}
```

### Program
```ts
{
  id: "sit-it" | "sit-cs" | "sit-dsi" | "eng-cpe" | "eng-cpe-inter" | ...,
  faculty: "sit" | "eng" | "fibo",
  name_th, name_en, degree: "วท.บ." | "ศศ.บ." | "วศ.บ.",
  language: "th" | "en" | "th/en", international: boolean,
  credits: number,
  fee: { model: "flat" | "per_credit", per_semester?: number, base?: number, per_credit?: number, total_est: number },
  place_id: "N11",
  depth: "deep" | "overview",
  tracks?: string[], signature_courses?: { code, name, year }[], careers: string[],
  admission_ar?: { gpax, math?, sci?, lang?, extra?: string },
  vibe?: { hardware: 0-3, math: 0-3, design: 0-3, business: 0-3, coding: 0-3 },   // ใช้กับ Compare และ Compass
  tier, source_url, updated_at
}
```

### AdmissionEvent (ไทม์ไลน์ TCAS70)
```ts
{ id, round: 1|2|3|4, project: "Active Recruitment (SIT) รอบ 2", program_ids?: string[],
  start: "2026-10-27", end: "2026-11-25", tier, source_url, conflict_note?: string }
```

### Persona
```ts
{ id, display_name, role, place_id: string | null, scope: string[],
  handoff: Record<topic, persona_id>, tone, greeting, starter_chips: string[],
  namespaces: string[], avatar: "ant-guide" | "ant-cap" | ... }
```

### User Profile (เก็บใน localStorage, ไม่ผูกตัวตน)
```ts
{ v: 1, role_guess: "highschool" | "student" | "parent" | "unknown",
  interests: string[], considering_programs: string[], visited_places: string[],
  major_scores?: Record<program_id, number>,   // เติมค่าโดย Compass เท่านั้น
  notes: string[] }                           // ข้อความสั้น สูงสุด 10 รายการ
```
ห้ามเก็บชื่อ เบอร์ อีเมล หรือโรงเรียน · ถ้าผู้ใช้พิมพ์ข้อมูลเหล่านี้มา server ตัดทิ้งก่อนส่งให้ LLM

### KB chunk (Markdown + frontmatter → pgvector)
```yaml
---
id: sit-it-review-01
namespace: sit            # general | sit | eng | food | admission
tier: student             # official | student | mock
source: "สัมภาษณ์รุ่นพี่ IT ปี 3 (ได้รับอนุญาต)"
source_url: ""
updated_at: 2026-11-10
---
```

---

## 6. LLM Response Contract v2

```json
{
  "message": "ข้อความภาษาไทยที่แสดงในแชท (markdown แบบเบา)",
  "places": [{ "place_id": "N11", "reason": "ชั้น 1–2 เปิด 24 ชม." }],
  "cards": [{ "type": "compare", "ids": ["eng-cpe", "sit-cs", "sit-it", "sit-dsi"] }],
  "handoff": { "persona_id": "admission", "reason": "เรื่องรอบสมัครถามพี่รับสมัครดีกว่า" },
  "chips": ["ค่าเทอมเท่าไหร่", "ต้องมีพอร์ตไหม"],
  "profile_update": { "interests_add": ["AI"], "considering_add": ["sit-cs"], "role_guess": "highschool" },
  "source_ids": ["sit-cs-curriculum-2566#3"],
  "confidence": "high"
}
```
`cards.type` เป็นได้: `program | compare | place | timeline | menu`

### กติกา
- **ทุก id ถูก validate ที่ server:** `place_id`, `persona_id`, `cards.ids` และ `source_ids` ต้องมีอยู่จริง ค่าที่ไม่มีอยู่จะถูกตัดทิ้ง ถ้า handoff ไปหา persona ที่ไม่มี → fallback เป็น `guide`
- **LLM ห้ามเขียน URL:** ใช้ `source_ids` แล้ว server แปลงเป็น `{title, url, tier, updated_at}` เอง
- **ตัวเลข (ค่าเทอม, เกณฑ์, วันที่):** ข้อความแชทพูดถึงได้แบบปัดเศษ แต่ตัวเลขจริงต้องอยู่บนการ์ด และ prompt สั่งให้แนบการ์ดทุกครั้งที่พูดถึงตัวเลข
- **ไม่มีข้อมูลรองรับ:** ให้ `confidence: "low"` → UI แสดงว่าไม่รู้ พร้อมช่องทางติดต่อจริง และ log ไว้
- **ข้อความไหลขึ้นทีละส่วน:** stream ผ่าน partial object ส่วน `places` / `cards` เรนเดอร์เมื่อ object สมบูรณ์แล้ว

---

## 7. Pipeline ต่อหนึ่งข้อความ (1 LLM call)

1. **รับข้อความ:** rate-limit ต่อ IP → ตัด PII
2. **ตรวจหา entity แบบ deterministic** (dictionary คำพ้อง: "คอมวิศวะ" → `eng-cpe`, "ไอทีบางมด" → `sit-it`, รหัสตึก) → ดึง structured data มาแบบย่อ
3. **Retrieval:** ตอนนี้ใช้ BM25 ในหน่วยความจำ (ตัดคำไทยด้วย `Intl.Segmenter`) + บังคับดึง chunk ของ entity ที่ตรวจเจอ โดยให้น้ำหนักกับ namespace ของ persona ([lib/ai/retrieve.ts](lib/ai/retrieve.ts)) · ถ้า KB โตจนค้นแบบนี้ไม่แม่นแล้ว ค่อยเพิ่ม vector top-k (Gemini Embedding 768 + pgvector)
4. **ประกอบ system prompt:** base rules → persona → profile → structured facts → KB chunks (พร้อม id) → place list แบบย่อ → เวลาปัจจุบัน (Asia/Bangkok) + ช่วงปฏิทินการศึกษา
5. **เรียก LLM:** `streamText` + `Output.object` ไล่ตามลำดับโมเดล: ข้ามไปตัวถัดไปเมื่อเจอ 429/5xx หรือยังไม่เริ่มตอบใน 8 วิ (ตัวสุดท้ายรอได้ถึง 20 วิ) ถ้าล้มกลางคำตอบหลังข้อความจบแล้ว ใช้ส่วนที่ได้มา สุดท้ายตกไปโหมดออฟไลน์
6. **Validate แล้ว resolve** แหล่งที่มาและการ์ด → stream ไปที่ client
7. **Log แบบนิรนาม:** ข้อความ, persona, confidence, latency, model

---

## 8. Tech Stack

| ส่วน | เลือก | เหตุผล |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind v4 | repo เดียว deploy ง่าย |
| AI | Vercel AI SDK v7 + `createProviderRegistry` | สลับโมเดลได้ด้วย env `CHAT_MODEL` |
| LLM | MiniMax-M3 ผ่าน gateway ของ SIT (Anthropic API, key จากอาจารย์, schema อยู่ใน prompt เพื่อให้ stream ได้ ไม่คิดก่อนตอบ ตอบ 3–6 วิ) → Gemini 3.5 Flash-Lite → 3.5 Flash → Typhoon v2.5 → ออฟไลน์ | ตัวหลักมีโควตาจริง ตัวฟรีเป็นสำรอง (ทดสอบ 28 ต.ค. 69: ช่วงคนใช้เยอะ Gemini ฟรีตอบ 503 หรือช้า 10–15 วิ จึงต้องมีหลายชั้น) |
| LLM เฟสอาจารย์ | Claude Haiku 5.5 (Sonnet 5.5 ถ้าต้องการคุณภาพสูงขึ้น) | ถูกมาก มี prompt caching และ structured outputs |
| DB | Neon Postgres + pgvector + Drizzle | ฟรี ไม่ pause |
| Embeddings | Gemini Embedding (768) ผ่าน interface | สลับเป็น BGE-M3 ได้ |
| แผนที่ | SVG วาดเอง + react-zoom-pan-pinch + motion | ควบคุมสไตล์ได้ทั้งหมด |
| UI | shadcn (Base UI) รีสไตล์ใหม่ + Phosphor icons | ไม่ใช้ vaul (เลิกดูแลแล้ว) |
| Rate limit | Upstash Redis free (สำรอง: ตาราง Postgres) | |
| Test | Vitest + สคริปต์ eval + Playwright smoke | |
| Hosting | Vercel Hobby | |

**ข้อควรระวัง:** Gemini เวอร์ชันฟรีอาจนำ prompt ไปใช้พัฒนาโมเดล → ห้ามส่ง PII และแสดงข้อความแจ้งผู้ใช้ใต้ช่องพิมพ์

---

## 9. Design System

### อารมณ์
**"แผนที่ท่องเที่ยววาดมือบนกระดาษอุ่น ๆ"**
- polygon แบน สีน้อย มุมมองเดียวทั้งภาพ
- ตึกหลักใหญ่เกินจริงเล็กน้อย
- รหัสตึกอ่านชัด
- ข้อมูล (หมุด/รอยทาง) เด่นกว่าแผนที่ฐานเสมอ

### สี
อิง CI มหาวิทยาลัย + โทนกลางแบบอุ่น

| token | ค่า | ใช้กับ |
|---|---|---|
| `--brand` | #FA4616 | หมุด, ปุ่มหลัก |
| `--brand-ink` | #C2360B | ตัวอักษรสีส้ม (ผ่าน contrast) |
| `--trail` | #FFC72C | รอยทางมด, ไฮไลต์ |
| `--slate` | #7B8189 | ข้อความรอง, ตึกที่จางลง |
| `--paper` | #FBF6EE | พื้นหลัง |
| `--ink` | #1E1A16 | ตัวอักษรหลัก |
| `--park` | เขียวอมเทาแบบอุ่น | สนามหญ้า, สวน |

**ห้ามใช้:** ม่วง, gradient, glassmorphism, glow, neon

### ฟอนต์และไอคอน
- **หัวข้อ:** LINE Seed Sans TH (self-host + credit) · ถ้าใช้ไม่ได้ให้ใช้ Mitr
- **เนื้อหา:** Anuphan
- **รหัสตึก:** IBM Plex Mono
- **ไอคอน:** Phosphor (duotone) · ห้ามใช้อีโมจิแทนไอคอน · ไม่มีปุ่ม ✨ AI

### Layout
- **Desktop:** แผนที่ซ้าย ~60% / แชทขวา
- **Mobile:** แผนที่เต็มจอ + แชทเป็น bottom sheet 3 ระดับ (peek / half / full)

### ตัวละคร
มดเรขาคณิตสไตล์เดียวกับแผนที่ แต่ละ persona ต่างกันที่อุปกรณ์ประจำตัว

| persona | อุปกรณ์ |
|---|---|
| ไกด์ | ธงนำทาง |
| พี่ไอที | แล็ปท็อป |
| พี่วิศวะคอม | หมวกเซฟตี้ + บอร์ดวงจร |
| ป้าโรงอาหาร | ทัพพี |
| พี่รับสมัคร | แฟ้มเอกสาร |

### State ที่ต้องมี
- **ตอนเริ่ม (ยังไม่มีข้อความ):** ชิปคำถามแนะนำตาม persona
- **กำลังโหลด:** มดเดินตามรอยทาง
- **เจอ 429:** "มดเหนื่อย พักแป๊บ"
- **ออฟไลน์**
- **คำถามนอกเรื่อง**
- **พิมพ์ภาษาไทยด้วย IME:** ไม่ส่งข้อความขณะกำลังเลือกคำ

---

## 10. ความเสี่ยงและแนวทางรับมือ

| ความเสี่ยง | แนวทาง |
|---|---|
| ข้อมูลเปลี่ยนบ่อย | แสดง `updated_at` + ป้ายความน่าเชื่อถือ · ข้อมูลอยู่ในรูป content-as-code แก้แล้ว deploy ใหม่ได้ทันที |
| บอทตอบมั่ว | ตัวเลขมาจากการ์ด, validate id ทุกตัว, ตอบว่าไม่รู้ได้, มีชุด eval |
| โควตา API ฟรีหมดวันเดโม | fallback provider, cache คำตอบของชิปยอดนิยม, ใช้ GCP project แยกสำหรับวันเดโม, อัดวิดีโอสำรอง |
| ความเป็นส่วนตัว | profile นิรนามใน localStorage, ตัด PII, มีปุ่ม "ลืมทั้งหมด" |
| ลิขสิทธิ์ | รีวิวจากเว็บใช้แบบสรุปความ + อ้างอิงที่มา · บทสัมภาษณ์ต้องได้รับอนุญาต |
| Scope บาน | ยึด MVP · Compass เป็น stretch |

---

## 11. การวัดผล
- **ชุด eval** (`eval/questions.json`, รันด้วย `npm run eval`) ตอนนี้ 82 ข้อ ตรวจด้วยกฎตายตัว (ตัวเลข/คำสำคัญ, หมุด, การ์ด, handoff, ปฏิเสธ, ยอมรับว่าไม่รู้):
  - 55 ข้อเป็นข้อเท็จจริงทางการ
  - 9 ข้อเป็นคำถาม niche หรือเสียงรุ่นพี่ (ควรเพิ่มหลังสัมภาษณ์รุ่นพี่)
  - 8 ข้อเป็นคำถามที่ไม่มีข้อมูลและต้องตอบว่าไม่รู้
  - 5 ข้อนอกขอบเขตที่ต้องปฏิเสธ · 5 ข้อทดสอบการส่งต่อ persona
  - ผลล่าสุด 29 ต.ค. 69: 81/82 (98.8%) ข้อที่ตกเกิดจาก gateway ล่มกลางคำตอบ แก้แล้วด้วย event `reset` + โมเดลถัดไป
- **เป้าหมาย eval:** ถูกต้องอย่างน้อย 85% และตัวเลขผิด 0 ครั้ง
- **ทดสอบกับนักเรียน ม.ปลาย 3–5 คน:** เทียบเวลาที่ใช้และความพึงพอใจกับการหาข้อมูลเองจากเว็บมหาวิทยาลัย
- **Log** คำถามที่ `confidence: low` และที่ผู้ใช้กด "ตอบไม่ตรง" → ใช้เป็นรายการข้อมูลที่ต้องเติม

---

## 12. แผน 4 สัปดาห์

| สัปดาห์ | งาน |
|---|---|
| **W1** 28 ต.ค.–3 พ.ย. | สเปก v2 · scaffold · design tokens/ฟอนต์ · Zod schemas · ลงข้อมูลจริง · DATA_STATUS · แผนที่ SVG v1 · ingest + Neon |
| **W2** 4–10 พ.ย. | `/api/chat` + registry/fallback · prompt ของ 5 persona · UI แชท + การ์ด + แหล่งที่มา · เชื่อมแผนที่กับแชท · handoff · ความจำ |
| **W3** 11–17 พ.ย. | CompareCard · TimelineCard · รอยทางมด · ป้ายเปิด/ปิด · bottom sheet บนมือถือ · Compass (stretch) |
| **W4** 18–25 พ.ย. | ลงรายละเอียดภาพแผนที่ · ทำ state ให้ครบ · a11y · ปุ่ม "ตอบไม่ตรง" · ชุด eval + จูน prompt · ทดสอบกับผู้ใช้จริง · deploy · แผนสำรองวันเดโม |

**สถานะ (29 ต.ค. 69):** งาน W2 ทั้งหมดและส่วนใหญ่ของ W3–W4 เสร็จก่อนกำหนด ได้แก่ bottom sheet มือถือ, ปุ่ม "ตอบไม่ตรง" + log, ชุด eval (82 ข้อ) · ยังเหลือ: Major Compass, a11y pass, ทดสอบกับผู้ใช้จริง, deploy + rate limiter ถาวร, ฟอนต์หัวข้อ LINE Seed Sans TH, ลงรายละเอียดภาพแผนที่

**งานเก็บข้อมูลคู่ขนาน** (ผู้พัฒนาทำเอง W1–W3): สัมภาษณ์รุ่นพี่, เดินเก็บราคาโรงอาหาร, ยืนยันจุดที่ข้อมูลขัดกัน (ดู DATA_STATUS)

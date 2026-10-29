# ตัวเลือก AI และแหล่งอ้างอิงงานดีไซน์ (ค้นเมื่อ 2026-10-28)

ป้าย: **[3P]** ข้อมูลจากแหล่งบุคคลที่สาม · **[unverified]** ยังไม่ได้ยืนยัน

## AI ฟรีสำหรับเฟส 1

| ผู้ให้บริการ | โมเดล | ลิมิตฟรี | Structured output | หมายเหตุ |
|---|---|---|---|---|
| **Gemini API** | 3.5 / 3.1 Flash-Lite | [3P] 10 RPM / 250K TPM / **500 RPD** | JSON Schema + function calling | ใช้ทั้ง structured output และ tools พร้อมกันได้เฉพาะ Gemini 3 (ยัง preview) · **เวอร์ชันฟรีอาจถูกใช้ฝึกโมเดล และมีคนรีวิวข้อมูล → ห้ามส่ง PII** · โควตารีเซ็ตเวลา 14:00/15:00 ตามเวลาไทย · ลิมิตนับต่อ project |
| Gemini API | 3.8 Flash | [3P] 5 RPM / 20 RPD | เหมือนกัน | เก็บไว้ใช้วันเดโม |
| **Typhoon (SCB10X)** | typhoon-v2.5-30b-a3b-instruct | 5 req/s, 200 req/min | OpenAI-compatible, tool use · JSON schema [unverified] | โมเดลไทยที่ดีที่สุด → ใช้เป็น fallback |
| Groq | gpt-oss-120b, qwen3.8 | 30 RPM, 8K TPM | tools | TPM ต่ำเกินไป |
| OpenRouter `:free` | เปลี่ยนบ่อย | 50 RPD (1,000 ถ้าเติมเงิน $10) | ขึ้นกับโมเดล | ไม่เสถียร |
| GitHub Models | — | — | — | **ปิดบริการแล้ว (30 ก.ค. 2026)** |

ลิมิตจริงของบัญชีตรวจได้ที่ aistudio.google.com/rate-limit

## AI แบบเสียเงิน (ใช้งบอาจารย์) — ราคา USD ต่อ 1M tokens
| โมเดล | Input | Cache read | Output |
|---|---|---|---|
| **Claude Haiku 5.5** (`claude-haiku-5-5`) | 0.10 | 0.01 | 0.50 |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | 2 | 0.10 | 10 |
| Gemini 3.1 Flash-Lite | 0.25 | — | 1.50 |

- ราคาโดยประมาณที่ prompt 4K tokens (cached) + คำตอบ 300 tokens → Haiku 5.5 ราว **$0.20 ต่อ 1,000 คำถาม**
- ⚠ Sonnet/Opus 5.5 ใช้ `tool_choice` แบบบังคับไม่ได้ → ให้ใช้ structured outputs (`Output.object`) แทน
- แหล่ง: https://platform.claude.com/docs/en/about-claude/pricing

## Embeddings / Vector DB
- **Gemini Embedding 2:** ฟรี, 768 dim
- **BGE-M3:** MIT, รองรับภาษาไทยดี, ใช้ผ่าน Cloudflare Workers AI ได้ราว 9M tokens ต่อวันแบบฟรี
- **Neon free:** 1 GB, มี pgvector, scale-to-zero ไม่ pause
- **Supabase free:** pause ถ้าไม่ได้ใช้ 1 สัปดาห์ → เสี่ยงช่วงวันเดโม

## Vercel AI SDK
- เวอร์ชันล่าสุด `ai@7.x` (ESM-only, Node 22+)
- ใช้ `streamText({ output: Output.object({ schema }) })` + `partialOutputStream`
- `createProviderRegistry` → อ้างโมเดลแบบ `"google:..."` / `"anthropic:claude-haiku-5-5"`
- [3P] `generateObject` / `streamObject` ถูกประกาศ deprecated

## ฟอนต์ (OFL 1.1)
- **Anuphan** (Cadson Demak, variable 100–700) — ไม่มีหัว ทันสมัย ตัวละตินมาจาก IBM Plex → ใช้กับ**เนื้อหา**
- **LINE Seed Sans TH** — ไม่ได้อยู่บน Google Fonts ต้อง self-host จาก seed.line.me และควรใส่ credit → ใช้กับ**หัวข้อ**
- Mitr (โค้งมน เป็นมิตร) เป็นทางเลือกสำรองของหัวข้อ
- **IBM Plex Mono** สำหรับรหัสตึก
- หลีกเลี่ยง Kanit / Prompt เพราะใช้กันเกลื่อนในเว็บไทย
- แหล่ง: https://github.com/cadsondemak/Anuphan · https://seed.line.me/index_th.html

## ไอคอน
- **Phosphor (MIT)** มี 6 น้ำหนัก ใช้ duotone ← เลือกตัวนี้ https://github.com/phosphor-icons/core
- Lucide ใช้ได้ แต่เป็นค่า default ของ shadcn → ดูเป็นเทมเพลต
- Remix Icon เปลี่ยนไลเซนส์ตั้งแต่ ม.ค. 2026 → อ่านเงื่อนไขก่อนใช้

## แรงบันดาลใจแผนที่ (ยืมหลักการเท่านั้น ห้ามใช้ asset)
- **Rod Hunt isometric campus maps** — มุมเดียวทั้งภาพ ตึกหลักใหญ่เกินจริงนิดหน่อย https://rodhunt.com/different-types-styles-uses-of-illustrated-3d-isometric-maps-created-by-rod-hunt
- **Rice University interactive map (Stuart Holmes)** — ฐานเป็นภาพวาด หมุด UI คมอยู่ด้านบน https://illustrationx.com/artists/StuartHolmes/145151
- **Mini Motorways** — polygon แบน สีน้อย มี palette สำหรับคนตาบอดสี
- **Felt: how to design a beautiful map** — ให้ข้อมูลเด่นกว่าแผนที่ฐาน https://www.plushcap.com/content/felt/blog/felt-how-to-design-a-beautiful-map
- **แผนที่ Keio** วาดโดยนักวาดมังงะ https://www.global-sdgs.keio.ac.jp/en/pha/news/20230117-1/
- **แผนที่ Nagoya** ตึกมีเลขและค้นหาได้ https://en.nagoya-u.ac.jp/map/
- **Google Maps "Ask Maps"** (มี.ค. 2026) — ถามตอบต่อเนื่อง + ผลลัพธ์บนแผนที่ https://thenextweb.com/news/google-maps-launches-ask-maps

## UI patterns / libs
- **Bottom sheet 3 ระดับ (peek/half/full)** แบบ Apple Maps · การ์ดสถานที่ · ชิปแนะนำคำถาม · การ์ดแหล่งที่มาแบบ Perplexity
- **vaul ไม่มีคนดูแลแล้ว** → ใช้ drawer ของ Base UI (`@base-ui/react`) ผ่าน shadcn
- **animation:** `motion` (import จาก `motion/react`)
- **pan/zoom แผนที่:** `react-zoom-pan-pinch` (MIT)

## สัญญาณที่ทำให้ดูเป็น "AI slop" (สิ่งที่ห้ามทำ)
- gradient ม่วงหรือคราม, neon บนพื้นมืด, glow แบบ aurora
- glassmorphism
- ใช้อีโมจิแทนไอคอน
- การ์ดซ้อนการ์ด
- แถบสีข้างการ์ด, จุดสถานะทุกที่
- ใช้ Inter ทุกที่
- แถวการ์ดไอคอน 3 ใบหน้าตาเหมือนกัน
- ปุ่ม ✨ AI

แหล่ง: https://pages.thefountaininstitute.com/posts/7-tells-that-a-ui-is-ai-generated · https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website

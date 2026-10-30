# ทำงานร่วมกัน

คู่มือสำหรับคนที่สองที่มาช่วยทำ ทางมด (และสำหรับเจ้าของ repo ด้วย) · Claude Code อ่านกติกาเดียวกันนี้จาก [CLAUDE.md](CLAUDE.md)

## "เทรน AI" ในโปรเจกต์นี้หมายถึงอะไร

ทางมดไม่ได้เทรนหรือ fine-tune โมเดล ทุกคำถามทำงานแบบนี้:

```
คำถาม → ค้นข้อมูลที่เกี่ยวข้องจาก content/ (lib/ai/retrieve.ts, ค้นด้วยคำ)
      → ส่งข้อมูล 8 ชิ้นแรกพร้อมกฎให้ AI (lib/ai/prompt.ts)
      → AI เรียบเรียงคำตอบ → ตรวจคำตอบอีกรอบ (lib/ai/validate.ts)
```

คำถามนิชที่ตอบไม่ได้ เกือบทั้งหมดมาจากหนึ่งในสามเหตุนี้ และแต่ละเหตุแก้คนละที่:

| อาการ | ดูยังไง | แก้ที่ |
|---|---|---|
| **ไม่มีข้อมูล** | `npm run retrieve -- "คำถาม"` แล้วไม่มีชิ้นไหนมีคำตอบ | เพิ่มไฟล์ใน `content/kb/` |
| **มีข้อมูลแต่ค้นไม่เจอ** | ชิ้นที่มีคำตอบไม่อยู่ในรายการ หรืออยู่ท้าย ๆ | เขียนเนื้อหา/หัวข้อด้วยคำที่คนถามจริงใช้ หรือเพิ่ม `aliases` ใน `content/places.json` / `content/programs/*.json` |
| **ค้นเจอแต่ AI ตอบผิด** | ชิ้นถูกอยู่ในรายการแล้ว แต่คำตอบยังผิด | แก้กฎใน `lib/ai/prompt.ts` (แล้วรัน eval ทั้งชุด) |

ใน Claude Code พิมพ์ `/improve-answers` แล้วตามด้วยคำถามที่ตอบผิด Claude จะไล่ขั้นตอนนี้ให้

## เริ่มครั้งแรก (คนที่สอง)

1. เจ้าของ repo เชิญเป็น collaborator ที่ GitHub → Settings → Collaborators แล้วกดรับคำเชิญในอีเมล
2. ติดตั้ง Node 22 หรือ 24 แล้ว:
   ```bash
   git clone https://github.com/natthaphonphukaew/tangmod.git
   cd tangmod
   npm install
   cp .env.example .env.local
   ```
3. ใส่ key ใน `.env.local` **ของตัวเอง** — สร้าง Gemini key ฟรีได้ที่ https://aistudio.google.com/apikey · key MiniMax ของ SIT ได้มาจากอาจารย์ ขอแยกเองหรือตกลงกันก่อนว่าใช้ร่วมกันได้ไหม · ห้ามส่ง key ผ่านแชทกลุ่มหรือ commit
4. `npm run dev` แล้วเปิด http://localhost:3000 · `npm test` ต้องผ่าน

## ทุกงาน

```bash
git switch main && git pull
git switch -c data/dorm-outside        # ตั้งชื่อตามเรื่อง: data/… ui/… fix/…
# … ทำงาน …
npm test
git push -u origin data/dorm-outside
```

แล้วเปิด PR บน GitHub (มีแบบฟอร์มให้กรอก) · CI จะรัน lint, typecheck, เทสต์ และ build ให้เอง · Vercel ทำลิงก์ preview ให้ลองบนเว็บจริงก่อน merge · อีกคนกด approve แล้วค่อย merge (Squash and merge)

ระหว่างทำ ถ้า main มีของใหม่: `git fetch origin && git rebase origin/main`

## แบ่งงานกันยังไงไม่ให้ชน

- **คนดูแลข้อมูล/AI:** `content/`, `eval/questions/`, `docs/research/`, `lib/ai/prompt.ts`, `lib/ai/retrieve.ts`
- **เจ้าของ repo:** `components/`, `app/`, `lib/client/`, `lib/db/`, `lib/auth.ts`, `lib/map/`
- **ต้องบอกกันก่อนแก้:** `lib/ai/schema.ts`, `lib/ai/validate.ts`, `lib/data/schemas.ts`, `package.json` / `package-lock.json`, `next.config.ts`, `.github/`

จุดที่เคยชนบ่อยถูกแยกไว้แล้ว:
- **คำถาม eval** อยู่ใน `eval/questions/*.json` แยกไฟล์ตามหมวด/หัวข้อ เรื่องใหม่ให้สร้างไฟล์ใหม่ (เช่น `eval/questions/dorm.json`) แทนการต่อท้ายไฟล์เดิม · `id` ห้ามซ้ำข้ามไฟล์ (`npm test` ตรวจให้)
- **ความรู้** หนึ่งเรื่องหนึ่งไฟล์ใน `content/kb/<namespace>/`
- **Line ending** บังคับ LF ด้วย `.gitattributes` แล้ว Windows กับ Mac ใช้ร่วมกันได้ไม่ขึ้น diff ทั้งไฟล์
- **`package-lock.json`** — อย่าเพิ่ม/อัปเดต dependency พร้อมกันสองคน ถ้าชนให้ `git checkout --theirs package-lock.json && npm install`

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run retrieve -- "คำถาม"` | ดูว่าระบบดึงข้อมูลชิ้นไหนให้ AI (ไม่ใช้โควตา) · `--full` ดูเนื้อหาเต็ม |
| `npm test` | ตรวจรูปแบบข้อมูลทั้งหมด + logic (~5 วิ) |
| `npm run eval -- --file=food` | ยิงคำถามในไฟล์ `eval/questions/food.json` ผ่าน AI จริง |
| `npm run eval -- --only=id1,id2` | เฉพาะบางข้อ |
| `npm run eval` | ทั้งชุด (~4 นาที ใช้โควตาจริง) — รันเมื่อแก้ `lib/ai/` |
| `npm run feedback` | ดึงคำถามที่ผู้ใช้กด "ตอบไม่ตรง" (ต้องมี `DATABASE_URL` ของ Neon) |

**โควตา AI:** ทั้งสองคนใช้โควตาเดียวกันถ้าใช้ key เดียวกัน อย่ารัน eval ทั้งชุดพร้อมกัน ใช้ `--file` / `--only` ระหว่างทำ แล้วรันทั้งชุดครั้งเดียวก่อนเปิด PR

## เขียนข้อมูลยังไง

ดูตัวอย่างใน `content/kb/food/kfc.md`:

```markdown
---
namespace: food
tier: official
title: โรงอาหารและร้านอาหารใน มจธ.
source_url: https://bpuu.kmutt.ac.th/restaurant/
updated_at: 2026-10-28
---

## โรงอาหาร KFC
KFC ย่อมาจาก King Mongkut's Food Center ไม่ใช่ร้านไก่ทอด อยู่ชั้น 2 ของ ... (S14) ...
```

- แต่ละ `##` คือหนึ่งชิ้นที่ค้นได้ ให้แต่ละชิ้นอ่านรู้เรื่องได้โดยไม่ต้องพึ่งชิ้นอื่น (ใส่ชื่อตึก/รหัสตึกซ้ำได้)
- ใส่คำที่คนพูดจริงไว้ในเนื้อหา ทั้งชื่อเต็ม ชื่อย่อ และชื่อเล่น
- `tier`: `official` ต้องมีลิงก์ · `student` = รุ่นพี่/รีวิว/เพจ · `mock` = ข้อมูลสมมติ
- แหล่งขัดกัน เขียนทั้งสองค่าแล้วบอกว่าเชื่ออันไหน · จดสถานะใน `content/DATA_STATUS.md`
- ห้ามแต่งตัวเลขหรือชื่อร้าน ห้ามใส่ชื่อคนที่ให้สัมภาษณ์

เพิ่มคำถามทดสอบคู่กันทุกครั้ง (ใน `eval/questions/<หัวข้อ>.json`):

```json
{
 "id": "dorm-price-outside",
 "cat": "niche",
 "q": "หอนอกแถวมอราคาเท่าไหร่",
 "expect": { "include": ["บาท"], "show_map": false }
}
```

`cat`: `official` (มีคำตอบทางการ) · `niche` (เรื่องเฉพาะ ข้อมูลรุ่นพี่) · `unknown` (ยังไม่มีข้อมูล ต้องตอบว่าไม่รู้ → `"admits_unknown": true`) · `out_of_scope` (นอกเรื่อง → `"refuse": true`) · `map` (ถามที่ตั้ง → `"show_map": true` + `places_any`)
ตัวตรวจอื่นดูใน [scripts/eval-questions.ts](scripts/eval-questions.ts) · `include` เป็น regex เช่น `"57,?000"` รับทั้ง 57000 และ 57,000

## ตั้งค่าที่เจ้าของ repo ต้องทำครั้งเดียว

- [ ] เชิญเพื่อนเป็น collaborator (Settings → Collaborators)
- [ ] ป้องกัน main: Settings → Branches → Add rule สำหรับ `main` → Require a pull request before merging + Require status checks (`check`) — กันการ push ตรงโดยไม่ตั้งใจ
- [ ] Vercel: ตรวจว่า Environment Variables ของ **Preview** มี key AI ด้วย ไม่งั้นลิงก์ preview ของ PR จะตอบแบบออฟไลน์

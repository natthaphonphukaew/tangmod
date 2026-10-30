# ทางมด — กติกาสำหรับ Claude Code

โปรเจกต์นี้ทำกันสองคน แต่ละคนใช้ Claude Code ของตัวเอง กติกาด้านล่างมีไว้กันงานชนกัน อ่านคู่กับ [CONTRIBUTING.md](CONTRIBUTING.md)
เรื่อง Next.js 16 (API ที่เปลี่ยนไป) ดู [AGENTS.md](AGENTS.md) · ภาพรวมระบบดู [README.md](README.md)

## Git
- ห้าม commit หรือ push ลง `main` ตรง ๆ ทุกงานต้องทำบน branch แล้วเปิด PR (`data/<หัวข้อ>` สำหรับงานข้อมูล/AI, `ui/<หัวข้อ>` สำหรับหน้าตา, `fix/<หัวข้อ>`)
- ก่อนเริ่มงานและก่อนเปิด PR ให้ดึง main ล่าสุด: `git fetch origin && git rebase origin/main`
- PR ละเรื่อง เล็กและ merge เร็ว ดีกว่า branch ยาวที่ค้างหลายวัน
- commit หรือ push เมื่อผู้ใช้สั่งเท่านั้น
- ห้ามแก้บล็อก `BEGIN:nextjs-agent-rules` ใน AGENTS.md (`next dev` เขียนทับเอง)

## ใครดูแลส่วนไหน
| ส่วน | ไฟล์ | หมายเหตุ |
|---|---|---|
| ข้อมูลและความแม่นของคำตอบ | `content/kb/**`, `content/*.json`, `content/programs/**`, `content/admission/**`, `eval/questions/**`, `docs/research/**`, `content/DATA_STATUS.md`, `lib/ai/prompt.ts`, `lib/ai/retrieve.ts` | งานของคนที่ดูแลข้อมูล |
| หน้าตาและระบบ | `components/**`, `app/**`, `lib/client/**`, `lib/db/**`, `lib/auth.ts`, `lib/map/**`, `content/map-layout.json` | งานของเจ้าของ repo |
| ใช้ร่วมกัน — **ต้องบอกอีกฝ่ายก่อนแก้** | `lib/ai/schema.ts` (contract ที่ UI ใช้), `lib/ai/validate.ts`, `lib/data/schemas.ts`, `package.json`, `package-lock.json`, `next.config.ts`, `.github/**`, `CLAUDE.md` | ถ้างานต้องแตะไฟล์กลุ่มนี้ หยุดถามผู้ใช้ก่อน |

ถ้างานที่ได้รับต้องแก้ไฟล์นอกส่วนของผู้ใช้คนนั้น ให้บอกผู้ใช้ก่อนลงมือ อย่าแก้เงียบ ๆ

## ข้อมูล (สำคัญที่สุด)
- **ห้ามแต่งข้อมูล** ตัวเลข วันที่ ชื่อร้าน ชื่อตึก ต้องมาจากแหล่งที่เปิดดูได้จริงหรือจากที่ผู้ใช้ไปเก็บมา ถ้าไม่แน่ใจ ไม่ต้องใส่ หรือเขียนให้ชัดว่ายังไม่ยืนยัน
- ไฟล์ KB (`content/kb/<namespace>/<ชื่อ>.md`) ต้องมี frontmatter `namespace, tier, title, source_url, updated_at` · namespace = ชื่อโฟลเดอร์ (`general / sit / eng / food / admission`) · แต่ละ `## หัวข้อ` = 1 chunk ที่ค้นได้
- `tier`: `official` (เว็บมหาวิทยาลัย/คณะ ต้องมี source_url) · `student` (รุ่นพี่ รีวิว เพจ) · `mock` (ข้อมูลสมมติ ต้องบอกเหตุผล)
- แหล่งขัดกัน: เขียนทั้งสองค่าพร้อมบอกว่าใช้ค่าไหนเพราะอะไร แล้วจดใน `content/DATA_STATUS.md`
- บทสัมภาษณ์: สรุปความ ห้ามใส่ชื่อจริง ชื่อเล่น หรือรายละเอียดที่ระบุตัวคนได้
- เขียนเนื้อหาด้วยคำที่คนถามจริงใช้ (เช่น "ข้าวมันไก่", "หอใน", "ตึกแดง") เพราะระบบค้นด้วยคำ (BM25) ไม่ใช่ความหมาย

## ก่อนบอกว่าเสร็จ
- `npm test` ต้องผ่าน (ตรวจรูปแบบ KB, ข้อมูล JSON, ชุดคำถาม eval และ logic)
- แตะ `content/` หรือ `lib/ai/`: รัน `npm run eval -- --file=<ไฟล์คำถามที่เกี่ยว>` ถ้าแก้ `lib/ai/` ให้รันทั้งชุด `npm run eval` และต้องไม่มีข้อเดิมที่เคยผ่านแล้วตก
- แตะ UI: `npm run typecheck` และ `npm run lint` ต้องผ่าน แล้วเปิดดูในเบราว์เซอร์
- ห้ามเพิ่ม dependency ใหม่โดยไม่ถามผู้ใช้

## ความลับ
- ห้ามอ่านค่าใน `.env.local` ออกมาแสดง ห้าม commit key และห้ามใส่ key ลงในไฟล์ใด ๆ ที่ขึ้น git (repo เป็น public)

## ภาษา
- ข้อความในแอป เนื้อหา KB, commit message และเอกสาร ใช้ภาษาไทยที่อ่านง่าย ตรงไปตรงมา ไม่ขายของ

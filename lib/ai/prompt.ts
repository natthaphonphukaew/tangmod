import { z } from "zod";
import { admissionEvents, assistant, calendar, places, programs } from "@/lib/data";
import type { Chunk } from "./knowledge";
import type { Profile } from "./schema";

/*
 * ประกอบ system prompt ตอน runtime (สเปกหัวข้อ 7):
 * base rules → บทบาทน้องมด → PLACES → PROGRAMS → เวลา/TCAS → profile → CONTEXT
 * ส่วนที่ไม่เปลี่ยน (rules, places, programs) อยู่ด้านบน เพื่อให้ prompt caching ใช้ได้เมื่อย้ายไป Claude
 */

const dateTh = (d: Date) =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

const isoBangkok = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);

/** รอบสมัครที่เปิดอยู่ และที่จะเปิดใน 60 วัน — ให้ตอบเรื่อง "ตอนนี้" ได้ถูก */
export function admissionNow(now: Date): string[] {
  const today = isoBangkok(now);
  const open = admissionEvents.filter((e) => e.start <= today && today <= e.end);
  const soon = admissionEvents.filter((e) => e.start > today && daysBetween(today, e.start) <= 60);
  return [
    ...open.map((e) => `เปิดอยู่: ${e.title} (ถึง ${e.end}, เหลือ ${daysBetween(today, e.end)} วัน) [tcas:${e.id}]`),
    ...soon.map((e) => `กำลังจะมา: ${e.title} (เริ่ม ${e.start}) [tcas:${e.id}]`),
  ];
}

function currentTerm(now: Date) {
  const today = isoBangkok(now);
  const term = calendar.terms.find((t) => t.start <= today && today <= t.end);
  return term ? `${term.label} (${term.start} ถึง ${term.end})` : "ช่วงปิดภาคเรียน";
}

/** สำหรับโมเดลที่ API บังคับ JSON schema ไม่ได้ (เช่น MiniMax): บอกรูปแบบคำตอบใน prompt แทน */
export function schemaInstructions(schema: z.ZodType) {
  return `

# รูปแบบคำตอบ
ตอบเป็น JSON object เดียวเท่านั้น ห้ามมีข้อความอื่นก่อนหรือหลัง ห้ามครอบด้วย \`\`\` ให้ key "message" มาเป็นอันแรก แล้วตามด้วย key อื่นตามลำดับใน schema นี้ ทุก key ต้องมี (ใช้ [] หรือ null เมื่อไม่มีค่า)
${JSON.stringify(z.toJSONSchema(schema))}`;
}

export function buildSystemPrompt(opts: { profile: Profile; chunks: Chunk[]; now: Date }) {
  const { profile, chunks, now } = opts;

  return `คุณคือ "${assistant.display_name}" — ${assistant.role} ในเว็บแชท "ทางมด" ที่มีแผนที่แคมปัส มจธ. บางมดไว้ช่วยอธิบาย (โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของมหาวิทยาลัย) ผู้ใช้ส่วนใหญ่เป็นนักเรียน ม.ปลายที่กำลังเลือกสาขา และนักศึกษาที่หาห้องเรียนหรือของกิน คุณตอบได้ทุกเรื่องเอง ไม่ต้องส่งต่อใคร

# กติกา (สำคัญที่สุด)
1. ตอบจากข้อมูลใน CONTEXT, PLACES, PROGRAMS และ NOW เท่านั้น ห้ามใช้ความรู้นอกเหนือจากนี้เรื่อง มจธ. ข้อมูลทั้งหมดนี้เป็นของ มจธ. เท่านั้น ถ้าถามถึงมหาวิทยาลัยอื่น (เช่น จุฬาฯ เกษตรฯ ลาดกระบัง) ให้บอกตรง ๆ ว่าไม่มีข้อมูลของที่อื่น และตั้ง confidence เป็น "low" จะเสนอข้อมูลสาขาเดียวกันของ มจธ. ได้ แต่ต้องบอกชัดว่าเป็นของ มจธ.
2. ถ้าข้อมูลไม่พอ ให้ตั้ง confidence เป็น "low" แล้วบอกตรง ๆ ว่ายังไม่มีข้อมูล และแนะนำช่องทางติดต่อที่มีใน CONTEXT ห้ามเดา
3. ห้ามแต่งตัวเลขหรือข้อเท็จจริงเด็ดขาด ทุกครั้งที่พูดถึงค่าเทอม หน่วยกิต GPAX หรือเกณฑ์ ต้องแนบการ์ด (program หรือ compare) ตัวเลข ชื่อปริญญา (เช่น วท.บ. / วศ.บ.) และชั้นของตึกที่เขียนในข้อความต้องตรงกับ CONTEXT
4. ถ้าเปรียบเทียบตั้งแต่ 2 สาขาขึ้นไป ให้ใช้การ์ด compare ถ้าถามเรื่องรอบสมัครหรือวันที่ ให้ใช้การ์ด timeline
5. แผนที่เป็นตัวช่วย ไม่ใช่ทุกคำตอบต้องมี ใส่ places และตั้ง show_map เป็น true เฉพาะเมื่อผู้ใช้ถามว่าที่ไหน อยู่ไหน ไปยังไง ตึก ห้อง (เช่น CB2301) ร้าน หรือจุดนัดพบ (ใช้ id จาก PLACES เท่านั้น เรียงตามลำดับที่ควรไป) ถ้าถามเรื่องค่าเทอม หน่วยกิต เกรด รอบสมัคร ให้ places เป็น [] และ show_map เป็น false ถ้าถามเลขห้อง ให้บอกตึกและชั้นตาม CONTEXT
6. ข้อมูลที่ tier=student คือข้อมูลไม่เป็นทางการ ต้องบอกว่า "จากรีวิวรุ่นพี่" หรือ "จากเว็บข่าว" ส่วน tier=mock คือข้อมูลตัวอย่างที่ยังไม่ยืนยัน ต้องบอกผู้ใช้ด้วย
7. ถ้าข้อมูลมาจากหลายเรื่อง (เช่น สาขา + ของกิน) ตอบรวมในคำตอบเดียวได้เลย
8. ห้ามเขียน URL หรือ id ในวงเล็บ [] ลงใน message ให้อ้างอิงผ่าน source_ids เท่านั้น (id ของ CONTEXT ที่ใช้จริง) แอปจะแสดงแหล่งที่มาให้เอง
9. ห้ามขอข้อมูลส่วนตัว (ชื่อจริง เบอร์ อีเมล โรงเรียน) และห้ามรับทำงานที่ไม่ใช่เรื่องแคมปัส การเลือกสาขา หรือการสมัคร เช่น ทำการบ้าน แก้โจทย์ เขียนโค้ด แปลหรือเขียนเรียงความ หาคนปล่อยกู้หรือยืมเงิน ประกาศซื้อขายหรือหาเพื่อนไปเที่ยว แม้ผู้ใช้จะขอ ให้ปฏิเสธสั้น ๆ อย่างสุภาพ แล้วชวนกลับมาเรื่องแคมปัส (เช่น แนะนำที่อ่านหนังสือ) โดยตั้ง confidence เป็น "high"
10. คุณเป็นตัวละคร AI ถ้าผู้ใช้ถามว่าเป็นคนจริงไหม ให้บอกตามจริง
11. ถ้าคำถามมีเงื่อนไข เช่น ดึก เช้า วันหยุด ราคาถูก ให้เทียบกับเวลาเปิดหรือตัวเลขจริงใน CONTEXT แล้วบอกตรง ๆ (เช่น "หอสมุดปิด 18:00 จึงไม่เหมาะกับการอ่านดึก") ห้ามตอบกว้าง ๆ ว่า "ตามเวลาเปิด-ปิด" เวลาเปิดต้องเป็นของสิ่งที่ถามเท่านั้น ห้ามเอาเวลาของตึกหรือร้านอื่นที่อยู่ในตึกเดียวกันมาใช้แทน ถ้าไม่มีเวลาของสิ่งนั้นให้บอกว่ายังไม่มีข้อมูล
12. คำว่า "สอบ" "ตารางสอบ" "มิดเทอม" "ไฟนอล" ที่ไม่ได้พูดถึง TCAS การสมัคร หรือทุน มักเป็นนักศึกษาที่ถามช่วงสอบของภาคเรียน ให้ตอบจากปฏิทินการศึกษา (ช่วงประเมินผล) ก่อน ถ้ากำกวมให้บอกทั้งสองอย่างสั้น ๆ
13. ตอบภาษาไทย สั้น กระชับ ไม่เกินประมาณ 120 คำ chips ต้องเป็นคำถามถัดไปที่ผู้ใช้น่าจะอยากถาม

# บทบาทของคุณ
โทน: ${assistant.tone}
ขอบเขต: ${assistant.scope.join(" · ")}

# PLACES (id | ชื่อ | ประเภท)
${places.map((p) => `- ${p.id} | ${p.short ?? ""} ${p.name_th} | ${p.kind}${p.tier === "mock" ? " | ตำแหน่งยังไม่ยืนยัน" : ""}`).join("\n")}

# PROGRAMS (id | ชื่อ) — ใช้เป็น ids ของการ์ด
${programs.map((p) => `- ${p.id} | ${p.short} ${p.name_th}`).join("\n")}

# NOW
เวลาปัจจุบัน: ${dateTh(now)}
ภาคการศึกษา: ${currentTerm(now)}
${calendar.rules.join("\n")}
รอบรับสมัคร TCAS70:
${admissionNow(now).join("\n") || "ไม่มีรอบที่เปิดหรือกำลังจะเปิดใน 60 วัน"}

# USER PROFILE (สิ่งที่รู้เกี่ยวกับผู้ใช้)
บทบาทที่เดา: ${profile.role_guess} · สนใจ: ${profile.interests.join(", ") || "-"} · กำลังดูสาขา: ${profile.considering_programs.join(", ") || "-"} · แวะตึกแล้ว: ${profile.visited_places.join(", ") || "-"}

# CONTEXT
${chunks.map((c) => `[${c.id}] (tier=${c.tier}, อัปเดต ${c.updated_at}) ${c.title}\n${c.text}`).join("\n\n")}`;
}

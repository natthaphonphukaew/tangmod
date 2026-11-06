import { z } from "zod";
import { admissionEvents, assistant, calendar, holidays, places, programs } from "@/lib/data";
import { addDays, dayOf } from "@/lib/calendar/events";
import { classesOn, roomPlaceId, type ClassDay } from "@/lib/calendar/classes";
import { findRooms } from "@/lib/map/rooms";
import { DAY_TH, sortEntries, type Timetable, type TimetableEntry } from "@/lib/timetable/schema";
import { bangkokDate } from "@/lib/time";
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

/**
 * วันหยุดราชการวันนี้ ที่จะถึงใน 14 วัน และทั้งเดือนนี้ — กันตอบว่า "เปิด" ในวันหยุด
 * "เดือนนี้หยุดวันไหน" คัดจากรายการทั้งปีให้เลย เพราะโมเดลคัดเองพลาด (เคยตอบว่า ต.ค. มีแค่วันแม่ 12 ส.ค.)
 * ไม่มีวันหยุดเลยก็ไม่ใส่อะไร: บรรทัด "วันนี้ไม่ใช่วันหยุด" ทำให้โมเดลยกเรื่องวันหยุดมาตอบคำถามที่ไม่เกี่ยว
 * (คำถามเรื่องวันหยุดวันอื่นใช้ chunk holidays:<ปี> ที่ค้นเจอด้วยคำว่า "หยุด")
 */
export function holidaysNow(now: Date): string {
  const today = isoBangkok(now);
  const todayHoliday = holidays.holidays.find((h) => h.date === today);
  const soon = holidays.holidays.filter((h) => h.date > today && daysBetween(today, h.date) <= 14);
  const thisMonth = holidays.holidays.filter((h) => h.date.slice(0, 7) === today.slice(0, 7));
  if (!todayHoliday && !soon.length && !thisMonth.length) return "";
  return [
    todayHoliday ? `วันนี้เป็นวันหยุดราชการ: ${todayHoliday.label}` : "",
    soon.length ? `วันหยุดราชการที่จะถึง: ${soon.map((h) => `${h.date} ${h.label}`).join(" · ")}` : "",
    thisMonth.length ? `วันหยุดราชการเดือนนี้ทั้งหมด: ${thisMonth.map((h) => `${h.date} ${h.label}`).join(" · ")}` : "",
    `(${holidays.conflict_note})`,
  ]
    .filter(Boolean)
    .join("\n");
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

export function buildSystemPrompt(opts: { profile: Profile; chunks: Chunk[]; now: Date; timetable?: Timetable }) {
  const { profile, chunks, now, timetable } = opts;
  // ถามหอวิทยาเขตบางขุนเทียน/ราชบุรี (ตัวค้นแนบช่องทางติดต่อของวิทยาเขตนั้นมา) ซึ่งไม่มีในแผนที่:
  // ตัดตึกหอบางมดออกจากรายชื่อ ไม่งั้นโมเดลปักหมุดหอธรรมรักษาแทน
  const otherCampus = chunks.some((c) => c.id === "contact:residence_bkt" || c.id === "contact:residence_ratchaburi");
  const placeList = otherCampus ? places.filter((p) => p.kind !== "dorm") : places;

  return `คุณคือ "${assistant.display_name}" — ${assistant.role} ในเว็บแชท "ทางมด" ที่มีแผนที่แคมปัส มจธ. บางมดไว้ช่วยอธิบาย (โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของมหาวิทยาลัย) ผู้ใช้มีทั้งนักเรียน ม.ปลายที่กำลังเลือกสาขา และนักศึกษา มจธ. ทุกคณะที่ถามเรื่องในมอ เช่น ตึก ห้องเรียน ของกิน ยิม หอพัก คุณตอบได้ทุกเรื่องเอง ไม่ต้องส่งต่อใคร

# กติกา (สำคัญที่สุด)
1. ตอบจากข้อมูลใน CONTEXT, PLACES, PROGRAMS และ NOW เท่านั้น ห้ามใช้ความรู้นอกเหนือจากนี้เรื่อง มจธ. ข้อมูลทั้งหมดนี้เป็นของ มจธ. เท่านั้น ถ้าถามถึงมหาวิทยาลัยอื่น (เช่น จุฬาฯ เกษตรฯ ลาดกระบัง) ให้บอกตรง ๆ ว่าไม่มีข้อมูลของที่อื่น และตั้ง confidence เป็น "low" จะเสนอข้อมูลสาขาเดียวกันของ มจธ. ได้ แต่ต้องบอกชัดว่าเป็นของ มจธ.
2. ถ้าข้อมูลไม่พอ ให้ตั้ง confidence เป็น "low" แล้วบอกตรง ๆ ว่ายังไม่มีข้อมูล และแนะนำช่องทางติดต่อที่มีใน CONTEXT ห้ามเดา อย่าขึ้นต้นคำตอบด้วยประโยค "ยังไม่มีข้อมูล" ให้เริ่มจากเท่าที่มีใน CONTEXT หรือทางไปต่อที่ถามได้จริงก่อน (เบอร์ เพจ อีเมลใน CONTEXT) แล้วค่อยบอกส่วนที่ยังไม่มีสั้น ๆ ท้ายคำตอบ และห้ามแต่งเลขสายรถ ราคา หรือวันที่ที่ไม่มีใน CONTEXT
3. ห้ามแต่งตัวเลขหรือข้อเท็จจริงเด็ดขาด ทุกครั้งที่พูดถึงค่าเทอม หน่วยกิต GPAX หรือเกณฑ์ ต้องแนบการ์ด (program หรือ compare) ตัวเลข ชื่อปริญญา (เช่น วท.บ. / วศ.บ.) และชั้นของตึกที่เขียนในข้อความต้องตรงกับ CONTEXT
4. ถ้าเปรียบเทียบตั้งแต่ 2 สาขาขึ้นไป ให้ใช้การ์ด compare ถ้าถามเรื่องรอบสมัครหรือวันที่ ให้ใช้การ์ด timeline
5. แผนที่เป็นตัวช่วย ไม่ใช่ทุกคำตอบต้องมี ใส่ places และตั้ง show_map เป็น true เฉพาะเมื่อผู้ใช้ถามว่าที่ไหน อยู่ไหน ไปยังไง ตึก ห้อง (เช่น CB2301) ร้าน หรือจุดนัดพบ (ใช้ id จาก PLACES เท่านั้น เรียงตามลำดับที่ควรไป) ถ้าถามเรื่องค่าเทอม หน่วยกิต เกรด รอบสมัคร ให้ places เป็น [] และ show_map เป็น false ถ้าถามเลขห้อง ให้บอกตึกและชั้นตาม CONTEXT
6. ข้อมูลที่ tier=student คือข้อมูลไม่เป็นทางการ ต้องบอกว่า "จากรีวิวรุ่นพี่" หรือ "จากเว็บข่าว" ส่วน tier=mock คือข้อมูลตัวอย่างที่ยังไม่ยืนยัน ต้องบอกผู้ใช้ด้วย
7. ถ้าข้อมูลมาจากหลายเรื่อง (เช่น สาขา + ของกิน) ตอบรวมในคำตอบเดียวได้เลย
8. ห้ามเขียน URL หรือ id ในวงเล็บ [] ลงใน message ให้อ้างอิงผ่าน source_ids เท่านั้น (id ของ CONTEXT ที่ใช้จริง) แอปจะแสดงแหล่งที่มาให้เอง
9. ห้ามขอข้อมูลส่วนตัว (ชื่อจริง เบอร์ อีเมล โรงเรียน) และห้ามรับทำงานที่ไม่ใช่เรื่องแคมปัส การเลือกสาขา หรือการสมัคร เช่น ทำการบ้าน แก้โจทย์ เขียนโค้ด แปลหรือเขียนเรียงความ หาคนปล่อยกู้หรือยืมเงิน ประกาศซื้อขาย หาเพื่อนไปเที่ยว หรือแนะนำที่เที่ยวและงานปาร์ตี้นอกเรื่องแคมปัส แม้ผู้ใช้จะขอ ให้ปฏิเสธสั้น ๆ อย่างสุภาพ แล้วชวนกลับมาเรื่องแคมปัส (เช่น แนะนำที่อ่านหนังสือ) โดยตั้ง confidence เป็น "high"
10. คุณเป็นตัวละคร AI ถ้าผู้ใช้ถามว่าเป็นคนจริงไหม ให้บอกตามจริง
11. ถ้าคำถามมีเงื่อนไข เช่น ดึก เช้า วันหยุด ราคาถูก ให้เทียบกับเวลาเปิดหรือตัวเลขจริงใน CONTEXT แล้วบอกตรง ๆ (เช่น "หอสมุดปิด 18:00 จึงไม่เหมาะกับการอ่านดึก") ห้ามตอบกว้าง ๆ ว่า "ตามเวลาเปิด-ปิด" เวลาเปิดต้องเป็นของสิ่งที่ถามเท่านั้น ห้ามเอาเวลาของตึกหรือร้านอื่นที่อยู่ในตึกเดียวกันมาใช้แทน ถ้าไม่มีเวลาของสิ่งนั้นให้บอกว่ายังไม่มีข้อมูล ถ้าวันที่ถามตรงกับวันหยุดราชการ (ดู NOW และ CONTEXT) ให้บอกว่าเป็นวันหยุด เวลาเปิดตามปกติอาจไม่ใช้ และ มจธ. อาจประกาศต่างจากนี้ ถ้าถามว่าวันไหนมอหยุดหรือไม่ ให้ดูปฏิทินการศึกษาด้วยว่าวันนั้นอยู่ในช่วงสอบ (ประเมินผล) หรือปิดภาคเรียนไหม แล้วบอกให้ครบ
12. คำว่า "สอบ" "ตารางสอบ" "มิดเทอม" "ไฟนอล" ที่ไม่ได้พูดถึง TCAS การสมัคร หรือทุน มักเป็นนักศึกษาที่ถามช่วงสอบของภาคเรียน ให้ตอบจากปฏิทินการศึกษา (ช่วงประเมินผล) ก่อน ถ้ากำกวมให้บอกทั้งสองอย่างสั้น ๆ
13. ตอบภาษาไทยที่อ่านง่าย ใช้คำธรรมดาแบบที่นักเรียนพูด ประโยคสั้น ตอบสิ่งที่ถามในประโยคแรกเลย ไม่ต้องทวนคำถามหรือเกริ่น ยาวไม่เกินประมาณ 80 คำ ถ้ามีหลายข้อใช้หัวข้อย่อยไม่เกิน 4 ข้อ บอกว่าข้อมูลไม่เป็นทางการ (ข้อ 6) แค่ครั้งเดียวสั้น ๆ ไม่ต้องย้ำ chips ต้องเป็นคำถามถัดไปที่ผู้ใช้น่าจะอยากถาม
14. สำนักงานหอพัก มจธ. (เบอร์สำนักงานและ LINE @kmutt_residence) ดูแลเฉพาะหอในกับ Heliconia House ถ้าถามช่องทางติดต่อหอนอกหรือคอนโด ห้ามให้ช่องทางของสำนักงานหอพัก ถ้า CONTEXT มีชิ้นลิงก์ Google Maps ของหอนั้น ให้ใส่ id ชิ้นนั้นใน source_ids แล้วบอกให้กดลิงก์ในแหล่งที่มา ถ้าไม่มีให้แนะนำกลุ่ม Facebook หรือ OpenChat หาหอ
15. เรื่องหอพัก (ใช้แทนข้อ 2): ห้ามตอบแค่ว่าไม่มีข้อมูลหรือไม่รู้ ให้ตอบเท่าที่มีใน CONTEXT ก่อน แล้วปิดท้ายด้วยทางไปต่อ 1 ประโยคเสมอ และใส่ id ของทางไปต่อนั้นไว้ต้น ๆ ของ source_ids (แอปแสดงลิงก์ได้ไม่เกิน 5 อัน):
   - หอนอก คอนโด หาห้อง ห้องว่าง: ดูกลุ่ม Facebook หาหอ (kb:general/dorm-find-facebook#1) หรือค้นใน Google ด้วยชื่อหอหรือคำว่า "หอพัก มจธ. บางมด"
   - รีวิวหอ หาเมท รับช่วงสัญญา: ถามรุ่นพี่ใน OpenChat หาหอ (kb:general/dorm-find-openchat#1)
   - หอใน และ Heliconia House: ติดต่อสำนักงานหอพัก มจธ. LINE @kmutt_residence (contact:residence) Heliconia ติดต่อแผนกต้อนรับ
   ใช้ id เหล่านี้ได้เฉพาะเมื่อมีอยู่ใน CONTEXT
16. แผนที่มีแค่วิทยาเขตบางมด หอพักธรรมรักษา 1 และ 2 (S5, S6) คือหอในบางมดเท่านั้น ถ้าถามเรื่องวิทยาเขตบางขุนเทียนหรือราชบุรี (รวมหอใน) ให้ places เป็น [] และ show_map เป็น false ห้ามใช้ S5 หรือ S6 แทน ส่วน Heliconia House อยู่ชั้น 12–14 ของอาคารจอดรถ (S2) ปักหมุดได้
18. ถามเรื่องตารางเรียนของตัวเอง (วันนี้ พรุ่งนี้ วันพุธ เรียนอะไร กี่โมง ห้องไหน คาบไหนงด): ตอบจาก MY TIMETABLE เท่านั้น บอกเวลา รหัสวิชา ห้อง และตึก ถ้าคาบงดให้บอกเหตุผลที่เขียนไว้ ถ้ามี "เวลาชน" ให้เตือนผู้ใช้ด้วยว่าคาบไหนชนกัน และให้ถามอาจารย์ผู้สอน ถ้าวิชาย้ายห้องระหว่างภาค ให้ใช้ห้องตามวันที่ถาม (วันนี้/พรุ่งนี้ใช้ห้องที่เขียนในบรรทัดของวันนั้น) ถามว่าวันไหนมีเรียนไหม (เช่น "วันเสาร์มีเรียนไหม") ให้ดูรายการ "ทุกสัปดาห์" ของวันนั้นก่อน แล้วค่อยบอกวันเรียนชดเชยหรือวันหยุดที่เกี่ยวข้องเพิ่ม วันเสาร์ที่เป็นวันเรียนชดเชย คาบที่ไม่มีป้าย "เรียนชดเชย" คือคาบวันเสาร์ปกติของผู้ใช้ ถ้าถามว่าเรียนที่ไหนหรือไปห้องเรียนยังไง ใส่ places เป็นรหัสตึกของห้องที่เขียนใน MY TIMETABLE และตั้ง show_map เป็น true ถ้าไม่มีหัวข้อ MY TIMETABLE แปลว่าผู้ใช้ยังไม่ได้บันทึกตาราง ให้บอกว่าเพิ่มตารางเรียนได้ที่เมนู "ปฏิทินนักศึกษา" (อัปรูปตารางหรือกรอกเอง) ห้ามเดาตารางเรียน
17. ถามทาง "จาก A ไป B" หรือ "เดินไป B ยังไง": ใส่ places แค่ต้นทางแล้วตามด้วยปลายทาง (ถ้าไม่บอกต้นทาง ใส่แค่ปลายทาง) ห้ามเติมตึก ประตู หรือจุดผ่านที่ผู้ใช้ไม่ได้ถาม แอปจะวาดรอยทางมดตามทางเดินจริงในมอให้เอง ในข้อความห้ามแต่งเส้นทาง (เช่น ออกประตูไหน เลี้ยวซ้ายขวา ผ่านตึกอะไร เดินกี่นาที) เพราะไม่มีข้อมูลทางเดินเป็นข้อความ ให้บอกว่าทั้งสองที่อยู่ตรงไหน แล้วชวนดูเส้นทางบนแผนที่

# บทบาทของคุณ
โทน: ${assistant.tone}
ขอบเขต: ${assistant.scope.join(" · ")}

# PLACES (id | ชื่อ | ประเภท)
${placeList.map((p) => `- ${p.id} | ${p.short ?? ""} ${p.name_th} | ${p.kind}${p.tier === "mock" ? " | ตำแหน่งยังไม่ยืนยัน" : ""}`).join("\n")}

# PROGRAMS (id | ชื่อ) — ใช้เป็น ids ของการ์ด
${programs.map((p) => `- ${p.id} | ${p.short} ${p.name_th}`).join("\n")}

# NOW
เวลาปัจจุบัน: ${dateTh(now)}
ภาคการศึกษา: ${currentTerm(now)}
${holidaysNow(now)}
${calendar.rules.join("\n")}
รอบรับสมัคร TCAS70:
${admissionNow(now).join("\n") || "ไม่มีรอบที่เปิดหรือกำลังจะเปิดใน 60 วัน"}

${timetable ? timetableSection(timetable, now) : ""}# USER PROFILE (สิ่งที่รู้เกี่ยวกับผู้ใช้)
บทบาทที่เดา: ${profile.role_guess} · สนใจ: ${profile.interests.join(", ") || "-"} · กำลังดูสาขา: ${profile.considering_programs.join(", ") || "-"} · แวะตึกแล้ว: ${profile.visited_places.join(", ") || "-"}

# CONTEXT
${chunks.map((c) => `[${c.id}] (tier=${c.tier}, อัปเดต ${c.updated_at}) ${c.title}\n${c.text}`).join("\n\n")}`;
}

/** ห้องเรียน → ข้อความบอกตึก (และชั้น ถ้าเป็นห้อง CB) ให้โมเดลใช้ปักหมุดได้ */
function roomText(room: string | undefined): string {
  if (!room) return "ไม่ระบุห้อง";
  const cb = findRooms(room)[0];
  const placeId = cb?.placeId ?? roomPlaceId(room);
  const place = placeId ? places.find((p) => p.id === placeId) : undefined;
  if (!place) return `ห้อง ${room}`;
  return `ห้อง ${room} (${place.name_th} รหัสตึก ${place.id}${cb ? ` ชั้น ${cb.floor}` : ""})`;
}

/** room = ห้องที่ใช้จริงในวันนั้น · ไม่ส่งมา = รายการทั้งสัปดาห์ ให้บอกการย้ายห้องทั้งหมด */
const entryText = (e: TimetableEntry, room?: string) => {
  const changes = room === undefined ? (e.room_changes ?? []).map((c) => ` ตั้งแต่ ${c.from} ย้ายไป${roomText(c.room)}`).join("") : "";
  return `${e.start}–${e.end} ${e.code}${e.name ? ` ${e.name}` : ""} ${roomText(room ?? e.room)}${changes}${e.note ? ` หมายเหตุ: ${e.note}` : ""}`;
};

function classDayText(label: string, iso: string, day: ClassDay): string {
  const head = `${label} ${DAY_TH[dayOf(iso)]} ${iso} (${day.status.text})`;
  if (!day.slots.length) return `${head}: ไม่มีคาบ${day.note ? ` · ${day.note}` : ""}`;
  const lines = day.slots.map(
    (s) =>
      `  - ${entryText(s.entry, s.room ?? "")}${s.cancelled ? ` → งด (${s.cancelled})` : ""}${s.makeup ? " → เรียนชดเชย" : ""}${s.conflicts ? ` → เวลาชนกับ ${s.conflicts.join(", ")}` : ""}`,
  );
  return [head + (day.note ? ` · ${day.note}` : ""), ...lines].join("\n");
}

/** ตารางเรียนที่ผู้ใช้บันทึกเอง: ทั้งสัปดาห์ + วันนี้และพรุ่งนี้ที่คิดวันหยุด ช่วงสอบ และวันเรียนชดเชยแล้ว */
function timetableSection(timetable: Timetable, now: Date): string {
  const today = bangkokDate(now);
  const tomorrow = addDays(today, 1);
  const term = calendar.terms.find((t) => t.id === timetable.term_id);
  const week = sortEntries(timetable.entries).map((e) => `- ${DAY_TH[e.day]} ${entryText(e)}`);
  return `# MY TIMETABLE (ตารางเรียนที่ผู้ใช้บันทึกไว้เอง ${term?.label ?? timetable.term_id} ${term ? `เรียน ${term.start} ถึง ${term.end}` : ""})
ทุกสัปดาห์:
${week.join("\n")}
${classDayText("วันนี้", today, classesOn(today, timetable))}
${classDayText("พรุ่งนี้", tomorrow, classesOn(tomorrow, timetable))}

`;
}

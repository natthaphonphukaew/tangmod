import { z } from "zod";
import placesJson from "@/content/places.json";
import assistantJson from "@/content/assistant.json";
import sitPrograms from "@/content/programs/sit.json";
import engPrograms from "@/content/programs/eng.json";
import fiboPrograms from "@/content/programs/fibo.json";
import tcas70Json from "@/content/admission/tcas70.json";
import contactsJson from "@/content/contacts.json";
import calendarJson from "@/content/calendar.json";
import holidaysJson from "@/content/holidays.json";
import academicEventsJson from "@/content/academic-events-2569.json";
import catalogJson from "@/content/programs/catalog.json";
import {
  AcademicCalendar,
  AcademicEvents,
  AdmissionEvent,
  CatalogProgram,
  Contact,
  Assistant,
  Holidays,
  Place,
  Program,
} from "./schemas";

// parse ตอนโหลด module — ข้อมูลผิดรูปแบบจะพังตั้งแต่ build ไม่ใช่ตอนผู้ใช้ถาม
export const places = z.array(Place).parse(placesJson);
export const assistant = Assistant.parse(assistantJson);
export const programs = z
  .array(Program)
  .parse([...sitPrograms, ...engPrograms, ...fiboPrograms]);
export const admissionEvents = z.array(AdmissionEvent).parse(tcas70Json);
export const contacts = z.array(Contact).parse(contactsJson);
export const calendar = AcademicCalendar.parse(calendarJson);
export const holidays = Holidays.parse(holidaysJson);
export const academicEvents = AcademicEvents.parse(academicEventsJson);
/** ปริญญาตรีทั้งมหาวิทยาลัย (เข็มทิศสาขา) แยกจาก programs ที่ใช้ตอบแชทแบบละเอียด */
export const catalog = z.array(CatalogProgram).parse(catalogJson);

const byId = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]));

export const placeById = byId(places);
export const programById = byId(programs);
export const admissionEventById = byId(admissionEvents);
export const contactById = byId(contacts);
export const catalogById = byId(catalog);

/** ตรวจว่า id ที่อ้างถึงกันข้ามไฟล์มีอยู่จริง คืนรายการปัญหา (ว่าง = ผ่าน) */
export function findIntegrityProblems(): string[] {
  const problems: string[] = [];
  const dupes = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${label}: id ซ้ำ "${id}"`);
      seen.add(id);
    }
  };
  dupes("place", places.map((p) => p.id));
  dupes("program", programs.map((p) => p.id));
  dupes("admission", admissionEvents.map((e) => e.id));
  dupes("academic event", academicEvents.events.map((e) => e.id));
  dupes("catalog", catalog.map((p) => p.id));

  for (const p of catalog) {
    if (p.place_id && !placeById.has(p.place_id)) problems.push(`catalog ${p.id}: ไม่มี place "${p.place_id}"`);
  }
  for (const program of programs) {
    if (!catalogById.has(program.id)) problems.push(`catalog: ไม่มีหลักสูตร "${program.id}" จาก programs/*.json`);
  }

  for (const program of programs) {
    if (program.place_id && !placeById.has(program.place_id))
      problems.push(`program ${program.id}: ไม่มี place "${program.place_id}"`);
    if (program.depth === "deep" && !program.vibe)
      problems.push(`program ${program.id}: depth=deep ต้องมี vibe`);
  }
  for (const event of admissionEvents) {
    if (event.start > event.end) problems.push(`admission ${event.id}: start หลัง end`);
    for (const id of event.program_ids) {
      if (!programById.has(id)) problems.push(`admission ${event.id}: ไม่มี program "${id}"`);
    }
  }
  const termIds = new Set(calendar.terms.map((t) => t.id));
  for (const event of academicEvents.events) {
    if (event.start > event.end) problems.push(`academic event ${event.id}: start หลัง end`);
    if (event.term_id && !termIds.has(event.term_id)) problems.push(`academic event ${event.id}: ไม่มีภาค "${event.term_id}"`);
    if (event.follows_day && event.kind !== "makeup") problems.push(`academic event ${event.id}: follows_day ใช้กับวันเรียนชดเชยเท่านั้น`);
  }
  return problems;
}

import { z } from "zod";
import placesJson from "@/content/places.json";
import assistantJson from "@/content/assistant.json";
import sitPrograms from "@/content/programs/sit.json";
import engPrograms from "@/content/programs/eng.json";
import fiboPrograms from "@/content/programs/fibo.json";
import tcas70Json from "@/content/admission/tcas70.json";
import contactsJson from "@/content/contacts.json";
import calendarJson from "@/content/calendar.json";
import {
  AcademicCalendar,
  AdmissionEvent,
  Contact,
  Assistant,
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

const byId = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]));

export const placeById = byId(places);
export const programById = byId(programs);
export const admissionEventById = byId(admissionEvents);

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
  return problems;
}

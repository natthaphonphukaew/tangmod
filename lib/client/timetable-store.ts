"use client";

import { useEffect, useSyncExternalStore } from "react";
import { authClient } from "@/lib/client/auth-client";
import { Timetable } from "@/lib/timetable/schema";

/*
 * ตารางเรียนส่วนตัว — ใช้ร่วมกันทั้งหน้าปฏิทิน การ์ดวันนี้ และแชท ผ่าน useTimetable()
 *   ไม่ได้ login → localStorage ในเครื่อง
 *   login แล้ว   → /api/timetable (ผูกกับบัญชี) · login ครั้งแรกย้ายตารางในเครื่องขึ้นบัญชีแล้วลบออกจากเครื่อง
 * เก็บใน store ระดับ module ทุก component จึงเห็นตารางเดียวกันและอัปเดตพร้อมกัน
 */

const KEY = "tangmod.timetable.v1";

type State = { timetable: Timetable | null; ready: boolean; owner: string | null | undefined };
let state: State = { timetable: null, ready: false, owner: undefined };
const SERVER_STATE: State = { timetable: null, ready: false, owner: undefined };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function readLocal(): Timetable | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = Timetable.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
function writeLocal(t: Timetable | null) {
  try {
    if (t) window.localStorage.setItem(KEY, JSON.stringify(t));
    else window.localStorage.removeItem(KEY);
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ ใช้ได้แค่ในหน้านี้
  }
}

async function load(userId: string | null) {
  if (state.owner === userId) return;
  set({ owner: userId, ready: false });
  if (!userId) return set({ timetable: readLocal(), ready: true });
  try {
    const res = await fetch("/api/timetable", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    let { timetable } = (await res.json()) as { timetable: Timetable | null };
    const local = readLocal();
    if (!timetable && local) {
      await put(local);
      timetable = local;
    }
    if (local) writeLocal(null);
    if (state.owner === userId) set({ timetable, ready: true });
  } catch {
    if (state.owner === userId) set({ timetable: readLocal(), ready: true });
  }
}

async function put(t: Timetable) {
  const res = await fetch("/api/timetable", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
  if (!res.ok) throw new Error(`timetable ${res.status}`);
}

/** บันทึก (แทนที่ทั้งตาราง) · โยน error ถ้าบันทึกขึ้นบัญชีไม่สำเร็จ */
export async function saveTimetable(t: Timetable) {
  if (state.owner) await put(t);
  else writeLocal(t);
  set({ timetable: t });
}

export async function clearTimetable() {
  if (state.owner) await fetch("/api/timetable", { method: "DELETE" });
  else writeLocal(null);
  set({ timetable: null });
}

/** ตารางเรียนปัจจุบัน · ready = โหลดเสร็จแล้ว (ก่อน hydrate และระหว่างโหลดเป็น false) */
export function useTimetable(): { timetable: Timetable | null; ready: boolean } {
  const session = authClient.useSession();
  const userId = session.isPending ? undefined : (session.data?.user.id ?? null);
  useEffect(() => {
    if (userId !== undefined) void load(userId);
  }, [userId]);
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

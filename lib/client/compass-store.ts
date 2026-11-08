"use client";

import { useEffect, useSyncExternalStore } from "react";
import { authClient } from "@/lib/client/auth-client";
import { SavedCompass } from "@/lib/compass-saved";

/*
 * ผลเข็มทิศล่าสุดและสาขาที่เลือกไว้เทียบ — ทำแบบเดียวกับตารางเรียน (timetable-store)
 *   ไม่ได้ login → localStorage ในเครื่อง
 *   login แล้ว   → /api/compass · login ครั้งแรกย้ายของในเครื่องขึ้นบัญชีแล้วลบออกจากเครื่อง
 */

const KEY = "tangmod.compass.v1";

type State = { saved: SavedCompass | null; ready: boolean; owner: string | null | undefined };
let state: State = { saved: null, ready: false, owner: undefined };
const SERVER_STATE: State = { saved: null, ready: false, owner: undefined };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function readLocal(): SavedCompass | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = SavedCompass.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
function writeLocal(c: SavedCompass | null) {
  try {
    if (c) window.localStorage.setItem(KEY, JSON.stringify(c));
    else window.localStorage.removeItem(KEY);
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ ใช้ได้แค่ในหน้านี้
  }
}

async function load(userId: string | null) {
  if (state.owner === userId) return;
  set({ owner: userId, ready: false });
  if (!userId) return set({ saved: readLocal(), ready: true });
  try {
    const res = await fetch("/api/compass", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    let { compass } = (await res.json()) as { compass: SavedCompass | null };
    const local = readLocal();
    if (!compass && local) {
      await put(local);
      compass = local;
    }
    if (local) writeLocal(null);
    if (state.owner === userId) set({ saved: compass, ready: true });
  } catch {
    if (state.owner === userId) set({ saved: readLocal(), ready: true });
  }
}

async function put(c: SavedCompass) {
  const res = await fetch("/api/compass", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
  if (!res.ok) throw new Error(`compass ${res.status}`);
}

/** บันทึกทับ · แสดงผลทันที ถ้าบันทึกขึ้นบัญชีไม่สำเร็จก็ยังเห็นผลในหน้านี้ */
export async function saveCompass(c: SavedCompass) {
  set({ saved: c });
  if (state.owner) await put(c).catch(() => undefined);
  else writeLocal(c);
}

export async function clearCompass() {
  set({ saved: null });
  if (state.owner) await fetch("/api/compass", { method: "DELETE" }).catch(() => undefined);
  else writeLocal(null);
}

/** ผลที่บันทึกไว้ปัจจุบัน (อ่านแบบไม่ subscribe ใช้ตอนรวมกับการแก้รายการเทียบ) */
export const currentCompass = () => state.saved;

export function useCompass(): { saved: SavedCompass | null; ready: boolean } {
  const session = authClient.useSession();
  const userId = session.isPending ? undefined : (session.data?.user.id ?? null);
  useEffect(() => {
    if (userId !== undefined) void load(userId);
  }, [userId]);
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

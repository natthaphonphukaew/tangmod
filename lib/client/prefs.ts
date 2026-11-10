"use client";

import { useSyncExternalStore } from "react";

/*
 * การตั้งค่าเล็ก ๆ ของผู้ใช้ เก็บในเบราว์เซอร์เครื่องนี้ (ไม่ผูกบัญชี เพราะแต่ละเครื่องจอไม่เท่ากัน)
 *   sidebarCollapsed  แถบซ้ายบนคอมพับเหลือแถบไอคอน
 *   reduceMotion      ลดภาพเคลื่อนไหวเสมอ (ปกติทำตามการตั้งค่าของเครื่อง)
 * ก่อน hydrate ใช้ค่าเริ่มต้น HTML จาก server จึงตรงกับฝั่ง client เสมอ
 */

export type Prefs = { sidebarCollapsed: boolean; reduceMotion: boolean };

const KEY = "tangmod.prefs.v1";
const DEFAULTS: Prefs = { sidebarCollapsed: false, reduceMotion: false };
let state: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (state) return state;
  try {
    state = { ...DEFAULTS, ...JSON.parse(window.localStorage.getItem(KEY) ?? "{}") };
  } catch {
    state = DEFAULTS;
  }
  return state!;
}

export function setPrefs(patch: Partial<Prefs>) {
  state = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ ใช้ได้แค่ในหน้านี้
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

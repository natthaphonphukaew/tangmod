import { Profile, emptyProfile, type ValidatedAnswer } from "@/lib/ai/schema";

const KEY = "tangmod.profile.v1";

/** localStorage อาจใช้ไม่ได้ (private mode, ถูกบล็อก) — ต้องไม่ทำให้แอปพัง */
export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const parsed = Profile.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyProfile();
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // ไม่มีที่เก็บก็จำได้แค่ในแท็บนี้
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

const merge = (xs: string[], add: string[], max: number) => [...new Set([...add, ...xs])].slice(0, max);

export function applyAnswer(profile: Profile, answer: ValidatedAnswer): Profile {
  const u = answer.profile_update;
  if (!u) return profile;
  return {
    ...profile,
    role_guess: u.role_guess !== "unknown" ? u.role_guess : profile.role_guess,
    interests: merge(profile.interests, u.interests_add, 12),
    considering_programs: merge(profile.considering_programs, u.considering_add, 8),
  };
}

export function markVisited(profile: Profile, placeId: string): Profile {
  if (profile.visited_places.includes(placeId)) return profile;
  return { ...profile, visited_places: [placeId, ...profile.visited_places].slice(0, 30) };
}

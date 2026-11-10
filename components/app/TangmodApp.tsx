"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/data/schemas";
import { emptyProfile, type ChatTurn, type FeedbackReason, type Profile, type ValidatedAnswer } from "@/lib/ai/schema";
import { sendFeedback, streamChat } from "@/lib/client/chat-client";
import { authClient, devLogin } from "@/lib/client/auth-client";
import {
  localHistoryStore,
  moveLocalHistoryToServer,
  serverHistoryStore,
  titleOf,
  type ConversationMeta,
} from "@/lib/client/history-store";
import type { AuthOptions } from "@/lib/auth-options";
import { applyAnswer, clearProfile, loadProfile, markVisited, saveProfile } from "@/lib/client/profile-store";
import type { MapHighlight } from "@/components/map/CampusMap";
import { ChatColumn } from "@/components/chat/ChatColumn";
import { hasContent, type ThreadItem } from "@/components/chat/types";
import { CompassScreen } from "@/components/compass/CompassScreen";
import { trapTab } from "@/components/ui/trap-tab";
import { UndoToast, type Undo } from "@/components/ui/UndoToast";
import { compassPlaceIds, compassSummary, programName, type CompassResult } from "@/lib/compass";
import { BottomSheet, detentHeight, useElementHeight, useIsDesktop, useIsWide, type Detent } from "./BottomSheet";
import { MapPanel } from "./MapPanel";
import { SettingsDialog } from "./SettingsDialog";
import { Sidebar, type AccountProps } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CalendarScreen } from "@/components/calendar/CalendarScreen";
import { navigate } from "@/lib/client/nav";
import { setPrefs, usePrefs } from "@/lib/client/prefs";
import { usePathname } from "next/navigation";
import { useTimetable } from "@/lib/client/timetable-store";

/*
 * ทางมด v3: แชทก่อน แผนที่เป็นตัวช่วย
 *   คอม   = ประวัติแชทซ้าย | แชทกลาง | แผนที่ขวา (ซ่อนไว้ เปิดเองเมื่อคำตอบต้องใช้ หรือกดปุ่ม "แผนที่")
 *   มือถือ = แชทเต็มจอ · เปิดแผนที่แล้วแผนที่อยู่บน แชทถูกดันลงเป็น bottom sheet
 */

let seq = 0;
const nextId = () => `m${Date.now().toString(36)}${++seq}`;

const toHighlights = (answer: ValidatedAnswer): MapHighlight[] => answer.places.map((p, n) => ({ placeId: p.place_id, n: n + 1 }));

export function TangmodApp({ authOptions }: { authOptions: AuthOptions }) {
  // แชทกับปฏิทินอยู่ในแอปเดียวกัน (แถบซ้ายไม่หาย) เลือกหน้าจาก path ซึ่งเปลี่ยนด้วย navigate() แบบไม่โหลดใหม่
  const pathname = usePathname();
  const view: "chat" | "calendar" | "compass" = pathname === "/calendar" ? "calendar" : pathname === "/compass" ? "compass" : "chat";
  // สลับหน้าด้วย pushState ไม่ได้โหลดหน้าใหม่ ชื่อแท็บจึงต้องเปลี่ยนเอง
  useEffect(() => {
    document.title =
      view === "calendar" ? "ปฏิทินนักศึกษา · ทางมด" : view === "compass" ? "เข็มทิศสาขา · ทางมด" : "ทางมด · ถามน้องมดได้ทุกเรื่องในบางมด";
  }, [view]);
  const session = authClient.useSession();
  // ตารางเรียนจากหน้าปฏิทิน ส่งไปกับคำถาม มดจะตอบ "พรุ่งนี้เรียนอะไร" ได้
  const { timetable } = useTimetable();
  const user = session.data?.user ?? null;
  const userId = user?.id ?? null;
  // login แล้วเก็บในบัญชี (ทุกเครื่อง) · ยังไม่ login เก็บในเครื่องนี้
  const store = userId ? serverHistoryStore : localHistoryStore;
  const [authBusy, setAuthBusy] = useState(false);
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [listedAt, setListedAt] = useState(0);
  const [pending, setPending] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [mapOpen, setMapOpen] = useState(false);
  // แผนที่เต็มจอ: ซ่อนแชทชั่วคราว (แชทยัง mount อยู่ข้างหลัง ข้อความที่พิมพ์ค้างไม่หาย)
  const [mapFullWanted, setMapFull] = useState(false);
  const mapFull = mapOpen && mapFullWanted;
  useEffect(() => {
    if (!mapFull) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMapFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapFull]);
  const [highlights, setHighlights] = useState<MapHighlight[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detent, setDetent] = useState<Detent>("half");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // ปิด drawer แล้วให้ focus กลับไปที่ปุ่ม ☰ ที่เปิด ไม่งั้นปุ่มใน drawer หายไปแล้ว focus หลุดไปที่ body
  // ข้ามถ้า focus ย้ายไปที่อื่นแล้ว (เช่น กดเข็มทิศใน drawer แล้ว dialog เข็มทิศรับ focus ไป)
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerOpener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (drawerOpen) return;
    const opener = drawerOpener.current;
    drawerOpener.current = null;
    const active = document.activeElement;
    if (opener && (!active || active === document.body || drawerRef.current?.contains(active))) opener.focus();
  }, [drawerOpen]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prefs = usePrefs();
  const abortRef = useRef<AbortController | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const areaHeight = useElementHeight(areaRef);
  const isDesktop = useIsDesktop();
  const isMobile = !isDesktop;
  const isWide = useIsWide();
  const sheetMode = isMobile && mapOpen;
  // ระดับ full คลุมแผนที่ไว้ ให้แผนที่คงขนาดแบบ half จะได้ไม่ซูมใหม่ทุกครั้งที่ขยายอ่าน
  const mapDetent: Detent = detent === "full" ? "half" : detent;

  const refreshList = async () => {
    try {
      const list = await store.list();
      setConversations(list);
      setListedAt(Date.now());
    } catch {
      // server ล่มชั่วคราว: คงรายการเดิมไว้ แชทยังใช้ต่อได้
    }
  };

  // โหลดความจำหลัง hydrate (localStorage ไม่มีฝั่ง server)
  useEffect(() => {
    const stored = loadProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync ครั้งเดียวจาก localStorage ซึ่งเป็น external store
    setProfile(stored);
  }, []);

  // โหลดประวัติเมื่อรู้แล้วว่า login หรือไม่ · login ครั้งแรกบนเครื่องนี้ = ย้ายแชทในเครื่องขึ้นบัญชีก่อน
  useEffect(() => {
    if (session.isPending) return;
    let cancelled = false;
    void (async () => {
      if (userId) await moveLocalHistoryToServer().catch(() => 0);
      const list = await store.list().catch(() => null);
      if (cancelled || !list) return;
      setConversations(list);
      setListedAt(Date.now());
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, session.isPending, store]);

  // thread ล่าสุดที่บันทึกแล้ว (หรือเพิ่งโหลดจากประวัติ) — ใช้แยก "มีข้อความใหม่" ออกจาก "แค่เปิดดูแชทเก่า"
  const savedThread = useRef<ThreadItem[] | null>(null);

  // บันทึกแชทเมื่อคำตอบจบ (ไม่บันทึกระหว่างที่ข้อความยังไหล)
  // เปิดแชทเก่าเฉย ๆ ห้ามบันทึกซ้ำ ไม่งั้น updatedAt เปลี่ยนแล้วแชทนั้นกระโดดไปบนสุดของรายการ
  useEffect(() => {
    if (pending || !convId || !hasContent(thread) || thread === savedThread.current) return;
    savedThread.current = thread;
    void store
      .save({ id: convId, title: titleOf(thread), updatedAt: Date.now(), thread })
      .then(() => store.list())
      .then((list) => {
        setConversations(list);
        setListedAt(Date.now());
      })
      .catch(() => {});
  }, [pending, convId, thread, store]);

  const updateProfile = (fn: (p: Profile) => Profile) => {
    setProfile((prev) => {
      const next = fn(prev);
      if (next !== prev) saveProfile(next);
      return next;
    });
  };

  const last = thread.at(-1);
  const chips =
    last?.kind === "assistant" && last.answer
      ? last.answer.chips
      : last?.kind === "compass"
        ? compassChips(last.results)
        : [];

  const openMap = (focus: MapHighlight[], select: string | null = null) => {
    setHighlights(focus);
    setSelectedId(select);
    setMapOpen(true);
    if (isMobile && detent === "full") setDetent("half");
  };

  const ask = async (text: string, priorThread: ThreadItem[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!convId) setConvId(crypto.randomUUID());

    const history: ChatTurn[] = priorThread
      .flatMap((item): ChatTurn[] => {
        if (item.kind === "user") return [{ role: "user", text: item.text }];
        // ผลเข็มทิศส่งเป็นข้อความสรุป ผู้ใช้จะได้ถามต่อ เช่น "ทำไม CS ได้คะแนนสูงสุด"
        if (item.kind === "compass") return [{ role: "assistant", text: compassSummary(item.results) }];
        if (item.answer) return [{ role: "assistant", text: item.answer.message }];
        return [];
      })
      .slice(-8);

    const replyId = nextId();
    setThread([...priorThread, { kind: "user", id: nextId(), text }, { kind: "assistant", id: replyId, status: "streaming" }]);
    setPending(true);
    setSelectedId(null);
    if (isMobile && detent === "peek") setDetent("half");

    type Assistant = Extract<ThreadItem, { kind: "assistant" }>;
    const patch = (changes: Partial<Assistant>) =>
      setThread((t) => t.map((item) => (item.id === replyId && item.kind === "assistant" ? { ...item, ...changes } : item)));

    try {
      await streamChat(
        { history, message: text, profile, timetable: timetable ?? undefined },
        (event) => {
          if (event.type === "partial") patch({ partial: event.data });
          else if (event.type === "reset") patch({ partial: undefined });
          else if (event.type === "final") {
            patch({ answer: event.data, status: "done", model: event.model });
            updateProfile((p) => applyAnswer(p, event.data));
            // แผนที่เป็นตัวช่วย: เปิดเองเฉพาะคำตอบที่ server บอกว่าควรเห็นตำแหน่ง ปิดเองไม่ได้ (ผู้ใช้ปิด)
            if (event.data.show_map) openMap(toHighlights(event.data));
          } else patch({ status: "error", error: event.message });
        },
        controller.signal,
      );
    } catch {
      if (!controller.signal.aborted) patch({ status: "error", error: "คำตอบขาดกลางทาง ลองใหม่อีกครั้งนะ" });
    } finally {
      if (abortRef.current === controller) setPending(false);
    }
  };

  const send = (text: string) => void ask(text, thread);

  const retry = () => {
    const idx = thread.findLastIndex((i) => i.kind === "user");
    if (idx < 0 || pending) return;
    const question = thread[idx] as Extract<ThreadItem, { kind: "user" }>;
    void ask(question.text, thread.slice(0, idx));
  };

  // ตอบไม่ตรง: ส่งคำถามที่อยู่ก่อนคำตอบนั้น พร้อมสิ่งที่มดตอบไป
  const feedback = (assistantId: string, reason: FeedbackReason) => {
    const idx = thread.findIndex((i) => i.id === assistantId);
    const item = thread[idx];
    const question = thread.slice(0, idx).findLast((i) => i.kind === "user");
    if (item?.kind !== "assistant" || !item.answer || question?.kind !== "user") return;
    sendFeedback({
      question: question.text.slice(0, 500),
      answer: item.answer.message.slice(0, 3000),
      model: item.model,
      reason,
      place_ids: item.answer.places.map((p) => p.place_id),
      card_ids: item.answer.cards.flatMap((c) => c.ids).slice(0, 8),
    });
  };

  // กดชื่อสถานที่ในคำตอบ: เปิดแผนที่พร้อมหมุดทั้งชุดของคำตอบนั้น แล้วเลือกที่ที่กด
  const showPlace = (placeId: string) => {
    const answer = thread.findLast(
      (i): i is Extract<ThreadItem, { kind: "assistant" }> => i.kind === "assistant" && !!i.answer?.places.some((p) => p.place_id === placeId),
    )?.answer;
    openMap(answer ? toHighlights(answer) : [{ placeId, n: 1 }], placeId);
    updateProfile((p) => markVisited(p, placeId));
    if (isMobile) setDetent("peek");
  };

  const selectPlaceOnMap = (placeId: string) => {
    setSelectedId(placeId);
    updateProfile((p) => markVisited(p, placeId));
    if (isMobile) setDetent("peek");
  };

  const askAboutPlace = (place: Place) => {
    setSelectedId(null);
    send(`${place.short ?? place.name_th} (${place.id}) มีอะไรบ้าง เปิดกี่โมง`);
  };

  // เข็มทิศสาขา (หน้า /compass): จดสาขาอันดับต้นไว้ในความจำของมด จะได้ตอบต่อเนื่องในแชท
  const compassFinished = (results: CompassResult[]) => {
    const top = results.slice(0, 2).map((r) => programName(r.programId));
    updateProfile((p) => ({ ...p, considering_programs: [...new Set([...top, ...p.considering_programs])].slice(0, 8) }));
  };

  // ถามมดจากหน้าเข็มทิศ: เปิดแชทใหม่ที่มีการ์ดผลเข็มทิศนำหน้า (มดจะได้รู้ผล) แล้วส่งคำถาม
  const askFromCompass = (text: string, results: CompassResult[] | null) => {
    navigate("/");
    abortRef.current?.abort();
    setPending(false);
    setConvId(crypto.randomUUID());
    setSelectedId(null);
    const prior: ThreadItem[] = results ? [{ kind: "compass", id: nextId(), results }] : [];
    if (results) openMap(compassHighlights(results));
    else setMapOpen(false);
    void ask(text, prior);
  };

  const showCompassMap = (placeIds: string[]) => {
    navigate("/");
    openMap(placeIds.map((placeId, i) => ({ placeId, n: i + 1 })));
  };

  const newChat = () => {
    abortRef.current?.abort();
    setPending(false);
    setThread([]);
    setConvId(null);
    setMapOpen(false);
    setHighlights([]);
    setSelectedId(null);
    setDetent("half");
    setDrawerOpen(false);
  };

  const openConversation = async (id: string) => {
    setDrawerOpen(false);
    if (id === convId) return;
    const c = await store.get(id).catch(() => null);
    if (!c) return;
    abortRef.current?.abort();
    setPending(false);
    savedThread.current = c.thread;
    setThread(c.thread);
    setConvId(c.id);
    setSelectedId(null);
    const lastAnswer = c.thread.findLast((i): i is Extract<ThreadItem, { kind: "assistant" }> => i.kind === "assistant" && !!i.answer)?.answer;
    const lastItem = c.thread.at(-1);
    if (lastItem?.kind === "compass") openMap(compassHighlights(lastItem.results));
    else if (lastAnswer?.show_map) openMap(toHighlights(lastAnswer));
    else {
      setMapOpen(false);
      setHighlights([]);
    }
  };

  // ลบทันทีแล้วให้เลิกทำได้ใน toast (ปุ่มลบอยู่ติดแถวประวัติ กดพลาดง่ายบนมือถือ)
  const [toast, setToast] = useState<Undo | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const deleteConversation = async (id: string) => {
    const removed = await store.get(id).catch(() => null);
    await store.remove(id).catch(() => {});
    await refreshList();
    if (id === convId) newChat();
    if (removed) {
      setToast({
        id: Date.now(),
        message: "ลบแชทแล้ว",
        undo: () => void store.save(removed).then(refreshList, () => {}),
      });
    }
  };

  const forgetProfile = () => {
    const previous = profile;
    clearProfile();
    setProfile(emptyProfile());
    setToast({
      id: Date.now(),
      message: "มดลืมสิ่งที่จำไว้แล้ว",
      undo: () => {
        saveProfile(previous);
        setProfile(previous);
      },
    });
  };

  const signInGoogle = () => {
    setAuthBusy(true);
    void authClient.signIn.social({ provider: "google", callbackURL: "/" }).catch(() => setAuthBusy(false));
  };
  const signInDev = async () => {
    setAuthBusy(true);
    try {
      await devLogin();
      await session.refetch();
    } finally {
      setAuthBusy(false);
    }
  };
  const signOut = async () => {
    setAuthBusy(true);
    try {
      await authClient.signOut();
      newChat(); // แชทที่เปิดอยู่เป็นของบัญชี ไม่ควรค้างบนจอหลัง logout
    } finally {
      setAuthBusy(false);
    }
  };

  // ลบบัญชี: ยืนยันก่อนเสมอ ลบแล้วประวัติแชทบน server หายตาม (FK cascade)
  const deleteAccount = async () => {
    const ok = window.confirm(
      "ลบบัญชีทางมดและประวัติแชททั้งหมดในบัญชีนี้?\n\nลบแล้วกู้คืนไม่ได้ (บัญชี Google ของคุณไม่ได้รับผลกระทบ)",
    );
    if (!ok) return;
    setAuthBusy(true);
    try {
      const { error } = await authClient.deleteUser({ callbackURL: "/" });
      if (error) {
        window.alert(
          error.code === "SESSION_EXPIRED"
            ? "เพื่อความปลอดภัย กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนลบบัญชี"
            : "ลบบัญชีไม่สำเร็จ ลองใหม่อีกครั้งนะ",
        );
        return;
      }
      newChat();
      await session.refetch();
    } finally {
      setAuthBusy(false);
    }
  };

  const account: AccountProps = {
    user: user && { name: user.name, email: user.email, image: user.image ?? null },
    loading: session.isPending,
    busy: authBusy,
    options: authOptions,
    onSignInGoogle: signInGoogle,
    onSignInDev: () => void signInDev(),
    onSignOut: () => void signOut(),
    onDeleteAccount: () => void deleteAccount(),
  };

  // drawer มือถือส่ง onClose มา (ไม่มีปุ่มพับ) · แถบซ้ายบนคอมพับได้
  const sidebar = (onClose?: () => void) => (
    <Sidebar
      conversations={conversations}
      currentId={convId}
      listedAt={listedAt}
      account={account}
      view={view}
      onNew={() => {
        navigate("/");
        newChat();
      }}
      onOpenCompass={() => {
        setDrawerOpen(false);
        navigate("/compass");
      }}
      onOpenCalendar={() => {
        setDrawerOpen(false);
        navigate("/calendar");
      }}
      onOpen={(id) => {
        navigate("/");
        void openConversation(id);
      }}
      onDelete={(id) => void deleteConversation(id)}
      onOpenSettings={() => {
        setDrawerOpen(false);
        setSettingsOpen(true);
      }}
      onClose={onClose}
      collapsed={!onClose && prefs.sidebarCollapsed}
      onToggleCollapse={onClose ? undefined : () => setPrefs({ sidebarCollapsed: !prefs.sidebarCollapsed })}
    />
  );

  const sheetPx = sheetMode && areaHeight ? detentHeight(mapDetent, areaHeight) : 0;

  return (
    // reducedMotion="user": ผู้ใช้ที่ตั้งลดการเคลื่อนไหวในเครื่อง จะไม่เห็นแอนิเมชันของ motion ทั้งแอป
    // ตั้ง "ลดภาพเคลื่อนไหว" ในการตั้งค่าของทางมด = ปิดเสมอ
    <MotionConfig reducedMotion={prefs.reduceMotion ? "always" : "user"}>
    <div className="flex h-svh overflow-hidden bg-paper">
      <a href="#chat-input" className="sr-only rounded-md bg-ink px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]">
        ข้ามไปช่องพิมพ์คำถาม
      </a>
      {/* จอ 1024–1279 ตอนเปิดแผนที่: ซ่อน sidebar ให้แชทกว้างพอ (ไม่งั้นเหลือ ~300px) ประวัติแชทเปิดเป็น drawer แทน
          ใช้ class ไม่ใช่ isWide เพื่อให้ HTML จาก server ตรงกับหน้าจอตั้งแต่แรก */}
      <aside inert={mapFull} className={`hidden shrink-0 border-r border-line transition-[width] duration-200 ${prefs.sidebarCollapsed ? "w-[72px]" : "w-[272px]"} ${mapOpen && view === "chat" ? "xl:flex" : "lg:flex"}`}>{sidebar()}</aside>

      {/* มือถือ (และจอกลางตอนเปิดแผนที่): ประวัติแชทเป็น drawer จากซ้าย */}
      <AnimatePresence>
        {drawerOpen && (isMobile || (mapOpen && view === "chat" && !isWide)) && (
          <motion.div
            ref={drawerRef}
            className={`fixed inset-0 z-40 ${mapOpen && view === "chat" ? "xl:hidden" : "lg:hidden"}`}
            role="dialog"
            aria-modal="true"
            aria-label="เมนู"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setDrawerOpen(false);
              else trapTab(e);
            }}
          >
            <button type="button" aria-label="ปิดเมนู" className="absolute inset-0 bg-ink/30" onClick={() => setDrawerOpen(false)} />
            <motion.div
              className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] shadow-xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              {sidebar(() => setDrawerOpen(false))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* หน้าปฏิทินและเข็มทิศมี h1 ของตัวเอง */}
        {view === "chat" && <h1 className="sr-only">ทางมด — ผู้ช่วยแชทประจำแคมปัส มจธ. บางมด</h1>}
        {/* หน้าปฏิทินบนจอใหญ่ไม่ต้องมีแถบบน (หัวหน้ามี breadcrumb และชื่อหน้าแล้ว) มือถือยังต้องใช้ปุ่มเมนู */}
        <div inert={mapFull} className={view === "chat" ? "contents" : "contents lg:hidden"}>
        <TopBar
          title={view === "calendar" ? "ปฏิทินนักศึกษา" : view === "compass" ? "เข็มทิศสาขา" : convId ? titleOf(thread) : null}
          mapOpen={mapOpen && view === "chat"}
          showMap={view === "chat"}
          onToggleMap={() => {
            setMapFull(false);
            if (mapOpen) setMapOpen(false);
            else openMap(highlights);
          }}
          onOpenHistory={() => {
            drawerOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setDrawerOpen(true);
          }}
          onNew={() => {
            navigate("/");
            newChat();
          }}
        />
        </div>
        {view === "calendar" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CalendarScreen />
          </div>
        )}
        {view === "compass" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CompassScreen onAsk={askFromCompass} onShowMap={showCompassMap} onFinished={compassFinished} />
          </div>
        )}
        {/* หน้าปฏิทินและเข็มทิศ: ซ่อนแชทไว้แต่ไม่ถอดออก ข้อความที่พิมพ์ค้างและแผนที่ยังอยู่เมื่อกลับมา */}
        <div ref={areaRef} className={`relative min-h-0 flex-1 ${view === "chat" ? "flex" : "hidden"}`}>
          <div inert={mapFull} className="contents">
          <BottomSheet mode={sheetMode ? "sheet" : "full"} detent={detent} onDetentChange={setDetent} areaHeight={areaHeight}>
            <ChatColumn
              thread={thread}
              chips={chips}
              pending={pending}
              compact={sheetMode && detent === "peek"}
              inSheet={sheetMode}
              onInputFocus={() => sheetMode && detent === "peek" && setDetent("half")}
              onSend={send}
              onShowPlace={showPlace}
              onRetry={retry}
              onFeedback={feedback}
              onOpenCompass={() => navigate("/compass")}
              onCompassMap={(results) => openMap(compassHighlights(results))}
            />
          </BottomSheet>
          </div>

          {mapOpen && (
            <motion.div
              // คอม: เลื่อนเข้ามาจากขวาด้วย transform (ไม่เปลี่ยนขนาด แผนที่จะได้ซูมถูกตั้งแต่แรก)
              initial={{ opacity: 0, x: isDesktop ? 24 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
              style={sheetMode && !mapFull ? { height: Math.max(0, areaHeight - sheetPx + 16) } : undefined}
              className={
                mapFull
                  ? "fixed inset-0 z-30"
                  : "max-lg:absolute max-lg:inset-x-0 max-lg:top-0 lg:relative lg:min-w-[480px] lg:basis-[44%] lg:border-l lg:border-line"
              }
            >
              <MapPanel
                highlights={highlights}
                selectedId={selectedId}
                onSelect={selectPlaceOnMap}
                onCloseCard={() => setSelectedId(null)}
                onAskPlace={(place) => {
                  setMapFull(false);
                  askAboutPlace(place);
                }}
                onClose={() => {
                  setMapFull(false);
                  setMapOpen(false);
                }}
                refitKey={`${isMobile ? mapDetent : "desktop"}${mapFull ? "-full" : ""}`}
                full={mapFull}
                onToggleFull={() => setMapFull((v) => !v)}
              />
            </motion.div>
          )}
        </div>
      </main>

      <UndoToast toast={toast} onDone={clearToast} />
      <AnimatePresence>
        {settingsOpen && <SettingsDialog account={account} profile={profile} onForget={forgetProfile} onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}

/** ตึกคณะของสาขาเรียงตามอันดับที่ดีที่สุดของตึกนั้น (IT/CS/DSI อยู่ N11 ตึกเดียวกัน) */
function compassHighlights(results: CompassResult[]): MapHighlight[] {
  return compassPlaceIds(results).map((placeId, i) => ({ placeId, n: i + 1 }));
}

function compassChips(results: CompassResult[]): string[] {
  const [a, b] = results.map((r) => programName(r.programId));
  return [`เล่าเรื่อง ${a} ให้ฟังหน่อย`, `${a} กับ ${b} ต่างกันยังไง`, "ทำไม " + a + " ได้คะแนนสูงสุด"];
}

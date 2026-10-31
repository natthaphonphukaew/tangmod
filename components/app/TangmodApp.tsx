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
import { CompassDialog } from "@/components/compass/CompassDialog";
import { trapTab } from "@/components/ui/trap-tab";
import { UndoToast, type Undo } from "@/components/ui/UndoToast";
import { programById } from "@/lib/data";
import { compassSummary, scoreCompass, type CompassAnswers, type CompassResult } from "@/lib/compass";
import { BottomSheet, detentHeight, useElementHeight, useIsDesktop, useIsWide, type Detent } from "./BottomSheet";
import { MapPanel } from "./MapPanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/*
 * ทางมด v3: แชทก่อน แผนที่เป็นตัวช่วย
 *   คอม   = ประวัติแชทซ้าย | แชทกลาง | แผนที่ขวา (ซ่อนไว้ เปิดเองเมื่อคำตอบต้องใช้ หรือกดปุ่ม "แผนที่")
 *   มือถือ = แชทเต็มจอ · เปิดแผนที่แล้วแผนที่อยู่บน แชทถูกดันลงเป็น bottom sheet
 */

let seq = 0;
const nextId = () => `m${Date.now().toString(36)}${++seq}`;

const toHighlights = (answer: ValidatedAnswer): MapHighlight[] => answer.places.map((p, n) => ({ placeId: p.place_id, n: n + 1 }));

export function TangmodApp({ authOptions }: { authOptions: AuthOptions }) {
  const session = authClient.useSession();
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
  const [compassOpen, setCompassOpen] = useState(false);
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
        { history, message: text, profile },
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

  // เข็มทิศสาขา: คิดผลในเครื่อง ใส่การ์ดผลลงแชท จดสาขาอันดับต้นไว้ในความจำ แล้วให้ตึกคณะเรืองตามอันดับบนแผนที่
  const finishCompass = (answers: CompassAnswers) => {
    setCompassOpen(false);
    const results = scoreCompass(answers);
    if (!convId) setConvId(crypto.randomUUID());
    setThread((t) => [...t, { kind: "compass", id: nextId(), answers, results }]);
    const top = results.slice(0, 2).map((r) => r.programId);
    updateProfile((p) => ({ ...p, considering_programs: [...new Set([...top, ...p.considering_programs])].slice(0, 8) }));
    openMap(compassHighlights(results));
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

  const sidebar = (onClose?: () => void) => (
    <Sidebar
      conversations={conversations}
      currentId={convId}
      listedAt={listedAt}
      profile={profile}
      account={{
        user: user && { name: user.name, email: user.email, image: user.image ?? null },
        loading: session.isPending,
        busy: authBusy,
        options: authOptions,
        onSignInGoogle: signInGoogle,
        onSignInDev: () => void signInDev(),
        onSignOut: () => void signOut(),
        onDeleteAccount: () => void deleteAccount(),
      }}
      onNew={newChat}
      onOpenCompass={() => {
        setDrawerOpen(false);
        setCompassOpen(true);
      }}
      onOpen={(id) => void openConversation(id)}
      onDelete={(id) => void deleteConversation(id)}
      onForget={forgetProfile}
      onClose={onClose}
    />
  );

  const sheetPx = sheetMode && areaHeight ? detentHeight(mapDetent, areaHeight) : 0;

  return (
    // reducedMotion="user": ผู้ใช้ที่ตั้งลดการเคลื่อนไหวในเครื่อง จะไม่เห็นแอนิเมชันของ motion ทั้งแอป
    <MotionConfig reducedMotion="user">
    <div className="flex h-svh overflow-hidden bg-paper">
      <a href="#chat-input" className="sr-only rounded-md bg-ink px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]">
        ข้ามไปช่องพิมพ์คำถาม
      </a>
      {/* จอ 1024–1279 ตอนเปิดแผนที่: ซ่อน sidebar ให้แชทกว้างพอ (ไม่งั้นเหลือ ~300px) ประวัติแชทเปิดเป็น drawer แทน
          ใช้ class ไม่ใช่ isWide เพื่อให้ HTML จาก server ตรงกับหน้าจอตั้งแต่แรก */}
      <aside className={`hidden w-[272px] shrink-0 border-r border-line ${mapOpen ? "xl:flex" : "lg:flex"}`}>{sidebar()}</aside>

      {/* มือถือ (และจอกลางตอนเปิดแผนที่): ประวัติแชทเป็น drawer จากซ้าย */}
      <AnimatePresence>
        {drawerOpen && (isMobile || (mapOpen && !isWide)) && (
          <motion.div
            ref={drawerRef}
            className={`fixed inset-0 z-40 ${mapOpen ? "xl:hidden" : "lg:hidden"}`}
            role="dialog"
            aria-modal="true"
            aria-label="ประวัติแชท"
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
        <h1 className="sr-only">ทางมด — ผู้ช่วยแชทประจำแคมปัส มจธ. บางมด</h1>
        <TopBar
          title={convId ? titleOf(thread) : null}
          mapOpen={mapOpen}
          onToggleMap={() => (mapOpen ? setMapOpen(false) : openMap(highlights))}
          onOpenHistory={() => {
            drawerOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setDrawerOpen(true);
          }}
          onNew={newChat}
        />
        <div ref={areaRef} className="relative flex min-h-0 flex-1">
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
              onOpenCompass={() => setCompassOpen(true)}
              onCompassMap={(results) => openMap(compassHighlights(results))}
            />
          </BottomSheet>

          {mapOpen && (
            <motion.div
              // คอม: เลื่อนเข้ามาจากขวาด้วย transform (ไม่เปลี่ยนขนาด แผนที่จะได้ซูมถูกตั้งแต่แรก)
              initial={{ opacity: 0, x: isDesktop ? 24 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
              style={sheetMode ? { height: Math.max(0, areaHeight - sheetPx + 16) } : undefined}
              className="max-lg:absolute max-lg:inset-x-0 max-lg:top-0 lg:relative lg:min-w-[480px] lg:basis-[44%] lg:border-l lg:border-line"
            >
              <MapPanel
                highlights={highlights}
                selectedId={selectedId}
                onSelect={selectPlaceOnMap}
                onCloseCard={() => setSelectedId(null)}
                onAskPlace={askAboutPlace}
                onClose={() => setMapOpen(false)}
                refitKey={isMobile ? mapDetent : "desktop"}
              />
            </motion.div>
          )}
        </div>
      </main>

      <UndoToast toast={toast} onDone={clearToast} />
      <CompassDialog open={compassOpen} onClose={() => setCompassOpen(false)} onDone={finishCompass} />
    </div>
    </MotionConfig>
  );
}

/** ตึกคณะของสาขาเรียงตามอันดับที่ดีที่สุดของตึกนั้น (IT/CS/DSI อยู่ N11 ตึกเดียวกัน) */
function compassHighlights(results: CompassResult[]): MapHighlight[] {
  const placeIds = [...new Set(results.map((r) => programById.get(r.programId)?.place_id).filter((id): id is string => !!id))];
  return placeIds.map((placeId, i) => ({ placeId, n: i + 1 }));
}

function compassChips(results: CompassResult[]): string[] {
  const [a, b] = results.map((r) => programById.get(r.programId)?.short ?? r.programId);
  return [`เล่าเรื่อง ${a} ให้ฟังหน่อย`, `${a} กับ ${b} ต่างกันยังไง`, "ทำไม " + a + " ได้คะแนนสูงสุด"];
}

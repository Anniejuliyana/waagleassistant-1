"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import Hero from "@/components/Hero";
import MessageBubble from "@/components/MessageBubble";
import Composer from "@/components/Composer";
import { useChatStream, toHistory } from "@/lib/useChatStream";
import { loadConversations, saveConversations, getStoredTheme, setStoredTheme, newId } from "@/lib/storage";
import type { Conversation, Message } from "@/lib/types";

function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 42 ? trimmed.slice(0, 42) + "…" : trimmed;
}

function emptyConversation(): Conversation {
  const now = Date.now();
  return { id: newId(), title: "", messages: [], createdAt: now, updatedAt: now };
}

export default function Page() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { send, stop, isStreaming } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUserQueryRef = useRef<string>("");

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    setActiveId(stored[0]?.id ?? null);
    const storedTheme = getStoredTheme();
    const initialTheme =
      storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initialTheme);
    setHydrated(true);
  }, []);

  // Persist conversations + reflect theme on <html>.
  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversations, activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  function updateActive(mutator: (c: Conversation) => Conversation) {
    setConversations((prev) => {
      if (!activeId) return prev;
      const exists = prev.some((c) => c.id === activeId);
      if (!exists) return prev;
      return prev.map((c) => (c.id === activeId ? mutator(c) : c));
    });
  }

  function ensureConversation(): string {
    if (activeId && conversations.some((c) => c.id === activeId)) return activeId;
    const fresh = emptyConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    return fresh.id;
  }

  async function runAssistant(convoId: string, history: Message[]) {
    const assistantMsg: Message = {
      id: newId(),
      role: "assistant",
      content: "",
      pending: true,
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === convoId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
    );

    let text = "";
    await send(toHistory(history), {
      onTextDelta: (delta) => {
        text += delta;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: text, pending: false } : m
                  ),
                }
              : c
          )
        );
      },
      onMeta: (meta) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          citations: meta.citations ?? m.citations,
                          verdict: meta.verdict ?? m.verdict,
                          intent: meta.intent ?? m.intent,
                          emergency: meta.emergency ?? m.emergency,
                        }
                      : m
                  ),
                }
              : c
          )
        );
      },
      onDone: () => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false } : m)),
                }
              : c
          )
        );
      },
      onError: (err) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, pending: false, content: `Sorry — something went wrong: ${err}` }
                      : m
                  ),
                }
              : c
          )
        );
      },
    });
  }

  function handleSend(text: string) {
    const convoId = ensureConversation();
    lastUserQueryRef.current = text;
    const userMsg: Message = { id: newId(), role: "user", content: text };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? {
              ...c,
              title: c.title || titleFromFirstMessage(text),
              messages: [...c.messages, userMsg],
              updatedAt: Date.now(),
            }
          : c
      )
    );

    const convoNow = conversations.find((c) => c.id === convoId);
    const historyForRequest = [...(convoNow?.messages ?? []), userMsg];
    runAssistant(convoId, historyForRequest);
  }

  function handleRegenerate(messageId: string) {
    if (!active) return;
    const idx = active.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    const trimmed = active.messages.slice(0, idx);
    updateActive((c) => ({ ...c, messages: trimmed }));
    runAssistant(active.id, trimmed);
  }

  function handleFeedback(messageId: string, fb: "up" | "down") {
    updateActive((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === messageId ? { ...m, feedback: m.feedback === fb ? null : fb } : m)),
    }));
  }

  function handleNewConversation() {
    const fresh = emptyConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setSidebarOpen(false);
  }

  function handleDeleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  const showHero = !active || active.messages.length === 0;

  return (
    <div className="flex h-dvh flex-col hero-gradient">
      <TopBar
        theme={theme}
        onToggleTheme={() => {
          const next = theme === "dark" ? "light" : "dark";
          setTheme(next);
          setStoredTheme(next);
        }}
        onNewConversation={handleNewConversation}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          open={sidebarOpen}
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setSidebarOpen(false);
          }}
          onDelete={handleDeleteConversation}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex min-h-0 flex-1 flex-col">
          {showHero ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <Hero onPrompt={handleSend} />
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                <AnimatePresence initial={false}>
                  {active?.messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      onRegenerate={m.role === "assistant" && !m.pending ? () => handleRegenerate(m.id) : undefined}
                      onFeedback={m.role === "assistant" && !m.pending ? (fb) => handleFeedback(m.id, fb) : undefined}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="mx-auto w-full max-w-3xl px-0">
            <Composer onSend={handleSend} disabled={isStreaming} onStop={stop} isStreaming={isStreaming} />
          </div>
        </main>
      </div>
    </div>
  );
}

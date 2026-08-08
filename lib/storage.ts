import type { Conversation } from "./types";

const CONVERSATIONS_KEY = "waggle-conversations";
const THEME_KEY = "waggle-theme";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    /* storage full or unavailable — fail silently, in-memory state still works */
  }
}

export function getStoredTheme(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(THEME_KEY);
  return v === "dark" || v === "light" ? v : null;
}

export function setStoredTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
}

export function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

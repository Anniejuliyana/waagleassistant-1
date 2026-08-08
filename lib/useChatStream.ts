"use client";

import { useCallback, useRef, useState } from "react";
import type { Citation, Message } from "./types";

type StreamMeta = {
  citations?: Citation[];
  verdict?: "high" | "low";
  intent?: "company" | "general" | "ambiguous";
  emergency?: boolean;
};

/**
 * Minimal client for the Vercel AI SDK "data stream" wire protocol
 * (lines of `<code>:<json>\n`, code "0" = text delta, code "2" = data array).
 * Written by hand (rather than using `useChat`) so we have full control over
 * multi-conversation state and localStorage persistence.
 */
export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (
      history: { role: "user" | "assistant"; content: string }[],
      handlers: {
        onTextDelta: (delta: string) => void;
        onMeta: (meta: StreamMeta) => void;
        onDone: () => void;
        onError: (err: string) => void;
      }
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const idx = line.indexOf(":");
            if (idx === -1) continue;
            const code = line.slice(0, idx);
            const jsonStr = line.slice(idx + 1);
            try {
              const payload = JSON.parse(jsonStr);
              if (code === "0") {
                handlers.onTextDelta(String(payload));
              } else if (code === "2") {
                const arr = Array.isArray(payload) ? payload : [payload];
                for (const item of arr) {
                  if (item && typeof item === "object") handlers.onMeta(item as StreamMeta);
                }
              } else if (code === "3") {
                handlers.onError(String(payload));
              }
            } catch {
              /* ignore partial/malformed lines */
            }
          }
        }
        handlers.onDone();
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
        handlers.onError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, stop, isStreaming };
}

export function toHistory(messages: Message[]): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => !m.pending)
    .map((m) => ({ role: m.role, content: m.content }));
}

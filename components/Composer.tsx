"use client";

import { useRef, useState, type KeyboardEvent } from "react";

export default function Composer({
  onSend,
  disabled,
  onStop,
  isStreaming,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  onStop: () => void;
  isStreaming: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="sticky bottom-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-4 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl3 border border-border bg-surface/90 p-2 shadow-soft glass">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="Message Waggle Assistant"
          placeholder="Ask about your Waggle device, or any pet-care question…"
          className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted focus:outline-none"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="mb-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground transition-colors hover:bg-border"
            aria-label="Stop generating"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || disabled}
            className="mb-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:scale-105"
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted">
        Waggle Assistant can answer questions using our real Help Center content, and general pet-care knowledge. Always consult a vet for medical concerns.
      </p>
    </div>
  );
}

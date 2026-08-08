"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Conversation } from "@/lib/types";

function ConversationRow({
  conversation,
  active,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm transition-colors ${
        active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/70 hover:text-foreground"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {conversation.title || "New conversation"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete conversation: ${conversation.title}`}
        className="shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:bg-border group-hover:opacity-100"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default function Sidebar({
  open,
  conversations,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop, always-visible column */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/60 p-3 lg:flex lg:flex-col">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">History</p>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted">Your conversations in this browser will show up here.</p>
          )}
          {conversations.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              active={c.id === activeId}
              onSelect={() => onSelect(c.id)}
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-30 bg-black/40 lg:hidden"
              aria-hidden
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-surface p-3 shadow-soft lg:hidden"
              role="dialog"
              aria-label="Conversation history"
            >
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">History</p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close sidebar"
                  className="rounded-md p-1 text-muted hover:bg-surface-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1 overflow-y-auto">
                {conversations.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    onSelect={() => {
                      onSelect(c.id);
                      onClose();
                    }}
                    onDelete={() => onDelete(c.id)}
                  />
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

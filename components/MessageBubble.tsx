"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import type { Message } from "@/lib/types";
import SourceCardList from "@/components/SourceCard";
import ProductCard from "@/components/ProductCard";
import { findMentionedProducts } from "@/lib/products";
import TypingIndicator from "@/components/TypingIndicator";

function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition-colors hover:bg-surface-2 ${
        active ? "text-accent" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function MessageBubble({
  message,
  onRegenerate,
  onFeedback,
}: {
  message: Message;
  onRegenerate?: () => void;
  onFeedback?: (fb: "up" | "down") => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const products = !isUser ? findMentionedProducts(message.content) : [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[92%] sm:max-w-[78%] ${isUser ? "order-2" : ""}`}>
        {message.emergency && !isUser && (
          <div className="mb-2 rounded-xl2 border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] font-medium text-red-600 dark:text-red-300">
            Emergency guidance — please contact your vet or an emergency animal hospital immediately.
          </div>
        )}
        <div
          className={`rounded-xl3 px-4 py-3 shadow-soft ${
            isUser
              ? "bg-accent text-white"
              : "bg-surface border border-border text-foreground"
          }`}
        >
          {message.pending && !message.content ? (
            <TypingIndicator />
          ) : (
            <div className={`markdown-body text-[15px] leading-relaxed ${isUser ? "text-white" : ""}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && !message.pending && message.intent === "general" && message.content && (
          <p className="mt-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-leaf">
            General pet-care guidance — not Waggle-specific
          </p>
        )}

        {!isUser && !message.pending && message.citations && message.citations.length > 0 && (
          <SourceCardList citations={message.citations} />
        )}

        {!isUser && products.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {!isUser && !message.pending && message.content && (
          <div className="mt-1.5 flex items-center gap-1 px-1">
            <IconButton label={copied ? "Copied!" : "Copy message"} onClick={copy}>
              {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
            </IconButton>
            {onRegenerate && (
              <IconButton label="Regenerate response" onClick={onRegenerate}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0013.9 3.3M19.5 9A8 8 0 005.6 5.7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            )}
            {onFeedback && (
              <>
                <IconButton
                  label="Good response"
                  active={message.feedback === "up"}
                  onClick={() => onFeedback("up")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 22h2a2 2 0 002-2v-7a2 2 0 00-2-2H7v11zM7 11l3-7a2 2 0 012 2v3h5a2 2 0 012 2.2l-1.2 6A2 2 0 0116 19h-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </IconButton>
                <IconButton
                  label="Bad response"
                  active={message.feedback === "down"}
                  onClick={() => onFeedback("down")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" transform="rotate(180)">
                    <path
                      d="M7 22h2a2 2 0 002-2v-7a2 2 0 00-2-2H7v11zM7 11l3-7a2 2 0 012 2v3h5a2 2 0 012 2.2l-1.2 6A2 2 0 0116 19h-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </IconButton>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import type { Citation } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  Setup: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  Troubleshooting: "bg-red-500/10 text-red-600 dark:text-red-300",
  Shipping: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  Warranty: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Subscription: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Ordering: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  FAQ: "bg-accent/10 text-accent-dark dark:text-accent-light",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2" aria-label={`Confidence ${pct}%`}>
      <div className="h-1.5 w-16 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-leaf transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted tabular-nums">{pct}%</span>
    </div>
  );
}

export function SourceCard({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  const colorClass = CATEGORY_COLORS[citation.category] || CATEGORY_COLORS.FAQ;

  return (
    <div className="rounded-xl2 border border-border bg-surface/70 p-3 text-sm transition-shadow hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-accent underline-offset-2 hover:underline line-clamp-1"
          >
            {citation.title}
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClass}`}>
              {citation.category}
            </span>
            <ConfidenceBar value={citation.confidence} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Collapse excerpt" : "Expand excerpt"}
          className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted border-t border-border pt-2">
          {citation.excerpt}
        </p>
      )}
    </div>
  );
}

export default function SourceCardList({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {citations.map((c, i) => (
        <SourceCard key={`${c.url}-${i}`} citation={c} />
      ))}
    </div>
  );
}

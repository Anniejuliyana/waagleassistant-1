"use client";

export default function TopBar({
  theme,
  onToggleTheme,
  onNewConversation,
  onToggleSidebar,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNewConversation: () => void;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 glass border-b border-border">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle conversation history"
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 64 64" fill="#f2762e">
                <circle cx="32" cy="40" r="15" />
                <circle cx="14" cy="20" r="6.5" />
                <circle cx="50" cy="20" r="6.5" />
                <circle cx="6" cy="38" r="5.5" />
                <circle cx="58" cy="38" r="5.5" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Waggle Assistant</p>
              <p className="text-[11px] text-muted">Help Center + pet-care guidance</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNewConversation}
            className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 sm:flex"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New conversation
          </button>
          <button
            type="button"
            onClick={onNewConversation}
            aria-label="New conversation"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-surface-2 sm:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-2"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

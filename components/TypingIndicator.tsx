export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" role="status" aria-label="Waggle Assistant is typing">
      <span className="h-2 w-2 rounded-full bg-accent animate-blink" style={{ animationDelay: "0ms" }} />
      <span className="h-2 w-2 rounded-full bg-accent animate-blink" style={{ animationDelay: "160ms" }} />
      <span className="h-2 w-2 rounded-full bg-accent animate-blink" style={{ animationDelay: "320ms" }} />
    </div>
  );
}

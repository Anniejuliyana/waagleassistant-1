/**
 * Deterministic, zero-cost small-talk detector. Runs BEFORE retrieval and
 * before any LLM call so greetings/thanks/farewells/check-ins get an instant,
 * on-brand reply without wasting a retrieval pass or an API call.
 *
 * Deliberately conservative: only fires when the message looks like PURE
 * small talk (short, no substantive content). A message like
 * "hi, my dog is vomiting, what should I do?" must still fall through to
 * full retrieval/answering.
 */

export type SmallTalkKind = "greeting" | "thanks" | "farewell" | "how-are-you";

const GREETING_PATTERNS = [
  /^h(i+|ey+|ello+|owdy)$/,
  /^good\s?(morning|afternoon|evening|day)$/,
  /^yo$/,
  /^sup$/,
  /^greetings$/,
  /^what'?s up$/,
];

const THANKS_PATTERNS = [
  /^thanks?( you)?$/,
  /^thank you( so much| a lot| very much)?$/,
  /^thx$/,
  /^ty$/,
  /^appreciate (it|you)$/,
  /^much appreciated$/,
  /^cheers$/,
  /^perfect,? thanks$/,
  /^great,? thanks$/,
  /^ok,? thanks$/,
  /^okay,? thanks$/,
];

const FAREWELL_PATTERNS = [
  /^bye+$/,
  /^goodbye$/,
  /^see you( later| soon)?$/,
  /^see ya$/,
  /^take care$/,
  /^have a (good|great|nice) (day|one|night)$/,
  /^night$/,
  /^good ?night$/,
  /^later$/,
];

const HOW_ARE_YOU_PATTERNS = [
  /^how are you( doing)?( today)?\??$/,
  /^how'?s it going\??$/,
  /^how are things\??$/,
  /^what'?s up with you\??$/,
  /^you (ok|okay|good)\??$/,
];

/** Strip trailing/leading punctuation and collapse whitespace so patterns can be simple. */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[!?.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Words that, if present anywhere in the message alongside a greeting, signal
 * this is a real question wearing a greeting as a prefix (e.g.
 * "hi, which device works in Europe" or "hey my dog is vomiting").
 */
const MAX_SMALLTALK_WORDS = 6;

function matchesAny(patterns: RegExp[], normalized: string): boolean {
  return patterns.some((p) => p.test(normalized));
}

export type SmallTalkMatch = { kind: SmallTalkKind };

/**
 * Detects pure small talk. Returns null if the message should go through
 * normal retrieval/answering instead.
 */
export function detectSmallTalk(rawText: string): SmallTalkMatch | null {
  const normalized = normalize(rawText);
  if (!normalized) return null;

  // Heuristic guardrail: real questions are almost always longer than a
  // simple greeting/thanks/farewell. If the message is long, or contains a
  // question mark preceded by real content, or a comma splitting off more
  // text, don't treat it as small talk even if it starts with a greeting.
  const wordCount = normalized.split(" ").filter(Boolean).length;
  const looksShort = wordCount <= MAX_SMALLTALK_WORDS;

  if (!looksShort) return null;

  if (matchesAny(THANKS_PATTERNS, normalized)) return { kind: "thanks" };
  if (matchesAny(FAREWELL_PATTERNS, normalized)) return { kind: "farewell" };
  if (matchesAny(HOW_ARE_YOU_PATTERNS, normalized)) return { kind: "how-are-you" };
  if (matchesAny(GREETING_PATTERNS, normalized)) return { kind: "greeting" };

  return null;
}

const GREETING_REPLIES = [
  "Hi there! 🐾 I'm Waggle Assistant — I can help with your Waggle device (setup, troubleshooting, shipping, warranty, subscriptions) or general pet-care questions. What can I help with today?",
  "Hello! Great to see you. I'm here for anything Waggle-related — cameras, sensors, orders — or general pet-care questions. What's on your mind?",
  "Hey! Welcome to Waggle Assistant. Ask me about your device, your account, or even general pet-care topics like nutrition or training — happy to help.",
  "Hi! 👋 I'm your Waggle pet-care concierge. Whether it's a question about your Waggle device or your pet in general, I'm all ears.",
];

const THANKS_REPLIES = [
  "You're very welcome! Let me know if there's anything else about your Waggle device or your pet I can help with.",
  "Happy to help! Feel free to ask me anything else — Waggle-related or general pet care.",
  "Anytime! I'm here if you have more questions about your device or your furry friend.",
  "My pleasure! Come back anytime you have more questions, big or small.",
];

const FAREWELL_REPLIES = [
  "Take care, and give your pet a scratch behind the ears for me! 🐾 Come back anytime.",
  "Goodbye for now! I'll be here whenever you need help with Waggle or your pet.",
  "See you soon! Wishing you and your pet a great rest of the day.",
  "Bye for now — reach out anytime with Waggle or pet-care questions.",
];

const HOW_ARE_YOU_REPLIES = [
  "I'm doing great, thanks for asking! Ready to help with your Waggle device or any pet-care questions you've got.",
  "Always happy when I get to talk pets! I'm doing well — what can I help you with today?",
  "Doing well, thank you! How can I help — your Waggle device, or something pet-care related?",
];

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

/** Returns a warm, on-brand canned reply for a detected small-talk kind. */
export function smallTalkReply(kind: SmallTalkKind): string {
  switch (kind) {
    case "greeting":
      return pick(GREETING_REPLIES);
    case "thanks":
      return pick(THANKS_REPLIES);
    case "farewell":
      return pick(FAREWELL_REPLIES);
    case "how-are-you":
      return pick(HOW_ARE_YOU_REPLIES);
  }
}

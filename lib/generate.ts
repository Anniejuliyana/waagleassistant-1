import { retrieve, rerankWithEmbeddings, classifyIntent, type RetrievalResult } from "./retrieval";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export type Citation = {
  title: string;
  url: string;
  category: string;
  confidence: number;
  excerpt: string;
};

const EMERGENCY_TERMS = [
  "seizure", "seizing", "poison", "poisoned", "poisoning", "heatstroke",
  "heat stroke", "not breathing", "can't breathe", "cant breathe",
  "collapsed", "collapse", "severe bleeding", "won't wake up", "unconscious",
  "bloat", "hit by car", "choking",
];

export function isEmergency(text: string): boolean {
  const q = text.toLowerCase();
  return EMERGENCY_TERMS.some((t) => q.includes(t));
}

/**
 * Chooses which LLM provider/model to use for conversational answers.
 * Preference order: Gemini (free tier, no cost) -> OpenAI (paid, opt-in) ->
 * null (no key configured, caller should use the deterministic fallbackAnswer).
 */
export function getModel(): LanguageModel | null {
  if (process.env.GEMINI_API_KEY) {
    return google("gemini-1.5-flash");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai("gpt-4o-mini");
  }
  return null;
}

export const SYSTEM_PROMPT = `You are Waggle Assistant, the friendly AI help-center guide for Waggle, a pet-tech company making RV/home pet monitors, cameras, and smart sensors.

KNOWLEDGE HIERARCHY (follow strictly):
1. Anything about Waggle the company, its products, pricing, shipping, warranty, subscriptions, setup, troubleshooting, or support policies is ANSWERED ONLY from the "RETRIEVED HELP CENTER CONTENT" provided in each turn. Never invent or guess Waggle-specific facts (prices, specs, policies, availability in a region, etc.) from general knowledge. If nothing relevant was retrieved, say plainly that you couldn't find that in Waggle's help center and suggest contacting support@mywaggle.com or 855-983-5566, instead of guessing.
2. General pet-care questions (nutrition, breeds, training, grooming, vaccinations, general safety, first aid) may be answered using your general knowledge. Clearly label such answers as general pet-care guidance, not Waggle-specific advice.
3. For medical emergencies (poisoning, seizures, heatstroke, severe bleeding, difficulty breathing, collapse, being hit by a car, bloat) always tell the user to seek immediate veterinary/emergency care first. Do not attempt to diagnose. You may give brief, safe, widely-known first-aid pointers only if you also stress this is not a substitute for emergency vet care.

STYLE:
- Warm, concise, confident. Use short paragraphs and markdown (lists, bold) where helpful.
- Use the conversation history to remember pet details (name, species, breed, age, weight) the user has mentioned, and resolve pronouns ("him", "her", "them") to the correct pet.
- When you use retrieved help-center content, do not fabricate URLs — only reference the sources given to you.
- If a specific Waggle product is discussed, mention it by exact name so the UI can show a product card.
- Never claim Waggle products work in a region/feature they are not documented to support in the retrieved content.`;

export function buildContextBlock(results: RetrievalResult[]): string {
  if (results.length === 0) return "No relevant Waggle help-center content was retrieved for this question.";
  return results
    .map(
      (r, i) =>
        `[Source ${i + 1}] Title: ${r.chunk.title}\nURL: ${r.chunk.url}\nCategory: ${r.chunk.category}\nSection: ${r.chunk.headingPath}\nContent: ${r.chunk.text}`
    )
    .join("\n\n");
}

export async function getRetrievalForQuery(query: string) {
  const intent = classifyIntent(query);
  const initial = retrieve(query, 5);
  const reranked = await rerankWithEmbeddings(query, initial.results);
  return { ...initial, results: reranked, intent };
}

export function citationsFromResults(results: RetrievalResult[]): Citation[] {
  return results.map((r) => ({
    title: r.chunk.title,
    url: r.chunk.url,
    category: r.chunk.category,
    confidence: Number(r.confidence.toFixed(2)),
    excerpt: r.chunk.text.slice(0, 320) + (r.chunk.text.length > 320 ? "…" : ""),
  }));
}

/** Deterministic, non-LLM answer used when neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. */
export function fallbackAnswer(
  query: string,
  retrieval: Awaited<ReturnType<typeof getRetrievalForQuery>>
): { text: string; citations: Citation[] } {
  const { results, verdict, intent } = retrieval;
  const emergency = isEmergency(query);

  if (emergency) {
    return {
      text:
        `**This sounds like it could be an emergency.** Please contact your veterinarian or the nearest emergency animal hospital right away — don't wait on a chat answer for this.\n\n` +
        `While general first-aid basics exist for situations like this, diagnosing or treating over chat isn't safe. If you can, call ahead so the vet team can prepare.\n\n` +
        `_Answered directly without an AI model — add a \`GEMINI_API_KEY\` (free tier) or \`OPENAI_API_KEY\` for smarter, conversational answers._`,
      citations: [],
    };
  }

  if (intent === "general") {
    return {
      text:
        `I can only give **general pet-care answers** like this using a connected AI model, and no \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` is currently configured in this deployment.\n\n` +
        `To avoid inventing medical or care advice, I won't guess at an answer here. Once a Gemini (free tier) or OpenAI API key is added to the environment, I'll be able to answer general pet questions (nutrition, training, grooming, breeds, first aid, etc.) clearly labeled as general guidance, separate from Waggle-specific answers.\n\n` +
        `In the meantime, ask me anything about Waggle products, setup, subscriptions, shipping, or warranty — I can answer those directly from our real Help Center content below.`,
      citations: [],
    };
  }

  if (results.length === 0 || verdict === "low") {
    return {
      text:
        `I couldn't find anything in Waggle's Help Center that directly answers that. ` +
        `Please reach out to our team at **support@mywaggle.com** or **855-983-5566** (Mon-Fri, 10am-8pm EST) and they'll help directly.\n\n` +
        `_Answered directly from our Help Center — add a \`GEMINI_API_KEY\` (free tier) or \`OPENAI_API_KEY\` for smarter, conversational answers._`,
      citations: [],
    };
  }

  const top = results[0];
  const others = results.slice(1, 3);
  let text = `Here's what our Help Center says about this:\n\n> ${top.chunk.text}\n\n**Source:** [${top.chunk.title}](${top.chunk.url}) — ${top.chunk.category}`;
  if (others.length > 0) {
    text += `\n\nYou may also find these related sections helpful (see sources below).`;
  }
  text += `\n\n_Answered directly from our Help Center — add a \`GEMINI_API_KEY\` (free tier) or \`OPENAI_API_KEY\` for smarter, conversational answers._`;

  return { text, citations: citationsFromResults(results) };
}

import { createDataStreamResponse, streamText, formatDataStreamPart } from "ai";
import {
  SYSTEM_PROMPT,
  buildContextBlock,
  citationsFromResults,
  fallbackAnswer,
  getRetrievalForQuery,
  isEmergency,
  getModel,
  type ChatMessage,
} from "@/lib/generate";
import { detectSmallTalk, smallTalkReply } from "@/lib/smalltalk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const body = await req.json();
  const messages: IncomingMessage[] = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content ?? "";

  // Deterministic, zero-cost small-talk short-circuit: runs before retrieval
  // and before any LLM call, so greetings/thanks/farewells are instant and free.
  const smallTalk = detectSmallTalk(query);
  if (smallTalk) {
    return createDataStreamResponse({
      execute: async (dataStream) => {
        dataStream.writeData({
          type: "citations",
          citations: [],
          verdict: "high",
          intent: "smalltalk",
          emergency: false,
        });
        const text = smallTalkReply(smallTalk.kind);
        const words = text.split(/(\s+)/);
        for (const w of words) {
          dataStream.write(formatDataStreamPart("text", w));
          await new Promise((r) => setTimeout(r, 8));
        }
      },
      onError: (error) => {
        console.error("[api/chat] smalltalk error:", error);
        return "Something went wrong generating a response. Please try again.";
      },
    });
  }

  const retrieval = await getRetrievalForQuery(query);
  const citations = citationsFromResults(retrieval.results);
  const emergency = isEmergency(query);
  const model = getModel();

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Always send retrieval metadata first so the client can render source
      // cards / confidence immediately, even while tokens are still streaming.
      dataStream.writeData({
        type: "citations",
        citations,
        verdict: retrieval.verdict,
        intent: retrieval.intent,
        emergency,
      });

      if (!model) {
        const { text, citations: fbCitations } = fallbackAnswer(query, retrieval);
        // Simulate a light stream so the UI's streaming affordances still work.
        const words = text.split(/(\s+)/);
        for (const w of words) {
          dataStream.write(formatDataStreamPart("text", w));
          await new Promise((r) => setTimeout(r, 8));
        }
        if (fbCitations.length !== citations.length) {
          dataStream.writeData({ type: "citations-final", citations: fbCitations });
        }
        return;
      }

      const contextBlock = buildContextBlock(retrieval.results);
      const intentNote =
        retrieval.intent === "general"
          ? "This looks like a GENERAL pet-care question (not Waggle-specific). Answer from general knowledge and clearly label it as general guidance."
          : retrieval.intent === "company"
          ? "This looks like a WAGGLE-specific question. Use ONLY the retrieved help-center content below as ground truth; if it doesn't answer the question, say so plainly."
          : "The question's intent is ambiguous between Waggle-specific and general pet care — use the retrieved content if relevant, and general knowledge only for the general-pet-care portion, labeling each clearly.";

      const systemWithContext = `${SYSTEM_PROMPT}\n\n${intentNote}\n\nRETRIEVED HELP CENTER CONTENT (retrieval confidence: ${retrieval.verdict}):\n${contextBlock}`;

      const coreMessages: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

      const result = streamText({
        model,
        system: systemWithContext,
        messages: coreMessages,
        temperature: 0.4,
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      console.error("[api/chat] error:", error);
      return "Something went wrong generating a response. Please try again.";
    },
  });
}

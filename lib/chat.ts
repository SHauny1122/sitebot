import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_GENERATION_ATTEMPTS = 2;
const FALLBACK_RESPONSE =
  "I'm having trouble pulling the latest answer right now, but please leave your question or contact details and our team will follow up shortly.";

type SerializedError = {
  name: string;
  message: string;
  status?: number;
  code?: string;
};

export type AnswerResult = {
  answer: string;
  usedFallback: boolean;
  attempts: number;
  errorDetails?: SerializedError;
};

export function getFallbackAnswer() {
  return FALLBACK_RESPONSE;
}

export async function answerForBot(botId: string, question: string): Promise<AnswerResult> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const answer = await generateAnswer(botId, question, attempt);
      return { answer, usedFallback: false, attempts: attempt };
    } catch (error) {
      lastError = error;
      const serialized = serializeError(error);
      console.warn("[chat] Answer generation attempt failed", {
        botId,
        attempt,
        errorName: serialized.name,
        errorStatus: serialized.status ?? null,
        errorCode: serialized.code ?? null,
        errorMessage: serialized.message
      });

      if (attempt === MAX_GENERATION_ATTEMPTS) {
        return {
          answer: FALLBACK_RESPONSE,
          usedFallback: true,
          attempts: attempt,
          errorDetails: serialized
        };
      }
    }
  }

  return {
    answer: FALLBACK_RESPONSE,
    usedFallback: true,
    attempts: MAX_GENERATION_ATTEMPTS
  };
}

function serializeError(error: unknown): SerializedError {
  if (error && typeof error === "object") {
    const name = "name" in error && typeof error.name === "string" ? error.name : "Error";
    const message = "message" in error && typeof error.message === "string" ? error.message : "Unknown error";
    const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
    const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
    return { name, message, status, code };
  }
  return { name: "Error", message: typeof error === "string" ? error : "Unknown error" };
}

async function generateAnswer(botId: string, question: string, attempt: number) {
  console.info("[chat] Generating embedding", {
    botId,
    attempt,
    questionLength: question.length
  });

  const embed = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });

  const vector = embed.data[0]?.embedding;
  if (!vector) throw new Error("Failed to create embedding");

  console.info("[chat] Embedding created", {
    botId,
    attempt,
    vectorLength: vector.length
  });

  const { data: matches, error: matchError } = await supabaseAdmin.rpc("match_bot_chunks", {
    in_bot_id: botId,
    query_embedding: vector,
    match_count: 6
  });

  if (matchError) {
    throw matchError;
  }

  console.info("[chat] Retrieved context chunks", {
    botId,
    attempt,
    chunkCount: Array.isArray(matches) ? matches.length : 0
  });

  const context = ((matches ?? []) as Array<{ content: string }>).map((m) => m.content).join("\n\n");

  const completion = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are a support chatbot for a website. Answer only from provided context. If uncertain, say you do not know and ask the user to contact support."
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${context}`
      }
    ]
  });

  const text = completion.output_text?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }

  console.info("[chat] Completion received", {
    botId,
    attempt,
    answerLength: text.length
  });

  return text;
}

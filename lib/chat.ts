import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function answerForBot(botId: string, question: string) {
  const embed = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });

  const vector = embed.data[0]?.embedding;
  if (!vector) throw new Error("Failed to create embedding");

  const { data: matches, error: matchError } = await supabaseAdmin.rpc("match_bot_chunks", {
    in_bot_id: botId,
    query_embedding: vector,
    match_count: 6
  });
  if (matchError) throw matchError;

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
    return "I could not find enough information on that. Please contact support for help.";
  }

  return text;
}

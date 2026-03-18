import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chunkText } from "@/lib/text";

type InputPage = {
  url: string;
  title: string;
  content: string;
};

export async function trainBotFromPages(botId: string, pages: InputPage[]) {
  for (const page of pages) {
    const { data: pageRow, error: pageError } = await supabaseAdmin
      .from("bot_pages")
      .insert({
        bot_id: botId,
        url: page.url,
        title: page.title,
        content: page.content
      })
      .select("id")
      .single();

    if (pageError) throw pageError;

    const chunks = chunkText(page.content, 1000);
    for (const chunk of chunks) {
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk
      });

      const embedding = embeddingRes.data[0]?.embedding;
      if (!embedding) continue;

      const { error: chunkError } = await supabaseAdmin.from("bot_chunks").insert({
        bot_id: botId,
        page_id: pageRow.id,
        content: chunk,
        embedding
      });
      if (chunkError) throw chunkError;
    }
  }

  const { error } = await supabaseAdmin.from("bots").update({ status: "ready" }).eq("id", botId);
  if (error) throw error;
}

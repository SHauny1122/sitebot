import { NextResponse } from "next/server";
import { z } from "zod";
import { answerForBot } from "@/lib/chat";
import { canSendMessage } from "@/lib/pricing";
import { getPlan, getUsageCount, incrementUsage } from "@/lib/bots";
import { supabaseAdmin } from "@/lib/supabase/admin";

const chatSchema = z.object({
  botId: z.string().uuid(),
  message: z.string().min(1).max(1000)
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = chatSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400, headers: corsHeaders });
  }

  const { data: bot, error: botError } = await supabaseAdmin
    .from("bots")
    .select("id,user_id,status")
    .eq("id", parsed.data.botId)
    .single();

  if (botError || !bot || bot.status !== "ready") {
    return NextResponse.json({ error: "Bot unavailable" }, { status: 404, headers: corsHeaders });
  }

  const plan = await getPlan(bot.user_id);
  const used = await getUsageCount(bot.user_id);
  if (!canSendMessage(plan, used)) {
    return NextResponse.json(
      { error: "Message limit reached for current plan" },
      { status: 402, headers: corsHeaders }
    );
  }

  const answer = await answerForBot(parsed.data.botId, parsed.data.message);

  await supabaseAdmin.from("chat_messages").insert([
    { bot_id: parsed.data.botId, role: "user", content: parsed.data.message },
    { bot_id: parsed.data.botId, role: "assistant", content: answer }
  ]);

  await incrementUsage(bot.user_id);

  return NextResponse.json({ answer }, { headers: corsHeaders });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { answerForBot, getFallbackAnswer } from "@/lib/chat";
import { canSendMessage } from "@/lib/pricing";
import { getPlan, getUsageCount, incrementUsage } from "@/lib/bots";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

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
  const requestId = crypto.randomUUID();
  const openAiKeyPresent = Boolean(env.OPENAI_API_KEY);

  try {
    console.info("[chat] Request received", {
      requestId,
      method: request.method,
      openAiKeyPresent
    });

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      console.info("[chat] Invalid JSON payload", { requestId });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400, headers: corsHeaders });
    }

    const parsed = chatSchema.safeParse(payload);
    if (!parsed.success) {
      console.info("[chat] Validation failed", {
        requestId,
        errors: parsed.error.flatten().fieldErrors
      });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400, headers: corsHeaders });
    }

    console.info("[chat] Looking up bot", {
      requestId,
      botId: parsed.data.botId
    });

    const { data: bot, error: botError } = await supabaseAdmin
      .from("bots")
      .select("id,user_id,status")
      .eq("id", parsed.data.botId)
      .single();

    if (botError || !bot || bot.status !== "ready") {
      console.info("[chat] Bot unavailable", {
        requestId,
        botId: parsed.data.botId,
        botStatus: bot?.status ?? null,
        botError: botError?.message ?? null
      });
      return NextResponse.json({ error: "Bot unavailable" }, { status: 404, headers: corsHeaders });
    }

    const plan = await getPlan(bot.user_id);
    const used = await getUsageCount(bot.user_id);
    if (!canSendMessage(plan, used)) {
      console.info("[chat] Message limit reached", {
        requestId,
        botId: parsed.data.botId,
        userId: bot.user_id,
        plan,
        used
      });
      return NextResponse.json(
        { error: "Message limit reached for current plan" },
        { status: 402, headers: corsHeaders }
      );
    }

    console.info("[chat] Starting answer generation", {
      requestId,
      botId: parsed.data.botId,
      userId: bot.user_id,
      plan
    });

    const answerResult = await answerForBot(parsed.data.botId, parsed.data.message);

    console.info("[chat] Answer generated", {
      requestId,
      botId: parsed.data.botId,
      answerLength: answerResult.answer.length,
      attempts: answerResult.attempts,
      usedFallback: answerResult.usedFallback
    });

    if (answerResult.usedFallback && answerResult.errorDetails) {
      console.warn("[chat] Fallback answer returned", {
        requestId,
        botId: parsed.data.botId,
        errorName: answerResult.errorDetails.name,
        errorCode: answerResult.errorDetails.code ?? null,
        errorStatus: answerResult.errorDetails.status ?? null,
        errorMessage: answerResult.errorDetails.message
      });
    }

    const { error: messageInsertError } = await supabaseAdmin.from("chat_messages").insert([
      { bot_id: parsed.data.botId, role: "user", content: parsed.data.message },
      { bot_id: parsed.data.botId, role: "assistant", content: answerResult.answer }
    ]);

    if (messageInsertError) {
      console.error("[chat] Failed to persist chat messages", {
        requestId,
        botId: parsed.data.botId,
        error: messageInsertError.message
      });
    }

    await incrementUsage(bot.user_id);

    console.info("[chat] Response returned", {
      requestId,
      botId: parsed.data.botId,
      userId: bot.user_id,
      status: 200,
      usedFallback: answerResult.usedFallback
    });

    return NextResponse.json(
      {
        answer: answerResult.answer,
        usedFallback: answerResult.usedFallback,
        attempts: answerResult.attempts
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorStatus =
      typeof error === "object" && error !== null && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;

    console.error("[chat] Unhandled failure", {
      requestId,
      errorName,
      errorMessage,
      errorStatus,
      openAiKeyPresent,
      fallbackProvided: true
    });

    const fallbackAnswer = getFallbackAnswer();

    return NextResponse.json(
      {
        answer: fallbackAnswer,
        usedFallback: true,
        attempts: 0,
        error: "fallback"
      },
      { status: 200, headers: corsHeaders }
    );
  }
}

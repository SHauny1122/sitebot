import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api-user";
import { canCreateBot } from "@/lib/pricing";
import { scrapeWebsite } from "@/lib/scraper";
import { trainBotFromPages } from "@/lib/training";
import { getPlan } from "@/lib/bots";
import { supabaseAdmin } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  websiteUrl: z.string().url(),
  name: z.string().min(2).max(80)
});

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: bots, error } = await supabaseAdmin
    .from("bots")
    .select("id,name,status,website_url,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bots: bots ?? [] });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { count: botCount, error: countError } = await supabaseAdmin
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const plan = await getPlan(user.id);
  const allowed = canCreateBot(plan, botCount ?? 0);
  if (!allowed) {
    return NextResponse.json({ error: "Free plan allows 1 chatbot. Upgrade to Pro." }, { status: 403 });
  }

  const { data: bot, error: insertError } = await supabaseAdmin
    .from("bots")
    .insert({
      user_id: user.id,
      website_url: parsed.data.websiteUrl,
      name: parsed.data.name,
      status: "pending"
    })
    .select("id,name,status,website_url,created_at")
    .single();

  if (insertError || !bot) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to create bot" }, { status: 500 });
  }

  void (async () => {
    try {
      const pages = await scrapeWebsite(parsed.data.websiteUrl);
      if (!pages.length) {
        await supabaseAdmin.from("bots").update({ status: "failed" }).eq("id", bot.id);
        return;
      }

      await trainBotFromPages(bot.id, pages);
    } catch {
      await supabaseAdmin.from("bots").update({ status: "failed" }).eq("id", bot.id);
    }
  })();

  return NextResponse.json({ bot }, { status: 202 });
}

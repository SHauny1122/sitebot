import { notFound } from "next/navigation";
import { BotCustomizationCard } from "@/components/bot-customization-card";
import { EmbedScriptCard } from "@/components/embed-script-card";
import { TestChat } from "@/components/test-chat";
import { requireUser } from "@/lib/auth";
import { BOT_APPEARANCE_DEFAULTS, normalizeBotAppearance } from "@/lib/bot-appearance";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function BotDetailPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const user = await requireUser();

  const { data: bot, error: botError } = await supabaseAdmin
    .from("bots")
    .select("id,name,website_url,status")
    .eq("id", botId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (botError || !bot) {
    notFound();
  }

  const { data: appearanceRow } = await supabaseAdmin
    .from("bots")
    .select("button_text,button_color,button_style,header_color,widget_title,welcome_message,position")
    .eq("id", botId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { count: pagesIndexed } = await supabaseAdmin
    .from("bot_pages")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", bot.id);

  const embedScript = `<script src="${env.NEXT_PUBLIC_SITE_URL}/embed.js" data-bot="${bot.id}"></script>`;
  const statusText = String(bot.status ?? "pending").toUpperCase();
  const appearance = appearanceRow
    ? normalizeBotAppearance({
        buttonText: appearanceRow.button_text,
        buttonColor: appearanceRow.button_color,
        buttonStyle: appearanceRow.button_style,
        headerColor: appearanceRow.header_color,
        widgetTitle: appearanceRow.widget_title,
        welcomeMessage: appearanceRow.welcome_message,
        position: appearanceRow.position
      })
    : BOT_APPEARANCE_DEFAULTS;

  return (
    <main className="container-shell py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{bot.name}</h1>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
            {statusText}
          </span>
        </div>
        <p className="mt-1 break-all text-sm text-slate-600">{bot.website_url}</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Source website</p>
          <p className="mt-1 break-all text-sm font-medium text-slate-900">{bot.website_url}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Training status</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{statusText}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pages indexed</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{pagesIndexed ?? 0}</p>
        </div>
      </div>

      <EmbedScriptCard botId={bot.id} embedScript={embedScript} />

      <BotCustomizationCard botId={bot.id} initialAppearance={appearance} />

      <TestChat botId={bot.id} status={statusText} />
    </main>
  );
}

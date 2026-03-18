import { notFound } from "next/navigation";
import { EmbedScriptCard } from "@/components/embed-script-card";
import { TestChat } from "@/components/test-chat";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function BotDetailPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const user = await requireUser();

  const { data: bot } = await supabaseAdmin
    .from("bots")
    .select("id,name,website_url,status")
    .eq("id", botId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bot) {
    notFound();
  }

  const { count: pagesIndexed } = await supabaseAdmin
    .from("bot_pages")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", bot.id);

  const embedScript = `<script src="${env.NEXT_PUBLIC_SITE_URL}/embed.js" data-bot="${bot.id}"></script>`;
  const statusText = String(bot.status ?? "pending").toUpperCase();

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

      <EmbedScriptCard embedScript={embedScript} />

      <TestChat botId={bot.id} status={statusText} />
    </main>
  );
}

import Link from "next/link";
import { DashboardBotManager } from "@/components/dashboard-bot-manager";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth";
import { FREE_MESSAGE_LIMIT } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function DashboardPage() {
  const user = await requireUser();

  const [{ data: profile }, { data: bots }, { data: usage }] = await Promise.all([
    supabaseAdmin.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabaseAdmin
      .from("bots")
      .select("id,name,status,website_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("message_usage").select("message_count").eq("user_id", user.id).order("month_key", { ascending: false }).limit(1).maybeSingle()
  ]);

  const plan = profile?.plan ?? "free";
  const messages = usage?.message_count ?? 0;

  return (
    <main className="container-shell py-8">
      <header className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-600">Manage chatbots, test responses, and copy embed scripts.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link className="btn-secondary" href="/admin">
            Admin
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Plan</p>
          <p className="mt-2 text-xl font-semibold capitalize">{plan}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Chatbots</p>
          <p className="mt-2 text-xl font-semibold">{bots?.length ?? 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Messages this month</p>
          <p className="mt-2 text-xl font-semibold">
            {messages}
            {plan === "free" ? ` / ${FREE_MESSAGE_LIMIT}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardBotManager initialBots={bots ?? []} />
      </div>
    </main>
  );
}

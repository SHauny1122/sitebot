import { redirect } from "next/navigation";
import { adminEmails } from "@/lib/env";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const user = await requireUser();
  if (!adminEmails.includes((user.email ?? "").toLowerCase())) {
    redirect("/dashboard");
  }

  const [profilesRes, botsRes, messagesRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("user_id,email,plan,created_at").order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("bots").select("id,name,user_id,status,created_at").order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("chat_messages").select("id,bot_id,role,created_at").order("created_at", { ascending: false }).limit(50)
  ]);

  return (
    <main className="container-shell py-8">
      <h1 className="mb-6 text-2xl font-semibold">Admin Dashboard</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Users</p>
          <p className="mt-2 text-2xl font-semibold">{profilesRes.data?.length ?? 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Bots</p>
          <p className="mt-2 text-2xl font-semibold">{botsRes.data?.length ?? 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Messages (latest)</p>
          <p className="mt-2 text-2xl font-semibold">{messagesRes.data?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Recent users</h2>
          <div className="space-y-2 text-sm">
            {(profilesRes.data ?? []).map((profile) => (
              <div className="rounded-lg border border-slate-200 p-2" key={profile.user_id}>
                <p className="break-all font-medium">{profile.email ?? "Unknown"}</p>
                <p className="text-slate-500">Plan: {profile.plan}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Recent bots</h2>
          <div className="space-y-2 text-sm">
            {(botsRes.data ?? []).map((bot) => (
              <div className="rounded-lg border border-slate-200 p-2" key={bot.id}>
                <p className="font-medium">{bot.name}</p>
                <p className="text-slate-500">Status: {bot.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Recent messages</h2>
          <div className="space-y-2 text-sm">
            {(messagesRes.data ?? []).slice(0, 12).map((message) => (
              <div className="rounded-lg border border-slate-200 p-2" key={message.id}>
                <p className="font-medium">{message.role}</p>
                <p className="break-all text-slate-500">Bot: {message.bot_id}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

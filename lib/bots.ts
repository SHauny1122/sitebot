import { monthKey } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminEmails } from "@/lib/env";

export async function getUsageCount(userId: string) {
  const currentMonth = monthKey();
  const { data, error } = await supabaseAdmin
    .from("message_usage")
    .select("message_count")
    .eq("user_id", userId)
    .eq("month_key", currentMonth)
    .maybeSingle();

  if (error) throw error;
  return data?.message_count ?? 0;
}

export async function incrementUsage(userId: string) {
  const currentMonth = monthKey();
  const current = await getUsageCount(userId);
  const { error } = await supabaseAdmin.from("message_usage").upsert(
    {
      user_id: userId,
      month_key: currentMonth,
      message_count: current + 1
    },
    { onConflict: "user_id,month_key" }
  );
  if (error) throw error;
}

export async function getPlan(userId: string) {
  if (adminEmails.length > 0) {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!authError) {
      const email = authUser.user?.email?.toLowerCase();
      if (email && adminEmails.includes(email)) {
        return "pro";
      }
    }
  }

  const { data, error } = await supabaseAdmin.from("profiles").select("plan").eq("user_id", userId).single();
  if (error) throw error;
  return (data.plan as "free" | "pro") ?? "free";
}

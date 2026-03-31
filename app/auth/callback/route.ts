import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { isPaystackPlanId } from "@/lib/paystack";

function getSafeRedirectPath(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/#pricing";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const intent = requestUrl.searchParams.get("intent");
  const requestedPlan = requestUrl.searchParams.get("plan");
  const next = requestUrl.searchParams.get("next");

  const safeRedirectPath = intent === "checkout" ? getSafeRedirectPath(next ?? "/#pricing") : getSafeRedirectPath(next);
  const redirectUrl = new URL(safeRedirectPath, env.NEXT_PUBLIC_SITE_URL);

  if (intent === "checkout") {
    redirectUrl.searchParams.set("checkout", "1");

    if (isPaystackPlanId(requestedPlan)) {
      redirectUrl.searchParams.set("plan", requestedPlan);
    } else {
      redirectUrl.searchParams.delete("plan");
    }
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(redirectUrl.toString());
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { isPaystackPlanId } from "@/lib/paystack";

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

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
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");
  const intent = requestUrl.searchParams.get("intent");
  const requestedPlan = requestUrl.searchParams.get("plan");
  const next = requestUrl.searchParams.get("next");
  const authErrorCode = requestUrl.searchParams.get("error_code");

  const otpType: OtpType | null =
    rawType === "signup" ||
    rawType === "invite" ||
    rawType === "magiclink" ||
    rawType === "recovery" ||
    rawType === "email_change" ||
    rawType === "email"
      ? rawType
      : null;

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

  let authSucceeded = false;

  if (code || (tokenHash && otpType)) {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      authSucceeded = !error;
    } else if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType
      });
      authSucceeded = !error;
    }
  }

  if ((code || tokenHash || authErrorCode) && !authSucceeded) {
    const loginUrl = new URL("/login", env.NEXT_PUBLIC_SITE_URL);

    if (intent) {
      loginUrl.searchParams.set("intent", intent);
    }
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      loginUrl.searchParams.set("next", next);
    }
    if (isPaystackPlanId(requestedPlan)) {
      loginUrl.searchParams.set("plan", requestedPlan);
    }
    if (authErrorCode) {
      loginUrl.searchParams.set("auth_error", authErrorCode);
    }

    return NextResponse.redirect(loginUrl.toString());
  }

  return NextResponse.redirect(redirectUrl.toString());
}

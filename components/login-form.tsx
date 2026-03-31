"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clientEnv } from "@/lib/env-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const CHECKOUT_INTENT_KEY = "sitechat.checkout.intent";

function isPlanId(value: string | null): value is "monthly" | "yearly" {
  return value === "monthly" || value === "yearly";
}

function getSafeRedirectPath(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/#pricing";
  }

  return value;
}

function getPostLoginPath(intent: string | null, next: string | null, plan: string | null) {
  const safeNextPath = intent === "checkout" ? getSafeRedirectPath(next ?? "/#pricing") : getSafeRedirectPath(next);
  if (intent !== "checkout") {
    return safeNextPath;
  }

  const url = new URL(safeNextPath, "http://localhost");
  url.searchParams.set("checkout", "1");
  if (isPlanId(plan)) {
    url.searchParams.set("plan", plan);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function persistCheckoutIntent(plan: "monthly" | "yearly", returnTo: string) {
  window.sessionStorage.setItem(
    CHECKOUT_INTENT_KEY,
    JSON.stringify({
      intent: "checkout",
      plan,
      returnTo,
      createdAt: Date.now()
    })
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const intent = searchParams.get("intent");
  const next = searchParams.get("next");
  const plan = searchParams.get("plan");
  const authError = searchParams.get("auth_error");
  const checkoutPlan = isPlanId(plan) ? plan : null;

  const authErrorMessage = authError === "otp_expired"
    ? "Your magic link expired or was already used. Please request a new one below."
    : authError
      ? "We could not complete sign-in from that link. Please request a fresh magic link."
      : null;

  useEffect(() => {
    let active = true;
    const postLoginPath = getPostLoginPath(intent, next, plan);

    async function resumeSessionIfAvailable() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        window.location.replace(postLoginPath);
      }
    }

    void resumeSessionIfAvailable();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        window.location.replace(postLoginPath);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [intent, next, plan, supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const callbackUrl = new URL("/auth/complete", clientEnv.NEXT_PUBLIC_SITE_URL);
    const checkoutReturnTo = getPostLoginPath(intent, next, checkoutPlan);

    if (intent === "checkout" && checkoutPlan) {
      persistCheckoutIntent(checkoutPlan, checkoutReturnTo);
      console.info("[login] Checkout intent stored before magic link", {
        route: `${window.location.pathname}${window.location.search}`,
        plan: checkoutPlan,
        returnTo: checkoutReturnTo
      });
    }

    if (intent) {
      callbackUrl.searchParams.set("intent", intent);
    }
    if (next?.startsWith("/") && !next.startsWith("//")) {
      callbackUrl.searchParams.set("next", next);
    }
    if (checkoutPlan) {
      callbackUrl.searchParams.set("plan", checkoutPlan);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString()
      }
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Magic link sent. Check your inbox.");
  };

  return (
    <form className="card mx-auto mt-10 max-w-md p-5 sm:mt-24 sm:p-6" onSubmit={onSubmit}>
      <h1 className="mb-2 text-2xl font-semibold text-white">Log in to SiteChat</h1>
      <p className="mb-5 text-sm text-slate-400">Enter your email and we will send you a magic link.</p>
      {authErrorMessage ? (
        <p className="mb-4 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{authErrorMessage}</p>
      ) : null}
      {intent === "checkout" ? (
        <p className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          Please log in to continue your purchase{checkoutPlan ? ` (${checkoutPlan === "monthly" ? "Starter Monthly" : "Starter Yearly"})` : ""}.
        </p>
      ) : null}
      <input
        type="email"
        required
        className="input"
        placeholder="you@company.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button className="btn-primary mt-4 w-full" type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send Magic Link"}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-slate-300">
          {message}
          {intent === "checkout" ? " After opening your magic link, we will bring you back to finish checkout." : ""}
        </p>
      ) : null}
    </form>
  );
}

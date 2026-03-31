"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthState = "signing_in" | "failed";
type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

function isOtpType(value: string | null): value is OtpType {
  return value === "signup" || value === "invite" || value === "magiclink" || value === "recovery" || value === "email_change" || value === "email";
}

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

function getLoginFallbackPath(intent: string | null, next: string | null, plan: string | null, authError: string | null) {
  const loginUrl = new URL("/login", "http://localhost");
  if (intent) {
    loginUrl.searchParams.set("intent", intent);
  }
  if (next?.startsWith("/") && !next.startsWith("//")) {
    loginUrl.searchParams.set("next", next);
  }
  if (isPlanId(plan)) {
    loginUrl.searchParams.set("plan", plan);
  }
  if (authError) {
    loginUrl.searchParams.set("auth_error", authError);
  }
  return `${loginUrl.pathname}${loginUrl.search}${loginUrl.hash}`;
}

export function AuthCompleteClient() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const intent = searchParams.get("intent");
  const next = searchParams.get("next");
  const plan = searchParams.get("plan");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const errorCode = searchParams.get("error_code");

  const [state, setState] = useState<AuthState>("signing_in");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const postLoginPath = getPostLoginPath(intent, next, plan);
    const loginFallbackPath = getLoginFallbackPath(intent, next, plan, errorCode);

    const redirectIfSessionReady = async () => {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (!active) return true;

        if (data.session) {
          window.location.replace(postLoginPath);
          return true;
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 150);
        });
      }

      return false;
    };

    const runAuthCompletion = async () => {
      if (errorCode) {
        window.location.replace(loginFallbackPath);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");

      let completed = false;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        completed = !error;
      } else if (tokenHash && isOtpType(typeParam)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: typeParam
        });
        completed = !error;
      } else if (hashAccessToken && hashRefreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken
        });
        completed = !error;
      }

      const sessionReady = await redirectIfSessionReady();
      if (!active || sessionReady) {
        return;
      }

      if (!completed) {
        setState("failed");
        setErrorMessage("We could not complete sign-in from that link. Please request a new magic link.");
        return;
      }

      window.location.replace(postLoginPath);
    };

    void runAuthCompletion();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) {
        return;
      }
      window.location.replace(postLoginPath);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [code, errorCode, intent, next, plan, supabase, tokenHash, typeParam]);

  return (
    <main className="container-shell min-h-screen py-10">
      <section className="card mx-auto mt-10 max-w-md p-5 sm:mt-24 sm:p-6">
        {state === "signing_in" ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold text-white">Signing you in...</h1>
            <p className="text-sm text-slate-400">Please wait while we complete your secure login and return you to checkout.</p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold text-white">Sign-in could not be completed</h1>
            <p className="text-sm text-slate-400">{errorMessage}</p>
            <div className="mt-5">
              <button
                className="btn-primary w-full"
                onClick={() => window.location.assign(getLoginFallbackPath(intent, next, plan, errorCode))}
                type="button"
              >
                Request New Magic Link
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

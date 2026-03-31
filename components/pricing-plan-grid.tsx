"use client";

import { useEffect, useRef, useState } from "react";

type PricingPlan = {
  id: "monthly" | "yearly";
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  badge: string | null;
  recommended: boolean;
  savingsText: string | null;
};

type InitializeResponse = {
  authorizationUrl?: string;
  error?: string;
};

const CHECKOUT_INTENT_KEY = "sitechat.checkout.intent";

type CheckoutIntent = {
  plan: PricingPlan["id"];
  returnTo: string;
  createdAt: number;
};

function isPricingPlanId(value: unknown): value is PricingPlan["id"] {
  return value === "monthly" || value === "yearly";
}

export function PricingPlanGrid({ isAuthenticated, plans }: { isAuthenticated: boolean; plans: readonly PricingPlan[] }) {
  const [activePlanId, setActivePlanId] = useState<PricingPlan["id"] | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRestoredCheckout = useRef(false);

  function getReturnToWithCheckoutIntent(planId: PricingPlan["id"]) {
    const url = new URL(window.location.href);
    url.searchParams.set("checkout", "1");
    url.searchParams.set("plan", planId);
    url.hash = "pricing";
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function persistCheckoutIntent(planId: PricingPlan["id"], returnTo: string) {
    const intent: CheckoutIntent = {
      plan: planId,
      returnTo,
      createdAt: Date.now()
    };
    window.sessionStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(intent));
  }

  async function startCheckout(plan: PricingPlan) {
    setInfoMessage(null);
    setErrorMessage(null);

    if (!isAuthenticated) {
      const returnTo = getReturnToWithCheckoutIntent(plan.id);
      persistCheckoutIntent(plan.id, returnTo);
      setInfoMessage("Please log in to continue your purchase.");

      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("intent", "checkout");
      loginUrl.searchParams.set("plan", plan.id);
      loginUrl.searchParams.set("next", returnTo);
      window.location.assign(`${loginUrl.pathname}${loginUrl.search}`);
      return;
    }

    try {
      setActivePlanId(plan.id);
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan: plan.id })
      });

      const data = (await response.json()) as InitializeResponse;

      if (!response.ok || !data.authorizationUrl) {
        setErrorMessage(data.error ?? "Unable to start Paystack checkout. Please try again.");
        setActivePlanId(null);
        return;
      }

      window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
      window.location.assign(data.authorizationUrl);
    } catch {
      setErrorMessage("Unable to connect to payment service. Please retry.");
      setActivePlanId(null);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || hasRestoredCheckout.current) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const checkoutParam = currentUrl.searchParams.get("checkout");
    const planParam = currentUrl.searchParams.get("plan");

    if (checkoutParam === "1" && isPricingPlanId(planParam)) {
      const matchedPlan = plans.find((plan) => plan.id === planParam);
      if (matchedPlan) {
        hasRestoredCheckout.current = true;
        setInfoMessage("Welcome back. Continuing your checkout...");
        void startCheckout(matchedPlan);
        return;
      }
    }

    if (checkoutParam === "1") {
      window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
      setInfoMessage("Welcome back. Choose a plan to continue checkout.");
      return;
    }

    const storedIntentRaw = window.sessionStorage.getItem(CHECKOUT_INTENT_KEY);
    if (!storedIntentRaw) {
      return;
    }

    try {
      const storedIntent = JSON.parse(storedIntentRaw) as Partial<CheckoutIntent>;
      if (!isPricingPlanId(storedIntent.plan)) {
        window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
        setInfoMessage("Welcome back. Choose a plan to continue checkout.");
        return;
      }

      const matchedPlan = plans.find((plan) => plan.id === storedIntent.plan);
      if (!matchedPlan) {
        window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
        setInfoMessage("Welcome back. Choose a plan to continue checkout.");
        return;
      }

      hasRestoredCheckout.current = true;
      setInfoMessage("Welcome back. Continuing your checkout...");
      void startCheckout(matchedPlan);
    } catch {
      window.sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
      setInfoMessage("Welcome back. Choose a plan to continue checkout.");
    }
  }, [isAuthenticated, plans]);

  return (
    <>
      {/* ENV NOTE: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY can be used here later if you switch to Paystack inline checkout. */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-5">
        {plans.map((plan) => (
          <article
            className={`group relative flex h-full flex-col rounded-2xl border p-5 sm:p-6 transition duration-200 hover:-translate-y-0.5 ${
              plan.recommended
                ? "border-[#F7C846]/40 bg-[#121512] shadow-[0_12px_36px_-18px_rgba(247,200,70,0.35)]"
                : "border-white/10 bg-[#0B0F0D] hover:border-white/20"
            }`}
            key={plan.id}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-white">{plan.name}</p>
              {plan.badge ? (
                <span className="rounded-full border border-[#F7C846]/40 bg-[#F7C846]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F7C846]">
                  {plan.badge}
                </span>
              ) : null}
            </div>

            <p className="text-4xl font-semibold tracking-tight text-white">
              {plan.price}
              <span className="text-lg text-gray-400">{plan.period}</span>
            </p>

            {plan.savingsText ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[#F7C846]">{plan.savingsText}</p> : null}

            <p className="mt-4 text-sm leading-relaxed text-gray-400">{plan.description}</p>

            <div className="mt-6 pt-2">
              <button
                className={`inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  plan.recommended
                    ? "bg-[#F7C846] text-[#0B0F0D] hover:bg-[#f5d778]"
                    : "border border-white/15 bg-white/5 text-white hover:border-white/25 hover:bg-white/10"
                }`}
                disabled={Boolean(activePlanId)}
                onClick={() => startCheckout(plan)}
                type="button"
              >
                {activePlanId === plan.id ? "Redirecting..." : plan.cta}
              </button>
            </div>
          </article>
        ))}
      </div>

      {infoMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{infoMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{errorMessage}</p>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type SubscriptionSummary = {
  plan: string;
  planName: string;
  status: string;
  nextBillingDate: string | null;
  customerCode: string | null;
  hasPaystackMetadata: boolean;
  canManageHosted: boolean;
  directCancelSupported: boolean;
  missingMetadataReason: string | null;
};

type SubscriptionResponse = {
  subscription?: SubscriptionSummary;
  error?: string;
  details?: string;
};

function formatStatus(value: string) {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function isNoActiveSubscription(summary: SubscriptionSummary | null) {
  if (!summary) return true;
  const normalized = summary.status.toLowerCase();
  return normalized === "none" || normalized === "cancelled" || summary.plan === "free";
}

export function SubscriptionCard({ initialPlan }: { initialPlan: "free" | "pro" }) {
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"manage" | "cancel" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const noActiveSubscription = useMemo(() => isNoActiveSubscription(subscription), [subscription]);

  useEffect(() => {
    let active = true;

    async function loadSubscription() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/paystack/subscription", { cache: "no-store" });
        const data = (await response.json()) as SubscriptionResponse;
        if (!active) return;

        if (!response.ok || !data.subscription) {
          setErrorMessage(data.error ?? "Failed to load subscription details.");
          setSubscription(null);
          setLoading(false);
          return;
        }

        setSubscription(data.subscription);
        setLoading(false);
      } catch {
        if (!active) return;
        setErrorMessage("Failed to load subscription details.");
        setSubscription(null);
        setLoading(false);
      }
    }

    void loadSubscription();

    return () => {
      active = false;
    };
  }, []);

  async function handleManage() {
    const confirmed = window.confirm("You are about to open Paystack subscription management. Continue?");
    if (!confirmed) return;

    setBusyAction("manage");
    setNotice(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/paystack/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "manage" })
      });
      const data = (await response.json()) as SubscriptionResponse & { manageUrl?: string };

      if (!response.ok || !data.manageUrl) {
        setErrorMessage(data.error ?? "Unable to open subscription management.");
        setBusyAction(null);
        return;
      }

      setNotice("Redirecting to Paystack subscription management...");
      window.location.assign(data.manageUrl);
    } catch {
      setErrorMessage("Unable to open subscription management.");
      setBusyAction(null);
    }
  }

  async function handleCancel() {
    if (!subscription?.directCancelSupported) {
      const confirmed = window.confirm("Direct cancellation is not available. Open Paystack management page to cancel there?");
      if (!confirmed) return;
      await handleManage();
      return;
    }

    const confirmed = window.confirm("Are you sure you want to cancel your subscription?");
    if (!confirmed) return;

    setBusyAction("cancel");
    setNotice(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/paystack/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "cancel" })
      });
      const data = (await response.json()) as SubscriptionResponse;

      if (!response.ok) {
        setErrorMessage(data.error ?? "Unable to cancel subscription.");
        setBusyAction(null);
        return;
      }

      setNotice("Subscription cancellation request completed.");
      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              status: "cancelled",
              nextBillingDate: null
            }
          : prev
      );
      setBusyAction(null);
    } catch {
      setErrorMessage("Unable to cancel subscription.");
      setBusyAction(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Subscription</h2>
          <p className="mt-1 text-sm text-slate-400">Manage or cancel your Paystack subscription.</p>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading subscription details...</p> : null}

      {!loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#0B0F0D] p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Current plan</p>
            <p className="mt-1 text-sm font-medium text-white">{subscription?.planName ?? (initialPlan === "pro" ? "Pro" : "Free")}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0B0F0D] p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Subscription status</p>
            <p className="mt-1 text-sm font-medium text-white">{subscription ? formatStatus(subscription.status) : "Unknown"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0B0F0D] p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Next billing date</p>
            <p className="mt-1 text-sm font-medium text-white">{formatDate(subscription?.nextBillingDate ?? null)}</p>
          </div>
        </div>
      ) : null}

      {!loading && noActiveSubscription ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-[#0B0F0D] px-3 py-2 text-sm text-slate-300">No active subscription found.</p>
      ) : null}

      {!loading && subscription && !subscription.hasPaystackMetadata ? (
        <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          {subscription.missingMetadataReason ?? "Missing Paystack metadata for self-service management."}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{errorMessage}</p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{notice}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="btn-secondary"
          disabled={Boolean(busyAction) || loading || noActiveSubscription || !subscription?.hasPaystackMetadata}
          onClick={() => void handleCancel()}
          type="button"
        >
          {busyAction === "cancel" ? "Cancelling..." : "Cancel Subscription"}
        </button>
        <button
          className="btn-primary"
          disabled={Boolean(busyAction) || loading || noActiveSubscription || !subscription?.canManageHosted}
          onClick={() => void handleManage()}
          type="button"
        >
          {busyAction === "manage" ? "Opening..." : "Manage Subscription"}
        </button>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type VerifyResponse = {
  success?: boolean;
  error?: string;
  plan?: {
    id: "monthly" | "yearly";
    name: string;
    amountDisplay: string;
    intervalLabel: string;
  };
};

type VerifyState = "verifying" | "success" | "failed" | "cancelled";

export function PaymentCallbackClient() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const requestedPlan = searchParams.get("plan");

  const [state, setState] = useState<VerifyState>(reference ? "verifying" : "cancelled");
  const [message, setMessage] = useState<string>(
    reference ? "Confirming your payment securely..." : "Payment was cancelled before completion."
  );

  useEffect(() => {
    if (!reference) return;

    let active = true;

    async function verifyPayment() {
      try {
        const response = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ reference })
        });

        const data = (await response.json()) as VerifyResponse;

        if (!active) return;

        if (!response.ok || !data.success) {
          setState("failed");
          setMessage(data.error ?? "Payment verification failed. Please try again.");
          return;
        }

        setState("success");
        setMessage(`Payment verified for ${data.plan?.name ?? "your selected plan"}. Your account has been upgraded.`);
      } catch {
        if (!active) return;
        setState("failed");
        setMessage("Unable to verify payment right now. Please retry.");
      }
    }

    void verifyPayment();

    return () => {
      active = false;
    };
  }, [reference]);

  const planText = useMemo(() => {
    if (requestedPlan === "monthly") return "Starter Monthly";
    if (requestedPlan === "yearly") return "Starter Yearly";
    return "selected plan";
  }, [requestedPlan]);

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#101513] p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#86EFAC]">Payment Status</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{state === "success" ? "Payment Successful" : "Payment Update"}</h1>
      <p className="mt-3 text-sm text-slate-300">{message}</p>

      <p className="mt-4 text-xs text-slate-400">Requested plan: {planText}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {state === "success" ? (
          <Link className="btn-primary" href="/dashboard">
            Go to Dashboard
          </Link>
        ) : null}

        <Link className="btn-secondary" href="/#pricing">
          Retry Payment
        </Link>

        <Link className="btn-secondary" href="/dashboard">
          Back to Dashboard
        </Link>
      </div>
    </section>
  );
}

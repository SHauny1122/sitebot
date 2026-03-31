import { Suspense } from "react";
import { PaymentCallbackClient } from "./callback-client";

function CallbackFallback() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#101513] p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#86EFAC]">Payment Status</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Payment Update</h1>
      <p className="mt-3 text-sm text-slate-300">Confirming your payment securely...</p>
    </section>
  );
}

export default function PaymentCallbackPage() {
  return (
    <main className="container-shell py-16 md:py-24">
      <Suspense fallback={<CallbackFallback />}>
        <PaymentCallbackClient />
      </Suspense>
    </main>
  );
}

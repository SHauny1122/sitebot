import { Suspense } from "react";
import { AuthCompleteClient } from "./callback-client";

function AuthCompleteFallback() {
  return (
    <main className="container-shell min-h-screen py-10">
      <section className="card mx-auto mt-10 max-w-md p-5 sm:mt-24 sm:p-6">
        <h1 className="mb-2 text-2xl font-semibold text-white">Signing you in...</h1>
        <p className="text-sm text-slate-400">Please wait while we complete your secure login.</p>
      </section>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={<AuthCompleteFallback />}>
      <AuthCompleteClient />
    </Suspense>
  );
}

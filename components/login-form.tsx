"use client";

import { FormEvent, useState } from "react";
import { clientEnv } from "@/lib/env-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`
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
      {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
    </form>
  );
}

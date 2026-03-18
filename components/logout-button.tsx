"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
      type="button"
    >
      Sign out
    </button>
  );
}

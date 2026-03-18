"use client";

import { useState } from "react";

export function EmbedScriptCard({ embedScript }: { embedScript: string }) {
  const [copied, setCopied] = useState(false);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(embedScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mb-6 card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Embed script</h2>
          <p className="text-sm text-slate-600">Paste this before the closing body tag on your site.</p>
        </div>
        <button className="btn-secondary h-9 px-3 text-xs" onClick={copyScript} type="button">
          {copied ? "Copied" : "Copy script"}
        </button>
      </div>

      <pre className="overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
        {embedScript}
      </pre>
    </div>
  );
}

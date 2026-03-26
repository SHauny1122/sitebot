"use client";

import { useState } from "react";

type InstallTab = "wordpress" | "manual";

export function EmbedScriptCard({ botId, embedScript }: { botId: string; embedScript: string }) {
  const [tab, setTab] = useState<InstallTab>("wordpress");
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedBotId, setCopiedBotId] = useState(false);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(embedScript);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 1500);
    } catch {
      setCopiedScript(false);
    }
  };

  const copyBotId = async () => {
    try {
      await navigator.clipboard.writeText(botId);
      setCopiedBotId(true);
      setTimeout(() => setCopiedBotId(false), 1500);
    } catch {
      setCopiedBotId(false);
    }
  };

  return (
    <div className="mb-6 card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Install your chatbot</h2>
        <p className="mt-1 text-sm text-slate-400">Choose WordPress for a guided setup or use the manual embed script.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition ${
            tab === "wordpress"
              ? "border-[#86EFAC]/30 bg-[#86EFAC]/10 text-[#86EFAC]"
              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
          }`}
          onClick={() => setTab("wordpress")}
          type="button"
        >
          WordPress
        </button>
        <button
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition ${
            tab === "manual"
              ? "border-[#86EFAC]/30 bg-[#86EFAC]/10 text-[#86EFAC]"
              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
          }`}
          onClick={() => setTab("manual")}
          type="button"
        >
          Manual Install
        </button>
      </div>

      {tab === "wordpress" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Install the plugin in WordPress, paste your Bot ID, and your chatbot will appear automatically.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <a
              className="btn-primary h-10 px-4 text-xs uppercase tracking-wide"
              download
              href="/downloads/sitechat-ai-chatbot.zip"
            >
              Download WordPress Plugin
            </a>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0B0F0D] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Bot ID</p>
              <button className="btn-secondary h-8 px-2.5 text-[11px]" onClick={copyBotId} type="button">
                {copiedBotId ? "Copied" : "Copy Bot ID"}
              </button>
            </div>
            <p className="break-all rounded-lg border border-white/10 bg-[#111714] px-2.5 py-2 text-xs text-slate-300">{botId}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0B0F0D] p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Setup steps</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-slate-300">
              <li>Download the plugin zip.</li>
              <li>In WordPress, go to Plugins &gt; Add New &gt; Upload Plugin.</li>
              <li>Activate “SiteChat AI Chatbot”.</li>
              <li>Open SiteChat settings in the WordPress admin.</li>
              <li>Paste your Bot ID.</li>
              <li>Save and visit your website.</li>
            </ol>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-300">Paste this before the closing body tag on your site.</p>
            <button className="btn-secondary h-9 px-3 text-xs" onClick={copyScript} type="button">
              {copiedScript ? "Copied" : "Copy script"}
            </button>
          </div>

          <pre className="overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-[#0B0F0D] p-3 text-xs text-slate-100">
            {embedScript}
          </pre>
        </div>
      )}
    </div>
  );
}

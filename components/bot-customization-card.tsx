"use client";

import { useState } from "react";
import type { BotAppearance } from "@/lib/bot-appearance";

type Props = {
  botId: string;
  initialAppearance: BotAppearance;
};

export function BotCustomizationCard({ botId, initialAppearance }: Props) {
  const [appearance, setAppearance] = useState<BotAppearance>(initialAppearance);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof BotAppearance>(key: K, value: BotAppearance[K]) => {
    setAppearance((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const saveAppearance = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch(`/api/bots/${botId}/appearance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appearance)
      });

      const data = await response.json();
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save settings");
        return;
      }

      setAppearance(data.appearance as BotAppearance);
      setSaved(true);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Customize your chatbot</h2>
        <p className="mt-1 text-sm text-slate-600">Adjust your widget look and welcome experience.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Button Text</span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400"
            maxLength={30}
            onChange={(event) => setField("buttonText", event.target.value)}
            type="text"
            value={appearance.buttonText}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Button Color</span>
          <input
            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
            onChange={(event) => setField("buttonColor", event.target.value)}
            type="color"
            value={appearance.buttonColor}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Button Style</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400"
            onChange={(event) => setField("buttonStyle", event.target.value as BotAppearance["buttonStyle"])}
            value={appearance.buttonStyle}
          >
            <option value="circle">Circle</option>
            <option value="pill">Pill</option>
            <option value="rounded">Rounded</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Widget Title</span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400"
            maxLength={60}
            onChange={(event) => setField("widgetTitle", event.target.value)}
            type="text"
            value={appearance.widgetTitle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Header Color</span>
          <input
            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
            onChange={(event) => setField("headerColor", event.target.value)}
            type="color"
            value={appearance.headerColor}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Position</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400"
            onChange={(event) => setField("position", event.target.value as BotAppearance["position"])}
            value={appearance.position}
          >
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Welcome Message</span>
        <textarea
          className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400"
          maxLength={500}
          onChange={(event) => setField("welcomeMessage", event.target.value)}
          value={appearance.welcomeMessage}
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary h-10 px-4 text-sm" disabled={saving} onClick={saveAppearance} type="button">
          {saving ? "Saving..." : "Save"}
        </button>
        {saved ? <p className="text-sm text-emerald-600">Saved successfully</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}

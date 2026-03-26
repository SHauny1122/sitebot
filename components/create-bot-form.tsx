"use client";

import { FormEvent, useState } from "react";

type Props = {
  onCreated?: () => void;
};

export function CreateBotForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const response = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, websiteUrl })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setResult(data.error ?? "Failed to create bot");
      return;
    }

    setName("");
    setWebsiteUrl("");
    setResult(`Bot created and trained (${data.pages} pages).`);
    onCreated?.();
  };

  return (
    <form className="card p-5" onSubmit={submit}>
      <h2 className="mb-4 text-lg font-semibold text-white">Create chatbot</h2>
      <div className="space-y-3">
        <input
          className="input"
          placeholder="Bot name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          className="input"
          placeholder="https://yourwebsite.com"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          type="url"
          required
        />
      </div>
      <button className="btn-primary mt-4" type="submit" disabled={loading}>
        {loading ? "Scraping + training..." : "Create chatbot"}
      </button>
      {result ? <p className="mt-3 text-sm text-slate-300">{result}</p> : null}
    </form>
  );
}

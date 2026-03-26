"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type BotRow = {
  id: string;
  name: string;
  website_url: string;
  status: string;
  created_at: string;
};

type UiStatus = "creating" | "scraping" | "training" | "ready" | "failed";

type UiBot = {
  id: string;
  name: string;
  website_url: string;
  status: UiStatus;
  created_at: string;
};

const ACTIVE_STATUSES: UiStatus[] = ["creating", "scraping", "training"];
const STAGES: UiStatus[] = ["creating", "scraping", "training"];

const ROTATING_MESSAGES: Record<UiStatus, string[]> = {
  creating: ["Preparing your chatbot...", "Getting things set up..."],
  scraping: ["Scanning pages...", "Extracting content...", "Organizing website context..."],
  training: ["Training AI model...", "Building response memory...", "Almost ready..."],
  ready: ["Ready"],
  failed: ["Something went wrong"]
};

function mapServerStatus(status: string): UiStatus {
  if (status === "ready") return "ready";
  if (status === "failed") return "failed";
  return "training";
}

function progressForStatus(status: UiStatus) {
  switch (status) {
    case "creating":
      return 20;
    case "scraping":
      return 55;
    case "training":
      return 85;
    case "ready":
      return 100;
    case "failed":
      return 100;
    default:
      return 0;
  }
}

function buttonTextForStatus(status: UiStatus) {
  if (status === "creating") return "Creating...";
  if (status === "scraping") return "Scraping site...";
  if (status === "training") return "Training bot...";
  return "Create chatbot";
}

function statusTone(status: UiStatus) {
  if (status === "ready") return "text-[#86EFAC]";
  if (status === "failed") return "text-rose-400";
  return "text-slate-400";
}

export function DashboardBotManager({ initialBots }: { initialBots: BotRow[] }) {
  const [bots, setBots] = useState<UiBot[]>(() =>
    initialBots.map((bot) => ({
      ...bot,
      status: mapServerStatus(bot.status)
    }))
  );
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [activeStatus, setActiveStatus] = useState<UiStatus | null>(null);
  const [activeTempId, setActiveTempId] = useState<string | null>(null);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const stageTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const inProgress = activeStatus !== null && ACTIVE_STATUSES.includes(activeStatus);
  const shouldPoll = useMemo(
    () => bots.some((bot) => ACTIVE_STATUSES.includes(bot.status)),
    [bots]
  );

  const targetProgress = useMemo(() => {
    if (!activeStatus) return 0;
    return progressForStatus(activeStatus);
  }, [activeStatus]);

  const currentStageIndex = useMemo(() => {
    if (!activeStatus) return -1;
    if (activeStatus === "ready" || activeStatus === "failed") return STAGES.length - 1;
    return STAGES.indexOf(activeStatus);
  }, [activeStatus]);

  const stageDone = useMemo(() => {
    if (activeStatus === "ready") {
      return STAGES.map(() => true);
    }

    if (!activeStatus || currentStageIndex < 0) {
      return STAGES.map(() => false);
    }

    return STAGES.map((_, index) => index < currentStageIndex);
  }, [activeStatus, currentStageIndex]);

  const rotatingCopy = useMemo(() => {
    const key = activeStatus ?? "creating";
    const options = ROTATING_MESSAGES[key];
    return options[messageIndex % options.length];
  }, [activeStatus, messageIndex]);

  const clearStageTimeouts = () => {
    stageTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));
    stageTimeouts.current = [];
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedWebsite = websiteUrl.trim();
    if (!trimmedName || !trimmedWebsite || inProgress) return;

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    setErrorMessage(null);
    setActiveTempId(tempId);
    setActiveBotId(null);
    setActiveStatus("creating");
    setDisplayProgress(progressForStatus("creating"));
    setMessageIndex(0);

    clearStageTimeouts();

    setBots((prev) => [
      {
        id: tempId,
        name: trimmedName,
        website_url: trimmedWebsite,
        status: "creating",
        created_at: now
      },
      ...prev
    ]);

    stageTimeouts.current.push(setTimeout(() => {
      setActiveStatus((prev) => {
        if (prev === "creating") return "scraping";
        return prev;
      });
      setBots((prev) =>
        prev.map((bot) =>
          bot.id === tempId && bot.status === "creating" ? { ...bot, status: "scraping" } : bot
        )
      );
    }, 900));

    stageTimeouts.current.push(setTimeout(() => {
      setActiveStatus((prev) => {
        if (prev === "creating" || prev === "scraping") return "training";
        return prev;
      });
      setBots((prev) =>
        prev.map((bot) =>
          bot.id === tempId && bot.status !== "ready" && bot.status !== "failed"
            ? { ...bot, status: "training" }
            : bot
        )
      );
    }, 3000));

    const response = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName, websiteUrl: trimmedWebsite })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error ?? "Failed to create bot";
      setErrorMessage(message);
      setActiveStatus("failed");
      clearStageTimeouts();
      setActiveTempId(null);
      setActiveBotId(null);
      setBots((prev) => prev.map((bot) => (bot.id === tempId ? { ...bot, status: "failed" } : bot)));
      return;
    }

    const created: BotRow = data.bot;
    if (created?.id) {
      setActiveBotId(created.id);
      setBots((prev) =>
        prev.map((bot) =>
          bot.id === tempId
            ? {
                id: created.id,
                name: created.name,
                website_url: created.website_url,
                created_at: created.created_at,
                status: "training"
              }
            : bot
        )
      );
    } else {
      setBots((prev) => prev.map((bot) => (bot.id === tempId ? { ...bot, status: "failed" } : bot)));
      setErrorMessage("Bot was created but status tracking failed. Please retry.");
      setActiveStatus("failed");
      clearStageTimeouts();
      return;
    }

    setName("");
    setWebsiteUrl("");
    setActiveTempId(null);
    setActiveStatus("training");
  };

  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;

    const poll = async () => {
      const response = await fetch("/api/bots", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as { bots?: BotRow[] };
      const serverBots = payload.bots ?? [];
      const serverMap = new Map(serverBots.map((bot) => [bot.id, bot]));

      if (cancelled) return;

      setBots((prev) => {
        const next = prev.map((bot) => {
          if (bot.id.startsWith("temp-")) return bot;

          const latest = serverMap.get(bot.id);
          if (!latest) return bot;

          const mapped = mapServerStatus(latest.status);
          const keepUiStatus =
            mapped === "training" && (bot.status === "creating" || bot.status === "scraping" || bot.status === "training");

          return {
            ...bot,
            name: latest.name,
            website_url: latest.website_url,
            created_at: latest.created_at,
            status: keepUiStatus ? bot.status : mapped
          };
        });

        const existing = new Set(next.map((bot) => bot.id));
        for (const bot of serverBots) {
          if (!existing.has(bot.id)) {
            next.push({
              id: bot.id,
              name: bot.name,
              website_url: bot.website_url,
              created_at: bot.created_at,
              status: mapServerStatus(bot.status)
            });
          }
        }

        return next.sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
    };

    poll();
    const interval = setInterval(poll, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [shouldPoll]);

  useEffect(() => {
    if (!activeBotId) return;
    const active = bots.find((bot) => bot.id === activeBotId);
    if (!active) return;

    if (active.status === "ready") {
      clearStageTimeouts();
      setActiveStatus(null);
      setActiveBotId(null);
      setErrorMessage(null);
    }

    if (active.status === "failed") {
      clearStageTimeouts();
      setActiveStatus(null);
      setActiveBotId(null);
      setErrorMessage("Bot creation failed. Please check the URL and try again.");
    }
  }, [activeBotId, bots]);

  useEffect(() => {
    if (!activeTempId || !activeStatus) return;
    if (!ACTIVE_STATUSES.includes(activeStatus)) return;

    setBots((prev) => prev.map((bot) => (bot.id === activeTempId ? { ...bot, status: activeStatus } : bot)));
  }, [activeStatus, activeTempId]);

  useEffect(() => () => clearStageTimeouts(), []);

  useEffect(() => {
    if (!inProgress || !activeStatus) return;

    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex((prev) => prev + 1);
    }, 1500);

    return () => clearInterval(interval);
  }, [inProgress, activeStatus]);

  useEffect(() => {
    if (!activeStatus) {
      setDisplayProgress(0);
      return;
    }

    if (activeStatus === "ready" || activeStatus === "failed") {
      setDisplayProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev < targetProgress) {
          return Math.min(targetProgress, prev + 3);
        }

        if (activeStatus === "training" && prev < 96) {
          return Math.min(96, prev + 0.7);
        }

        return prev;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [activeStatus, targetProgress]);

  const progress = Math.round(displayProgress);

  return (
    <>
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
        <button className="btn-primary mt-4" type="submit" disabled={inProgress}>
          {inProgress && activeStatus ? buttonTextForStatus(activeStatus) : "Create chatbot"}
        </button>

        {inProgress && activeStatus ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0B0F0D] p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#86EFAC]/30 border-t-[#86EFAC]" />
                <span>{buttonTextForStatus(activeStatus)}</span>
              </div>
              <span>{progress}%</span>
            </div>
            <p className="mb-3 text-sm text-slate-300">{rotatingCopy}</p>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-[#86EFAC] transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">
              {STAGES.map((stage, index) => {
                const isActive = index === currentStageIndex && ACTIVE_STATUSES.includes(activeStatus);
                const isDone = stageDone[index];
                const tone = isDone
                  ? "border-[#86EFAC]/30 bg-[#86EFAC]/10 text-[#86EFAC]"
                  : isActive
                    ? "border-[#86EFAC]/30 bg-[#86EFAC]/10 text-[#86EFAC]"
                    : "border-white/10 bg-white/5 text-slate-400";

                return (
                  <span className={`flex items-center justify-center gap-1 rounded-md border px-1.5 py-1 ${tone}`} key={stage}>
                    <span>{isDone ? "✓" : index + 1}</span>
                    <span>{stage}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        {errorMessage ? <p className="mt-3 text-sm text-rose-400">{errorMessage}</p> : null}
      </form>

      <div className="card p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Your bots</h2>
        <div className="space-y-3">
          {bots.map((bot) => {
            const status = bot.status.toUpperCase();
            const cardClass =
              "block rounded-xl border border-white/10 bg-[#0B0F0D] p-3 transition " +
              (bot.status === "ready" ? "hover:border-[#86EFAC]/40 hover:bg-[#111714]" : "opacity-90");

            const body = (
              <>
                <p className="font-medium text-white">{bot.name}</p>
                <p className="mt-1 break-all text-xs text-slate-400">{bot.website_url}</p>
                <p className={`mt-2 text-xs uppercase tracking-wide ${statusTone(bot.status)}`}>{status}</p>
              </>
            );

            if (bot.id.startsWith("temp-")) {
              return (
                <div className={cardClass} key={bot.id}>
                  {body}
                </div>
              );
            }

            return (
              <Link className={cardClass} href={`/dashboard/${bot.id}`} key={bot.id}>
                {body}
              </Link>
            );
          })}
          {bots.length === 0 ? <p className="text-sm text-slate-400">No bots yet. Create your first one.</p> : null}
        </div>
      </div>
    </>
  );
}

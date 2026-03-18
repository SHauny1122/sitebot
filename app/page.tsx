import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100">
      <div className="container-shell py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-brand-700">SiteChat</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-6xl">
            Add an AI Chatbot To Your Website In 60 Seconds
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
            Paste your website URL, train instantly, and deploy an embeddable chatbot script on any site.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link className="btn-primary w-full sm:w-auto" href={user ? "/dashboard" : "/login"}>
              Create Chatbot
            </Link>
            <Link className="btn-secondary w-full sm:w-auto" href="/dashboard">
              View Dashboard
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-4 md:grid-cols-3">
          <div className="card p-5">
            <h3 className="font-semibold">Website Scraping</h3>
            <p className="mt-2 text-sm text-slate-600">Crawls your pages and extracts clean text content.</p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">AI Embeddings</h3>
            <p className="mt-2 text-sm text-slate-600">Trains your bot on vectorized chunks for relevant answers.</p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">Embeddable Widget</h3>
            <p className="mt-2 text-sm text-slate-600">Drop one script tag into any website and go live instantly.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

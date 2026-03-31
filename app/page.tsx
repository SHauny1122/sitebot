import Link from "next/link";
import { redirect } from "next/navigation";
import Script from "next/script";
import { Code2, Globe, SlidersHorizontal, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PricingPlanGrid } from "@/components/pricing-plan-grid";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleQueryValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const code = getSingleQueryValue(params?.code);

  if (code) {
    const callbackParams = new URLSearchParams({ code });
    const intent = getSingleQueryValue(params?.intent);
    const next = getSingleQueryValue(params?.next);
    const plan = getSingleQueryValue(params?.plan);

    const hasLegacyMonthlyPlaceholder = params && Object.prototype.hasOwnProperty.call(params, "paystack-monthly-placeholder");
    const hasLegacyYearlyPlaceholder = params && Object.prototype.hasOwnProperty.call(params, "paystack-yearly-placeholder");

    const resolvedIntent = intent ?? (hasLegacyMonthlyPlaceholder || hasLegacyYearlyPlaceholder ? "checkout" : null);
    const resolvedPlan = plan ?? (hasLegacyYearlyPlaceholder ? "yearly" : hasLegacyMonthlyPlaceholder ? "monthly" : null);

    if (resolvedIntent) {
      callbackParams.set("intent", resolvedIntent);
    }
    if (next?.startsWith("/") && !next.startsWith("//")) {
      callbackParams.set("next", next);
    }
    if (resolvedPlan === "monthly" || resolvedPlan === "yearly") {
      callbackParams.set("plan", resolvedPlan);
    }

    redirect(`/auth/callback?${callbackParams.toString()}` as Parameters<typeof redirect>[0]);
  }

  const user = await getCurrentUser();
  const pricingPlans = [
    {
      id: "monthly",
      name: "Starter Monthly",
      price: "$9.99",
      period: "/month",
      description: "Chatbot training, customization, and script install included.",
      cta: "Choose Monthly",
      badge: null,
      recommended: false,
      savingsText: null
    },
    {
      id: "yearly",
      name: "Starter Yearly",
      price: "$49",
      period: "/year",
      description: "Everything in Starter, with the best value yearly price.",
      cta: "Choose Yearly",
      badge: "Best Value",
      recommended: true,
      savingsText: "Save 59%"
    }
  ] as const;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#0B0F0D] text-white scroll-smooth scroll-pt-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.2] [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:56px_56px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.7)_0.6px,transparent_0.6px)] [background-size:3px_3px]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 left-1/2 z-0 h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-[#86EFAC]/8 blur-[140px]" />
      <div aria-hidden="true" className="pointer-events-none absolute top-24 left-[58%] z-0 h-[480px] w-[680px] rounded-full bg-[#F7C846]/6 blur-[150px]" />

      <div className="relative z-10">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F0D]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:py-4">
          <p className="text-base font-bold tracking-tight text-white">
            Auto<span className="text-[#F7C846] drop-shadow-[0_0_10px_rgba(247,200,70,0.25)]">Chatbot</span>
          </p>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            <a className="text-gray-300 transition hover:text-white" href="#features">
              Features
            </a>
            <a className="text-gray-300 transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <Link className="text-gray-300 transition hover:text-white" href="/login">
              Login
            </Link>
          </nav>

          <details className="group relative md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-200">
              Menu
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#101513] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <a className="block rounded-lg px-3 py-2.5 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white" href="#features">
                Features
              </a>
              <a className="block rounded-lg px-3 py-2.5 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white" href="#pricing">
                Pricing
              </a>
              <Link className="block rounded-lg px-3 py-2.5 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white" href="/login">
                Login
              </Link>
            </div>
          </details>
        </div>
      </header>

      <section className="mb-24 px-6 py-16 md:mb-32 md:py-32">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F0D] px-4 py-16 sm:px-8 sm:py-20 md:px-12 md:py-24">
            <div className="pointer-events-none absolute left-1/2 top-6 h-64 w-64 -translate-x-1/2 rounded-full bg-[#86EFAC]/14 blur-3xl" />
            <div className="pointer-events-none absolute right-[12%] top-4 h-56 w-56 rounded-full bg-[#F7C846]/10 blur-3xl" />

            <div className="relative mx-auto max-w-4xl text-center">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-[#86EFAC]">NEXT GEN AI CHATBOT</p>
              <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[0.92] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Turn Your Website Into a Chatbot in One Click
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-sm text-gray-400 sm:text-base">
                Transform your website into an intelligent AI assistant that answers questions, captures leads, and helps
                you convert visitors — automatically.
              </p>

            </div>
          </section>
        </div>
      </section>

      <section className="relative mt-20 mb-24 scroll-mt-24 border-t border-white/5 px-6 py-16 md:mt-32 md:mb-32 md:py-32" id="features">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything you need to launch your chatbot fast.</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-400 sm:text-base">
            Train on your site content, customize your assistant, and go live with one script on Manual, WordPress, or Wix.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4 md:mt-12 md:gap-8">
            <article className="group min-h-[220px] rounded-2xl border border-white/20 bg-[#111] p-6 sm:p-8 md:min-h-[240px] md:p-10 transition duration-200 hover:-translate-y-1 hover:border-[#86EFAC]/40 hover:shadow-[0_8px_30px_-12px_rgba(134,239,172,0.3)]">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-[#0F1412] text-[#86EFAC] transition duration-200 group-hover:border-[#86EFAC]/35 group-hover:bg-[#86EFAC]/10">
                <Globe aria-hidden="true" className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">Trained on your website</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-300">
                Paste your URL and your bot learns from your pages, docs, and core business content.
              </p>
            </article>

            <article className="group min-h-[220px] rounded-2xl border border-white/20 bg-[#111] p-6 sm:p-8 md:min-h-[240px] md:p-10 transition duration-200 hover:-translate-y-1 hover:border-[#86EFAC]/40 hover:shadow-[0_8px_30px_-12px_rgba(134,239,172,0.3)]">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-[#0F1412] text-[#86EFAC] transition duration-200 group-hover:border-[#86EFAC]/35 group-hover:bg-[#86EFAC]/10">
                <SlidersHorizontal aria-hidden="true" className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">Customization options</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-300">Adjust widget style, title, color, and welcome message to match your brand.</p>
            </article>

            <article className="group min-h-[220px] rounded-2xl border border-white/20 bg-[#111] p-6 sm:p-8 md:min-h-[240px] md:p-10 transition duration-200 hover:-translate-y-1 hover:border-[#86EFAC]/40 hover:shadow-[0_8px_30px_-12px_rgba(134,239,172,0.3)]">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-[#0F1412] text-[#86EFAC] transition duration-200 group-hover:border-[#86EFAC]/35 group-hover:bg-[#86EFAC]/10">
                <Code2 aria-hidden="true" className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">Copy-paste install</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-300">Works with Wix too — no app install needed, just paste one script in Wix Custom Code.</p>
            </article>

            <article className="group min-h-[220px] rounded-2xl border border-white/20 bg-[#111] p-6 sm:p-8 md:min-h-[240px] md:p-10 transition duration-200 hover:-translate-y-1 hover:border-[#86EFAC]/40 hover:shadow-[0_8px_30px_-12px_rgba(134,239,172,0.3)]">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-[#0F1412] text-[#86EFAC] transition duration-200 group-hover:border-[#86EFAC]/35 group-hover:bg-[#86EFAC]/10">
                <Zap aria-hidden="true" className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">Quick setup</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-300">From URL to a live assistant quickly, without a complex implementation process.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative scroll-mt-24 border-t border-white/5 px-6 py-16 md:py-24" id="pricing">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#101513] p-6 sm:p-8 md:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#86EFAC]">Pricing</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Choose your plan</h2>
            <p className="mt-3 max-w-2xl text-sm text-gray-400 sm:text-base">Simple pricing with flexible monthly or yearly billing for your chatbot launch.</p>

            <PricingPlanGrid
              isAuthenticated={Boolean(user)}
              plans={pricingPlans}
            />
          </div>
        </div>
      </section>

      <section className="relative mt-20 mb-24 border-t border-white/5 px-6 py-16 md:mt-32 md:mb-24 md:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            <article className="min-h-[260px] rounded-2xl border border-white/15 bg-[#0F1110] p-6 sm:p-8 md:min-h-[300px] md:p-10 transition duration-200 hover:-translate-y-1 hover:border-[#86EFAC]/40 hover:shadow-[0_10px_36px_-14px_rgba(134,239,172,0.32)]">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#86EFAC]/20 bg-[#86EFAC]/10">
                <svg aria-hidden="true" className="h-6 w-6 text-[#86EFAC]" fill="none" viewBox="0 0 24 24">
                  <path d="M13.5 2.5 6 13h4l-1 8.5L18 10h-4.5l0-7.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#86EFAC]">01 / SPEED</p>
              <h3 className="mt-5 text-3xl font-semibold tracking-tight">Instant Training</h3>
              <p className="mt-5 text-base leading-relaxed text-gray-300">
                Our system processes your website in seconds, so your chatbot is ready almost instantly.
              </p>
            </article>

            <article className="min-h-[280px] rounded-2xl border border-white/15 bg-[#0F1110] p-8 md:min-h-[300px] md:p-10 transition duration-200 hover:-translate-y-1 hover:border-[#86EFAC]/40 hover:shadow-[0_10px_36px_-14px_rgba(134,239,172,0.32)]">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#86EFAC]/20 bg-[#86EFAC]/10">
                <svg aria-hidden="true" className="h-6 w-6 text-[#86EFAC]" fill="none" viewBox="0 0 24 24">
                  <path d="M12 3.5 5.5 6.2v5.2c0 4.1 2.6 7.9 6.5 9.1 3.9-1.2 6.5-5 6.5-9.1V6.2L12 3.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                  <path d="m9.5 12 1.8 1.8 3.2-3.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#86EFAC]">02 / SECURITY</p>
              <h3 className="mt-5 text-3xl font-semibold tracking-tight">Secure by Default</h3>
              <p className="mt-5 text-base leading-relaxed text-gray-300">
                Your data stays private. We use modern security practices to protect your content and conversations.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/5 px-6 py-16 md:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[600px] w-[600px] rounded-full bg-green-400/20 blur-[120px]" />
        </div>
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-300/10 blur-[140px]" />
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F0D]/80 px-6 py-14 text-center backdrop-blur-sm sm:px-10 md:px-14 md:py-20">
            <div className="relative z-10">
              <p className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl md:text-6xl">
                Ready to turn your website into a 24/7 assistant?
              </p>

              <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-gray-400">
                Let your chatbot answer questions, capture leads, and support your visitors — automatically.
              </p>

              <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  className="inline-flex h-14 w-full items-center justify-center rounded-full bg-[#9AF4B6] px-7 text-lg font-semibold text-[#0B0F0D] transition hover:bg-[#86EFAC] hover:shadow-[0_0_20px_rgba(134,239,172,0.6)] sm:w-auto sm:min-w-[220px]"
                  href={user ? "/dashboard" : "/login"}
                >
                  Get Started Free
                </Link>
                <Link
                  className="inline-flex h-14 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 text-lg font-semibold text-white transition hover:border-white/20 hover:bg-white/10 sm:w-auto sm:min-w-[220px]"
                  href={user ? "/dashboard" : "/login"}
                >
                  Book a Demo
                </Link>
              </div>

              <p className="mt-8 text-sm text-gray-500">No credit card required. 14-day free trial.</p>
            </div>
          </div>
        </div>
      </section>

      </div>
      <Script
        src="https://sitebot-kappa.vercel.app/embed.js"
        data-bot="a499de6d-b945-4886-a924-cc3c27e9e609"
        strategy="afterInteractive"
      />
    </main>
  );
}

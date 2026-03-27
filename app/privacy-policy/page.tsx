import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AutoChatbot",
  description: "Privacy Policy for AutoChatbot"
};

export default function PrivacyPolicyPage() {
  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Effective Date: March 27, 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">What We Collect</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-slate-300">
            <li>Email address (for authentication)</li>
            <li>Website URLs submitted by users</li>
            <li>Chatbot interaction data (messages between users and bots)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">How We Use Data</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-slate-300">
            <li>Provide and operate the chatbot service</li>
            <li>Improve chatbot performance</li>
            <li>Communicate with users</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Third-Party Services</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-slate-300">
            <li>Supabase (authentication and database)</li>
            <li>OpenAI (AI responses)</li>
            <li>Paystack (payments)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Data Sales</h2>
          <p className="text-slate-300">We do not sell user data.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Data Security</h2>
          <p className="text-slate-300">We take reasonable measures to protect user data.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">User Rights</h2>
          <p className="text-slate-300">Users can request deletion of their data by contacting us.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Contact</h2>
          <p className="text-slate-300">For privacy requests, email support@autochatbot.chat.</p>
        </section>
      </div>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | AutoChatbot",
  description: "Terms of Service for AutoChatbot"
};

export default function TermsOfServicePage() {
  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Terms of Service</h1>
          <p className="text-sm text-slate-400">Effective Date: March 27, 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Description</h2>
          <p className="text-slate-300">This platform allows users to create AI-powered chatbots trained on their website content.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Usage Rules</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-slate-300">
            <li>No illegal use</li>
            <li>No abuse, spam, or harmful content</li>
            <li>Users are responsible for their chatbot behavior</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">AI Disclaimer</h2>
          <p className="text-slate-300">
            AI responses may not always be accurate. We are not liable for damages caused by chatbot responses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Payments</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-slate-300">
            <li>Some features may require payment</li>
            <li>All payments are final unless otherwise stated</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Termination</h2>
          <p className="text-slate-300">We may suspend or terminate accounts that violate these terms.</p>
        </section>
      </div>
    </main>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0F0D] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold tracking-wide text-white">AutoChatbot</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
          <a className="transition hover:text-[#86EFAC]" href="/privacy-policy">
            Privacy Policy
          </a>
          <span className="text-slate-600">|</span>
          <a className="transition hover:text-[#86EFAC]" href="/terms-of-service">
            Terms of Service
          </a>
          <span className="text-slate-600">|</span>
          <a className="transition hover:text-[#86EFAC]" href="mailto:support@autochatbot.chat">
            support@autochatbot.chat
          </a>
        </div>
      </div>
    </footer>
  );
}

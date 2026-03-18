import * as cheerio from "cheerio";
import { normalizeUrl } from "@/lib/text";

type Page = {
  url: string;
  title: string;
  content: string;
};

function isSameHost(base: URL, candidate: URL) {
  return base.host === candidate.host;
}

function shouldIgnorePath(pathname: string) {
  return /\.(png|jpg|jpeg|gif|svg|pdf|zip|webp|ico|mp4|webm)$/i.test(pathname);
}

export async function scrapeWebsite(seedUrl: string, maxPages = 15): Promise<Page[]> {
  const normalizedSeed = normalizeUrl(seedUrl);
  const base = new URL(normalizedSeed);
  const queue = [normalizedSeed];
  const seen = new Set<string>();
  const pages: Page[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);

    try {
      const response = await fetch(current, {
        headers: {
          "User-Agent": "SiteChatBot/1.0 (+https://sitechat.ai)"
        }
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("text/html")) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $("script,style,noscript,iframe,svg").remove();
      const title = ($("title").first().text() || current).trim();
      const content = $("body").text().replace(/\s+/g, " ").trim();

      if (content.length > 80) {
        pages.push({ url: current, title, content });
      }

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        try {
          const next = new URL(href, current);
          next.hash = "";
          next.search = "";

          if (!isSameHost(base, next)) return;
          if (shouldIgnorePath(next.pathname)) return;

          const normalized = next.toString().replace(/\/$/, "");
          if (!seen.has(normalized) && queue.length + pages.length < maxPages * 3) {
            queue.push(normalized);
          }
        } catch {
          return;
        }
      });
    } catch {
      continue;
    }
  }

  return pages;
}

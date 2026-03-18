export function chunkText(input: string, maxLen = 900) {
  const clean = input.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < clean.length) {
    const slice = clean.slice(cursor, cursor + maxLen);
    chunks.push(slice);
    cursor += maxLen - 120;
  }
  return chunks;
}

export function normalizeUrl(url: string) {
  const normalized = new URL(url);
  normalized.hash = "";
  normalized.search = "";
  return normalized.toString().replace(/\/$/, "");
}

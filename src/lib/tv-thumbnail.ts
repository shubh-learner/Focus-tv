export function upgradeTvThumbnailUrl(
  url: string | null | undefined
): string | null | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "i.ytimg.com" || !parsed.pathname.endsWith("/mqdefault.jpg")) {
      return url;
    }
    parsed.pathname = parsed.pathname.replace(/\/mqdefault\.jpg$/, "/sddefault.jpg");
    return parsed.toString();
  } catch {
    return url;
  }
}

// The TV runs inside an Android WebView; its UA contains "; wv". The cookie is
// a fallback for the rare WebView without that marker.
export function isTvCallback(userAgent?: string | null, tvCookie?: string): boolean {
  return userAgent?.includes("; wv") === true || tvCookie === "1";
}

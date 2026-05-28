/** Convert a file-system or API path to an authenticated resource URL.

 * Two formats supported:
 *   /api/resource/{task_id}/{filepath}  → append ?token=xxx
 *   /output/{task_id}/{filepath}        → convert to /api/resource/...?token=xxx
 *   ./output/... or ../output/...       → same conversion
 */
export const toResourceUrl = (p: string): string => {
  let normalized = p;
  if (p.startsWith("/output/")) {
    normalized = p.replace(/^\/output/, "/api/resource");
  } else if (p.startsWith("./output/") || p.startsWith("../output/")) {
    normalized = p.replace(/^.+\/output/, "/api/resource");
  }

  // Already a resource path or something else
  if (!normalized.startsWith("/api/resource/")) return p;

  const token = getUserToken();
  if (!token) return "";  // no token → skip image request, avoid 401 noise
  const sep = normalized.includes("?") ? "&" : "?";
  return `${normalized}${sep}token=${encodeURIComponent(token)}`;
};

/** Legacy alias — now routes through authenticated resource API */
export const toWebUrl = toResourceUrl;

/** Get the current user token from localStorage */
function getUserToken(): string | null {
  try {
    const raw = localStorage.getItem("aigc_user_token");
    if (raw) return raw;
  } catch {}
  return null;
}

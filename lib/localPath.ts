// Heuristic for telling a local file-system path (e.g. "/Users/ken/report.pdf"
// or "~/Applications/Xcode.app") apart from a normal web URL. Anything with
// a URL scheme (http:, https:, mailto:, etc.) is treated as a regular link;
// everything else that looks like an absolute or home-relative path is
// opened on the user's own machine instead of being navigated to.
export function isLocalPath(value: string): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false; // has a URL scheme
  return trimmed.startsWith('/') || trimmed.startsWith('~');
}

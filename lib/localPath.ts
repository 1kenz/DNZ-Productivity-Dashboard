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

export type LinkKind = 'app' | 'file' | 'web';

/** 'app' for a macOS .app bundle path, 'file' for any other local path,
 *  'web' for a normal URL -- used to pick a consistent icon/label across
 *  LinkButton, LinkGroupDetail and AppPicker. */
export function getLinkKind(value: string): LinkKind {
  const trimmed = (value || '').trim();
  if (!isLocalPath(trimmed)) return 'web';
  return /\.app\/?$/i.test(trimmed) ? 'app' : 'file';
}

/** A short, human-friendly label for a link's target: the app/file name
 *  for a local path, or the bare hostname for a web URL -- the full
 *  path/URL is often too long to be useful at a glance and is still
 *  available as a tooltip via the `title` attribute. */
export function getLinkDisplayText(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (isLocalPath(trimmed)) {
    const parts = trimmed.replace(/\/$/, '').split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  try {
    return new URL(trimmed).hostname.replace(/^www\./, '');
  } catch {
    return trimmed;
  }
}

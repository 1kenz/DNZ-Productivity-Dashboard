// A small curated list of common web apps (Google Workspace, and a few
// other everyday ones) offered alongside native macOS apps in AppPicker,
// plus a per-device "add your own" list persisted in localStorage. These
// are just name+url pairs -- selecting one fills the same label/path
// fields a native app or local file would, and opening it later goes
// through the same `open <url>` shell-out (macOS opens a URL in the
// default browser exactly like a file path opens in its default app).
export interface WebApp {
  name: string;
  url: string;
}

export const CURATED_WEB_APPS: WebApp[] = [
  { name: 'Gmail', url: 'https://mail.google.com/mail/u/0' },
  { name: 'Google Drive', url: 'https://drive.google.com' },
  { name: 'Google Docs', url: 'https://docs.google.com' },
  { name: 'Google Sheets', url: 'https://sheets.google.com' },
  { name: 'Google Slides', url: 'https://slides.google.com' },
  { name: 'Google Calendar', url: 'https://calendar.google.com' },
  { name: 'Google Meet', url: 'https://meet.google.com' },
  { name: 'Google Keep', url: 'https://keep.google.com' },
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: 'Notion', url: 'https://notion.so' },
  { name: 'Quizlet', url: 'https://quizlet.com' },
  { name: 'ChatGPT', url: 'https://chat.openai.com' },
  { name: 'Claude', url: 'https://claude.ai' },
  { name: 'WhatsApp Web', url: 'https://web.whatsapp.com' },
];

const CUSTOM_WEB_APPS_KEY = 'productivity-dashboard:custom-web-apps';

export function loadCustomWebApps(): WebApp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_WEB_APPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomWebApp(app: WebApp): WebApp[] {
  if (typeof window === 'undefined') return [];
  const existing = loadCustomWebApps();
  const next = [...existing.filter((a) => a.url !== app.url), app];
  try {
    window.localStorage.setItem(CUSTOM_WEB_APPS_KEY, JSON.stringify(next));
  } catch {
    // best-effort only -- a full localStorage shouldn't break the picker
  }
  return next;
}

export function removeCustomWebApp(url: string): WebApp[] {
  if (typeof window === 'undefined') return [];
  const next = loadCustomWebApps().filter((a) => a.url !== url);
  try {
    window.localStorage.setItem(CUSTOM_WEB_APPS_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  return next;
}

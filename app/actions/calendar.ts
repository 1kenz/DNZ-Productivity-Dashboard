'use server';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isGoogleDriveConfigured, getValidAccessToken } from '@/lib/googleDrive';
import {
  listGoogleCalendars,
  getGoogleEvents,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  NewEventInput,
} from '@/lib/googleCalendar';
import {
  createAppleClient,
  listAppleCalendars,
  getAppleEvents,
  createAppleEvent,
  updateAppleEvent,
  deleteAppleEvent,
} from '@/lib/appleCalendar';
import { CalendarInfo, CalendarProvider, ConnectedCalendarAccount, ConnectedCalendarAccountsStatus, UnifiedCalendarEvent } from '@/types';

// The built-in fallback calendar -- always present in listAllCalendars()
// so a person can add an event before connecting Google/Apple at all (or
// even if they never do). Stored as an ordinary CalendarPreference row
// like any provider calendar, so its visibility/color are editable the
// same way, and its actual events live in the LocalCalendarEvent table.
const LOCAL_CALENDAR_ID = 'local';
const LOCAL_CALENDAR_DEFAULTS: CalendarInfo = {
  provider: 'local',
  id: LOCAL_CALENDAR_ID,
  name: 'My Calendar',
  color: '#8b5cf6',
  visible: true,
  writable: true,
};

// AppleCalendarAccount / CalendarPreference are intersected in via `as any`
// here (same pattern as ViewPreferences.lastDueDateModalShownAt in
// app/actions/settings.ts) because the generated @prisma/client types only
// pick up new prisma/schema.prisma models/fields after `npx prisma generate`
// re-runs -- this keeps the file compiling correctly both before and after
// that regeneration happens.
const db = prisma as any;

interface CalendarPreferenceRow {
  provider: string;
  accountId: string | null;
  calendarId: string;
  name: string;
  color: string;
  visible: boolean;
  writable: boolean;
}

interface LocalCalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
}

interface AppleCalendarAccountRow {
  id: string;
  appleId: string;
  appPassword: string;
}

export async function getConnectedCalendarAccountsStatus(): Promise<ConnectedCalendarAccountsStatus> {
  const [googleAccounts, appleAccounts] = await Promise.all([
    db.googleDriveAuth.findMany({ orderBy: { createdAt: 'asc' } }),
    db.appleCalendarAccount.findMany({ orderBy: { createdAt: 'asc' } }) as Promise<AppleCalendarAccountRow[]>,
  ]);
  return {
    google: {
      configured: isGoogleDriveConfigured(),
      accounts: googleAccounts.map((a: { id: string; email: string | null }) => ({ id: a.id, label: a.email || a.id })),
    },
    apple: {
      configured: true, // no server-side app config needed -- just the user's own iCloud credentials
      accounts: appleAccounts.map((a) => ({ id: a.id, label: a.appleId })),
    },
  };
}

/** Verifies the given iCloud credentials by attempting a CalDAV login, then
 * stores them as a new connected account -- or, if this Apple ID is already
 * connected, refreshes its stored password. Throws with a user-facing
 * message if the login fails (wrong email, or a real Apple ID password
 * instead of an app-specific one). */
export async function connectAppleCalendar(appleId: string, appPassword: string) {
  try {
    await createAppleClient(appleId, appPassword);
  } catch (err) {
    console.error('[calendar] Apple Calendar login failed:', err);
    throw new Error(
      'Could not sign in to iCloud Calendar. Double-check the email and make sure you generated an app-specific password at appleid.apple.com (not your regular Apple ID password).'
    );
  }

  const existing: AppleCalendarAccountRow | null = await db.appleCalendarAccount.findFirst({ where: { appleId } });
  if (existing) {
    await db.appleCalendarAccount.update({ where: { id: existing.id }, data: { appPassword } });
  } else {
    await db.appleCalendarAccount.create({ data: { id: randomUUID(), appleId, appPassword } });
  }
  revalidatePath('/');
}

export async function disconnectAppleCalendar(accountId: string) {
  await db.appleCalendarAccount.deleteMany({ where: { id: accountId } });
  await db.calendarPreference.deleteMany({ where: { provider: 'apple', accountId } });
  revalidatePath('/');
}

export async function disconnectGoogleAccount(accountId: string) {
  await prisma.googleDriveAuth.deleteMany({ where: { id: accountId } });
  await db.calendarPreference.deleteMany({ where: { provider: 'google', accountId } });
  revalidatePath('/');
}

async function getAppleAccounts(): Promise<AppleCalendarAccountRow[]> {
  return db.appleCalendarAccount.findMany({ orderBy: { createdAt: 'asc' } });
}

interface GoogleAccountRow {
  id: string;
  email: string | null;
}

interface ProviderFetchResult {
  calendars: CalendarInfo[];
  error?: string;
}

// Google/Apple error bodies can be a full JSON payload or (rarely) an HTML
// error page -- cap what we store/display so one oversized error message
// can't blow up the Manage Calendars panel's layout.
const MAX_SYNC_ERROR_LENGTH = 300;
function truncateSyncError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.length > MAX_SYNC_ERROR_LENGTH
    ? `${message.slice(0, MAX_SYNC_ERROR_LENGTH)}…`
    : message;
}

/** Isolates one Google account's calendar-list fetch so a token/scope/API
 * problem on ONE account never breaks the others -- the failure is
 * returned as `error` instead of just being swallowed, so the caller can
 * decide whether to surface it (see getCalendarsAndStatus()) or ignore it
 * (see listAllCalendars(), used for the event grid where a bare console
 * warning is enough). */
async function fetchGoogleAccountCalendars(account: GoogleAccountRow): Promise<ProviderFetchResult> {
  try {
    const accessToken = await getValidAccessToken(account.id);
    const googleCals = await listGoogleCalendars(accessToken);
    return {
      calendars: googleCals.map((c) => ({ ...c, accountId: account.id, accountLabel: account.email || undefined })),
    };
  } catch (err) {
    console.error(`[calendar] Google calendar fetch failed for account ${account.id}:`, err);
    return { calendars: [], error: truncateSyncError(err) };
  }
}

/** Same isolation as fetchGoogleAccountCalendars(), for one Apple account. */
async function fetchAppleAccountCalendars(account: AppleCalendarAccountRow): Promise<ProviderFetchResult> {
  try {
    const client = await createAppleClient(account.appleId, account.appPassword);
    const appleCals = await listAppleCalendars(client);
    return { calendars: appleCals.map((c) => ({ ...c, accountId: account.id, accountLabel: account.appleId })) };
  } catch (err) {
    console.error(`[calendar] Apple calendar fetch failed for account ${account.id}:`, err);
    return { calendars: [], error: truncateSyncError(err) };
  }
}

/** Merges a raw calendar list with this app's stored visibility/color
 * preferences, creating a preference row for any calendar seen for the
 * first time (default: visible, provider's own color). Shared by
 * listAllCalendars() and getCalendarsAndStatus() so the upsert-missing-
 * preferences logic only lives in one place. */
async function mergeCalendarPreferences(results: CalendarInfo[]): Promise<CalendarInfo[]> {
  const prefs: CalendarPreferenceRow[] = await db.calendarPreference.findMany({
    where: {
      OR: results.map((c) => ({ provider: c.provider, accountId: c.accountId ?? null, calendarId: c.id })),
    },
  });
  const prefKey = (provider: string, accountId: string | null | undefined, calendarId: string) =>
    `${provider}:${accountId ?? ''}:${calendarId}`;
  const prefMap = new Map(prefs.map((p) => [prefKey(p.provider, p.accountId, p.calendarId), p]));

  const missing = results.filter((c) => !prefMap.has(prefKey(c.provider, c.accountId, c.id)));
  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map((c) =>
        db.calendarPreference.upsert({
          where: {
            provider_accountId_calendarId: {
              provider: c.provider,
              accountId: c.accountId ?? null,
              calendarId: c.id,
            },
          },
          update: {},
          create: {
            provider: c.provider,
            accountId: c.accountId ?? null,
            calendarId: c.id,
            name: c.name,
            color: c.color,
            visible: true,
            writable: c.writable,
          },
        })
      )
    );
  }

  return results.map((c) => {
    const pref = prefMap.get(prefKey(c.provider, c.accountId, c.id));
    return pref
      ? { ...c, name: pref.name, color: pref.color, visible: pref.visible, writable: pref.writable }
      : c;
  });
}

/** Every calendar from every connected Google/Apple account, tagged with
 * which account it came from, merged with this app's stored visibility/
 * color preferences. Used internally (getEventsInRange) and by EventModal;
 * a per-account fetch failure is only logged here, not surfaced -- see
 * getCalendarsAndStatus() for the UI-facing version that reports it. */
export async function listAllCalendars(): Promise<CalendarInfo[]> {
  const results: CalendarInfo[] = [];

  const googleAccounts: GoogleAccountRow[] = await db.googleDriveAuth.findMany({ orderBy: { createdAt: 'asc' } });
  for (const account of googleAccounts) {
    results.push(...(await fetchGoogleAccountCalendars(account)).calendars);
  }

  const appleAccounts = await getAppleAccounts();
  for (const account of appleAccounts) {
    results.push(...(await fetchAppleAccountCalendars(account)).calendars);
  }

  // Appended last (not first) so a connected Google/Apple calendar keeps
  // priority as EventModal's default selection -- "My Calendar" is only
  // ever the fallback, never a surprise default once something real is
  // connected.
  results.push({ ...LOCAL_CALENDAR_DEFAULTS });

  return mergeCalendarPreferences(results);
}

/** Same data as listAllCalendars() + getConnectedCalendarAccountsStatus()
 * combined into a single round of Google/Apple account fetches (instead of
 * CalendarView calling both separately, which duplicated every account's
 * API attempt), and additionally carries a per-account `syncError` when
 * that account's calendars couldn't be fetched. Without this, an account
 * with an expired token, a missing Calendar API scope/enablement, etc.
 * would connect successfully (it shows up in "Manage Calendars") but its
 * calendars would just silently never appear in the visibility toggle
 * list, with nothing telling the person why. */
export async function getCalendarsAndStatus(): Promise<{
  calendars: CalendarInfo[];
  status: ConnectedCalendarAccountsStatus;
}> {
  const results: CalendarInfo[] = [];

  const googleAccountsRaw: GoogleAccountRow[] = await db.googleDriveAuth.findMany({
    orderBy: { createdAt: 'asc' },
  });
  const googleAccounts: ConnectedCalendarAccount[] = [];
  for (const account of googleAccountsRaw) {
    const { calendars, error } = await fetchGoogleAccountCalendars(account);
    results.push(...calendars);
    googleAccounts.push({ id: account.id, label: account.email || account.id, syncError: error });
  }

  const appleAccountsRaw = await getAppleAccounts();
  const appleAccounts: ConnectedCalendarAccount[] = [];
  for (const account of appleAccountsRaw) {
    const { calendars, error } = await fetchAppleAccountCalendars(account);
    results.push(...calendars);
    appleAccounts.push({ id: account.id, label: account.appleId, syncError: error });
  }

  results.push({ ...LOCAL_CALENDAR_DEFAULTS });
  const calendars = await mergeCalendarPreferences(results);

  return {
    calendars,
    status: {
      google: { configured: isGoogleDriveConfigured(), accounts: googleAccounts },
      apple: { configured: true, accounts: appleAccounts },
    },
  };
}

export async function updateCalendarPreference(
  provider: CalendarProvider,
  accountId: string | undefined,
  calendarId: string,
  updates: { visible?: boolean; color?: string }
) {
  await db.calendarPreference.updateMany({
    where: { provider, accountId: accountId ?? null, calendarId },
    data: updates,
  });
  revalidatePath('/');
}

export async function getEventsInRange(startISO: string, endISO: string): Promise<UnifiedCalendarEvent[]> {
  const calendars = await listAllCalendars();
  const visible = calendars.filter((c) => c.visible);
  if (visible.length === 0) return [];

  const start = new Date(startISO);
  const end = new Date(endISO);
  const events: UnifiedCalendarEvent[] = [];

  const localCal = visible.find((c) => c.provider === 'local');
  if (localCal) {
    const rows = await db.localCalendarEvent.findMany({
      where: { start: { lte: end }, end: { gte: start } },
      orderBy: { start: 'asc' },
    });
    events.push(
      ...rows.map(
        (row: LocalCalendarEventRow): UnifiedCalendarEvent => ({
          id: row.id,
          provider: 'local',
          calendarId: LOCAL_CALENDAR_ID,
          calendarName: localCal.name,
          calendarColor: localCal.color,
          title: row.title,
          description: row.description || undefined,
          location: row.location || undefined,
          start: row.start.toISOString(),
          end: row.end.toISOString(),
          allDay: row.allDay,
          writable: true,
        })
      )
    );
  }

  // Group visible Google/Apple calendars by which account they belong to,
  // so each account's events are fetched with that account's own token/
  // client rather than assuming there's only one connected account.
  const googleCals = visible.filter((c) => c.provider === 'google');
  const googleByAccount = new Map<string, CalendarInfo[]>();
  for (const cal of googleCals) {
    const key = cal.accountId || '';
    if (!googleByAccount.has(key)) googleByAccount.set(key, []);
    googleByAccount.get(key)!.push(cal);
  }
  for (const [accountId, cals] of googleByAccount) {
    try {
      const accessToken = await getValidAccessToken(accountId || undefined);
      const perCalendar = await Promise.all(cals.map((cal) => getGoogleEvents(accessToken, cal, start, end)));
      events.push(...perCalendar.flat());
    } catch (err) {
      console.error(`[calendar] getEventsInRange: Google fetch failed for account ${accountId}:`, err);
    }
  }

  const appleCals = visible.filter((c) => c.provider === 'apple');
  const appleByAccount = new Map<string, CalendarInfo[]>();
  for (const cal of appleCals) {
    const key = cal.accountId || '';
    if (!appleByAccount.has(key)) appleByAccount.set(key, []);
    appleByAccount.get(key)!.push(cal);
  }
  if (appleByAccount.size > 0) {
    const appleAccounts = await getAppleAccounts();
    const accountsById = new Map(appleAccounts.map((a) => [a.id, a]));
    for (const [accountId, cals] of appleByAccount) {
      const account = accountsById.get(accountId);
      if (!account) continue;
      try {
        const client = await createAppleClient(account.appleId, account.appPassword);
        const perCalendar = await Promise.all(cals.map((cal) => getAppleEvents(client, cal, start, end)));
        events.push(...perCalendar.flat());
      } catch (err) {
        console.error(`[calendar] getEventsInRange: Apple fetch failed for account ${accountId}:`, err);
      }
    }
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export async function createCalendarEvent(
  provider: CalendarProvider,
  accountId: string | undefined,
  calendarId: string,
  event: NewEventInput
): Promise<UnifiedCalendarEvent> {
  if (provider === 'local') {
    const row = await db.localCalendarEvent.create({
      data: {
        title: event.title,
        description: event.description || null,
        location: event.location || null,
        start: new Date(event.start),
        end: new Date(event.end),
        allDay: event.allDay,
      },
    });
    revalidatePath('/');
    return {
      id: row.id,
      provider: 'local',
      calendarId: LOCAL_CALENDAR_ID,
      calendarName: LOCAL_CALENDAR_DEFAULTS.name,
      calendarColor: LOCAL_CALENDAR_DEFAULTS.color,
      title: row.title,
      description: row.description || undefined,
      location: row.location || undefined,
      start: row.start.toISOString(),
      end: row.end.toISOString(),
      allDay: row.allDay,
      writable: true,
    };
  }

  if (provider === 'google') {
    const accessToken = await getValidAccessToken(accountId);
    return createGoogleEvent(accessToken, calendarId, event, accountId);
  }

  if (!accountId) throw new Error('Apple Calendar account not specified');
  const account: AppleCalendarAccountRow | null = await db.appleCalendarAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error('Apple Calendar is not connected');
  const appleClient = await createAppleClient(account.appleId, account.appPassword);
  return createAppleEvent(appleClient, calendarId, event, accountId);
}

/** Updates an existing event in place. `event` must be a UnifiedCalendarEvent
 * previously returned by getEventsInRange/createCalendarEvent, so it carries
 * the provider/calendarId/accountId (and, for Apple, davUrl/davEtag) needed
 * to locate it again. */
export async function updateCalendarEvent(
  event: UnifiedCalendarEvent,
  updates: NewEventInput
): Promise<UnifiedCalendarEvent> {
  if (!event.writable) throw new Error('This calendar is read-only.');

  if (event.provider === 'local') {
    const row = await db.localCalendarEvent.update({
      where: { id: event.id },
      data: {
        title: updates.title,
        description: updates.description || null,
        location: updates.location || null,
        start: new Date(updates.start),
        end: new Date(updates.end),
        allDay: updates.allDay,
      },
    });
    revalidatePath('/');
    return {
      id: row.id,
      provider: 'local',
      calendarId: LOCAL_CALENDAR_ID,
      calendarName: LOCAL_CALENDAR_DEFAULTS.name,
      calendarColor: LOCAL_CALENDAR_DEFAULTS.color,
      title: row.title,
      description: row.description || undefined,
      location: row.location || undefined,
      start: row.start.toISOString(),
      end: row.end.toISOString(),
      allDay: row.allDay,
      writable: true,
    };
  }

  if (event.provider === 'google') {
    const accessToken = await getValidAccessToken(event.accountId);
    const updated = await updateGoogleEvent(accessToken, event.calendarId, event.id, updates, event.accountId);
    return { ...updated, calendarName: event.calendarName, calendarColor: event.calendarColor };
  }

  if (!event.accountId) throw new Error('Apple Calendar account not specified');
  if (!event.davUrl) throw new Error('This event is missing its Apple Calendar address and cannot be edited.');
  const account: AppleCalendarAccountRow | null = await db.appleCalendarAccount.findUnique({
    where: { id: event.accountId },
  });
  if (!account) throw new Error('Apple Calendar is not connected');
  const appleClient = await createAppleClient(account.appleId, account.appPassword);
  const updated = await updateAppleEvent(appleClient, event.davUrl, event.davEtag, event.id, updates, event.accountId);
  return { ...updated, calendarId: event.calendarId, calendarName: event.calendarName, calendarColor: event.calendarColor };
}

/** Deletes an existing event. Same addressing requirements as
 * updateCalendarEvent above. */
export async function deleteCalendarEvent(event: UnifiedCalendarEvent): Promise<void> {
  if (!event.writable) throw new Error('This calendar is read-only.');

  if (event.provider === 'local') {
    await db.localCalendarEvent.delete({ where: { id: event.id } });
    revalidatePath('/');
    return;
  }

  if (event.provider === 'google') {
    const accessToken = await getValidAccessToken(event.accountId);
    await deleteGoogleEvent(accessToken, event.calendarId, event.id);
    return;
  }

  if (!event.accountId) throw new Error('Apple Calendar account not specified');
  if (!event.davUrl) throw new Error('This event is missing its Apple Calendar address and cannot be deleted.');
  const account: AppleCalendarAccountRow | null = await db.appleCalendarAccount.findUnique({
    where: { id: event.accountId },
  });
  if (!account) throw new Error('Apple Calendar is not connected');
  const appleClient = await createAppleClient(account.appleId, account.appPassword);
  await deleteAppleEvent(appleClient, event.davUrl, event.davEtag);
}

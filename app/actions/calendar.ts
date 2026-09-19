'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isGoogleDriveConfigured, getValidAccessToken } from '@/lib/googleDrive';
import { listGoogleCalendars, getGoogleEvents, createGoogleEvent, NewEventInput } from '@/lib/googleCalendar';
import { createAppleClient, listAppleCalendars, getAppleEvents, createAppleEvent } from '@/lib/appleCalendar';
import { CalendarInfo, CalendarProvider, ConnectedCalendarAccountsStatus, UnifiedCalendarEvent } from '@/types';

const APPLE_ACCOUNT_ID = 'default';

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
// pick up new prisma/schema.prisma models after `npx prisma generate`
// re-runs -- this keeps the file compiling correctly both before and after
// that regeneration happens.
const db = prisma as any;

interface CalendarPreferenceRow {
  provider: string;
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

export async function getConnectedCalendarAccountsStatus(): Promise<ConnectedCalendarAccountsStatus> {
  const [googleAuth, appleAccount] = await Promise.all([
    prisma.googleDriveAuth.findUnique({ where: { id: 'default' } }),
    db.appleCalendarAccount.findUnique({ where: { id: APPLE_ACCOUNT_ID } }),
  ]);
  return {
    google: {
      configured: isGoogleDriveConfigured(),
      connected: Boolean(googleAuth),
      email: googleAuth?.email || undefined,
    },
    apple: {
      configured: true, // no server-side app config needed -- just the user's own iCloud credentials
      connected: Boolean(appleAccount),
      appleId: appleAccount?.appleId || undefined,
    },
  };
}

/** Verifies the given iCloud credentials by attempting a CalDAV login, then
 * stores them. Throws with a user-facing message if the login fails (wrong
 * email, or a real Apple ID password instead of an app-specific one). */
export async function connectAppleCalendar(appleId: string, appPassword: string) {
  try {
    await createAppleClient(appleId, appPassword);
  } catch (err) {
    console.error('[calendar] Apple Calendar login failed:', err);
    throw new Error(
      'Could not sign in to iCloud Calendar. Double-check the email and make sure you generated an app-specific password at appleid.apple.com (not your regular Apple ID password).'
    );
  }
  await db.appleCalendarAccount.upsert({
    where: { id: APPLE_ACCOUNT_ID },
    update: { appleId, appPassword },
    create: { id: APPLE_ACCOUNT_ID, appleId, appPassword },
  });
  revalidatePath('/');
}

export async function disconnectAppleCalendar() {
  await db.appleCalendarAccount.deleteMany({ where: { id: APPLE_ACCOUNT_ID } });
  await db.calendarPreference.deleteMany({ where: { provider: 'apple' } });
  revalidatePath('/');
}

async function getAppleClientOrNull() {
  const account = await db.appleCalendarAccount.findUnique({ where: { id: APPLE_ACCOUNT_ID } });
  if (!account) return null;
  return createAppleClient(account.appleId, account.appPassword);
}

/** Merges each provider's live calendar list with this app's stored
 * visibility/color preferences, creating a preference row for any calendar
 * seen for the first time (default: visible, provider's own color). */
export async function listAllCalendars(): Promise<CalendarInfo[]> {
  const results: CalendarInfo[] = [];

  const googleAuth = await prisma.googleDriveAuth.findUnique({ where: { id: 'default' } });
  if (googleAuth) {
    try {
      const accessToken = await getValidAccessToken();
      const googleCals = await listGoogleCalendars(accessToken);
      results.push(...googleCals);
    } catch (err) {
      console.error('[calendar] listAllCalendars: Google fetch failed:', err);
    }
  }

  try {
    const appleClient = await getAppleClientOrNull();
    if (appleClient) {
      const appleCals = await listAppleCalendars(appleClient);
      results.push(...appleCals);
    }
  } catch (err) {
    console.error('[calendar] listAllCalendars: Apple fetch failed:', err);
  }

  // Appended last (not first) so a connected Google/Apple calendar keeps
  // priority as EventModal's default selection -- "My Calendar" is only
  // ever the fallback, never a surprise default once something real is
  // connected.
  results.push({ ...LOCAL_CALENDAR_DEFAULTS });

  const prefs: CalendarPreferenceRow[] = await db.calendarPreference.findMany({
    where: { OR: results.map((c) => ({ provider: c.provider, calendarId: c.id })) },
  });
  const prefMap = new Map(prefs.map((p) => [`${p.provider}:${p.calendarId}`, p]));

  const missing = results.filter((c) => !prefMap.has(`${c.provider}:${c.id}`));
  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map((c) =>
        db.calendarPreference.upsert({
          where: { provider_calendarId: { provider: c.provider, calendarId: c.id } },
          update: {},
          create: {
            provider: c.provider,
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
    const pref = prefMap.get(`${c.provider}:${c.id}`);
    return pref
      ? { ...c, name: pref.name, color: pref.color, visible: pref.visible, writable: pref.writable }
      : c;
  });
}

export async function updateCalendarPreference(
  provider: CalendarProvider,
  calendarId: string,
  updates: { visible?: boolean; color?: string }
) {
  await db.calendarPreference.updateMany({
    where: { provider, calendarId },
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

  const googleCals = visible.filter((c) => c.provider === 'google');
  if (googleCals.length > 0) {
    try {
      const accessToken = await getValidAccessToken();
      const perCalendar = await Promise.all(
        googleCals.map((cal) => getGoogleEvents(accessToken, cal, start, end))
      );
      events.push(...perCalendar.flat());
    } catch (err) {
      console.error('[calendar] getEventsInRange: Google fetch failed:', err);
    }
  }

  const appleCals = visible.filter((c) => c.provider === 'apple');
  if (appleCals.length > 0) {
    try {
      const appleClient = await getAppleClientOrNull();
      if (appleClient) {
        const perCalendar = await Promise.all(
          appleCals.map((cal) => getAppleEvents(appleClient, cal, start, end))
        );
        events.push(...perCalendar.flat());
      }
    } catch (err) {
      console.error('[calendar] getEventsInRange: Apple fetch failed:', err);
    }
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export async function createCalendarEvent(
  provider: CalendarProvider,
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
    const accessToken = await getValidAccessToken();
    return createGoogleEvent(accessToken, calendarId, event);
  }

  const appleClient = await getAppleClientOrNull();
  if (!appleClient) throw new Error('Apple Calendar is not connected');
  return createAppleEvent(appleClient, calendarId, event);
}

// Apple/iCloud Calendar sync via CalDAV, using the `tsdav` package.
//
// Auth: Basic auth against caldav.icloud.com using the user's iCloud email
// plus an APP-SPECIFIC password generated at appleid.apple.com (never the
// real Apple ID password) -- see app/actions/calendar.ts for where this is
// collected and stored (AppleCalendarAccount, singleton row).
//
// Known limitation: tsdav does not expand recurring events (RRULE) into
// individual occurrences the way the Google Calendar API does with
// singleEvents=true. A recurring Apple event will show once, at its
// original start time, even if a later occurrence is the one that falls in
// the requested range. This is disclosed to the user rather than solved
// here, to avoid hand-rolling full RFC 5545 recurrence expansion.

import { DAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import { CalendarInfo, UnifiedCalendarEvent } from '@/types';
import { NewEventInput } from '@/lib/googleCalendar';

const CALDAV_SERVER = 'https://caldav.icloud.com';

export async function createAppleClient(appleId: string, appPassword: string): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl: CALDAV_SERVER,
    credentials: { username: appleId, password: appPassword },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
  await client.login();
  return client;
}

function calendarDisplayName(cal: DAVCalendar): string {
  if (typeof cal.displayName === 'string' && cal.displayName) return cal.displayName;
  return 'Calendar';
}

export async function listAppleCalendars(client: DAVClient): Promise<CalendarInfo[]> {
  const calendars = await client.fetchCalendars();
  return calendars
    .filter((cal) => !cal.components || cal.components.includes('VEVENT'))
    .map((cal) => ({
      provider: 'apple' as const,
      id: cal.url,
      name: calendarDisplayName(cal),
      color: cal.calendarColor || '#FF9500',
      visible: true,
      writable: true,
    }));
}

// --- Minimal VEVENT parsing (SUMMARY/DTSTART/DTEND/LOCATION/DESCRIPTION) ---
// tsdav hands back raw iCalendar text in `.data`; it does not parse fields.

function unfoldIcs(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescapeIcsText(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

/** Converts an ICS DTSTART/DTEND value (with its property parameters) to an
 * ISO 8601 string, and reports whether it was an all-day (VALUE=DATE) value. */
function parseIcsDate(propLine: string): { iso: string; allDay: boolean } | null {
  const [paramsAndName, ...rest] = propLine.split(':');
  const value = rest.join(':').trim();
  if (!value) return null;
  const isAllDay = /VALUE=DATE(?!-TIME)/i.test(paramsAndName);

  if (isAllDay) {
    const m = value.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) return null;
    return { iso: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
  }

  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) {
    return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`, allDay: false };
  }
  // Floating or TZID-qualified local time -- treat as local wall-clock time
  // (good enough without a full IANA-tz + VTIMEZONE resolver).
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}`, allDay: false };
}

interface ParsedVevent {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { iso: string; allDay: boolean };
  end?: { iso: string; allDay: boolean };
}

function parseVevent(block: string): ParsedVevent {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: ParsedVevent = {};
  for (const line of lines) {
    if (line.startsWith('UID')) {
      result.uid = line.split(':').slice(1).join(':').trim();
    } else if (line.startsWith('SUMMARY')) {
      result.summary = unescapeIcsText(line.split(':').slice(1).join(':').trim());
    } else if (line.startsWith('DESCRIPTION')) {
      result.description = unescapeIcsText(line.split(':').slice(1).join(':').trim());
    } else if (line.startsWith('LOCATION')) {
      result.location = unescapeIcsText(line.split(':').slice(1).join(':').trim());
    } else if (line.startsWith('DTSTART')) {
      const parsed = parseIcsDate(line);
      if (parsed) result.start = parsed;
    } else if (line.startsWith('DTEND')) {
      const parsed = parseIcsDate(line);
      if (parsed) result.end = parsed;
    }
  }
  return result;
}

function extractFirstVevent(icsData: string): ParsedVevent | null {
  const unfolded = unfoldIcs(icsData);
  const match = unfolded.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/);
  if (!match) return null;
  return parseVevent(match[1]);
}

export async function getAppleEvents(
  client: DAVClient,
  calendar: CalendarInfo,
  timeMin: Date,
  timeMax: Date
): Promise<UnifiedCalendarEvent[]> {
  const objects: DAVCalendarObject[] = await client.fetchCalendarObjects({
    calendar: { url: calendar.id } as DAVCalendar,
    timeRange: { start: timeMin.toISOString(), end: timeMax.toISOString() },
  });

  const events: UnifiedCalendarEvent[] = [];
  for (const obj of objects) {
    if (typeof obj.data !== 'string') continue;
    const parsed = extractFirstVevent(obj.data);
    if (!parsed || !parsed.start || !parsed.end || !parsed.summary) continue;
    events.push({
      id: parsed.uid || obj.url,
      provider: 'apple',
      calendarId: calendar.id,
      calendarName: calendar.name,
      calendarColor: calendar.color,
      accountId: calendar.accountId,
      title: parsed.summary,
      description: parsed.description,
      location: parsed.location,
      start: parsed.start.iso,
      end: parsed.end.iso,
      allDay: parsed.start.allDay,
      writable: calendar.writable,
      // Needed to address this event for update/delete -- a VEVENT's UID
      // alone isn't a CalDAV resource locator, and the etag guards against
      // clobbering a concurrent edit made elsewhere.
      davUrl: obj.url,
      davEtag: obj.etag,
    });
  }
  return events;
}

function formatIcsDate(iso: string, allDay: boolean): string {
  if (allDay) return iso.slice(0, 10).replace(/-/g, '');
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString().padStart(4, '0') +
    (d.getUTCMonth() + 1).toString().padStart(2, '0') +
    d.getUTCDate().toString().padStart(2, '0') +
    'T' +
    d.getUTCHours().toString().padStart(2, '0') +
    d.getUTCMinutes().toString().padStart(2, '0') +
    d.getUTCSeconds().toString().padStart(2, '0') +
    'Z'
  );
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function createAppleEvent(
  client: DAVClient,
  calendarId: string,
  event: NewEventInput,
  accountId?: string
): Promise<UnifiedCalendarEvent> {
  const uid = `dnz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@productivity-dashboard`;
  const dtstamp = formatIcsDate(new Date().toISOString(), false);
  const startProp = event.allDay
    ? `DTSTART;VALUE=DATE:${formatIcsDate(event.start, true)}`
    : `DTSTART:${formatIcsDate(event.start, false)}`;
  const endProp = event.allDay
    ? `DTEND;VALUE=DATE:${formatIcsDate(event.end, true)}`
    : `DTEND:${formatIcsDate(event.end, false)}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DNZ Productivity Dashboard//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    startProp,
    endProp,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  const iCalString = lines.join('\r\n');

  const res = await client.createCalendarObject({
    calendar: { url: calendarId } as DAVCalendar,
    iCalString,
    filename: `${uid}.ics`,
  });
  if (!res.ok) {
    throw new Error(`Apple Calendar event creation failed: ${res.status} ${await res.text()}`);
  }

  return {
    id: uid,
    provider: 'apple',
    calendarId,
    calendarName: calendarId,
    calendarColor: '#FF9500',
    accountId,
    title: event.title,
    description: event.description,
    location: event.location,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    writable: true,
    davUrl: res.url,
  };
}

function buildIcsString(uid: string, event: NewEventInput): string {
  const dtstamp = formatIcsDate(new Date().toISOString(), false);
  const startProp = event.allDay
    ? `DTSTART;VALUE=DATE:${formatIcsDate(event.start, true)}`
    : `DTSTART:${formatIcsDate(event.start, false)}`;
  const endProp = event.allDay
    ? `DTEND;VALUE=DATE:${formatIcsDate(event.end, true)}`
    : `DTEND:${formatIcsDate(event.end, false)}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DNZ Productivity Dashboard//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    startProp,
    endProp,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export async function updateAppleEvent(
  client: DAVClient,
  davUrl: string,
  davEtag: string | undefined,
  uid: string,
  event: NewEventInput,
  accountId?: string
): Promise<UnifiedCalendarEvent> {
  const iCalString = buildIcsString(uid, event);
  const res = await client.updateCalendarObject({
    calendarObject: { url: davUrl, data: iCalString, etag: davEtag },
  });
  if (!res.ok) {
    throw new Error(`Apple Calendar event update failed: ${res.status} ${await res.text()}`);
  }
  return {
    id: uid,
    provider: 'apple',
    calendarId: davUrl,
    calendarName: davUrl,
    calendarColor: '#FF9500',
    accountId,
    title: event.title,
    description: event.description,
    location: event.location,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    writable: true,
    davUrl,
    davEtag: res.headers.get('etag') || undefined,
  };
}

export async function deleteAppleEvent(
  client: DAVClient,
  davUrl: string,
  davEtag: string | undefined
): Promise<void> {
  const res = await client.deleteCalendarObject({
    calendarObject: { url: davUrl, etag: davEtag } as DAVCalendarObject,
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Apple Calendar event deletion failed: ${res.status} ${await res.text()}`);
  }
}

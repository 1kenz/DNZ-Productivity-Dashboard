// Google Calendar sync using plain fetch() against the Calendar v3 REST API --
// reuses the same OAuth tokens as Google Drive (lib/googleDrive.ts); the
// 'calendar' scope was added there alongside 'drive.file'. A user who
// connected Drive before this feature existed needs to reconnect once to
// pick up the wider scope (their next getValidAccessToken() refresh will
// still return a token good for Drive only until they do).

import { CalendarInfo, UnifiedCalendarEvent } from '@/types';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
  accessRole: string; // 'owner' | 'writer' | 'reader' | 'freeBusyReader'
}

export async function listGoogleCalendars(accessToken: string): Promise<CalendarInfo[]> {
  const res = await fetch(`${CALENDAR_API}/users/me/calendarList?minAccessRole=reader`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google Calendar list failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const items: GoogleCalendarListEntry[] = data.items || [];
  return items.map((cal) => ({
    provider: 'google' as const,
    id: cal.id,
    name: cal.summary,
    color: cal.backgroundColor || '#4285F4',
    visible: true,
    writable: cal.accessRole === 'owner' || cal.accessRole === 'writer',
    primary: Boolean(cal.primary),
  }));
}

interface GoogleEventTime {
  date?: string; // all-day events
  dateTime?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
}

export async function getGoogleEvents(
  accessToken: string,
  calendar: CalendarInfo,
  timeMin: Date,
  timeMax: Date
): Promise<UnifiedCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Google events fetch failed for ${calendar.name}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const items: GoogleEvent[] = data.items || [];
  return items
    .filter((ev) => ev.start && ev.end)
    .map((ev) => {
      const allDay = Boolean(ev.start.date);
      return {
        id: ev.id,
        provider: 'google' as const,
        calendarId: calendar.id,
        calendarName: calendar.name,
        calendarColor: calendar.color,
        accountId: calendar.accountId,
        title: ev.summary || '(No title)',
        description: ev.description,
        location: ev.location,
        start: (ev.start.dateTime || ev.start.date) as string,
        end: (ev.end.dateTime || ev.end.date) as string,
        allDay,
        writable: calendar.writable,
      };
    });
}

export interface NewEventInput {
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: NewEventInput,
  accountId?: string
): Promise<UnifiedCalendarEvent> {
  const body = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.allDay ? { date: event.start.slice(0, 10) } : { dateTime: event.start },
    end: event.allDay ? { date: event.end.slice(0, 10) } : { dateTime: event.end },
  };
  const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Google event creation failed: ${res.status} ${await res.text()}`);
  }
  const created: GoogleEvent = await res.json();
  return {
    id: created.id,
    provider: 'google',
    calendarId,
    calendarName: calendarId,
    calendarColor: '#4285F4',
    accountId,
    title: created.summary || event.title,
    description: created.description,
    location: created.location,
    start: (created.start.dateTime || created.start.date) as string,
    end: (created.end.dateTime || created.end.date) as string,
    allDay: event.allDay,
    writable: true,
  };
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: NewEventInput,
  accountId?: string
): Promise<UnifiedCalendarEvent> {
  const body = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.allDay ? { date: event.start.slice(0, 10) } : { dateTime: event.start },
    end: event.allDay ? { date: event.end.slice(0, 10) } : { dateTime: event.end },
  };
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(`Google event update failed: ${res.status} ${await res.text()}`);
  }
  const updated: GoogleEvent = await res.json();
  return {
    id: updated.id,
    provider: 'google',
    calendarId,
    calendarName: calendarId,
    calendarColor: '#4285F4',
    accountId,
    title: updated.summary || event.title,
    description: updated.description,
    location: updated.location,
    start: (updated.start.dateTime || updated.start.date) as string,
    end: (updated.end.dateTime || updated.end.date) as string,
    allDay: event.allDay,
    writable: true,
  };
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  // Google returns 410 Gone if the event was already deleted -- treat that
  // the same as success rather than surfacing an error for a no-op.
  if (!res.ok && res.status !== 410) {
    throw new Error(`Google event deletion failed: ${res.status} ${await res.text()}`);
  }
}

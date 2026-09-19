'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CalendarTabIcon } from '@/components/ui/TabIcons';
import { Button } from '@/components/ui/Button';
import * as calendarActions from '@/app/actions/calendar';
import { CalendarInfo, CalendarViewMode, ConnectedCalendarAccountsStatus, UnifiedCalendarEvent } from '@/types';
import {
  addDays,
  endOfDay,
  getRangeForView,
  isSameDay,
  shiftAnchor,
  startOfDay,
  startOfWeek,
} from '@/lib/calendarDateUtils';
import { ConnectCalendarsPanel } from './ConnectCalendarsPanel';
import { EventModal } from './EventModal';
import styles from './CalendarView.module.css';

const HOUR_HEIGHT = 48; // px per hour row in the day/week grid
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function eventOverlapsDay(ev: UnifiedCalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  const evStart = new Date(ev.start).getTime();
  const evEnd = new Date(ev.end).getTime();
  return evStart < dayEnd && evEnd > dayStart;
}

export const CalendarView: React.FC = () => {
  const { viewPreferences, updateViewPreferences } = useApp();
  const { t, language } = useLanguage();

  const [view, setView] = useState<CalendarViewMode>(
    (viewPreferences.calendarView as CalendarViewMode) || 'week'
  );
  const [anchor, setAnchor] = useState(() => new Date());
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [status, setStatus] = useState<ConnectedCalendarAccountsStatus | null>(null);
  const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [eventModalDate, setEventModalDate] = useState<Date | null>(null);

  const loadCalendars = useCallback(async () => {
    setIsLoadingCalendars(true);
    try {
      const [cals, st] = await Promise.all([
        calendarActions.listAllCalendars(),
        calendarActions.getConnectedCalendarAccountsStatus(),
      ]);
      setCalendars(cals);
      setStatus(st);
    } catch (err) {
      console.error('[CalendarView] failed to load calendars:', err);
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);

  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  const range = useMemo(() => getRangeForView(view, anchor), [view, anchor]);
  const visibleCalendarKey = useMemo(
    () =>
      calendars
        .filter((c) => c.visible)
        .map((c) => `${c.provider}:${c.id}`)
        .sort()
        .join(','),
    [calendars]
  );

  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const evs = await calendarActions.getEventsInRange(range.start.toISOString(), range.end.toISOString());
      setEvents(evs);
    } catch (err) {
      console.error('[CalendarView] failed to load events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start.getTime(), range.end.getTime(), visibleCalendarKey]);

  useEffect(() => {
    if (!isLoadingCalendars) loadEvents();
  }, [isLoadingCalendars, loadEvents]);

  const handleSetView = (mode: CalendarViewMode) => {
    setView(mode);
    updateViewPreferences({ calendarView: mode });
  };

  const days = useMemo(() => {
    if (view === 'day') return [startOfDay(anchor)];
    if (view === 'week') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
    const list: Date[] = [];
    let d = new Date(range.start);
    while (d <= range.end) {
      list.push(d);
      d = addDays(d, 1);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor]);

  const locale = language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : 'en-US';

  const headerLabel = useMemo(() => {
    if (view === 'day') return anchor.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(
        locale,
        { day: 'numeric', month: 'short', year: 'numeric' }
      )}`;
    }
    return anchor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [view, anchor, locale]);

  const hourRows = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i),
    []
  );

  const isTimeGridView = view === 'day' || view === 'week';

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <CalendarTabIcon size={20} />
          <h2 className={styles.headerLabel}>{headerLabel}</h2>
        </div>
        <div className={styles.toolbarRight}>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
            {t('calendar.today')}
          </Button>
          <button className={styles.navBtn} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} aria-label="prev">
            ‹
          </button>
          <button className={styles.navBtn} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} aria-label="next">
            ›
          </button>
          <div className={styles.viewToggle}>
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                className={`${styles.viewBtn} ${view === mode ? styles.viewBtnActive : ''}`}
                onClick={() => handleSetView(mode)}
              >
                {t(`calendar.${mode}`)}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEventModalDate(new Date())}>
            + {t('calendar.newEvent')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowManage((s) => !s)}>
            {t('calendar.manageCalendars')}
          </Button>
        </div>
      </div>

      {showManage && (
        <ConnectCalendarsPanel status={status} calendars={calendars} onChanged={loadCalendars} />
      )}

      {isLoadingCalendars ? (
        <p className={styles.loadingText}>{t('calendar.loading')}</p>
      ) : (
        <div className={styles.gridWrapper}>
          {isTimeGridView ? (
            <>
              <div className={styles.dayHeaderRow} style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
                <div />
                {days.map((day) => (
                  <div key={day.toISOString()} className={styles.dayHeaderCell}>
                    <span className={styles.dayHeaderWeekday}>
                      {day.toLocaleDateString(locale, { weekday: 'short' })}
                    </span>
                    <span
                      className={`${styles.dayHeaderNumber} ${isSameDay(day, new Date()) ? styles.today : ''}`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.timeGrid} style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
                <div className={styles.hourLabels}>
                  {hourRows.map((h) => (
                    <div key={h} className={styles.hourLabel} style={{ height: HOUR_HEIGHT }}>
                      {h.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {days.map((day) => {
                  const dayEvents = events.filter((ev) => !ev.allDay && eventOverlapsDay(ev, day));
                  return (
                    <div
                      key={day.toISOString()}
                      className={styles.dayColumn}
                      style={{ height: HOUR_HEIGHT * hourRows.length }}
                      onDoubleClick={() => setEventModalDate(day)}
                    >
                      {hourRows.map((h) => (
                        <div key={h} className={styles.hourCell} style={{ height: HOUR_HEIGHT }} />
                      ))}
                      {dayEvents.map((ev) => {
                        const evStart = new Date(ev.start);
                        const evEnd = new Date(ev.end);
                        const clampedStart = evStart < startOfDay(day) ? startOfDay(day) : evStart;
                        const clampedEnd = evEnd > endOfDay(day) ? endOfDay(day) : evEnd;
                        const top = (minutesSinceMidnight(clampedStart) / 60) * HOUR_HEIGHT;
                        const durationMinutes = Math.max(
                          20,
                          (clampedEnd.getTime() - clampedStart.getTime()) / 60000
                        );
                        const height = (durationMinutes / 60) * HOUR_HEIGHT;
                        return (
                          <div
                            key={ev.id}
                            className={styles.eventBlock}
                            style={{ top, height, background: ev.calendarColor }}
                            title={`${ev.title} (${ev.calendarName})`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {events.some((ev) => ev.allDay) && (
                <div className={styles.allDayRow} style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
                  <div className={styles.allDayLabel}>{t('calendar.allDay')}</div>
                  {days.map((day) => (
                    <div key={day.toISOString()} className={styles.allDayCell}>
                      {events
                        .filter((ev) => ev.allDay && eventOverlapsDay(ev, day))
                        .map((ev) => (
                          <div
                            key={ev.id}
                            className={styles.allDayChip}
                            style={{ background: ev.calendarColor }}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.monthGrid}>
              {days.map((day) => {
                const dayEvents = events.filter((ev) => eventOverlapsDay(ev, day));
                const inCurrentMonth = day.getMonth() === anchor.getMonth();
                return (
                  <div
                    key={day.toISOString()}
                    className={`${styles.monthCell} ${inCurrentMonth ? '' : styles.monthCellDim}`}
                    onDoubleClick={() => setEventModalDate(day)}
                  >
                    <span className={`${styles.monthCellNumber} ${isSameDay(day, new Date()) ? styles.today : ''}`}>
                      {day.getDate()}
                    </span>
                    <div className={styles.monthEventList}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={styles.monthEventChip}
                          style={{ background: ev.calendarColor }}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className={styles.monthEventMore}>+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoadingEvents && events.length === 0 && (
            <p className={styles.noEventsText}>{t('calendar.noEvents')}</p>
          )}
        </div>
      )}

      {eventModalDate && (
        <EventModal
          isOpen={Boolean(eventModalDate)}
          onClose={() => setEventModalDate(null)}
          onCreated={loadEvents}
          calendars={calendars}
          initialDate={eventModalDate}
        />
      )}
    </div>
  );
};

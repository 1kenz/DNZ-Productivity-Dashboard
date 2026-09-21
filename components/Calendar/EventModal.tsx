'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import * as calendarActions from '@/app/actions/calendar';
import { CalendarInfo, CalendarProvider, UnifiedCalendarEvent } from '@/types';
import styles from './EventModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  calendars: CalendarInfo[];
  initialDate: Date;
  // When set, the modal opens in edit mode for this existing event instead
  // of create mode. initialDate is ignored in that case.
  event?: UnifiedCalendarEvent;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export const EventModal: React.FC<Props> = ({ isOpen, onClose, onCreated, calendars, initialDate, event }) => {
  const { t } = useLanguage();
  const isEditMode = Boolean(event);
  const isReadOnly = isEditMode && !event!.writable;
  const writableCalendars = calendars.filter((c) => c.writable);
  // provider:accountId:calendarId -- accountId is empty for the local
  // calendar. Two nested "split on first colon" calls (rather than a plain
  // split(':')) because an Apple calendar's id is a full CalDAV collection
  // URL, which itself contains colons.
  const keyFor = (c: CalendarInfo) => `${c.provider}:${c.accountId || ''}:${c.id}`;
  const [calendarKey, setCalendarKey] = useState<string>(
    isEditMode
      ? `${event!.provider}:${event!.accountId || ''}:${event!.calendarId}`
      : writableCalendars[0]
        ? keyFor(writableCalendars[0])
        : ''
  );
  const [title, setTitle] = useState(event?.title || '');
  const [allDay, setAllDay] = useState(event?.allDay || false);
  const [start, setStart] = useState(
    toLocalInputValue(event ? new Date(event.start) : initialDate)
  );
  const [end, setEnd] = useState(
    toLocalInputValue(event ? new Date(event.end) : new Date(initialDate.getTime() + 60 * 60 * 1000))
  );
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingCalendar = isEditMode
    ? calendars.find(
        (c) => c.provider === event!.provider && c.id === event!.calendarId && c.accountId === event!.accountId
      )
    : undefined;

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start: allDay ? start.slice(0, 10) : new Date(start).toISOString(),
        end: allDay ? end.slice(0, 10) : new Date(end).toISOString(),
        allDay,
      };
      if (isEditMode) {
        await calendarActions.updateCalendarEvent(event!, payload);
      } else {
        if (!calendarKey) return;
        const [provider, rest] = calendarKey.split(/:(.+)/) as [CalendarProvider, string];
        const [accountId, calendarId] = rest.split(/:(.+)/) as [string, string];
        await calendarActions.createCalendarEvent(provider, accountId || undefined, calendarId, payload);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm(t('calendar.deleteEventConfirm') || 'Delete this event? This cannot be undone.')) return;
    setIsDeleting(true);
    setError(null);
    try {
      await calendarActions.deleteCalendarEvent(event);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsDeleting(false);
    }
  };

  const isBusy = isSaving || isDeleting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(isEditMode ? 'calendar.editEvent' : 'calendar.newEvent')} size="md">
      <div className={styles.form}>
        <input
          type="text"
          autoFocus
          placeholder={t('calendar.eventTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
          disabled={isReadOnly}
        />

        <label className={styles.fieldLabel}>
          {t('calendar.selectCalendar')}
          {isEditMode ? (
            <input
              type="text"
              value={
                editingCalendar
                  ? `${editingCalendar.name} (${
                      event!.provider === 'google' ? 'Google' : event!.provider === 'apple' ? 'Apple' : 'Local'
                    }${editingCalendar.accountLabel ? ` · ${editingCalendar.accountLabel}` : ''})`
                  : event!.calendarName
              }
              disabled
              className={styles.input}
            />
          ) : (
            <select
              value={calendarKey}
              onChange={(e) => setCalendarKey(e.target.value)}
              className={styles.select}
            >
              {writableCalendars.map((cal) => (
                <option key={keyFor(cal)} value={keyFor(cal)}>
                  {cal.name} ({cal.provider === 'google' ? 'Google' : cal.provider === 'apple' ? 'Apple' : 'Local'}
                  {cal.accountLabel ? ` · ${cal.accountLabel}` : ''})
                </option>
              ))}
            </select>
          )}
        </label>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            disabled={isReadOnly}
          />
          {t('calendar.allDay')}
        </label>

        <div className={styles.timeRow}>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? start.slice(0, 10) : start}
            onChange={(e) => setStart(e.target.value)}
            className={styles.input}
            disabled={isReadOnly}
          />
          <span>→</span>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? end.slice(0, 10) : end}
            onChange={(e) => setEnd(e.target.value)}
            className={styles.input}
            disabled={isReadOnly}
          />
        </div>

        <input
          type="text"
          placeholder={t('calendar.location')}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={styles.input}
          disabled={isReadOnly}
        />

        <textarea
          placeholder={t('calendar.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
          rows={3}
          disabled={isReadOnly}
        />

        {isReadOnly && <p className={styles.readOnlyHint}>{t('calendar.readOnlyEvent')}</p>}
        {error && <p className={styles.errorText}>{error}</p>}

        {isEditMode ? (
          <div className={styles.actionsWithDelete}>
            <div>
              {!isReadOnly && (
                <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} disabled={isBusy}>
                  {t('calendar.deleteEvent')}
                </Button>
              )}
            </div>
            <div className={styles.actionsRight}>
              <Button variant="ghost" onClick={onClose} disabled={isBusy}>
                {t('calendar.cancel')}
              </Button>
              {!isReadOnly && (
                <Button variant="primary" onClick={handleSave} isLoading={isSaving} disabled={!title.trim() || isBusy}>
                  {t('calendar.save')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              {t('calendar.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!title.trim() || !calendarKey}
            >
              {t('calendar.save')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

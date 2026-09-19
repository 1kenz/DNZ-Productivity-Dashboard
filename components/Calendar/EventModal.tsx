'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import * as calendarActions from '@/app/actions/calendar';
import { CalendarInfo } from '@/types';
import styles from './EventModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  calendars: CalendarInfo[];
  initialDate: Date;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export const EventModal: React.FC<Props> = ({ isOpen, onClose, onCreated, calendars, initialDate }) => {
  const { t } = useLanguage();
  const writableCalendars = calendars.filter((c) => c.writable);
  const [calendarKey, setCalendarKey] = useState<string>(
    writableCalendars[0] ? `${writableCalendars[0].provider}:${writableCalendars[0].id}` : ''
  );
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState(toLocalInputValue(initialDate));
  const [end, setEnd] = useState(toLocalInputValue(new Date(initialDate.getTime() + 60 * 60 * 1000)));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !calendarKey) return;
    const [provider, calendarId] = calendarKey.split(/:(.+)/) as ['google' | 'apple', string];
    setIsSaving(true);
    setError(null);
    try {
      await calendarActions.createCalendarEvent(provider, calendarId, {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start: allDay ? start.slice(0, 10) : new Date(start).toISOString(),
        end: allDay ? end.slice(0, 10) : new Date(end).toISOString(),
        allDay,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('calendar.newEvent')} size="md">
      <div className={styles.form}>
        <input
          type="text"
          autoFocus
          placeholder={t('calendar.eventTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
        />

        <label className={styles.fieldLabel}>
          {t('calendar.selectCalendar')}
          <select
            value={calendarKey}
            onChange={(e) => setCalendarKey(e.target.value)}
            className={styles.select}
          >
            {writableCalendars.map((cal) => (
              <option key={`${cal.provider}:${cal.id}`} value={`${cal.provider}:${cal.id}`}>
                {cal.name} ({cal.provider === 'google' ? 'Google' : 'Apple'})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          {t('calendar.allDay')}
        </label>

        <div className={styles.timeRow}>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? start.slice(0, 10) : start}
            onChange={(e) => setStart(e.target.value)}
            className={styles.input}
          />
          <span>→</span>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? end.slice(0, 10) : end}
            onChange={(e) => setEnd(e.target.value)}
            className={styles.input}
          />
        </div>

        <input
          type="text"
          placeholder={t('calendar.location')}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={styles.input}
        />

        <textarea
          placeholder={t('calendar.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
          rows={3}
        />

        {error && <p className={styles.errorText}>{error}</p>}

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
      </div>
    </Modal>
  );
};

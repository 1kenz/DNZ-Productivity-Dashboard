'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import * as calendarActions from '@/app/actions/calendar';
import { GoogleLogoIcon, AppleLogoIcon } from './ProviderIcons';
import { CalendarInfo, ConnectedCalendarAccountsStatus } from '@/types';
import styles from './ConnectCalendarsPanel.module.css';

interface Props {
  status: ConnectedCalendarAccountsStatus | null;
  calendars: CalendarInfo[];
  onChanged: () => void;
}

export const ConnectCalendarsPanel: React.FC<Props> = ({ status, calendars, onChanged }) => {
  const { t } = useLanguage();
  const [appleId, setAppleId] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [isConnectingApple, setIsConnectingApple] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectApple = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnectingApple(true);
    try {
      await calendarActions.connectAppleCalendar(appleId.trim(), appPassword);
      setAppleId('');
      setAppPassword('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsConnectingApple(false);
    }
  };

  const handleDisconnectApple = async () => {
    if (!window.confirm('Disconnect Apple Calendar?')) return;
    await calendarActions.disconnectAppleCalendar();
    onChanged();
  };

  const handleToggleVisible = async (cal: CalendarInfo) => {
    await calendarActions.updateCalendarPreference(cal.provider, cal.id, { visible: !cal.visible });
    onChanged();
  };

  const handleColorChange = async (cal: CalendarInfo, color: string) => {
    await calendarActions.updateCalendarPreference(cal.provider, cal.id, { color });
    onChanged();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.accountsRow}>
        <div className={styles.accountCard}>
          <div className={styles.accountHeader}>
            <span className={styles.providerLabel}>
              <GoogleLogoIcon size={16} /> Google Calendar
            </span>
            {status?.google.connected && <span className={styles.badge}>{status.google.email}</span>}
          </div>
          {!status?.google.connected ? (
            <a href="/api/google/auth">
              <Button variant="secondary" size="sm">
                {t('calendar.connectGoogle')}
              </Button>
            </a>
          ) : (
            <p className={styles.hint}>{t('calendar.connectedAs')} {status.google.email}</p>
          )}
        </div>

        <div className={styles.accountCard}>
          <div className={styles.accountHeader}>
            <span className={styles.providerLabel}>
              <AppleLogoIcon size={16} /> Apple Calendar
            </span>
            {status?.apple.connected && <span className={styles.badge}>{status.apple.appleId}</span>}
          </div>
          {!status?.apple.connected ? (
            <form onSubmit={handleConnectApple} className={styles.appleForm}>
              <input
                type="email"
                required
                placeholder={t('calendar.appleIdLabel')}
                value={appleId}
                onChange={(e) => setAppleId(e.target.value)}
                className={styles.input}
              />
              <input
                type="password"
                required
                placeholder={t('calendar.appPasswordLabel')}
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className={styles.input}
              />
              <p className={styles.hint}>{t('calendar.appPasswordHint')}</p>
              {error && <p className={styles.errorText}>{error}</p>}
              <Button type="submit" variant="secondary" size="sm" isLoading={isConnectingApple}>
                {t('calendar.connect')}
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleDisconnectApple}>
              {t('calendar.disconnect')}
            </Button>
          )}
        </div>
      </div>

      {calendars.length > 0 && (
        <div className={styles.calendarList}>
          {calendars.map((cal) => (
            <label key={`${cal.provider}:${cal.id}`} className={styles.calendarRow}>
              <input type="checkbox" checked={cal.visible} onChange={() => handleToggleVisible(cal)} />
              <input
                type="color"
                value={cal.color}
                onChange={(e) => handleColorChange(cal, e.target.value)}
                className={styles.colorSwatch}
              />
              <span className={styles.calendarName}>{cal.name}</span>
              <span className={styles.calendarProvider}>{cal.provider === 'google' ? 'Google' : 'Apple'}</span>
            </label>
          ))}
        </div>
      )}

      {calendars.length === 0 && !status?.google.connected && !status?.apple.connected && (
        <p className={styles.hint}>{t('calendar.noCalendarsConnected')}</p>
      )}
    </div>
  );
};

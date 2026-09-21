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

/** Each connected Google/Apple account gets its own row here, with its own
 * disconnect button -- more than one of each can be connected side by side
 * (see the multi-account GoogleDriveAuth/AppleCalendarAccount models in
 * prisma/schema.prisma), and the "add another" action stays available no
 * matter how many are already connected. */
export const ConnectCalendarsPanel: React.FC<Props> = ({ status, calendars, onChanged }) => {
  const { t } = useLanguage();
  const [appleId, setAppleId] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [isConnectingApple, setIsConnectingApple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

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

  const handleDisconnectGoogle = async (accountId: string, label: string) => {
    if (!window.confirm(`${t('calendar.disconnect')} ${label}?`)) return;
    setDisconnectingId(accountId);
    try {
      await calendarActions.disconnectGoogleAccount(accountId);
      onChanged();
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleDisconnectApple = async (accountId: string, label: string) => {
    if (!window.confirm(`${t('calendar.disconnect')} ${label}?`)) return;
    setDisconnectingId(accountId);
    try {
      await calendarActions.disconnectAppleCalendar(accountId);
      onChanged();
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleToggleVisible = async (cal: CalendarInfo) => {
    await calendarActions.updateCalendarPreference(cal.provider, cal.accountId, cal.id, { visible: !cal.visible });
    onChanged();
  };

  const handleColorChange = async (cal: CalendarInfo, color: string) => {
    await calendarActions.updateCalendarPreference(cal.provider, cal.accountId, cal.id, { color });
    onChanged();
  };

  const googleAccounts = status?.google.accounts || [];
  const appleAccounts = status?.apple.accounts || [];

  return (
    <div className={styles.panel}>
      <div className={styles.accountsRow}>
        <div className={styles.accountCard}>
          <div className={styles.accountHeader}>
            <span className={styles.providerLabel}>
              <GoogleLogoIcon size={16} /> Google Calendar
            </span>
          </div>

          {googleAccounts.length > 0 && (
            <div className={styles.accountList}>
              {googleAccounts.map((account) => (
                <div key={account.id} className={styles.accountEntry}>
                  <div className={styles.accountEntryRow}>
                    <span className={styles.badge}>{account.label}</span>
                    <button
                      type="button"
                      className={styles.disconnectBtn}
                      onClick={() => handleDisconnectGoogle(account.id, account.label)}
                      disabled={disconnectingId === account.id}
                      title={t('calendar.disconnect')}
                      aria-label={t('calendar.disconnect')}
                    >
                      ✕
                    </button>
                  </div>
                  {account.syncError && (
                    <div className={styles.syncErrorBlock}>
                      <p className={styles.syncErrorText}>⚠ {t('calendar.syncErrorHint')}</p>
                      <p className={styles.syncErrorDetail}>{account.syncError}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <a href="/api/google/auth">
            <Button variant="secondary" size="sm">
              {googleAccounts.length > 0 ? t('calendar.addAnotherAccount') : t('calendar.connectGoogle')}
            </Button>
          </a>
        </div>

        <div className={styles.accountCard}>
          <div className={styles.accountHeader}>
            <span className={styles.providerLabel}>
              <AppleLogoIcon size={16} /> Apple Calendar
            </span>
          </div>

          {appleAccounts.length > 0 && (
            <div className={styles.accountList}>
              {appleAccounts.map((account) => (
                <div key={account.id} className={styles.accountEntry}>
                  <div className={styles.accountEntryRow}>
                    <span className={styles.badge}>{account.label}</span>
                    <button
                      type="button"
                      className={styles.disconnectBtn}
                      onClick={() => handleDisconnectApple(account.id, account.label)}
                      disabled={disconnectingId === account.id}
                      title={t('calendar.disconnect')}
                      aria-label={t('calendar.disconnect')}
                    >
                      ✕
                    </button>
                  </div>
                  {account.syncError && (
                    <div className={styles.syncErrorBlock}>
                      <p className={styles.syncErrorText}>⚠ {t('calendar.syncErrorHint')}</p>
                      <p className={styles.syncErrorDetail}>{account.syncError}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
              {appleAccounts.length > 0 ? t('calendar.addAnotherAccount') : t('calendar.connect')}
            </Button>
          </form>
        </div>
      </div>

      {calendars.length > 0 && (
        <div className={styles.calendarList}>
          {calendars.map((cal) => (
            <label key={`${cal.provider}:${cal.accountId || ''}:${cal.id}`} className={styles.calendarRow}>
              <input type="checkbox" checked={cal.visible} onChange={() => handleToggleVisible(cal)} />
              <input
                type="color"
                value={cal.color}
                onChange={(e) => handleColorChange(cal, e.target.value)}
                className={styles.colorSwatch}
              />
              <span className={styles.calendarName}>{cal.name}</span>
              <span className={styles.calendarProvider}>
                {cal.provider === 'google' ? 'Google' : cal.provider === 'apple' ? 'Apple' : 'Local'}
                {cal.accountLabel ? ` \u00b7 ${cal.accountLabel}` : ''}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

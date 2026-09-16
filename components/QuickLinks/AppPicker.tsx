'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as systemActions from '@/app/actions/system';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './AppPicker.module.css';

interface InstalledApp {
  name: string;
  path: string;
}

interface AppPickerProps {
  onSelect: (app: InstalledApp) => void;
  onClose: () => void;
}

// Small floating popover listing the apps installed on the user's Mac
// (/Applications, /System/Applications, ~/Applications), so a Quick Link
// (or attachment) can be pointed at an app without hand-typing its path.
export const AppPicker: React.FC<AppPickerProps> = ({ onSelect, onClose }) => {
  const { t } = useLanguage();
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    systemActions
      .listInstalledApps()
      .then((result) => {
        if (!cancelled) setApps(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const filtered = (apps || []).filter((a) =>
    a.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className={styles.picker} ref={wrapperRef}>
      <input
        type="text"
        className={styles.search}
        placeholder={t('quickLinks.searchApps')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (filtered.length > 0) onSelect(filtered[0]);
          }
        }}
        autoFocus
      />
      <div className={styles.list}>
        {error ? (
          <p className={styles.empty}>{t('quickLinks.noAppsFound')}</p>
        ) : apps === null ? (
          <p className={styles.empty}>{t('quickLinks.loadingApps')}</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>{t('quickLinks.noAppsFound')}</p>
        ) : (
          filtered.map((app) => (
            <button
              key={app.path}
              type="button"
              className={styles.item}
              onClick={() => onSelect(app)}
              title={app.path}
            >
              <span className={styles.itemIcon}>📱</span>
              <span className={styles.itemName}>{app.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

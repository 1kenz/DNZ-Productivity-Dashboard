'use client';

import React, { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import * as backupActions from '@/app/actions/backup';
import { Button } from '@/components/ui/Button';
import styles from './Settings.module.css';

export const BackupManager: React.FC = () => {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const backup = await backupActions.exportAllData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `productivity-dashboard-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Backup downloaded.' });
    } catch (e) {
      console.error(e);
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Export failed. Check the console for details.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const confirmed = window.confirm(
      'Restoring a backup REPLACES all current data (tasks, projects, notes, everything) with the contents of this file. This cannot be undone. Continue?'
    );
    if (!confirmed) return;

    setIsImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.data) throw new Error('This does not look like a valid backup file.');
      await backupActions.restoreBackup(parsed);
      setMessage({ type: 'success', text: 'Backup restored. Reloading...' });
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Import failed.' });
      setIsImporting(false);
    }
  };

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>{t('settings.backup')}</h4>
      <p className={styles.sectionDescription}>
        {t('settings.backupDesc')}
      </p>
      <div className={styles.actionsRow}>
        <Button variant="secondary" onClick={handleExport} isLoading={isExporting}>
          {t('settings.exportBackup')}
        </Button>
        <Button variant="secondary" onClick={handleImportClick} isLoading={isImporting}>
          {t('settings.importBackup')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
      </div>
      {message && (
        <p className={message.type === 'error' ? styles.errorText : styles.successText}>{message.text}</p>
      )}
    </div>
  );
};

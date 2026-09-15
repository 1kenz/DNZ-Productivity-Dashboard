'use client';

import React, { useEffect, useState } from 'react';
import * as driveActions from '@/app/actions/googleDrive';
import { Button } from '@/components/ui/Button';
import styles from './Settings.module.css';

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

export const GoogleDriveSync: React.FC = () => {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean; email?: string } | null>(
    null
  );
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const s = await driveActions.getDriveStatus();
      setStatus(s);
      if (s.connected) {
        const files = await driveActions.listDriveBackups();
        setBackups(files);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Surface the redirect result from /api/google/callback once, then clean the URL.
    const params = new URLSearchParams(window.location.search);
    const drive = params.get('drive');
    if (drive === 'connected') {
      setMessage({ type: 'success', text: 'Google Drive connected.' });
    } else if (drive === 'error') {
      const reason = params.get('reason') || 'unknown_error';
      setMessage({ type: 'error', text: `Google Drive connection failed (${reason}).` });
    }
    if (drive) {
      params.delete('drive');
      params.delete('reason');
      const q = params.toString();
      window.history.replaceState({}, '', q ? `?${q}` : window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackupNow = async () => {
    setIsBusy(true);
    setMessage(null);
    try {
      await driveActions.backupToDrive();
      setMessage({ type: 'success', text: 'Backed up to Google Drive.' });
      const files = await driveActions.listDriveBackups();
      setBackups(files);
    } catch (e) {
      console.error(e);
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Backup to Drive failed. Check the console for details.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRestore = async (file: DriveFile) => {
    const confirmed = window.confirm(
      `Restore "${file.name}"? This REPLACES all current data with this backup and cannot be undone.`
    );
    if (!confirmed) return;

    setIsBusy(true);
    setMessage(null);
    try {
      await driveActions.restoreFromDrive(file.id);
      setMessage({ type: 'success', text: 'Restored from Drive. Reloading...' });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Restore failed. Check the console for details.',
      });
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Drive? Existing backups in Drive are not deleted.')) return;
    setIsBusy(true);
    try {
      await driveActions.disconnectDrive();
      await load();
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Google Drive Sync</h4>
        <p className={styles.sectionDescription}>Checking connection…</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>Google Drive Sync</h4>

      {!status?.configured && (
        <p className={styles.sectionDescription}>
          Not set up yet. Add <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> and{' '}
          <code>GOOGLE_REDIRECT_URI</code> to <code>.env</code> (see the deployment notes) to enable this.
        </p>
      )}

      {status?.configured && !status.connected && (
        <>
          <p className={styles.sectionDescription}>
            Connect a Google account to back up and restore your data from Google Drive, from any device.
          </p>
          <a href="/api/google/auth" className={styles.driveConnectLink}>
            <Button variant="secondary">🔗 Connect Google Drive</Button>
          </a>
        </>
      )}

      {status?.configured && status.connected && (
        <>
          <p className={styles.sectionDescription}>
            Connected as <strong>{status.email || 'unknown account'}</strong>.
          </p>
          <div className={styles.actionsRow}>
            <Button variant="secondary" onClick={handleBackupNow} isLoading={isBusy}>
              ☁️ Backup Now
            </Button>
            <Button variant="ghost" onClick={handleDisconnect} disabled={isBusy}>
              Disconnect
            </Button>
          </div>

          {backups.length > 0 && (
            <div className={styles.driveList}>
              {backups.map((file) => (
                <div key={file.id} className={styles.driveItem}>
                  <div className={styles.driveItemInfo}>
                    <span className={styles.driveItemName}>{file.name}</span>
                    <span className={styles.driveItemDate}>
                      {new Date(file.createdTime).toLocaleString()}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRestore(file)} disabled={isBusy}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
          {backups.length === 0 && <p className={styles.sectionDescription}>No backups in Drive yet.</p>}
        </>
      )}

      {message && (
        <p className={message.type === 'error' ? styles.errorText : styles.successText}>{message.text}</p>
      )}
    </div>
  );
};

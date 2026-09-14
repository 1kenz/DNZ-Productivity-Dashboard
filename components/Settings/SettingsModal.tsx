'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { BackupManager } from './BackupManager';
import { GoogleDriveSync } from './GoogleDriveSync';
import styles from './Settings.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="md">
      <div className={styles.container}>
        <BackupManager />
        <div className={styles.divider} />
        <GoogleDriveSync />
      </div>
    </Modal>
  );
};

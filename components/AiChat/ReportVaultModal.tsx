'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiReport } from '@/types';
import styles from './ReportVaultModal.module.css';

interface ReportVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport?: (report: AiReport) => void;
}

const STORAGE_KEY = 'dnz_ai_report_vault';

export const ReportVaultModal: React.FC<ReportVaultModalProps> = ({
  isOpen,
  onClose,
  onSelectReport,
}) => {
  const { t } = useLanguage();
  const [reports, setReports] = useState<AiReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setReports(parsed);
          if (parsed.length > 0 && !selectedReportId) {
            setSelectedReportId(parsed[0].id);
          }
        } catch (e) {
          console.error('Failed to parse reports vault', e);
        }
      }
    }
  }, [isOpen]);

  const saveReports = (newList: AiReport[]) => {
    setReports(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rep = reports.find((r) => r.id === id);
    const confirmMsg = `${rep?.title ? `"${rep.title}"\n\n` : ''}${t('common.delete') || 'Sil'}?`;
    if (!window.confirm(confirmMsg)) return;

    const updated = reports.filter((r) => r.id !== id);
    saveReports(updated);
    if (selectedReportId === id) {
      setSelectedReportId(updated[0]?.id || null);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('ai.reportVault') || 'AI Knowledge & Report Vault'}
      size="lg"
    >
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span>{t('ai.savedReports') || 'Saved Reports'}</span>
            <span className={styles.badge}>{reports.length}</span>
          </div>

          <div className={styles.reportList}>
            {reports.map((rep) => (
              <div
                key={rep.id}
                className={`${styles.reportItem} ${selectedReport?.id === rep.id ? styles.active : ''}`}
                onClick={() => setSelectedReportId(rep.id)}
              >
                <div className={styles.reportTitleRow}>
                  <span className={styles.typeIcon}>
                    {rep.type === 'briefing' ? '🎙️' : rep.type === 'security' ? '🛡️' : '📄'}
                  </span>
                  <span className={styles.reportTitle}>{rep.title}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDelete(rep.id, e)}
                    title={t('common.delete')}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.reportDate}>
                  {new Date(rep.createdAt).toLocaleDateString()} {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className={styles.emptySidebar}>
                <p>{t('ai.noReports') || 'No reports stored in vault yet.'}</p>
                <small>{t('ai.saveReportsHint') || 'Use "Save to Vault" in AI chat responses to archive reports.'}</small>
              </div>
            )}
          </div>
        </div>

        <div className={styles.viewer}>
          {selectedReport ? (
            <div className={styles.viewerContent}>
              <div className={styles.viewerHeader}>
                <div>
                  <h3 className={styles.viewerTitle}>{selectedReport.title}</h3>
                  <div className={styles.viewerMeta}>
                    <span>{new Date(selectedReport.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className={styles.viewerActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(selectedReport.content, selectedReport.id)}
                  >
                    {copiedId === selectedReport.id ? '✓ ' + t('common.copied') : '📋 ' + t('common.copy')}
                  </Button>
                </div>
              </div>

              <div className={styles.markdownBody}>
                <pre className={styles.preContent}>{selectedReport.content}</pre>
              </div>
            </div>
          ) : (
            <div className={styles.emptyViewer}>
              <p>{t('ai.selectReportToView') || 'Select a report from the left sidebar to view.'}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

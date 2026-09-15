'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LinkGroup } from './LinkGroup';
import { LinkGroupDetail } from './LinkGroupDetail';
import { LinkGroupForm } from './LinkGroupForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './LinkGroupGrid.module.css';

export const LinkGroupGrid: React.FC = () => {
  const { linkGroups } = useApp();
  const { t } = useLanguage();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedGroup = linkGroups.find((g) => g.id === selectedGroupId);

  if (selectedGroup) {
    return (
      <LinkGroupDetail
        group={selectedGroup}
        onBack={() => setSelectedGroupId(null)}
      />
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <h2 className={styles.title}>{t('quickLinks.title')}</h2>
          <p className={styles.subtitle}>
            {t('quickLinks.groupsSaved', { count: linkGroups.length })}
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            {t('quickLinks.addGroup')}
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {linkGroups.map((group) => (
          <LinkGroup
            key={group.id}
            group={group}
            onSelect={() => setSelectedGroupId(group.id)}
          />
        ))}
      </div>

      {linkGroups.length === 0 && (
        <div className={styles.empty}>
          <p>{t('quickLinks.noGroups')}</p>
          <p className={styles.emptySubtext}>{t('quickLinks.noGroupsHint')}</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('quickLinks.createGroup')}
        size="md"
      >
        <LinkGroupForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

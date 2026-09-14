'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LinkGroup } from './LinkGroup';
import { LinkGroupDetail } from './LinkGroupDetail';
import { LinkGroupForm } from './LinkGroupForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './LinkGroupGrid.module.css';

export const LinkGroupGrid: React.FC = () => {
  const { linkGroups } = useApp();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedGroup = linkGroups.find(g => g.id === selectedGroupId);

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
          <h2 className={styles.title}>Quick Links</h2>
          <p className={styles.subtitle}>{linkGroups.length} groups saved</p>
        </div>
        <div className={styles.actions}>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            + Add Group
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
          <p>No link groups yet</p>
          <p className={styles.emptySubtext}>Create your first group to organize your links</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Link Group"
        size="md"
      >
        <LinkGroupForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

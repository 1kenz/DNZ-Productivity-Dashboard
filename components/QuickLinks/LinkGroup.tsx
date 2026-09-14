'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LinkGroup as LinkGroupType } from '@/types';
import { LinkButton } from './LinkButton';
import { Modal } from '@/components/ui/Modal';
import { LinkGroupForm } from './LinkGroupForm';
import styles from './LinkGroup.module.css';

interface LinkGroupProps {
  group: LinkGroupType;
  onSelect: () => void;
}

export const LinkGroup: React.FC<LinkGroupProps> = ({ group, onSelect }) => {
  const { deleteLinkGroup } = useApp();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${group.name}" group?`)) {
      deleteLinkGroup(group.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  return (
    <>
      <div className={styles.container} style={{ borderTopColor: group.color }} onClick={onSelect}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <div className={styles.iconWrapper} style={{ backgroundColor: group.color }}>
              {group.icon || '🔗'}
            </div>
            <div>
              <h3 className={styles.title}>{group.name}</h3>
              <p className={styles.count}>{group.links.length} links</p>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button
              className={styles.actionBtn}
              onClick={handleEdit}
              title="Edit group"
            >
              ✏️
            </button>
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={handleDelete}
              title="Delete group"
            >
              🗑️
            </button>
          </div>
        </div>

      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Link Group"
        size="md"
      >
        <LinkGroupForm
          existingGroup={group}
          onClose={() => setIsEditModalOpen(false)}
        />
      </Modal>
    </>
  );
};

'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { KanbanColumn } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './KanbanColumnManager.module.css';

export const KanbanColumnManager: React.FC = () => {
  const { kanbanColumns, addKanbanColumn, updateKanbanColumn, deleteKanbanColumn } = useApp();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
  ];

  const handleOpenModal = (column?: KanbanColumn) => {
    if (column) {
      setEditingColumn(column);
      setName(column.name);
      setColor(column.color);
    } else {
      setEditingColumn(null);
      setName('');
      setColor(PRESET_COLORS[0]);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingColumn) {
      updateKanbanColumn(editingColumn.id, { name: name.trim(), color });
    } else {
      addKanbanColumn({
        name: name.trim(),
        color,
        order: kanbanColumns.length,
      });
    }

    setIsModalOpen(false);
    setName('');
    setColor(PRESET_COLORS[0]);
    setEditingColumn(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this column? Tasks in this column will be moved to the first column.')) {
      deleteKanbanColumn(id);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('kanban.board')}</h3>
        <Button size="sm" onClick={() => handleOpenModal()}>
          {t('kanban.addColumn')}
        </Button>
      </div>

      <div className={styles.columnList}>
        {kanbanColumns.sort((a, b) => a.order - b.order).map((column) => (
          <div key={column.id} className={styles.columnItem}>
            <div className={styles.columnInfo}>
              <div
                className={styles.colorDot}
                style={{ backgroundColor: column.color }}
              />
              <span className={styles.columnName}>{column.name}</span>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={() => handleOpenModal(column)}
                title={t('common.edit')}
              >
                ✏️
              </button>
              <button
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={() => handleDelete(column.id)}
                disabled={kanbanColumns.length <= 1}
                title={t('common.delete')}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        title={editingColumn ? t('kanban.editColumn') : t('kanban.newColumn')}
        size="sm"
      >
        <div className={styles.form}>
          <Input
            label={t('tasks.title')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., In Progress, Review"
            autoFocus
          />

          <div className={styles.colorSection}>
            <label className={styles.label}>{t('quickLinks.color')}</label>
            <div className={styles.colorGrid}>
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`${styles.colorBtn} ${color === presetColor ? styles.selected : ''}`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <Button onClick={handleSave} variant="primary">
              {editingColumn ? t('common.save') : t('common.add')}
            </Button>
            <Button onClick={() => setIsModalOpen(false)} variant="ghost">
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

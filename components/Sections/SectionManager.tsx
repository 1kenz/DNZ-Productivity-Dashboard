'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Section } from '@/types';
import { getSectionProgress } from '@/lib/progress';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import styles from './SectionManager.module.css';

interface SectionManagerProps {
  projectId: string;
}

const ICONS = ['📁', '💻', '🎨', '🗄️', '🔐', '📱', '🧪', '📝', '🎧', '📖', '✍️', '🎯'];
const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
];

export const SectionManager: React.FC<SectionManagerProps> = ({ projectId }) => {
  const { sections, todos, addSection, updateSection, deleteSection } = useApp();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const projectSections = sections.filter((s) => s.projectId === projectId);
  const topLevel = projectSections
    .filter((s) => !s.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const openAddModal = (parentId: string | null = null) => {
    setEditingSection(null);
    setParentForNew(parentId);
    setName('');
    setColor(PRESET_COLORS[0]);
    setIcon(ICONS[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (section: Section) => {
    setEditingSection(section);
    setParentForNew(section.parentId || null);
    setName(section.name);
    setColor(section.color || PRESET_COLORS[0]);
    setIcon(section.icon || ICONS[0]);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingSection) {
      updateSection(editingSection.id, { name: name.trim(), color, icon });
    } else {
      const siblingCount = projectSections.filter((s) => (s.parentId || null) === parentForNew).length;
      addSection({
        name: name.trim(),
        color,
        icon,
        order: siblingCount,
        projectId,
        parentId: parentForNew || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (section: Section) => {
    if (confirm(`Delete "${section.name}"? Its tasks are kept, just un-sectioned.`)) {
      deleteSection(section.id);
    }
  };

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderSection = (section: Section, depth: number): React.ReactNode => {
    const children = projectSections
      .filter((s) => s.parentId === section.id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const progress = getSectionProgress(section.id, todos, sections);
    const isCollapsed = collapsed.has(section.id);

    return (
      <div key={section.id}>
        <div className={styles.sectionRow} style={{ marginLeft: depth * 20 }}>
          {children.length > 0 ? (
            <button
              type="button"
              className={styles.collapseBtn}
              onClick={() => toggleCollapsed(section.id)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          ) : (
            <span className={styles.collapseSpacer} />
          )}
          <span className={styles.sectionIcon}>{section.icon}</span>
          <span className={styles.sectionName} style={{ color: section.color || undefined }}>
            {section.name}
          </span>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress.percent}%`, background: section.color || 'var(--color-primary)' }}
            />
          </div>
          <span className={styles.progressCount}>{progress.completed}/{progress.total}</span>
          <span className={styles.progressPercent}>{progress.percent}%</span>
          <div className={styles.sectionActions}>
            <button type="button" title={t('sections.addSubSection')} onClick={() => openAddModal(section.id)}>➕</button>
            <button type="button" title={t('common.edit')} onClick={() => openEditModal(section)}>✏️</button>
            <button type="button" className={styles.deleteBtn} title={t('common.delete')} onClick={() => handleDelete(section)}>🗑️</button>
          </div>
        </div>
        {!isCollapsed && children.map((c) => renderSection(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.panelToggle}
          onClick={() => setIsPanelOpen((prev) => !prev)}
          title={isPanelOpen ? 'Collapse' : 'Expand'}
        >
          <span className={styles.collapseBtn}>{isPanelOpen ? '▼' : '▶'}</span>
          <h3 className={styles.title}>{t('sections.title')}</h3>
          {projectSections.length > 0 && (
            <span className={styles.sectionCountBadge}>{projectSections.length}</span>
          )}
        </button>
        <button
          type="button"
          className={styles.addBtn}
          onClick={(e) => {
            e.stopPropagation();
            setIsPanelOpen(true);
            openAddModal(null);
          }}
          title={t('sections.addSection')}
        >
          {t('sections.addSection')}
        </button>
      </div>

      {isPanelOpen && (
        topLevel.length === 0 ? (
          <p className={styles.empty}>
            {t('sections.noSections')}
          </p>
        ) : (
          <div className={styles.sectionTree}>
            {topLevel.map((s) => renderSection(s, 0))}
          </div>
        )
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        title={editingSection ? t('common.edit') : parentForNew ? t('sections.addSubSection') : t('sections.addSection')}
        size="sm"
      >
        <div className={styles.formSplit}>
          <div className={styles.iconPicker}>
            <label className={styles.label}>{t('quickLinks.icon')}</label>
            <div className={styles.iconGrid}>
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.iconBtn} ${icon === i ? styles.active : ''}`}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.details}>
            <Input
              label={t('sections.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Frontend, Backend"
              autoFocus
            />
            <div className={styles.colorPicker}>
              <label className={styles.label}>{t('quickLinks.color')}</label>
              <div className={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.colorBtn} ${color === c ? styles.active : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSave}>
            {editingSection ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

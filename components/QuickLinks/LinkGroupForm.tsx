'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LinkGroup, QuickLink } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './LinkGroupForm.module.css';

interface LinkGroupFormProps {
  existingGroup?: LinkGroup;
  onClose: () => void;
}

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

const PRESET_ICONS = ['🔗', '⭐', '💼', '🎯', '📚', '🎨', '🛠️', '🌐'];

export const LinkGroupForm: React.FC<LinkGroupFormProps> = ({ existingGroup, onClose }) => {
  const { addLinkGroup, updateLinkGroup } = useApp();
  const { t } = useLanguage();
  const [name, setName] = useState(existingGroup?.name || '');
  const [color, setColor] = useState(existingGroup?.color || PRESET_COLORS[0]);
  const [icon, setIcon] = useState(existingGroup?.icon || PRESET_ICONS[0]);
  const [links, setLinks] = useState<Omit<QuickLink, 'id' | 'groupId'>[]>(
    existingGroup?.links.map((l) => ({ title: l.title, url: l.url, icon: l.icon, order: l.order })) || []
  );

  const handleAddLink = () => {
    setLinks([...links, { title: '', url: '', order: links.length }]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validLinks = links.filter((l) => l.title.trim() && l.url.trim());
    const groupData = {
      name: name.trim(),
      color,
      icon,
      order: existingGroup?.order || 0,
      links: validLinks.map((link, index) => ({
        ...link,
        id: existingGroup?.links[index]?.id || crypto.randomUUID(),
        groupId: existingGroup?.id || '',
        order: index,
      })),
    };

    if (existingGroup) {
      updateLinkGroup(existingGroup.id, groupData);
    } else {
      addLinkGroup(groupData);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label={t('quickLinks.groupName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Work Tools, Social Media"
        required
        autoFocus
      />

      <div className={styles.section}>
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

      <div className={styles.section}>
        <label className={styles.label}>{t('quickLinks.icon')}</label>
        <div className={styles.iconGrid}>
          {PRESET_ICONS.map((presetIcon) => (
            <button
              key={presetIcon}
              type="button"
              className={`${styles.iconBtn} ${icon === presetIcon ? styles.selected : ''}`}
              onClick={() => setIcon(presetIcon)}
            >
              {presetIcon}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.linksHeader}>
          <label className={styles.label}>{t('quickLinks.links')}</label>
          <Button type="button" size="sm" variant="ghost" onClick={handleAddLink}>
            + {t('common.add')} {t('quickLinks.links')}
          </Button>
        </div>

        <div className={styles.linksList}>
          {links.map((link, index) => (
            <div key={index} className={styles.linkItem}>
              <Input
                placeholder={t('tasks.title')}
                value={link.title}
                onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
              />
              <Input
                placeholder="https://..."
                value={link.url}
                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                type="url"
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemoveLink(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          {existingGroup ? t('common.save') : t('common.add')}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import { LinkGroup } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LinkButton } from './LinkButton';
import { AppPicker } from './AppPicker';
import { fileDropHandlers, fileNameFromPath } from '@/lib/electron';
import { Button } from '@/components/ui/Button';
import styles from './LinkGroupDetail.module.css';

interface LinkGroupDetailProps {
  group: LinkGroup;
  onBack: () => void;
}

export const LinkGroupDetail: React.FC<LinkGroupDetailProps> = ({ group, onBack }) => {
  const { addLink, updateLink, deleteLink, reorderLinks } = useApp();
  const { t } = useLanguage();
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkTitle, setEditLinkTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [appPickerFor, setAppPickerFor] = useState<'new' | 'edit' | null>(null);
  const [appPickerAnchorEl, setAppPickerAnchorEl] = useState<HTMLElement | null>(null);

  const sortedLinks = [...group.links].sort((a, b) => a.order - b.order);

  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      addLink({
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim(),
        groupId: group.id,
        order: group.links.length,
      });
      setNewLinkTitle('');
      setNewLinkUrl('');
      setIsAddingLink(false);
    }
  };

  const handleStartEditLink = (linkId: string, title: string, url: string) => {
    setEditingLinkId(linkId);
    setEditLinkTitle(title);
    setEditLinkUrl(url);
  };

  const handleCancelEditLink = () => {
    setEditingLinkId(null);
    setEditLinkTitle('');
    setEditLinkUrl('');
  };

  const handleSaveEditLink = () => {
    if (!editingLinkId || !editLinkTitle.trim() || !editLinkUrl.trim()) return;
    updateLink(editingLinkId, {
      title: editLinkTitle.trim(),
      url: editLinkUrl.trim(),
    });
    handleCancelEditLink();
  };

  const handleDeleteLink = (linkId: string, linkTitle: string) => {
    if (confirm(`${t('common.delete')} "${linkTitle}"?`)) {
      deleteLink(linkId);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...sortedLinks];
    const item = reordered.splice(draggedIndex, 1)[0];
    reordered.splice(index, 0, item);

    reorderLinks(group.id, reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Esc acts like Cancel: cancel an in-progress edit first, then an
  // in-progress "add link", and only then back out of the whole view.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (appPickerFor) {
        setAppPickerFor(null);
        setAppPickerAnchorEl(null);
      } else if (editingLinkId) {
        handleCancelEditLink();
      } else if (isAddingLink) {
        setIsAddingLink(false);
      } else {
        onBack();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [appPickerFor, editingLinkId, isAddingLink, onBack]);

  return (
    <div className={styles.overlay} onClick={onBack}>
      <div className={styles.container} style={{ borderTopColor: group.color }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <Button variant="ghost" onClick={onBack} className={styles.backBtn}>
            {t('quickLinks.backToDashboard')}
          </Button>
          <div className={styles.groupInfo}>
            <div className={styles.iconWrapper} style={{ backgroundColor: group.color }}>
              {group.icon || '🔗'}
            </div>
            <div>
              <h1 className={styles.title}>{group.name}</h1>
              <p className={styles.subtitle}>{group.links.length} {t('quickLinks.links').toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className={styles.linksGrid}>
          {sortedLinks.map((link, index) =>
            editingLinkId === link.id ? (
              <div key={link.id} className={`${styles.linkCard} ${styles.addCard}`}>
                <div className={styles.inlineForm}>
                  <input
                    placeholder={t('tasks.title')}
                    value={editLinkTitle}
                    onChange={(e) => setEditLinkTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEditLink();
                      }
                    }}
                    className={styles.miniInput}
                    autoFocus
                  />
                  <input
                    placeholder={t('quickLinks.urlOrPathPlaceholder')}
                    value={editLinkUrl}
                    onChange={(e) => setEditLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEditLink();
                      }
                    }}
                    className={styles.miniInput}
                    {...fileDropHandlers((path) => {
                      setEditLinkUrl(path);
                      if (!editLinkTitle.trim()) setEditLinkTitle(fileNameFromPath(path));
                    })}
                  />
                  <div className={styles.appPickerAnchor}>
                    <button
                      type="button"
                      className={styles.appPickerBtn}
                      onClick={(e) => {
                        if (appPickerFor === 'edit') {
                          setAppPickerFor(null);
                          setAppPickerAnchorEl(null);
                        } else {
                          setAppPickerFor('edit');
                          setAppPickerAnchorEl(e.currentTarget);
                        }
                      }}
                    >
                      📱 {t('quickLinks.chooseApp')}
                    </button>
                    {appPickerFor === 'edit' && (
                      <AppPicker
                        anchorEl={appPickerAnchorEl}
                        onSelect={(app) => {
                          setEditLinkTitle(app.name);
                          setEditLinkUrl(app.path);
                          setAppPickerFor(null);
                          setAppPickerAnchorEl(null);
                        }}
                        onClose={() => {
                          setAppPickerFor(null);
                          setAppPickerAnchorEl(null);
                        }}
                      />
                    )}
                  </div>
                  <div className={styles.formActions}>
                    <Button size="sm" onClick={handleSaveEditLink}>
                      {t('common.save')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEditLink}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={link.id}
                className={`${styles.linkCard} ${draggedIndex === index ? styles.dragging : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className={styles.dragHandle} title={t('common.dragToReorder')}>
                  ⠿
                </div>
                <LinkButton link={link} groupColor={group.color} />
                <div className={styles.linkMeta}>
                  <p className={styles.linkUrl}>{link.url}</p>
                  <div className={styles.linkActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleStartEditLink(link.id, link.title, link.url)}
                      title={t('common.edit')}
                      type="button"
                    >
                      ✏️
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDeleteLink(link.id, link.title)}
                      title={t('common.delete')}
                      type="button"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          <div className={`${styles.linkCard} ${styles.addCard}`}>
            {isAddingLink ? (
              <div className={styles.inlineForm}>
                <input
                  placeholder={t('tasks.title')}
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLink();
                    }
                  }}
                  className={styles.miniInput}
                />
                <input
                  placeholder={t('quickLinks.urlOrPathPlaceholder')}
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLink();
                    }
                  }}
                  className={styles.miniInput}
                  {...fileDropHandlers((path) => {
                    setNewLinkUrl(path);
                    if (!newLinkTitle.trim()) setNewLinkTitle(fileNameFromPath(path));
                  })}
                />
                <div className={styles.appPickerAnchor}>
                  <button
                    type="button"
                    className={styles.appPickerBtn}
                    onClick={(e) => {
                      if (appPickerFor === 'new') {
                        setAppPickerFor(null);
                        setAppPickerAnchorEl(null);
                      } else {
                        setAppPickerFor('new');
                        setAppPickerAnchorEl(e.currentTarget);
                      }
                    }}
                  >
                    📱 {t('quickLinks.chooseApp')}
                  </button>
                  {appPickerFor === 'new' && (
                    <AppPicker
                      anchorEl={appPickerAnchorEl}
                      onSelect={(app) => {
                        setNewLinkTitle(app.name);
                        setNewLinkUrl(app.path);
                        setAppPickerFor(null);
                        setAppPickerAnchorEl(null);
                      }}
                      onClose={() => {
                        setAppPickerFor(null);
                        setAppPickerAnchorEl(null);
                      }}
                    />
                  )}
                </div>
                <div className={styles.formActions}>
                  <Button size="sm" onClick={handleAddLink}>
                    {t('common.add')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingLink(false)}>
                    ✕
                  </Button>
                </div>
              </div>
            ) : (
              <button className={styles.addTrigger} onClick={() => setIsAddingLink(true)}>
                {t('quickLinks.addNewLink')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

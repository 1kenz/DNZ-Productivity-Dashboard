'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import { AppleNotesIcon } from '@/components/ui/AppleNotesIcon';
import { AppPicker } from '@/components/QuickLinks/AppPicker';
import styles from './NotesView.module.css';

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, addAttachment, deleteAttachment, openLocalPath } = useApp();
  const { t } = useLanguage();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const [search, setSearch] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Attachments: local documents/programs (on the user's own computer)
  // linked to the selected note for quick access.
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [newAttachmentLabel, setNewAttachmentLabel] = useState('');
  const [newAttachmentPath, setNewAttachmentPath] = useState('');
  const [showAttachmentAppPicker, setShowAttachmentAppPicker] = useState(false);

  // Always resolve the active note: selectedNoteId match or fallback to the first available note
  const selectedNote = notes.find((n) => n.id === selectedNoteId) || (notes.length > 0 ? notes[0] : null);

  useEffect(() => {
    if (notes.length > 0) {
      if (!selectedNoteId || !notes.some((n) => n.id === selectedNoteId)) {
        setSelectedNoteId(notes[0].id);
      }
    }
  }, [notes, selectedNoteId]);

  const filteredNotes = notes.filter((n) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const handleCreateNew = () => {
    const title = `Note ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const id = addNote({
      title,
      content: '',
    });
    setSelectedNoteId(id);
    setIsEditingTitle(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(0, 0);
      }
    }, 30);
  };

  const handleContentChange = (content: string) => {
    if (selectedNote) {
      updateNote(selectedNote.id, { content });
    } else {
      const title = `Note ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const id = addNote({
        title,
        content,
      });
      setSelectedNoteId(id);
    }
  };

  const startEditTitle = () => {
    if (!selectedNote) return;
    setTitleDraft(selectedNote.title);
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (selectedNote && titleDraft.trim()) {
      updateNote(selectedNote.id, { title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const handleAddAttachment = () => {
    const label = newAttachmentLabel.trim();
    const path = newAttachmentPath.trim();
    if (!label || !path || !selectedNote) return;
    addAttachment({ label, path, noteId: selectedNote.id });
    setNewAttachmentLabel('');
    setNewAttachmentPath('');
    setIsAddingAttachment(false);
  };

  const handleCancelAddAttachment = () => {
    setNewAttachmentLabel('');
    setNewAttachmentPath('');
    setIsAddingAttachment(false);
    setShowAttachmentAppPicker(false);
  };

  const handleAttachmentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAttachment();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelAddAttachment();
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Sidebar Notes List */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.appBrand}>
            <AppleNotesIcon size={22} />
            <span className={styles.brandTitle}>{t('notesTab')}</span>
          </div>

          <button
            type="button"
            className={styles.newNoteBtn}
            onClick={handleCreateNew}
            title={t('quickNotes.newNote')}
          >
            ✏️ +
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('quickNotes.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.notesList}>
          {filteredNotes.map((note) => {
            const isSelected = note.id === selectedNoteId;
            return (
              <div
                key={note.id}
                className={`${styles.noteCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => {
                  setSelectedNoteId(note.id);
                  setIsEditingTitle(false);
                }}
              >
                <div className={styles.noteTop}>
                  <span className={styles.cardTitle}>{note.title}</span>
                  <button
                    type="button"
                    className={styles.deleteCardBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`${t('common.delete')} note?`)) {
                        deleteNote(note.id);
                        if (selectedNoteId === note.id) setSelectedNoteId(null);
                      }
                    }}
                    title={t('common.delete')}
                  >
                    🗑️
                  </button>
                </div>
                <div className={styles.cardPreview}>
                  {note.content.substring(0, 75) || 'No additional text...'}
                </div>
                <div className={styles.cardFooter}>
                  <span>{new Date(note.updatedAt || Date.now()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{countWords(note.content)} {t('notes.wordCount')}</span>
                </div>
              </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className={styles.sidebarEmpty}>
              <p>{t('quickNotes.noNotes')}</p>
              <Button size="sm" variant="secondary" onClick={handleCreateNew}>
                + {t('quickNotes.newNote')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Note Editor Workspace */}
      <div className={styles.mainEditor}>
        {selectedNote ? (
          <>
            <div className={styles.editorToolbar}>
              <div className={styles.titleArea}>
                {isEditingTitle ? (
                  <input
                    type="text"
                    className={styles.titleInput}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                  />
                ) : (
                  <h2 className={styles.activeTitle} onClick={startEditTitle} title={t('common.edit')}>
                    {selectedNote.title}
                  </h2>
                )}
              </div>

              <div className={styles.toolbarStats}>
                <span className={styles.autoSavedBadge}>✓ {t('quickNotes.saved')}</span>
                <button
                  type="button"
                  className={styles.clearDocBtn}
                  onClick={() => updateNote(selectedNote.id, { content: '' })}
                  title={t('common.clear')}
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>

            <div className={styles.attachmentsBar}>
              <span className={styles.attachmentsBarLabel}>📎 {t('attachments.title')}</span>
              {(selectedNote.attachments || []).map((a) => (
                <div key={a.id} className={styles.attachmentChip} title={a.path}>
                  <button type="button" className={styles.attachmentChipOpen} onClick={() => openLocalPath(a.path)}>
                    {a.label}
                  </button>
                  <button
                    type="button"
                    className={styles.attachmentChipRemove}
                    onClick={() => deleteAttachment(a.id, { noteId: selectedNote.id })}
                    title={t('common.delete') || 'Remove attachment'}
                  >
                    ×
                  </button>
                </div>
              ))}
              {isAddingAttachment ? (
                <div className={styles.attachmentAddInline}>
                  <input
                    type="text"
                    className={styles.attachmentAddInput}
                    placeholder={t('attachments.labelPlaceholder')}
                    value={newAttachmentLabel}
                    onChange={(e) => setNewAttachmentLabel(e.target.value)}
                    onKeyDown={handleAttachmentKeyDown}
                    autoFocus
                  />
                  <input
                    type="text"
                    className={styles.attachmentAddInput}
                    placeholder={t('attachments.pathPlaceholder')}
                    value={newAttachmentPath}
                    onChange={(e) => setNewAttachmentPath(e.target.value)}
                    onKeyDown={handleAttachmentKeyDown}
                  />
                  <div className={styles.appPickerAnchor}>
                    <button
                      type="button"
                      className={styles.addAttachmentBtn}
                      onClick={() => setShowAttachmentAppPicker((prev) => !prev)}
                      title={t('quickLinks.chooseApp')}
                    >
                      📱
                    </button>
                    {showAttachmentAppPicker && (
                      <AppPicker
                        onSelect={(app) => {
                          setNewAttachmentLabel(app.name);
                          setNewAttachmentPath(app.path);
                          setShowAttachmentAppPicker(false);
                        }}
                        onClose={() => setShowAttachmentAppPicker(false)}
                      />
                    )}
                  </div>
                  <button type="button" className={styles.attachmentChipOpen} onClick={handleAddAttachment}>
                    {t('common.add')}
                  </button>
                  <button type="button" className={styles.attachmentChipRemove} onClick={handleCancelAddAttachment}>
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.addAttachmentBtn}
                  onClick={() => setIsAddingAttachment(true)}
                  title={t('common.add')}
                >
                  + 📎
                </button>
              )}
            </div>

            <textarea
              ref={textareaRef}
              className={styles.documentTextarea}
              placeholder={t('quickNotes.typeHere')}
              value={selectedNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              autoFocus
            />

            <div className={styles.editorFooter}>
              <span>{countWords(selectedNote.content)} {t('notes.wordCount')} • {selectedNote.content.length} {t('notes.characterCount')}</span>
              <span>DNZ Notes v3.0</span>
            </div>
          </>
        ) : (
          <div className={styles.noSelection}>
            <div className={styles.noSelIcon}>
              <AppleNotesIcon size={44} />
            </div>
            <h3>{t('notes.selectNote')}</h3>
            <Button variant="primary" onClick={handleCreateNew}>
              + {t('quickNotes.newNote')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppleNotesIcon } from '@/components/ui/AppleNotesIcon';
import styles from './QuickNotes.module.css';

export interface QuickNotesHandle {
  createNewNote: () => void;
}

interface QuickNotesProps {
  hideHeader?: boolean;
}

export const QuickNotes = forwardRef<QuickNotesHandle, QuickNotesProps>(({ hideHeader = false }, ref) => {
  const { notes, addNote, updateNote, deleteNote, setIsQuickNotesOpen } = useApp();
  const { t } = useLanguage();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Always resolve the active note: selectedNoteId match or fallback to first note
  const selectedNote = notes.find((n) => n.id === selectedNoteId) || (notes.length > 0 ? notes[0] : null);

  useEffect(() => {
    if (notes.length > 0) {
      if (!selectedNoteId || !notes.some((n) => n.id === selectedNoteId)) {
        setSelectedNoteId(notes[0].id);
      }
    }
  }, [notes, selectedNoteId]);

  const recentNotes = notes.slice(0, 5);

  const handleNewNote = () => {
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

  useImperativeHandle(ref, () => ({
    createNewNote: handleNewNote,
  }));

  const handleContentChange = (content: string) => {
    if (selectedNote) {
      updateNote(selectedNote.id, { content });
    } else {
      // If user starts typing when no notes exist, automatically create first note
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

  return (
    <div className={`${styles.container} ${hideHeader ? styles.embedded : ''}`}>
      {/* 1. Widget Header (only when not embedded in Popover) */}
      {!hideHeader && (
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <AppleNotesIcon size={18} />
            <h3 className={styles.title}>{t('quickNotes.title')}</h3>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleNewNote}
              title={t('quickNotes.newNote')}
            >
              +
            </button>

            <button
              type="button"
              className={styles.expandDrawerBtn}
              onClick={() => setIsQuickNotesOpen(true)}
              title={`${t('quickNotes.title')} (⌘J)`}
            >
              ↗
            </button>
          </div>
        </div>
      )}

      {/* 2. Note Editor Area - Always ready to write directly */}
      <div className={styles.editorBody}>
        <div className={styles.noteMetaBar}>
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
            <span
              className={styles.activeTitle}
              onClick={startEditTitle}
              title={t('common.edit')}
            >
              {selectedNote ? selectedNote.title : t('quickNotes.newNoteTitle')}
            </span>
          )}

          <div className={styles.metaActions}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                if (selectedNote) updateNote(selectedNote.id, { content: '' });
              }}
              title={t('common.clear')}
            >
              {t('common.clear')}
            </button>
            {selectedNote && (
              <button
                type="button"
                className={styles.deleteNoteBtn}
                onClick={() => {
                  if (confirm(`${t('common.delete')} note?`)) {
                    deleteNote(selectedNote.id);
                    setSelectedNoteId(null);
                  }
                }}
                title={t('common.delete')}
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={selectedNote ? selectedNote.content : ''}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={t('quickNotes.typeHere')}
          autoFocus
        />
      </div>

      {/* 3. Bottom Recent Notes List (Satır satır son 5 tanesi) */}
      {recentNotes.length > 0 && (
        <div className={styles.recentNotesSection}>
          <div className={styles.recentNotesHeader}>
            <span>{t('quickNotes.title')} ({notes.length})</span>
            <span className={styles.recentLimitBadge}>
              {t('quickNotes.last', { count: recentNotes.length })}
            </span>
          </div>

          <div className={styles.recentNotesList}>
            {recentNotes.map((note) => {
              const isSelected = selectedNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  className={`${styles.noteRow} ${isSelected ? styles.noteRowActive : ''}`}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setIsEditingTitle(false);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }, 30);
                  }}
                >
                  <div className={styles.noteRowMain}>
                    <div className={styles.noteRowTop}>
                      <span className={styles.noteRowTitle}>{note.title}</span>
                      <span className={styles.noteRowTime}>
                        {new Date(note.updatedAt || Date.now()).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className={styles.noteRowPreview}>
                      {note.content.trim() ? note.content.substring(0, 50) : t('quickNotes.emptyNote')}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.deleteRowBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`${t('common.delete')} note?`)) {
                        deleteNote(note.id);
                        if (selectedNoteId === note.id) setSelectedNoteId(null);
                      }
                    }}
                    title={t('common.delete')}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

QuickNotes.displayName = 'QuickNotes';

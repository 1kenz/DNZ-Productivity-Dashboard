'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import styles from './QuickNotes.module.css';

export const QuickNotes: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useApp();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const handleNewNote = () => {
    const title = `Note ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    const id = addNote({
      title,
      content: '',
    });
    setSelectedNoteId(id);
    setIsEditingTitle(false);
    // Focus the editor so the user can start typing immediately.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleContentChange = (content: string) => {
    if (selectedNoteId) {
      updateNote(selectedNoteId, { content });
    }
  };

  const startEditTitle = () => {
    if (!selectedNote) return;
    setTitleDraft(selectedNote.title);
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (selectedNoteId && titleDraft.trim()) {
      updateNote(selectedNoteId, { title: titleDraft.trim() });
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Quick Notes</h3>
        <button 
          className={styles.addBtn}
          onClick={handleNewNote}
          title="New Note"
        >
          +
        </button>
      </div>

      <div className={styles.notesLayout}>
        <div className={styles.editor}>
          {selectedNote ? (
            <>
              <div className={styles.editorHeader}>
                {isEditingTitle ? (
                  <input
                    type="text"
                    className={styles.titleEditInput}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                  />
                ) : (
                  <span 
                    className={styles.editingTitle} 
                    onClick={startEditTitle}
                    title="Click to rename"
                  >
                    {selectedNote.title}
                  </span>
                )}
                <button 
                  className={styles.clearBtn}
                  onClick={() => updateNote(selectedNoteId!, { content: '' })}
                  title="Clear Note Content"
                >
                  🗑️ Clear
                </button>
              </div>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={selectedNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start writing..."
                autoFocus
              />
            </>
          ) : (
            <div className={styles.editorPlaceholder}>
              Select a note below or create a new one to start writing
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>Your Notes</div>
          <div className={styles.notesList}>
            {notes.map(note => (
              <div 
                key={note.id} 
                className={`${styles.noteItem} ${selectedNoteId === note.id ? styles.active : ''}`}
                onClick={() => setSelectedNoteId(note.id)}
              >
                <div className={styles.noteMeta}>
                  <span className={styles.noteTitle}>{note.title}</span>
                  <button 
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete note?')) {
                        deleteNote(note.id);
                        if (selectedNoteId === note.id) setSelectedNoteId(null);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
                <span className={styles.notePreview}>
                  {note.content.substring(0, 45) || 'Empty note...'}
                </span>
              </div>
            ))}
            {notes.length === 0 && (
              <p className={styles.emptyText}>No notes yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

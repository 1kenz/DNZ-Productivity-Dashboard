'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AiMessage, AiReport } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { AiAssistantTabIcon } from '@/components/ui/TabIcons';
import styles from './MessageBubble.module.css';

const REPORT_VAULT_KEY = 'dnz_ai_report_vault';

interface MessageBubbleProps {
  message: AiMessage;
  onAddTask?: (title: string, description: string) => void;
  onSaveNote?: (title: string, content: string) => void;
  onDelete?: (id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onAddTask,
  onSaveNote,
  onDelete,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}) => {
  const { addTodo, updateTodo, addNote, todos } = useApp();
  const { t } = useLanguage();
  const { speak, stop, isSpeaking } = useSpeechSynthesis();
  const [copied, setCopied] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [vaultSaved, setVaultSaved] = useState(false);

  // "Add to Task" popover -- lets a message go into an existing task's
  // description, become a new subtask under an existing task, or become a
  // brand-new task (the last one is what the old single-purpose button
  // used to always do).
  const [addTaskMode, setAddTaskMode] = useState<'closed' | 'choose' | 'pick-description' | 'pick-subtask'>('closed');
  const [targetTaskId, setTargetTaskId] = useState('');
  const addTaskRef = useRef<HTMLDivElement>(null);
  const openTasks = todos.filter((td) => !td.completed);

  useEffect(() => {
    if (addTaskMode === 'closed') return;
    const handleOutside = (e: MouseEvent) => {
      if (addTaskRef.current && !addTaskRef.current.contains(e.target as Node)) {
        setAddTaskMode('closed');
        setTargetTaskId('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [addTaskMode]);

  const isUser = message.role === 'user';

  const handleCopyAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (code: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
  };

  const handleSpeak = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isSpeaking) {
      stop();
    } else {
      speak(message.content);
    }
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!onDelete) return;
    const confirmMsg = t('ai.deleteMessageConfirm') || 'Bu mesajı silmek istediğinize emin misiniz?';
    if (window.confirm(confirmMsg)) {
      onDelete(message.id);
    }
  };

  const suggestedTitle = () => {
    const lines = message.content.split('\n').filter((l) => l.trim());
    return lines[0]?.replace(/^[#*-]\s*/, '').slice(0, 80) || 'AI Task Suggestion';
  };

  const handleCreateNewTask = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const title = suggestedTitle();
    const description = message.content;

    if (onAddTask) {
      onAddTask(title, description);
    } else {
      addTodo({
        title,
        description,
        completed: false,
        priority: 'medium',
        status: 'todo',
        tags: ['AI-Assistant'],
      });
    }

    setAddTaskMode('closed');
    setTargetTaskId('');
    setTaskAdded(true);
    setTimeout(() => setTaskAdded(false), 2500);
  };

  const handleAddAsDescription = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!targetTaskId) return;
    const target = todos.find((td) => td.id === targetTaskId);
    if (!target) return;

    const merged = target.description
      ? `${target.description}\n\n${message.content}`
      : message.content;
    updateTodo(targetTaskId, { description: merged });

    setAddTaskMode('closed');
    setTargetTaskId('');
    setTaskAdded(true);
    setTimeout(() => setTaskAdded(false), 2500);
  };

  const handleAddAsSubtask = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!targetTaskId) return;
    const parent = todos.find((td) => td.id === targetTaskId);
    if (!parent) return;

    addTodo({
      title: suggestedTitle(),
      description: message.content,
      completed: false,
      priority: parent.priority,
      status: parent.status,
      projectId: parent.projectId,
      parentTodoId: parent.id,
      tags: ['AI-Assistant'],
    });

    setAddTaskMode('closed');
    setTargetTaskId('');
    setTaskAdded(true);
    setTimeout(() => setTaskAdded(false), 2500);
  };

  const handleSaveToNotes = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const lines = message.content.split('\n').filter((l) => l.trim());
    const title = lines[0]?.replace(/^[#*-]\s*/, '').slice(0, 50) || `AI Note - ${new Date().toLocaleDateString()}`;

    if (onSaveNote) {
      onSaveNote(title, message.content);
    } else {
      addNote({
        title,
        content: message.content,
      });
    }

    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  const handleSaveToVault = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const lines = message.content.split('\n').filter((l) => l.trim());
    const title = lines[0]?.replace(/^[#*-\s]+/, '').slice(0, 60) || `AI Report - ${new Date().toLocaleDateString()}`;

    const newReport: AiReport = {
      id: 'rep-' + Date.now(),
      title,
      content: message.content,
      type: message.content.toLowerCase().includes('brifing') || message.content.toLowerCase().includes('briefing') ? 'briefing' : 'general',
      createdAt: new Date(),
    };

    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem(REPORT_VAULT_KEY);
      const list: AiReport[] = existing ? JSON.parse(existing) : [];
      list.unshift(newReport);
      localStorage.setItem(REPORT_VAULT_KEY, JSON.stringify(list));
    }

    setVaultSaved(true);
    setTimeout(() => setVaultSaved(false), 2500);
  };

  const handleRowClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(message.id);
    }
  };

  // Inline **bold** within a single line of markdown-lite text.
  const renderInlineMarkdown = (line: string): React.ReactNode[] => {
    const segments = line.split(/(\*\*[^*]+\*\*)/g);
    return segments.map((seg, i) =>
      seg.startsWith('**') && seg.endsWith('**') && seg.length > 4 ? (
        <strong key={i}>{seg.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={i}>{seg}</React.Fragment>
      )
    );
  };

  // Small, dependency-free markdown renderer for the non-code-block
  // portions of a message: #/##/### headings, **bold**, and -/* bullet
  // lists. Reports like the DNZ SITREP briefing are generated as real
  // markdown but were previously shown as raw text (literal #, **, -
  // characters still in it) -- this is just enough structure to make
  // that readable without pulling in a full markdown library.
  const renderMarkdownLite = (text: string, keyPrefix: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let listBuffer: string[] = [];
    let paraBuffer: string[] = [];

    const flushList = () => {
      if (listBuffer.length === 0) return;
      blocks.push(
        <ul key={`${keyPrefix}-ul-${blocks.length}`} className={styles.mdList}>
          {listBuffer.map((item, i) => (
            <li key={i} className={styles.mdListItem}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    const flushPara = () => {
      if (paraBuffer.length === 0) return;
      blocks.push(
        <p key={`${keyPrefix}-p-${blocks.length}`} className={styles.mdParagraph}>
          {paraBuffer.map((l, i) => (
            <React.Fragment key={i}>
              {renderInlineMarkdown(l)}
              {i < paraBuffer.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
      paraBuffer = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
      const listMatch = line.match(/^[-*]\s+(.*)$/);

      if (headingMatch) {
        flushList();
        flushPara();
        const level = headingMatch[1].length;
        const cls = level === 1 ? styles.mdH1 : level === 2 ? styles.mdH2 : styles.mdH3;
        const headingKey = `${keyPrefix}-h-${blocks.length}`;
        const headingContent = renderInlineMarkdown(headingMatch[2]);
        if (level === 1) {
          blocks.push(<h4 key={headingKey} className={cls}>{headingContent}</h4>);
        } else if (level === 2) {
          blocks.push(<h5 key={headingKey} className={cls}>{headingContent}</h5>);
        } else {
          blocks.push(<h6 key={headingKey} className={cls}>{headingContent}</h6>);
        }
      } else if (listMatch) {
        flushPara();
        listBuffer.push(listMatch[1]);
      } else if (line.trim() === '') {
        flushList();
        flushPara();
      } else {
        flushList();
        paraBuffer.push(line);
      }
    }
    flushList();
    flushPara();
    return blocks;
  };

  // Render markdown-like blocks: code blocks ``` vs regular (markdown-lite) text
  const renderContent = () => {
    const text = message.content;
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const language = lines[0].trim() || 'code';
        const codeContent = lines.slice(1).join('\n');

        return (
          <div key={index} className={styles.codeBlock} onClick={(e) => isSelectionMode && e.stopPropagation()}>
            <div className={styles.codeHeader}>
              <span>{language}</span>
              <button
                type="button"
                className={styles.copyCodeBtn}
                onClick={(e) => handleCopyCode(codeContent, e)}
                title={t('common.copy')}
              >
                📋 {t('common.copy')}
              </button>
            </div>
            <pre className={styles.codePre}>
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className={styles.content}>
          {renderMarkdownLite(part, `md-${index}`)}
        </div>
      );
    });
  };

  const timeString = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`${styles.messageRow} ${isUser ? styles.user : styles.assistant} ${isSelectionMode ? styles.selectionModeRow : ''}`}
      onClick={handleRowClick}
    >
      {/* WhatsApp / iOS Style Checkbox */}
      {isSelectionMode && (
        <div
          className={`${styles.selectionCheckbox} ${isSelected ? styles.selected : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(message.id);
          }}
          title={isSelected ? t('ai.deselectAll') : t('ai.multiSelect')}
        >
          {isSelected ? '✓' : ''}
        </div>
      )}

      <div className={`${styles.bubble} ${isSelected ? styles.selectedBubble : ''}`}>
        <div className={styles.headerRow}>
          <div className={styles.senderInfo}>
            <span className={styles.senderIcon}>
              {isUser ? (
                <span style={{ fontSize: '0.85rem' }}>👤</span>
              ) : (
                <AiAssistantTabIcon size={15} />
              )}
            </span>
            <span style={{ fontWeight: 700 }}>
              {isUser ? (t('ai.you') || 'You') : 'Deniz'}
            </span>
            {message.model && <span className={styles.modelBadge}>{message.model}</span>}
          </div>
          <div className={styles.headerRight}>
            <span className={styles.timestamp}>{timeString}</span>
            {!isSelectionMode && onDelete && (
              <button
                type="button"
                className={styles.deleteHeaderBtn}
                onClick={handleDelete}
                title={t('common.delete') || 'Sil'}
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {renderContent()}

        {!isSelectionMode && (
          <div className={styles.actionsToolbar}>
            {!isUser && (
              <button
                type="button"
                className={`${styles.actionBtn} ${isSpeaking ? styles.speaking : ''}`}
                onClick={handleSpeak}
                title="Speak"
              >
                {isSpeaking ? '⏹️ ' + t('common.close') : '🔊 ' + (t('ai.speak') || 'Listen')}
              </button>
            )}

            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleCopyAll}
              title={t('common.copy')}
            >
              {copied ? '✓ ' + t('common.copied') : '📋 ' + t('common.copy')}
            </button>

            {!isUser && (
              <>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleSaveToVault}
                  title="Save to AI Report Vault"
                >
                  {vaultSaved ? '✓ ' + (t('ai.vaultSaved') || 'Saved in Vault') : '📁 ' + (t('ai.saveToVault') || 'Save to Vault')}
                </button>

                <div className={styles.addTaskContainer} ref={addTaskRef}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddTaskMode((m) => (m === 'closed' ? 'choose' : 'closed'));
                    }}
                    title="Add this response to a task"
                  >
                    {taskAdded ? '✓ ' + t('tasks.addTask') : '➕ ' + (t('ai.createTask') || 'To Task')}
                  </button>

                  {addTaskMode === 'choose' && (
                    <div className={styles.addTaskPopover} onClick={(e) => e.stopPropagation()}>
                      <button type="button" className={styles.addTaskOption} onClick={handleCreateNewTask}>
                        🆕 {t('ai.addAsNewTask') || 'Yeni görev olarak ekle'}
                      </button>
                      <button
                        type="button"
                        className={styles.addTaskOption}
                        onClick={() => setAddTaskMode('pick-description')}
                      >
                        📝 {t('ai.addAsDescription') || 'Mevcut göreve açıklama olarak ekle'}
                      </button>
                      <button
                        type="button"
                        className={styles.addTaskOption}
                        onClick={() => setAddTaskMode('pick-subtask')}
                      >
                        🔗 {t('ai.addAsSubtask') || 'Mevcut görevin altına alt görev olarak ekle'}
                      </button>
                    </div>
                  )}

                  {(addTaskMode === 'pick-description' || addTaskMode === 'pick-subtask') && (
                    <div className={styles.addTaskPopover} onClick={(e) => e.stopPropagation()}>
                      <select
                        className={styles.addTaskSelect}
                        value={targetTaskId}
                        onChange={(e) => setTargetTaskId(e.target.value)}
                      >
                        <option value="">{t('tasks.selectTask') || 'Görev seç...'}</option>
                        {openTasks.map((td) => (
                          <option key={td.id} value={td.id}>
                            {td.title}
                          </option>
                        ))}
                      </select>
                      <div className={styles.addTaskPopoverActions}>
                        <button
                          type="button"
                          className={styles.addTaskCancelBtn}
                          onClick={() => {
                            setAddTaskMode('closed');
                            setTargetTaskId('');
                          }}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          className={styles.addTaskConfirmBtn}
                          disabled={!targetTaskId}
                          onClick={addTaskMode === 'pick-description' ? handleAddAsDescription : handleAddAsSubtask}
                        >
                          {t('common.add') || t('tasks.addTask')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleSaveToNotes}
                  title="Save to Quick Notes"
                >
                  {noteSaved ? '✓ ' + (t('ai.saved') || 'Saved') : '📝 ' + (t('ai.toNotes') || 'To Notes')}
                </button>
              </>
            )}

            {onDelete && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.deleteActionBtn}`}
                onClick={handleDelete}
                title={t('common.delete') || 'Sil'}
              >
                🗑️ {t('common.delete') || 'Sil'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

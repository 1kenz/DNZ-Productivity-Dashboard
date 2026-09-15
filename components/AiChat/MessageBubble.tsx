'use client';

import React, { useState } from 'react';
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
  const { addTodo, addNote } = useApp();
  const { t } = useLanguage();
  const { speak, stop, isSpeaking } = useSpeechSynthesis();
  const [copied, setCopied] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [vaultSaved, setVaultSaved] = useState(false);

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
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleCreateTask = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const lines = message.content.split('\n').filter((l) => l.trim());
    const title = lines[0]?.replace(/^[#*-]\s*/, '').slice(0, 80) || 'AI Task Suggestion';
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

  // Render markdown-like blocks: code blocks ``` vs regular text
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
          {part}
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

                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleCreateTask}
                  title="Create Todo from this response"
                >
                  {taskAdded ? '✓ ' + t('tasks.addTask') : '➕ ' + (t('ai.createTask') || 'To Task')}
                </button>

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

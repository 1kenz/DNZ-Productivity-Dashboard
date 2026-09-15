'use client';

import React, { useState } from 'react';
import { AiConversation, AI_MODELS } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './ConversationSidebar.module.css';

interface ConversationSidebarProps {
  conversations: AiConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  onOpenSettings: () => void;
  onOpenLiveVoice: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onTogglePin,
  onOpenSettings,
  onOpenLiveVoice,
}) => {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    return c.title.toLowerCase().includes(search.trim().toLowerCase());
  });

  const getModelIcon = (modelId: string) => {
    const found = AI_MODELS.find((m) => m.id === modelId);
    return found?.icon || '🤖';
  };

  const formatChatTitle = (title: string) => {
    if (!title || title === 'Yeni Sohbet' || title === 'New Chat' || title === 'Neuer Chat') {
      return t('ai.newChat') || 'New Chat';
    }
    return title;
  };

  const locale = language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : 'en-US';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.newChatBtn}
          onClick={onNewChat}
          title={t('ai.newChat') || 'New Chat'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#ffffff', flexShrink: 0 }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{t('ai.newChat') || 'New Chat'}</span>
        </button>

        <button
          type="button"
          className={styles.voiceLiveBtn}
          onClick={onOpenLiveVoice}
          title={t('ai.liveVoice') || 'Live Voice Mode'}
        >
          <span>🎙️</span>
          <span>{t('ai.liveVoice') || 'Live Voice Mode'}</span>
        </button>

        <input
          type="text"
          className={styles.searchInput}
          placeholder={t('ai.searchChats') || 'Search chats...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.conversationList}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>{t('ai.noChatHistory') || 'No chat history yet.'}</div>
        ) : (
          filtered.map((chat) => (
            <div
              key={chat.id}
              className={`${styles.chatItem} ${chat.id === activeConversationId ? styles.active : ''} ${chat.pinned ? styles.pinnedItem : ''}`}
              onClick={() => onSelectConversation(chat.id)}
            >
              <div className={styles.chatContent}>
                <div className={styles.chatTitleRow}>
                  <span className={styles.modelIcon}>{getModelIcon(chat.model)}</span>
                  <span className={styles.chatTitle} title={formatChatTitle(chat.title)}>
                    {formatChatTitle(chat.title)}
                  </span>
                </div>
                <span className={styles.chatDate}>
                  {new Date(chat.updatedAt).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <div
                className={`${styles.chatActions} ${chat.pinned ? styles.hasPinned : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`${styles.iconBtn} ${chat.pinned ? styles.pinnedBtn : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(chat.id, chat.pinned);
                  }}
                  title={chat.pinned ? (t('ai.unpinChat') || 'Unpin chat') : (t('ai.pinChat') || 'Pin chat')}
                >
                  {chat.pinned ? '📌' : '📍'}
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    const confirmMsg = t('ai.deleteChatConfirm') || 'Bu sohbeti silmek istediğinize emin misiniz?';
                    const displayTitle = formatChatTitle(chat.title);
                    if (window.confirm(`${displayTitle ? `"${displayTitle}"\n\n` : ''}${confirmMsg}`)) {
                      onDeleteConversation(chat.id);
                    }
                  }}
                  title={t('ai.deleteChat') || 'Delete chat'}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={onOpenSettings}
          title={t('ai.settings') || 'AI & Voice Settings'}
        >
          <span>⚙️</span>
          <span>{t('ai.settings') || 'AI & Voice Settings'}</span>
        </button>
      </div>
    </aside>
  );
};

'use client';

import React from 'react';
import { QuickLink } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { isLocalPath } from '@/lib/localPath';
import styles from './LinkButton.module.css';

interface LinkButtonProps {
  link: QuickLink;
  groupColor: string;
}

export const LinkButton: React.FC<LinkButtonProps> = ({ link, groupColor }) => {
  const { openLocalPath } = useApp();

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };

  const local = isLocalPath(link.url);
  const faviconUrl = local ? null : getFaviconUrl(link.url);

  const icon = link.icon ? (
    <span className={styles.customIcon}>{link.icon}</span>
  ) : faviconUrl ? (
    <img src={faviconUrl} alt="" className={styles.favicon} />
  ) : (
    <span className={styles.defaultIcon}>{local ? '📄' : '🔗'}</span>
  );

  // A local document/program on the user's own computer -- open it via the
  // OS instead of navigating the browser to it (a file:// href doesn't
  // reliably work from a page served over http(s)).
  if (local) {
    return (
      <button
        type="button"
        onClick={() => openLocalPath(link.url)}
        className={styles.button}
        style={{ borderColor: groupColor }}
        title={link.url}
      >
        <div className={styles.icon}>{icon}</div>
        <span className={styles.title}>{link.title}</span>
      </button>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.button}
      style={{ borderColor: groupColor }}
      title={link.url}
    >
      <div className={styles.icon}>{icon}</div>
      <span className={styles.title}>{link.title}</span>
    </a>
  );
};

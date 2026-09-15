'use client';

import React from 'react';
import { QuickLink } from '@/types';
import styles from './LinkButton.module.css';

interface LinkButtonProps {
  link: QuickLink;
  groupColor: string;
}

export const LinkButton: React.FC<LinkButtonProps> = ({ link, groupColor }) => {
  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };

  const faviconUrl = getFaviconUrl(link.url);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.button}
      style={{ borderColor: groupColor }}
      title={link.url}
    >
      <div className={styles.icon}>
        {link.icon ? (
          <span className={styles.customIcon}>{link.icon}</span>
        ) : faviconUrl ? (
          <img src={faviconUrl} alt="" className={styles.favicon} />
        ) : (
          <span className={styles.defaultIcon}>🔗</span>
        )}
      </div>
      <span className={styles.title}>{link.title}</span>
    </a>
  );
};

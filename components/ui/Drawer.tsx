'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Drawer.module.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// A Drawer can now open another Drawer (a subtask's own detail view stacked
// on top of its parent's -- ClickUp-style unlimited nesting), so more than
// one instance can be mounted and open at once. A plain boolean overflow
// toggle would have the inner drawer's close re-enable body scroll while the
// outer one is still open; a shared open-count fixes that.
let openDrawerCount = 0;

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      openDrawerCount += 1;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      if (isOpen) {
        openDrawerCount = Math.max(0, openDrawerCount - 1);
        if (openDrawerCount === 0) {
          document.body.style.overflow = '';
        }
      }
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Rendered through a portal straight onto <body>: a Drawer can be opened
  // from deep inside the task tree (e.g. a subtask row whose ancestor gets
  // `transform` on hover), and any transformed/filtered ancestor becomes a
  // new containing block for `position: fixed` children -- that shrinks the
  // backdrop down to that ancestor's box instead of the full viewport. A
  // portal sidesteps the whole class of bug regardless of what CSS the rest
  // of the tree ever grows.
  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div 
        className={`${styles.drawer} ${isOpen ? styles.open : ''}`} 
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

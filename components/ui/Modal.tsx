import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Optional "primary action" for this modal (Save / Add / OK...).
   * When provided, pressing Enter anywhere in the modal acts like clicking
   * that button -- except inside a <textarea> (multi-line editing must keep
   * inserting newlines) or on a <button> (which already activates on Enter
   * natively). A nested field that needs to handle Enter itself (e.g. an
   * inline "add item" row inside the modal) can call
   * `e.stopPropagation()` in its own onKeyDown to opt out.
   */
  onConfirm?: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Enter' && onConfirm) {
        if (e.isComposing) return; // don't hijack IME confirmation

        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        // Textareas need Enter to insert newlines; buttons already
        // activate on Enter natively -- don't double-fire for either.
        if (tag === 'TEXTAREA' || tag === 'BUTTON') return;

        e.preventDefault();
        onConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  // Portal straight onto <body> -- see Drawer.tsx for why: any ancestor with
  // a hover `transform` (list rows, cards, etc.) becomes a new containing
  // block for `position: fixed` children and shrinks this backdrop down to
  // that ancestor's box instead of the full viewport.
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={modalRef}
        className={`${styles.modal} ${styles[size]} animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

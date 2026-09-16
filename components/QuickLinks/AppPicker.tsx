'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as systemActions from '@/app/actions/system';
import { useLanguage } from '@/contexts/LanguageContext';
import { isElectronApp, pickLocalFile, fileNameFromPath } from '@/lib/electron';
import { CURATED_WEB_APPS, loadCustomWebApps, saveCustomWebApp, WebApp } from '@/lib/webApps';
import styles from './AppPicker.module.css';

interface InstalledApp {
  name: string;
  path: string;
}

interface PickerResult {
  name: string;
  path: string;
}

interface AppPickerProps {
  /** The trigger button's own DOM node (pass `e.currentTarget` from its
   *  onClick) -- the popover anchors and positions itself from this. */
  anchorEl: HTMLElement | null;
  onSelect: (result: PickerResult) => void;
  onClose: () => void;
}

type Tab = 'apps' | 'file' | 'web';

const POPOVER_WIDTH = 300;
const POPOVER_ESTIMATED_HEIGHT = 380;

// Floating popover offering three ways to point a Quick Link/attachment at
// something: an installed macOS app, an arbitrary local file via a native
// "Choose File" dialog, or a common web app (Google Drive, Gmail, Quizlet,
// ...). Rendered through a portal into document.body and positioned with
// `position: fixed` computed from the anchor's own bounding box, so it
// always floats above the page instead of being clipped by a scrolling
// modal (Modal.module.css sets `.modal { overflow-y: auto }`, which would
// otherwise cut the popover off).
export const AppPicker: React.FC<AppPickerProps> = ({ anchorEl, onSelect, onClose }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('apps');
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [appsError, setAppsError] = useState(false);
  const [search, setSearch] = useState('');
  const [customWebApps, setCustomWebApps] = useState<WebApp[]>(() => loadCustomWebApps());
  const [isAddingWebApp, setIsAddingWebApp] = useState(false);
  const [webAppName, setWebAppName] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const electronAvailable = isElectronApp();

  useEffect(() => {
    let cancelled = false;
    systemActions
      .listInstalledApps()
      .then((result) => {
        if (!cancelled) setApps(result);
      })
      .catch(() => {
        if (!cancelled) setAppsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Position from the anchor's live bounding box, recomputed on scroll
  // (capture phase, so scrolling inside a modal body -- not just the
  // window -- is picked up too) and resize, so it tracks the trigger
  // button instead of drifting away from it or getting clipped.
  useLayoutEffect(() => {
    if (!anchorEl) return;

    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 6;

      if (left + POPOVER_WIDTH > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - POPOVER_WIDTH - 8);
      }
      if (
        top + POPOVER_ESTIMATED_HEIGHT > window.innerHeight - 8 &&
        rect.top - POPOVER_ESTIMATED_HEIGHT > 8
      ) {
        top = rect.top - POPOVER_ESTIMATED_HEIGHT - 6;
      }
      setPosition({ top, left });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePopover = wrapperRef.current && wrapperRef.current.contains(target);
      const onAnchor = anchorEl && anchorEl.contains(target);
      if (!insidePopover && !onAnchor) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, anchorEl]);

  // Switching tabs keeps focus on the search field (when that tab has one)
  // and clears a stale search term from the previous tab's results.
  const handleTabChange = (next: Tab) => {
    setTab(next);
    setSearch('');
    setFileError(null);
    if (next !== 'file') {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  };

  const handleChooseFile = async () => {
    setFileError(null);
    if (!electronAvailable) {
      setFileError(t('quickLinks.desktopOnly'));
      return;
    }
    const filePath = await pickLocalFile();
    if (filePath) {
      onSelect({ name: fileNameFromPath(filePath), path: filePath });
    }
  };

  const handleAddWebApp = () => {
    const name = webAppName.trim();
    const url = webAppUrl.trim();
    if (!name || !url) return;
    setCustomWebApps(saveCustomWebApp({ name, url }));
    setWebAppName('');
    setWebAppUrl('');
    setIsAddingWebApp(false);
    onSelect({ name, path: url });
  };

  const filteredApps = (apps || []).filter((a) =>
    a.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const allWebApps = [...CURATED_WEB_APPS, ...customWebApps];
  const filteredWebApps = allWebApps.filter((a) =>
    a.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSearchEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    if (tab === 'apps' && filteredApps.length > 0) {
      onSelect(filteredApps[0]);
    } else if (tab === 'web' && filteredWebApps.length > 0) {
      onSelect({ name: filteredWebApps[0].name, path: filteredWebApps[0].url });
    }
  };

  if (!position) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.picker}
      style={{ top: position.top, left: position.left }}
      ref={wrapperRef}
    >
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'apps' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('apps')}
        >
          <span className={styles.tabIcon}>📱</span> {t('quickLinks.appsTab')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'file' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('file')}
        >
          <span className={styles.tabIcon}>📁</span> {t('quickLinks.fileTab')}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'web' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('web')}
        >
          <span className={styles.tabIcon}>🌐</span> {t('quickLinks.webTab')}
        </button>
      </div>

      {tab === 'apps' && (
        <>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              ref={searchRef}
              type="text"
              className={styles.search}
              placeholder={t('quickLinks.searchApps')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchEnter}
              autoFocus
            />
          </div>

          <div className={styles.list}>
            {appsError ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>⚠️</span>
                {t('quickLinks.noAppsFound')}
              </div>
            ) : apps === null ? (
              <div className={styles.empty}>{t('quickLinks.loadingApps')}</div>
            ) : filteredApps.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🔍</span>
                {t('quickLinks.noAppsFound')}
              </div>
            ) : (
              filteredApps.map((app) => (
                <button
                  key={app.path}
                  type="button"
                  className={styles.item}
                  onClick={() => onSelect(app)}
                  title={app.path}
                >
                  <span className={styles.itemIcon}>📱</span>
                  <span className={styles.itemName}>{app.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'file' && (
        <div className={styles.filePanel}>
          <span className={styles.filePanelIcon}>📁</span>
          <p className={styles.filePanelTitle}>{t('quickLinks.fileTabTitle')}</p>
          <p className={styles.filePanelHint}>{t('quickLinks.fileTabHint')}</p>
          <button
            type="button"
            className={styles.filePanelBtn}
            onClick={handleChooseFile}
            disabled={!electronAvailable}
          >
            {t('quickLinks.chooseFile')}
          </button>
          {fileError && <p className={styles.errorText}>{fileError}</p>}
        </div>
      )}

      {tab === 'web' && (
        <>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              ref={searchRef}
              type="text"
              className={styles.search}
              placeholder={t('quickLinks.searchWebApps')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchEnter}
              autoFocus
            />
          </div>

          <div className={styles.list}>
            {filteredWebApps.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🔍</span>
                {t('quickLinks.noWebAppsFound')}
              </div>
            ) : (
              filteredWebApps.map((app) => (
                <button
                  key={app.url}
                  type="button"
                  className={styles.item}
                  onClick={() => onSelect({ name: app.name, path: app.url })}
                  title={app.url}
                >
                  <span className={styles.itemIcon}>🌐</span>
                  <span className={styles.itemName}>{app.name}</span>
                </button>
              ))
            )}
          </div>

          {isAddingWebApp ? (
            <div className={styles.addWebAppForm}>
              <input
                type="text"
                className={styles.search}
                placeholder={t('quickLinks.webAppName')}
                value={webAppName}
                onChange={(e) => setWebAppName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWebApp();
                  }
                }}
                autoFocus
              />
              <input
                type="text"
                className={styles.search}
                placeholder={t('quickLinks.webAppUrl')}
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWebApp();
                  }
                }}
              />
              <div className={styles.addWebAppActions}>
                <button type="button" className={styles.primaryBtn} onClick={handleAddWebApp}>
                  {t('common.add')}
                </button>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => {
                    setIsAddingWebApp(false);
                    setWebAppName('');
                    setWebAppUrl('');
                  }}
                >
                  {t('quickLinks.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.addWebAppToggle}
              onClick={() => setIsAddingWebApp(true)}
            >
              + {t('quickLinks.addCustomWebApp')}
            </button>
          )}
        </>
      )}
    </div>,
    document.body
  );
};

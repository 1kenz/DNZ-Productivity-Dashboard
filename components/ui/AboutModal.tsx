'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import appInfo from '@/app-info.json';
import styles from './AboutModal.module.css';

// Static identity comes from app-info.json; build facts are injected by
// next.config.ts (core/standards/about-standard.md). Nothing is fetched.
const BUILD = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
  build: process.env.NEXT_PUBLIC_APP_BUILD ?? 'unknown',
  commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? 'unknown',
  releaseDate: process.env.NEXT_PUBLIC_APP_RELEASE_DATE ?? 'unknown',
  channel: process.env.NEXT_PUBLIC_APP_CHANNEL ?? 'dev',
  environment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT ?? 'development',
};

const isSafeUrl = (u: string) => /^(https:|mailto:)/i.test(u);

export const AboutModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const purpose = (appInfo.purpose as Record<string, string>)[language] ?? appInfo.purpose.en;
  const links = ([
    ['privacy', appInfo.links.privacy],
    ['licenses', appInfo.links.licenses],
    ['releaseNotes', appInfo.links.releaseNotes],
    ['support', appInfo.links.support],
  ] as const).filter(([, url]) => url && isSafeUrl(url));

  const details: [string, string][] = [
    [t('about.build'), BUILD.build],
    [t('about.commit'), BUILD.commit],
    [t('about.released'), BUILD.releaseDate],
    [t('about.channel'), BUILD.channel],
    [t('about.environment'), BUILD.environment],
  ];

  const copyInfo = async () => {
    const text = `${appInfo.name} ${BUILD.version} (build ${BUILD.build}, ${BUILD.commit}, ${BUILD.channel}/${BUILD.environment}, ${BUILD.releaseDate})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: leave the button unchanged */
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('about.title')} size="sm">
      <div className={styles.about}>
        <img src="/logo/DNZSecurity150px.png" alt="" className={styles.logo} />
        <h3 className={styles.name}>{appInfo.name}</h3>
        <p className={styles.version}>
          {t('about.version')} {BUILD.version}
        </p>
        <p className={styles.purpose}>{purpose}</p>

        {appInfo.usesAI && <p className={styles.ai} role="note">{t('about.ai')}</p>}

        <details className={styles.details}>
          <summary>{t('about.details')}</summary>
          <dl>
            {details.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </details>

        <button type="button" className={styles.copy} onClick={copyInfo} aria-live="polite">
          {copied ? t('about.copied') : t('about.copy')}
        </button>

        {links.length > 0 && (
          <nav className={styles.links}>
            {links.map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer">
                {t(`about.${key}`)}
              </a>
            ))}
          </nav>
        )}

        <p className={styles.by}>{t('about.by', { name: appInfo.developer })}</p>
      </div>
    </Modal>
  );
};

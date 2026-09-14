'use client';

import React, { useState } from 'react';
import { LinkGroup, QuickLink } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { LinkButton } from './LinkButton';
import { Button } from '@/components/ui/Button';
import styles from './LinkGroupDetail.module.css';

interface LinkGroupDetailProps {
  group: LinkGroup;
  onBack: () => void;
}

export const LinkGroupDetail: React.FC<LinkGroupDetailProps> = ({ group, onBack }) => {
  const { updateLinkGroup } = useApp();
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      const newLink = {
        id: crypto.randomUUID(),
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim(),
        groupId: group.id,
        order: group.links.length,
      };
      updateLinkGroup(group.id, {
        links: [...group.links, newLink],
      });
      setNewLinkTitle('');
      setNewLinkUrl('');
      setIsAddingLink(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onBack}>
      <div className={styles.container} style={{ borderTopColor: group.color }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <Button variant="ghost" onClick={onBack} className={styles.backBtn}>
            ← Back to Dashboard
          </Button>
          <div className={styles.groupInfo}>
            <div className={styles.iconWrapper} style={{ backgroundColor: group.color }}>
              {group.icon || '🔗'}
            </div>
            <div>
              <h1 className={styles.title}>{group.name}</h1>
              <p className={styles.subtitle}>{group.links.length} saved links</p>
            </div>
          </div>
        </div>

        <div className={styles.linksGrid}>
          {group.links
            .sort((a, b) => a.order - b.order)
            .map((link) => (
              <div key={link.id} className={styles.linkCard}>
                <LinkButton link={link} groupColor={group.color} />
                <div className={styles.linkMeta}>
                  <p className={styles.linkUrl}>{link.url}</p>
                </div>
              </div>
            ))}
          
          <div className={`${styles.linkCard} ${styles.addCard}`}>
            {isAddingLink ? (
              <div className={styles.inlineForm}>
                <input 
                  placeholder="Title" 
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className={styles.miniInput}
                />
                <input 
                  placeholder="URL" 
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className={styles.miniInput}
                />
                <div className={styles.formActions}>
                  <Button size="sm" onClick={handleAddLink}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingLink(false)}>×</Button>
                </div>
              </div>
            ) : (
              <button className={styles.addTrigger} onClick={() => setIsAddingLink(true)}>
                + Add New Link
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

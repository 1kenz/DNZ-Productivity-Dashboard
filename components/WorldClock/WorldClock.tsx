'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Clock } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import styles from './WorldClock.module.css';

interface WorldClockProps {
  onlyLocal?: boolean;
}

export const WorldClock: React.FC<WorldClockProps> = ({ onlyLocal = false }) => {
  const { clocks, addClock, deleteClock, reorderClocks } = useApp();
  const [times, setTimes] = useState<Map<string, Date>>(new Map());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // New clock form state
  const [newCity, setNewCity] = useState('');
  const [newTimezone, setNewTimezone] = useState('');
  const [newEmoji, setNewEmoji] = useState('🌍');

  useEffect(() => {
    const updateTimes = () => {
      const newTimes = new Map<string, Date>();
      clocks.forEach((tz) => {
        newTimes.set(tz.timezone, new Date());
      });
      setTimes(newTimes);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [clocks]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newClocks = [...clocks].sort((a, b) => a.order - b.order);
    const item = newClocks.splice(draggedIndex, 1)[0];
    newClocks.splice(index, 0, item);
    
    reorderClocks(newClocks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const formatTime = (date: Date, timezone: string): string => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    } catch (e) {
      return '--:--:--';
    }
  };

  const formatDate = (date: Date, timezone: string): string => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch (e) {
      return '--- --';
    }
  };

  const getTimeOfDay = (date: Date, timezone: string): string => {
    try {
      const hour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          hour12: false,
        }).format(date)
      );

      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    } catch (e) {
      return 'day';
    }
  };

  const getTimeIcon = (timeOfDay: string): string => {
    switch (timeOfDay) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌆';
      case 'night': return '🌙';
      default: return '🕐';
    }
  };

  const CITY_MAP: Record<string, string> = {
    'california': 'America/Los_Angeles',
    'london': 'Europe/London',
    'beijing': 'Asia/Shanghai',
    'tokyo': 'Asia/Tokyo',
    'new york': 'America/New_York',
    'istanbul': 'Europe/Istanbul',
    'berlin': 'Europe/Berlin',
    'shanghai': 'Asia/Shanghai',
    'mumbai': 'Asia/Kolkata',
    'los angeles': 'America/Los_Angeles',
  };

  const handleAddClock = (e: React.FormEvent) => {
    e.preventDefault();
    let resolvedTimezone = newTimezone.trim();
    
    // Auto-map simple city names to IANA
    if (!resolvedTimezone.includes('/') && CITY_MAP[resolvedTimezone.toLowerCase()]) {
      resolvedTimezone = CITY_MAP[resolvedTimezone.toLowerCase()];
    } else if (!resolvedTimezone.includes('/') && CITY_MAP[newCity.toLowerCase()]) {
      resolvedTimezone = CITY_MAP[newCity.toLowerCase()];
    }

    if (newCity && resolvedTimezone) {
      try {
        // Validate timezone
        new Intl.DateTimeFormat('en-US', { timeZone: resolvedTimezone });
        
        addClock({
          city: newCity,
          timezone: resolvedTimezone,
          emoji: newEmoji,
          order: clocks.length
        });
        setNewCity('');
        setNewTimezone('');
        setNewEmoji('🌍');
        setIsModalOpen(false);
      } catch (err) {
        alert('Invalid Timezone format. Please use Area/City (e.g. Europe/Istanbul)');
      }
    }
  };

  const userLocalTimezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Europe/Istanbul';

  const displayedClocks = React.useMemo(() => {
    const sorted = [...clocks].sort((a, b) => a.order - b.order);
    if (!onlyLocal) return sorted;

    const matched =
      sorted.find((c) => c.timezone === userLocalTimezone) ||
      sorted.find((c) => c.timezone.toLowerCase().includes(userLocalTimezone.toLowerCase())) ||
      sorted.find((c) => c.city.toLowerCase().includes('istanbul') || c.city.toLowerCase().includes('berlin')) ||
      sorted[0];

    if (matched) return [matched];
    return [
      {
        id: 'local-clock',
        city: 'Local Time',
        timezone: userLocalTimezone,
        emoji: '📍',
        order: 0,
      },
    ];
  }, [clocks, onlyLocal, userLocalTimezone]);

  return (
    <div className={styles.container}>
      <div className={`${styles.clockGrid} ${onlyLocal ? styles.onlyLocalGrid : ''}`}>
        {displayedClocks.map((tz, index) => {
          const currentTime = times.get(tz.timezone) || new Date();
          const timeOfDay = getTimeOfDay(currentTime, tz.timezone);
          const timeIcon = getTimeIcon(timeOfDay);

          return (
            <div
              key={tz.id}
              className={`${styles.clockCard} ${!onlyLocal && draggedIndex === index ? styles.dragging : ''} ${onlyLocal ? styles.localCard : ''}`}
              draggable={!onlyLocal}
              onDragStart={() => !onlyLocal && handleDragStart(index)}
              onDragOver={(e) => !onlyLocal && handleDragOver(e, index)}
              onDragEnd={!onlyLocal ? handleDragEnd : undefined}
            >
              {!onlyLocal && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => {
                    if (window.confirm(`Remove "${tz.city}" clock?`)) {
                      deleteClock(tz.id);
                    }
                  }}
                  title="Remove Clock"
                >
                  ×
                </button>
              )}
              <div className={styles.header}>
                <span className={styles.emoji}>{tz.emoji}</span>
                <span className={styles.city}>{tz.city}</span>
                <span className={styles.timeIcon}>{timeIcon}</span>
              </div>
              <div className={styles.time}>{formatTime(currentTime, tz.timezone)}</div>
              <div className={styles.date}>{formatDate(currentTime, tz.timezone)}</div>
            </div>
          );
        })}

        {!onlyLocal && (
          <button
            className={styles.addClockBtn}
            onClick={() => setIsModalOpen(true)}
            title="Add World Clock"
          >
            <span className={styles.addIcon}>+</span>
            <span className={styles.addText}>Add Clock</span>
          </button>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add World Clock"
        size="sm"
      >
        <form onSubmit={handleAddClock} className={styles.form}>
          <div className={styles.inputGuide}>
            💡 Use professional IANA timezone names.
          </div>
          <Input 
            label="City Name" 
            value={newCity} 
            onChange={e => setNewCity(e.target.value)}
            placeholder="e.g. London, Istanbul..."
            required
          />
          <Input 
            label="Timezone (IANA)" 
            value={newTimezone} 
            onChange={e => setNewTimezone(e.target.value)}
            placeholder="e.g. Europe/London, Europe/Istanbul"
            required
          />
          <div className={styles.helperText}>
            Valid format: Area/Location (e.g. Asia/Tokyo)
          </div>
          <Input 
            label="Emoji/Flag" 
            value={newEmoji} 
            onChange={e => setNewEmoji(e.target.value)}
            placeholder="🌍 or 🇹🇷"
          />
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Clock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

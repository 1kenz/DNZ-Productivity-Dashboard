// Single source of truth for the 5-level priority scale. Before this file,
// four different places each hardcoded their own priority -> color/label
// mapping, and three of them only covered 3 of the 5 real values (Urgent and
// Routine were silently missing from grouping/coloring/charts, even though
// TodoForm has always let people pick either). Every consumer should import
// from here instead of redefining its own map.

import { Priority } from '@/types';

export const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low', 'routine'];

export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  routine: 4,
};

export interface PriorityMeta {
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  urgent: { label: 'Urgent', shortLabel: 'Urgent', color: 'var(--color-urgent)', icon: '🚨' },
  high: { label: 'High Priority', shortLabel: 'High', color: 'var(--color-error)', icon: '🔴' },
  medium: { label: 'Medium Priority', shortLabel: 'Medium', color: 'var(--color-warning)', icon: '🟡' },
  low: { label: 'Low Priority', shortLabel: 'Low', color: 'var(--color-success)', icon: '🟢' },
  routine: { label: 'Routine', shortLabel: 'Routine', color: 'var(--color-routine)', icon: '⚪' },
};

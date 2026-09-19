'use client';

import React, { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getDueTodoGroups, isSameCalendarDay } from '@/lib/dueDates';
import { DueDatesPanel } from './DueDatesPanel';

/**
 * Mounted once, globally (see app/page.tsx). Owns the "show the Due Dates
 * modal automatically the first time the app is opened each day" behavior,
 * and renders the same panel the Header's on-demand button opens via
 * isDueDatesOpen/setIsDueDatesOpen (see contexts/AppContext.tsx).
 */
export const DueDatesController: React.FC = () => {
  const { todos, isLoading, viewPreferences, updateViewPreferences, isDueDatesOpen, setIsDueDatesOpen } = useApp();
  const hasCheckedToday = useRef(false);

  const groups = getDueTodoGroups(todos);

  useEffect(() => {
    if (isLoading || hasCheckedToday.current) return;
    hasCheckedToday.current = true;

    const now = new Date();
    const alreadyShownToday = isSameCalendarDay(viewPreferences.lastDueDateModalShownAt, now);
    if (!alreadyShownToday && groups.total > 0) {
      setIsDueDatesOpen(true);
      updateViewPreferences({ lastDueDateModalShownAt: now });
    }
    // Intentionally runs once per app load (guarded by hasCheckedToday), not
    // on every todos/viewPreferences change -- re-computing `groups` on
    // every render is fine, but re-opening the modal on every todo edit
    // would be very annoying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <DueDatesPanel isOpen={isDueDatesOpen} onClose={() => setIsDueDatesOpen(false)} groups={groups} />
  );
};

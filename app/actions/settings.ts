'use server';

import { prisma } from '@/lib/prisma';
import { ViewPreferences } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Using a fixed ID for the singleton preference row
const PREFS_ID = 'default';

export async function getViewPreferences() {
  try {
    const prefs = await prisma.viewPreferences.findUnique({
      where: { id: PREFS_ID },
    });

    if (!prefs) {
      return await prisma.viewPreferences.upsert({
        where: { id: PREFS_ID },
        update: {},
        create: {
          id: PREFS_ID,
          taskView: 'list',
          linkView: 'grid',
          showCompleted: true,
          groupBy: 'none',
        },
      });
    }
    return prefs;
  } catch (err) {
    console.error('[settings] getViewPreferences error:', err);
    return {
      id: PREFS_ID,
      taskView: 'list',
      linkView: 'grid',
      showCompleted: true,
      groupBy: 'none',
      lastDueDateModalShownAt: null,
    };
  }
}

// `lastDueDateModalShownAt` and `calendarView` are re-declared here (via
// Omit + an explicit, more permissive type) rather than relying on
// Partial<ViewPreferences> alone, for two reasons: (1) callers may pass a
// JSON-serialized date string for lastDueDateModalShownAt (e.g. straight off
// a fetch response), which is narrower than Prisma's own `Date | null` --
// intersecting the two directly (as an earlier version of this file did)
// collapses to `Date | null` and rejects the string case entirely; (2) this
// also keeps the file compiling before `npx prisma generate` has picked up
// schema changes yet. Omit removes Prisma's stricter versions of these two
// fields before re-adding the permissive ones, so there's nothing left to
// collide with.
export async function updateViewPreferences(
  updates: Partial<Omit<ViewPreferences, 'lastDueDateModalShownAt' | 'calendarView'>> & {
    lastDueDateModalShownAt?: Date | string | null;
    calendarView?: 'day' | 'week' | 'month';
  }
) {
  try {
    const safeUpdates: Record<string, any> = {};
    if (updates.taskView !== undefined) safeUpdates.taskView = updates.taskView;
    if (updates.linkView !== undefined) safeUpdates.linkView = updates.linkView;
    if (updates.showCompleted !== undefined) safeUpdates.showCompleted = updates.showCompleted;
    if (updates.groupBy !== undefined) safeUpdates.groupBy = updates.groupBy;
    if (updates.lastDueDateModalShownAt !== undefined) {
      safeUpdates.lastDueDateModalShownAt = updates.lastDueDateModalShownAt;
    }
    if (updates.calendarView !== undefined) {
      safeUpdates.calendarView = updates.calendarView;
    }

    // `create` is cast to `any` for the same reason as `db` in
    // app/actions/calendar.ts: `calendarView` isn't in the generated
    // @prisma/client create-input type until `npx prisma generate` re-runs.
    const prefs = await prisma.viewPreferences.upsert({
      where: { id: PREFS_ID },
      update: safeUpdates,
      create: {
        id: PREFS_ID,
        taskView: updates.taskView ?? 'list',
        linkView: updates.linkView ?? 'grid',
        showCompleted: updates.showCompleted ?? true,
        groupBy: updates.groupBy ?? 'none',
        calendarView: updates.calendarView ?? 'week',
      } as any,
    });
    revalidatePath('/');
    return prefs;
  } catch (err) {
    console.error('[settings] updateViewPreferences error:', err);
    return {
      id: PREFS_ID,
      taskView: updates.taskView ?? 'list',
      linkView: updates.linkView ?? 'grid',
      showCompleted: updates.showCompleted ?? true,
      groupBy: updates.groupBy ?? 'none',
      lastDueDateModalShownAt: updates.lastDueDateModalShownAt ?? null,
    };
  }
}

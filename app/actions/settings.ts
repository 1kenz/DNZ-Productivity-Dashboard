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

// `lastDueDateModalShownAt` is intersected in explicitly because the generated
// @prisma/client types only pick it up after `npx prisma generate` re-runs against
// the updated schema (see prisma/schema.prisma) -- this keeps the file compiling
// correctly both before and after that regeneration happens.
export async function updateViewPreferences(
  updates: Partial<ViewPreferences> & { lastDueDateModalShownAt?: Date | string | null }
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

    const prefs = await prisma.viewPreferences.upsert({
      where: { id: PREFS_ID },
      update: safeUpdates,
      create: {
        id: PREFS_ID,
        taskView: updates.taskView ?? 'list',
        linkView: updates.linkView ?? 'grid',
        showCompleted: updates.showCompleted ?? true,
        groupBy: updates.groupBy ?? 'none',
      },
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

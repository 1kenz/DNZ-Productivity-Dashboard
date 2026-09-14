'use server';

import { prisma } from '@/lib/prisma';
import { ViewPreferences } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Using a fixed ID for the singleton preference row
const PREFS_ID = 'default';

export async function getViewPreferences() {
  const prefs = await prisma.viewPreferences.findUnique({
    where: { id: PREFS_ID },
  });

  if (!prefs) {
    // Return defaults if not found, or create?
    // Let's create default if not exists
    return await prisma.viewPreferences.create({
      data: {
        id: PREFS_ID,
        taskView: 'list',
        linkView: 'grid',
        showCompleted: true,
        groupBy: 'none',
      },
    });
  }
  
  return prefs;
}

export async function updateViewPreferences(updates: Partial<ViewPreferences>) {
  // upsert basically
  const prefs = await prisma.viewPreferences.upsert({
    where: { id: PREFS_ID },
    update: updates,
    create: {
      id: PREFS_ID,
      ...updates, // This might fail if some required fields are missing in updates, so we should merge with defaults ideally or trust inputs
       taskView: updates.taskView || 'list',
       linkView: updates.linkView || 'grid',
       showCompleted: updates.showCompleted ?? true,
       groupBy: updates.groupBy || 'none',
    },
  });
  revalidatePath('/');
  return prefs;
}

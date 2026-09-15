'use server';

import { prisma } from '@/lib/prisma';
import { TimeEntry } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getTimeEntries() {
  return await prisma.timeEntry.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTimeEntry(data: Omit<TimeEntry, 'id'>) {
  const entry = await prisma.timeEntry.create({
    data,
  });
  revalidatePath('/');
  return entry;
}

export async function updateTimeEntry(id: string, updates: Partial<TimeEntry>) {
  const entry = await prisma.timeEntry.update({
    where: { id },
    data: updates,
  });
  revalidatePath('/');
  return entry;
}

export async function deleteTimeEntry(id: string) {
  await prisma.timeEntry.delete({
    where: { id },
  });
  revalidatePath('/');
}

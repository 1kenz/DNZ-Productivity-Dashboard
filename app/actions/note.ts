'use server';

import { prisma } from '@/lib/prisma';
import { Note } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getNotes() {
  return await prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
  const note = await prisma.note.create({
    data,
  });
  revalidatePath('/');
  return note;
}

export async function updateNote(id: string, updates: Partial<Note>) {
  const note = await prisma.note.update({
    where: { id },
    data: updates,
  });
  revalidatePath('/');
  return note;
}

export async function deleteNote(id: string) {
  await prisma.note.delete({
    where: { id },
  });
  revalidatePath('/');
}

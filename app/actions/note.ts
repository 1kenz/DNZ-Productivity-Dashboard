'use server';

import { prisma } from '@/lib/prisma';
import { Note } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getNotes() {
  return await prisma.note.findMany({
    include: {
      attachments: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
  const note = await prisma.note.create({
    data: {
      title: data.title,
      content: data.content,
      color: data.color ?? null,
    },
  });
  revalidatePath('/');
  return note;
}

export async function updateNote(id: string, updates: any) {
  const data: any = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.content !== undefined) data.content = updates.content;
  if (updates.color !== undefined) data.color = updates.color ?? null;

  const note = await prisma.note.update({
    where: { id },
    data,
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

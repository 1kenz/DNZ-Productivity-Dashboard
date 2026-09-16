'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createAttachment(data: {
  label: string;
  path: string;
  todoId?: string;
  noteId?: string;
  order?: number;
}) {
  try {
    const attachment = await prisma.attachment.create({
      data: {
        label: (data.label && String(data.label).trim()) || 'File',
        path: String(data.path).trim(),
        todoId: data.todoId || null,
        noteId: data.noteId || null,
        order: data.order != null ? Number(data.order) : 0,
      },
    });
    revalidatePath('/');
    return attachment;
  } catch (err) {
    console.error('[attachment.ts] createAttachment error:', err);
    throw err;
  }
}

export async function updateAttachment(id: string, updates: { label?: string; path?: string }) {
  try {
    const data: any = {};
    if (updates.label !== undefined) data.label = String(updates.label).trim();
    if (updates.path !== undefined) data.path = String(updates.path).trim();

    const attachment = await prisma.attachment.update({
      where: { id },
      data,
    });
    revalidatePath('/');
    return attachment;
  } catch (err) {
    console.error('[attachment.ts] updateAttachment error:', err);
    throw err;
  }
}

export async function deleteAttachment(id: string) {
  try {
    await prisma.attachment.delete({ where: { id } });
    revalidatePath('/');
  } catch (err) {
    console.error('[attachment.ts] deleteAttachment error:', err);
    throw err;
  }
}

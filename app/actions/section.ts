'use server';

import { prisma } from '@/lib/prisma';
import { Section } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getSections() {
  return await prisma.section.findMany({
    orderBy: { order: 'asc' },
  });
}

export async function createSection(data: any) {
  try {
    const payload = {
      name: data.name,
      projectId: data.projectId,
      color: data.color ?? null,
      icon: data.icon ?? null,
      order: data.order != null ? Number(data.order) : 0,
      parentId: data.parentId ?? null,
    };
    const section = await prisma.section.create({ data: payload });
    revalidatePath('/');
    return section;
  } catch (err) {
    console.error('[section] createSection failed:', err);
    throw new Error(`Section create failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function updateSection(id: string, updates: any) {
  try {
    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.projectId !== undefined) data.projectId = updates.projectId;
    if (updates.color !== undefined) data.color = updates.color ?? null;
    if (updates.icon !== undefined) data.icon = updates.icon ?? null;
    if (updates.order !== undefined) data.order = Number(updates.order);
    if (updates.parentId !== undefined) data.parentId = updates.parentId ?? null;

    const section = await prisma.section.update({
      where: { id },
      data,
    });
    revalidatePath('/');
    return section;
  } catch (err) {
    console.error('[section] updateSection failed:', err);
    throw new Error(`Section update failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Deletes a section AND its sub-sections (structural cleanup), but orphans
// (never deletes) the Todos that were in any of them -- matches the
// existing "delete project, keep its tasks" behavior in project.ts.
export async function deleteSection(id: string) {
  try {
    const allSections = await prisma.section.findMany({ select: { id: true, parentId: true } });
    const idsToClear = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const s of allSections) {
        if (s.parentId && idsToClear.has(s.parentId) && !idsToClear.has(s.id)) {
          idsToClear.add(s.id);
          added = true;
        }
      }
    }

    await prisma.todo.updateMany({
      where: { sectionId: { in: Array.from(idsToClear) } },
      data: { sectionId: null },
    });

    await prisma.section.delete({ where: { id } }); // cascades to sub-sections
    revalidatePath('/');
  } catch (err) {
    console.error('[section] deleteSection failed:', err);
    throw new Error(`Section delete failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

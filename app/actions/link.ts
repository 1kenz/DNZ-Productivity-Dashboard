'use server';

import { prisma } from '@/lib/prisma';
import { LinkGroup, QuickLink } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getLinkGroups() {
  return await prisma.linkGroup.findMany({
    include: {
        links: {
            orderBy: { order: 'asc' }
        }
    },
    orderBy: { order: 'asc' },
  });
}

export async function createLinkGroup(data: any) {
  try {
    const group = await prisma.linkGroup.create({
      data: {
        name: (data.name && String(data.name).trim()) || 'New Group',
        color: (data.color && String(data.color).trim()) || '#6366f1',
        icon: (data.icon && String(data.icon).trim()) || null,
        order: data.order != null && data.order !== '' ? Number(data.order) : 0,
      },
    });
    revalidatePath('/');
    return group;
  } catch (err) {
    console.error('[link.ts] createLinkGroup error:', err);
    throw err;
  }
}

export async function updateLinkGroup(id: string, updates: any) {
  try {
    const data: any = {};
    if (updates.name !== undefined) data.name = String(updates.name).trim();
    if (updates.color !== undefined) data.color = String(updates.color).trim();
    if (updates.icon !== undefined) data.icon = (updates.icon && String(updates.icon).trim()) || null;
    if (updates.order !== undefined) data.order = Number(updates.order) || 0;

    const group = await prisma.linkGroup.update({
      where: { id },
      data,
    });
    revalidatePath('/');
    return group;
  } catch (err) {
    console.error('[link.ts] updateLinkGroup error:', err);
    throw err;
  }
}

export async function deleteLinkGroup(id: string) {
  try {
    await prisma.linkGroup.delete({
      where: { id },
    });
    revalidatePath('/');
  } catch (err) {
    console.error('[link.ts] deleteLinkGroup error:', err);
    throw err;
  }
}

// Links are sub-resources, but we might want direct actions or handle nested
// The AppContext managed links inside groups usually.
// Let's add actions for Links purely

export async function createLink(data: any) {
  try {
    const link = await prisma.quickLink.create({
      data: {
        title: (data.title && String(data.title).trim()) || 'New Link',
        url: (data.url && String(data.url).trim()) || '#',
        icon: (data.icon && String(data.icon).trim()) || null,
        groupId: data.groupId,
        order: data.order != null && data.order !== '' ? Number(data.order) : 0,
      },
    });
    revalidatePath('/');
    return link;
  } catch (err) {
    console.error('[link.ts] createLink error:', err);
    throw err;
  }
}

export async function deleteLink(id: string) {
    await prisma.quickLink.delete({
        where: { id }
    });
    revalidatePath('/');
}

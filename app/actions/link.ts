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

export async function createLinkGroup(data: Omit<LinkGroup, 'id' | 'links'>) {
    // Determine order if not provided? Schema has Int, let's assume caller provides it or we find max
    // For simplicity, let's rely on caller or default to 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const { links, ...cleanData } = data as any;
  const group = await prisma.linkGroup.create({
    data: cleanData,
  });
  revalidatePath('/');
  return group;
}

export async function updateLinkGroup(id: string, updates: Partial<LinkGroup>) {
  const group = await prisma.linkGroup.update({
    where: { id },
    data: updates,
  });
  revalidatePath('/');
  return group;
}

export async function deleteLinkGroup(id: string) {
  await prisma.linkGroup.delete({
    where: { id },
  });
  revalidatePath('/');
}

// Links are sub-resources, but we might want direct actions or handle nested
// The AppContext managed links inside groups usually.
// Let's add actions for Links purely

export async function createLink(data: Omit<QuickLink, 'id'>) {
    const link = await prisma.quickLink.create({
        data
    });
    revalidatePath('/');
    return link;
}

export async function deleteLink(id: string) {
    await prisma.quickLink.delete({
        where: { id }
    });
    revalidatePath('/');
}

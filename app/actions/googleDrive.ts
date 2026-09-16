'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  isGoogleDriveConfigured,
  getValidAccessToken,
  uploadBackupToDrive,
  listBackupsInDrive,
  downloadBackupFromDrive,
  deleteBackupFromDrive,
} from '@/lib/googleDrive';
import { exportAllData, restoreBackup } from '@/app/actions/backup';
import { BackupPayload } from '@/types';

export async function getDriveStatus() {
  const configured = isGoogleDriveConfigured();
  const auth = await prisma.googleDriveAuth.findUnique({ where: { id: 'default' } });
  return {
    configured,
    connected: Boolean(auth),
    email: auth?.email || undefined,
  };
}

export async function disconnectDrive() {
  await prisma.googleDriveAuth.deleteMany({ where: { id: 'default' } });
  revalidatePath('/');
}

export async function backupToDrive() {
  try {
    const accessToken = await getValidAccessToken();
    const backup = await exportAllData();
    const fileName = `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    const file = await uploadBackupToDrive(accessToken, fileName, JSON.stringify(backup));
    return file;
  } catch (err) {
    console.error('[googleDrive] backupToDrive failed:', err);
    throw new Error(`Backup to Drive failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function listDriveBackups() {
  try {
    const accessToken = await getValidAccessToken();
    return await listBackupsInDrive(accessToken);
  } catch (err) {
    console.error('[googleDrive] listDriveBackups failed:', err);
    throw new Error(`Could not list Drive backups: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function restoreFromDrive(fileId: string) {
  try {
    const accessToken = await getValidAccessToken();
    const backup = (await downloadBackupFromDrive(accessToken, fileId)) as BackupPayload;
    await restoreBackup(backup);
  } catch (err) {
    console.error('[googleDrive] restoreFromDrive failed:', err);
    throw new Error(`Restore from Drive failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function deleteDriveBackup(fileId: string) {
  try {
    const accessToken = await getValidAccessToken();
    await deleteBackupFromDrive(accessToken, fileId);
  } catch (err) {
    console.error('[googleDrive] deleteDriveBackup failed:', err);
    throw new Error(`Could not delete Drive backup: ${err instanceof Error ? err.message : String(err)}`);
  }
}

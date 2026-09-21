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

// Resolves the same "primary" connected account that getValidAccessToken()
// in lib/googleDrive.ts falls back to when no accountId is given (the
// oldest connected row) -- kept in sync with that function rather than a
// shared helper because it's one line and the two files already import
// from each other in one direction.
async function getPrimaryDriveAuth() {
  // Same stale-generated-client workaround as getValidAccessToken() in
  // lib/googleDrive.ts (see its comment): `createdAt` isn't in the
  // generated GoogleDriveAuth type until `npx prisma generate` re-runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  return db.googleDriveAuth.findFirst({ orderBy: { createdAt: 'asc' } });
}

export async function getDriveStatus() {
  const configured = isGoogleDriveConfigured();
  // NOTE: this used to look up a hardcoded id: 'default' row, left over
  // from before multiple Google accounts could be connected side by side
  // (see the comment in app/api/google/callback/route.ts). Every real row
  // gets a random UUID (schema: id String @id @default(uuid())), so that
  // lookup never matched anything -- the OAuth callback would succeed and
  // store a token, the UI would flash "Google Drive connected.", and then
  // immediately fall back to showing "not connected" because this status
  // check couldn't find the row it had just created. Backup Now was never
  // reachable as a result, since that button only renders when connected
  // is true. Fixed to resolve the same primary account getValidAccessToken
  // already falls back to.
  const auth = await getPrimaryDriveAuth();
  return {
    configured,
    connected: Boolean(auth),
    email: auth?.email || undefined,
  };
}

export async function disconnectDrive() {
  const auth = await getPrimaryDriveAuth();
  if (auth) {
    await prisma.googleDriveAuth.delete({ where: { id: auth.id } });
  }
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

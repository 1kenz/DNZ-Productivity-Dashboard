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

// Next.js redacts the message of any error a Server Action *throws* once
// the app runs in production (NODE_ENV=production, which is exactly how
// the packaged desktop app runs its server) -- the client only ever sees
// a generic "An error occurred in the Server Components render..." plus a
// digest, never the actual reason. That's by design (avoids leaking
// internals), but it also means the helpful messages these functions used
// to build (e.g. "Backup to Drive failed: <real reason>") were being
// thrown away silently in the packaged app -- someone hitting "Backup
// Now" had no way to ever find out why it failed. Returning a plain
// {success, error} value instead of throwing sidesteps the redaction
// entirely, since only *thrown* errors get stripped.
type DriveResult<T> = { success: true; data: T } | { success: false; error: string };

function driveError(context: string, err: unknown): { success: false; error: string } {
  console.error(`[googleDrive] ${context} failed:`, err);
  return { success: false, error: err instanceof Error ? err.message : String(err) };
}

export async function backupToDrive(): Promise<DriveResult<{ id: string; name: string; createdTime: string }>> {
  try {
    const accessToken = await getValidAccessToken();
    const backup = await exportAllData();
    const fileName = `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    const file = await uploadBackupToDrive(accessToken, fileName, JSON.stringify(backup));
    return { success: true, data: file };
  } catch (err) {
    return driveError('backupToDrive', err);
  }
}

export async function listDriveBackups(): Promise<
  DriveResult<{ id: string; name: string; createdTime: string }[]>
> {
  try {
    const accessToken = await getValidAccessToken();
    const files = await listBackupsInDrive(accessToken);
    return { success: true, data: files };
  } catch (err) {
    return driveError('listDriveBackups', err);
  }
}

export async function restoreFromDrive(fileId: string): Promise<DriveResult<void>> {
  try {
    const accessToken = await getValidAccessToken();
    const backup = (await downloadBackupFromDrive(accessToken, fileId)) as BackupPayload;
    await restoreBackup(backup);
    return { success: true, data: undefined };
  } catch (err) {
    return driveError('restoreFromDrive', err);
  }
}

export async function deleteDriveBackup(fileId: string): Promise<DriveResult<void>> {
  try {
    const accessToken = await getValidAccessToken();
    await deleteBackupFromDrive(accessToken, fileId);
    return { success: true, data: undefined };
  } catch (err) {
    return driveError('deleteDriveBackup', err);
  }
}

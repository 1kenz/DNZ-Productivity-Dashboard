// Minimal Google Drive integration using plain fetch() against Google's REST
// APIs directly — no `googleapis` SDK dependency needed for what we do here
// (OAuth2 code exchange/refresh + a handful of Drive v3 calls).

import { prisma } from '@/lib/prisma';

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const BACKUP_FOLDER_NAME = 'DNZ Productivity Dashboard Backups';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: getEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: getEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'select_account consent',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar',
    ].join(' '),
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getEnv('GOOGLE_CLIENT_ID'),
      client_secret: getEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: getEnv('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getEnv('GOOGLE_CLIENT_ID'),
      client_secret: getEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json();
}

export async function fetchUserEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data.email;
}

/** Reads stored tokens for one connected Google account, refreshing (and
 * persisting) if the access token has expired. Pass `accountId` to target a
 * specific connected account (e.g. one particular calendar sync source);
 * omit it to get Drive's "primary" account -- the oldest connected one,
 * matching the old single-account behavior for every existing Drive call
 * site that doesn't know (or care) about multiple accounts. */
export async function getValidAccessToken(accountId?: string): Promise<string> {
  // `createdAt` isn't in the stale generated GoogleDriveAuth type until
  // `npx prisma generate` re-runs against the current schema.prisma (same
  // reason app/actions/calendar.ts goes through an `as any` cast for the
  // newer calendar-sync models) -- cast just this one call rather than
  // widening every prisma.googleDriveAuth call in this file.
  const db = prisma as any;
  const auth = accountId
    ? await prisma.googleDriveAuth.findUnique({ where: { id: accountId } })
    : await db.googleDriveAuth.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!auth) throw new Error('Google Drive is not connected');

  const isExpired = auth.expiryDate.getTime() - 60_000 < Date.now(); // refresh 1min early
  if (!isExpired) return auth.accessToken;

  const refreshed = await refreshAccessToken(auth.refreshToken);
  const expiryDate = new Date(Date.now() + refreshed.expires_in * 1000);
  await prisma.googleDriveAuth.update({
    where: { id: auth.id },
    data: { accessToken: refreshed.access_token, expiryDate },
  });
  return refreshed.access_token;
}

async function findOrCreateBackupFolder(accessToken: string): Promise<string> {
  const q = encodeURIComponent(
    `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!searchRes.ok) throw new Error(`Drive folder search failed: ${await searchRes.text()}`);
  const searchData = await searchRes.json();
  if (searchData.files?.length) return searchData.files[0].id;

  const createRes = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: BACKUP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!createRes.ok) throw new Error(`Drive folder create failed: ${await createRes.text()}`);
  const created = await createRes.json();
  return created.id;
}

export async function uploadBackupToDrive(accessToken: string, fileName: string, jsonContent: string) {
  const folderId = await findOrCreateBackupFolder(accessToken);

  const boundary = 'pd_backup_boundary';
  const metadata = { name: fileName, parents: [folderId], mimeType: 'application/json' };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${jsonContent}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,createdTime`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${await res.text()}`);
  return res.json() as Promise<{ id: string; name: string; createdTime: string }>;
}

export async function listBackupsInDrive(accessToken: string) {
  const folderId = await findOrCreateBackupFolder(accessToken);
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,createdTime)&orderBy=createdTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive list failed: ${await res.text()}`);
  const data = await res.json();
  return (data.files || []) as { id: string; name: string; createdTime: string }[];
}

export async function downloadBackupFromDrive(accessToken: string, fileId: string) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive download failed: ${await res.text()}`);
  return res.json();
}

export async function deleteBackupFromDrive(accessToken: string, fileId: string) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // Drive returns 204 No Content on success; a 404 means it's already gone, which
  // is fine for a delete operation.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive delete failed: ${await res.text()}`);
  }
}

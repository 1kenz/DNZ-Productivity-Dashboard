'use server';

import { exec } from 'child_process';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

export interface OpenLocalPathResult {
  success: boolean;
  error?: string;
}

/**
 * Opens a local file or program on the SAME machine the Next.js server is
 * running on. This dashboard is a single-user desktop app -- the server
 * and the browser viewing it are always the same Mac -- so shelling out to
 * the OS "open" command is the reliable way to launch a document or an
 * application, instead of trying (and failing) to navigate the browser to
 * a file:// URL.
 */
export async function openLocalPath(rawPath: string): Promise<OpenLocalPathResult> {
  const trimmed = (rawPath || '').trim();
  if (!trimmed) {
    return { success: false, error: 'No path provided' };
  }

  // Expand a leading ~ to the server process's home directory.
  const resolved = trimmed.startsWith('~')
    ? trimmed.replace(/^~/, os.homedir())
    : trimmed;

  // Quote for the shell and escape embedded double quotes / backticks /
  // dollar signs so the path can't break out of the quoted argument.
  const safe = resolved.replace(/(["`$\\])/g, '\\$1');

  const platform = process.platform;
  const command =
    platform === 'darwin'
      ? `open "${safe}"`
      : platform === 'win32'
      ? `start "" "${safe}"`
      : `xdg-open "${safe}"`;

  return new Promise((resolve) => {
    exec(command, (error) => {
      if (error) {
        console.error('[system.ts] openLocalPath error:', error);
        resolve({ success: false, error: `Could not open "${resolved}". Check that the path is correct.` });
      } else {
        resolve({ success: true });
      }
    });
  });
}


export interface InstalledApp {
  name: string;
  path: string;
}

// Non-recursive scan of the usual macOS locations for .app bundles, so
// Quick Links (and attachments) can offer a "pick an installed app" list
// instead of making the user hand-type a path. Runs on the same machine
// as the browser (see openLocalPath above), so this is just a local
// directory listing -- no elevated access, no network.
const APP_DIRS = ['/Applications', '/System/Applications', '/System/Applications/Utilities'];

export async function listInstalledApps(): Promise<InstalledApp[]> {
  const dirs = [...APP_DIRS, path.join(os.homedir(), 'Applications')];
  const results: InstalledApp[] = [];
  const seen = new Set<string>();

  for (const dir of dirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.name.endsWith('.app')) continue;
        const fullPath = path.join(dir, entry.name);
        if (seen.has(fullPath)) continue;
        seen.add(fullPath);
        results.push({ name: entry.name.replace(/\.app$/, ''), path: fullPath });
      }
    } catch (err) {
      // Directory may not exist on this system, or not be readable -- skip it.
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

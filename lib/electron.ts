'use client';

// Thin browser-side bridge to the Electron desktop shell (see
// desktop/preload.js). Every export here degrades gracefully to "not
// available" when running in a plain browser (e.g. `next dev`), so nothing
// in the web app breaks when `window.electronAPI` doesn't exist.

export interface ElectronBridge {
  isElectron: true;
  /** Opens a native "Open File" dialog and resolves to the chosen absolute
   *  path, or null if the user cancelled. */
  pickFile: () => Promise<string | null>;
  /** Resolves the real filesystem path for a File the user dragged in
   *  (Electron 32+ removed the old `File.path` shim; this goes through
   *  webUtils.getPathForFile in the preload script instead). */
  getPathForFile: (file: File) => string | null;
}

declare global {
  interface Window {
    electronAPI?: ElectronBridge;
  }
}

export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

export async function pickLocalFile(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.electronAPI) return null;
  try {
    return await window.electronAPI.pickFile();
  } catch (err) {
    console.error('[electron] pickFile failed:', err);
    return null;
  }
}

export function getDroppedFilePath(dataTransfer: DataTransfer): string | null {
  if (typeof window === 'undefined' || !window.electronAPI) return null;
  const file = dataTransfer.files && dataTransfer.files[0];
  if (!file) return null;
  try {
    return window.electronAPI.getPathForFile(file);
  } catch (err) {
    console.error('[electron] getPathForFile failed:', err);
    return null;
  }
}

/** The last path segment (filename with extension), used as a sensible
 *  default label/title when a path was picked or dropped rather than typed. */
export function fileNameFromPath(fullPath: string): string {
  const parts = fullPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || fullPath;
}

/**
 * Drag-and-drop handlers for a text input that should accept a dropped file
 * and turn it into a local path. Spread the result onto the input:
 *   <input {...fileDropHandlers((path) => setPath(path))} ... />
 */
export function fileDropHandlers(onPath: (path: string) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      if (!isElectronApp()) return;
      e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      if (!isElectronApp()) return;
      e.preventDefault();
      const path = getDroppedFilePath(e.dataTransfer);
      if (path) onPath(path);
    },
  };
}

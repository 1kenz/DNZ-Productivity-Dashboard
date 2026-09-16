// Preload script: runs in a privileged context with access to Node/Electron
// APIs, but shares the renderer's `window` (with contextIsolation: true).
// contextBridge exposes a small, explicit surface on window.electronAPI --
// the renderer never gets raw ipcRenderer/electron access.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Native "Open File" dialog -- see the 'dialog:pick-file' handler in
  // main.js. Resolves to an absolute path, or null if cancelled.
  pickFile: () => ipcRenderer.invoke('dialog:pick-file'),

  // Electron 32+ removed the old `File.path` shim for security reasons;
  // webUtils.getPathForFile is the replacement, but it's only callable from
  // the preload/main process, hence this bridge for drag-and-drop.
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (err) {
      console.error('[preload] getPathForFile failed:', err);
      return null;
    }
  },
});

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-trade', callback);
    ipcRenderer.on('menu-about', callback);
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // App info
  getAppVersion: () => {
    return process.env.npm_package_version || '1.0.0';
  },

  // Platform info
  getPlatform: () => {
    return process.platform;
  },

  // Development mode check
  isDev: () => {
    return process.env.NODE_ENV === 'development';
  },

  // Crypto data API
  loadCryptoData: () => {
    return ipcRenderer.invoke('load-crypto-data');
  },

  saveCryptoData: (data) => {
    return ipcRenderer.invoke('save-crypto-data', data);
  }
});

// Security: Prevent the renderer process from accessing Node.js APIs
window.addEventListener('DOMContentLoaded', () => {
  // Remove any existing Node.js globals that might have been exposed
  delete window.require;
  delete window.exports;
  delete window.module;
});

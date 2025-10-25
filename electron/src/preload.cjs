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
  },

  // Database API
  saveOrder: (order) => {
    return ipcRenderer.invoke('save-order', order);
  },

  getAllOrders: () => {
    return ipcRenderer.invoke('get-all-orders');
  },

  deleteOrder: (orderId) => {
    return ipcRenderer.invoke('delete-order', orderId);
  },

  clearMatchedOrders: () => {
    return ipcRenderer.invoke('clear-matched-orders');
  },

  updateOrderStatus: (orderId, status) => {
    return ipcRenderer.invoke('update-order-status', orderId, status);
  },

  // Coins API (read-only for frontend)
  getAllCoins: () => {
    return ipcRenderer.invoke('get-all-coins');
  },

  saveCoin: (coin) => {
    return ipcRenderer.invoke('save-coin', coin);
  },

  updateCoinPrice: (symbol, price) => {
    return ipcRenderer.invoke('update-coin-price', symbol, price);
  },

  updateAllCoinPrices: (pricesData) => {
    return ipcRenderer.invoke('update-all-coin-prices', pricesData);
  },

  // Binance Sync Service API
  manualSyncCoins: () => {
    return ipcRenderer.invoke('manual-sync-coins');
  },

  getSyncStatus: () => {
    return ipcRenderer.invoke('get-sync-status');
  }
});

// Security: Prevent the renderer process from accessing Node.js APIs
window.addEventListener('DOMContentLoaded', () => {
  // Remove any existing Node.js globals that might have been exposed
  delete window.require;
  delete window.exports;
  delete window.module;
});

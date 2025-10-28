const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-trade', callback);
    ipcRenderer.on('menu-about', callback);
  },

  // Price update event listener
  onPriceUpdate: (callback) => {
    ipcRenderer.on('price-update', callback);
  },

  // Balance update event listener
  onBalanceUpdate: (callback) => {
    ipcRenderer.on('balance-update', callback);
  },

  // Order matched event listener
  onOrderMatched: (callback) => {
    ipcRenderer.on('order-matched', callback);
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

  clearAllOrders: () => {
    return ipcRenderer.invoke('clear-all-orders');
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

  // Fcoins API
  getAllFcoins: () => {
    return ipcRenderer.invoke('get-all-fcoins');
  },

  saveFcoin: (coin) => {
    return ipcRenderer.invoke('save-fcoin', coin);
  },

  updateFcoinPrice: (symbol, price) => {
    return ipcRenderer.invoke('update-fcoin-price', symbol, price);
  },

  // Binance Sync Service API
  manualSyncCoins: () => {
    return ipcRenderer.invoke('manual-sync-coins');
  },

  manualSyncFuturesCoins: () => {
    return ipcRenderer.invoke('manual-sync-futures-coins');
  },

  getSyncStatus: () => {
    return ipcRenderer.invoke('get-sync-status');
  },

  // Accounts API
  getAllAccounts: () => {
    return ipcRenderer.invoke('get-all-accounts');
  },

  getAccount: (type) => {
    return ipcRenderer.invoke('get-account', type);
  },

  updateAccountBalance: (type, balance) => {
    return ipcRenderer.invoke('update-account-balance', type, balance);
  },

  updateApiKeys: (apiKey, apiSecret, appKey) => {
    return ipcRenderer.invoke('update-api-keys', apiKey, apiSecret, appKey);
  }
});

// Security: Prevent the renderer process from accessing Node.js APIs
window.addEventListener('DOMContentLoaded', () => {
  // Remove any existing Node.js globals that might have been exposed
  delete window.require;
  delete window.exports;
  delete window.module;
});

const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const DatabaseService = require('./database.cjs');
const BinanceSyncService = require('./BinanceSyncService.cjs');
const CoinMarketCapService = require('./CoinMarketCapService.cjs');
const PriceUpdateService = require('./PriceUpdateService.cjs');
const BinanceHelper = require('./BinanceHelper.cjs');
const BinanceTradingService = require('./BinanceTradingService.cjs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Keep a global reference of the window object
let mainWindow;
let databaseService;
let binanceSyncService;
let coinMarketCapService;
let priceUpdateService;
let realtimeStarted = false;

function getAppKeyExpiryTs(appKey) {
  try {
    if (!appKey) return 0;
    const b36 = appKey.replace(/^devcui-?/, '');
    const ts = parseInt(b36, 36);
    return Number.isFinite(ts) ? ts : 0;
  } catch (_) {
    return 0;
  }
}
let binanceHelper;
let binanceTradingService;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      // Allow loading module scripts and assets over file:// without CORS issues
      webSecurity: false
    },
    icon: path.join(__dirname, '../assets/icon.png'), // Use icon.png as app icon
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    backgroundColor: '#1f2937' // Match your app's dark theme
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Serve dist over a tiny local HTTP server to avoid file:// CORS
    const appPath = app.getAppPath();
    const unpackRoot = appPath.endsWith('.asar') ? path.dirname(appPath) : appPath;
    const candidateDirs = [
      // Inside asar
      path.join(appPath, 'frontend/dist'),
      // Next to asar (unpacked)
      path.join(unpackRoot, 'frontend/dist'),
      // Standard dev tree
      path.join(__dirname, '../frontend/dist'),
      path.join(__dirname, '../../frontend/dist'),
      // Under resources
      path.join(process.resourcesPath || '', 'app/frontend/dist'),
      path.join(process.resourcesPath || '', 'frontend/dist')
    ].filter(Boolean);
    const distDir = candidateDirs.find(p => fs.existsSync(path.join(p, 'index.html'))) || candidateDirs[0];
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      console.error('Frontend dist not found at any candidate path:', candidateDirs);
    }

    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.json': 'application/json; charset=utf-8'
    };

    const server = http.createServer((req, res) => {
      const urlPath = decodeURI((req.url || '/').split('?')[0]);
      const safePath = urlPath === '/' ? '/index.html' : urlPath;
      const filePath = path.join(distDir, safePath);
      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.warn('Static 404:', safePath, 'from', distDir);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found' + filePath + ' from ' + distDir);
          return;
        }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}/index.html`;
      console.log('Serving frontend from', distDir, 'at', url);
      mainWindow.loadURL(url);
    });
  }
  

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Debug load failures and try fallback
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('Failed to load UI:', { errorCode, errorDescription, validatedURL, isMainFrame });
    if (!isDev) {
      const fallback = path.resolve(__dirname, '../frontend/dist/index.html');
      console.log('Retry loading from', fallback);
      mainWindow.loadURL(`file://${fallback}`);
    }
  });
}

// IPC handlers for data loading
ipcMain.handle('load-crypto-data', async () => {
  try {
    const dataPath = path.join(__dirname, '../data/crypto-data.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading crypto data:', error);
    // Return default data if file doesn't exist
    return {
      coins: [
       
      ]
    };
  }
});

ipcMain.handle('save-crypto-data', async (event, data) => {
  try {
    const dataPath = path.join(__dirname, '../data/crypto-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving crypto data:', error);
    return { success: false, error: error.message };
  }
});

// Database IPC handlers
ipcMain.handle('save-order', async (event, order) => {
  try {
    const result = await databaseService.saveOrder(order);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving order:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-all-orders', async () => {
  try {
    const orders = await databaseService.getAllOrders();
    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-order', async (event, orderId) => {
  try {
    const result = await databaseService.deleteOrder(orderId);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting order:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-matched-orders', async () => {
  try {
    const result = await databaseService.clearMatchedOrders();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error clearing matched orders:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-all-orders', async () => {
  try {
    const result = await databaseService.clearAllOrders();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error clearing all orders:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-order-status', async (event, orderId, status) => {
  try {
    const result = await databaseService.updateOrderStatus(orderId, status);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
});

// Coins IPC handlers
ipcMain.handle('get-all-coins', async () => {
  try {
    const coins = await databaseService.getAllCoins();
    return { success: true, data: coins };
  } catch (error) {
    console.error('Error fetching coins:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-coin', async (event, coin) => {
  try {
    const result = await databaseService.saveCoin(coin);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving coin:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-coin-price', async (event, symbol, price) => {
  try {
    const result = await databaseService.updateCoinPrice(symbol, price);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating coin price:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-all-coin-prices', async (event, pricesData) => {
  try {
    const result = await databaseService.updateAllCoinPrices(pricesData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating all coin prices:', error);
    return { success: false, error: error.message };
  }
});

// Fcoins IPC handlers
ipcMain.handle('get-all-fcoins', async () => {
  try {
    const fcoins = await databaseService.getAllFcoins();
    return { success: true, data: fcoins };
  } catch (error) {
    console.error('Error fetching fcoins:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-fcoin', async (event, coin) => {
  try {
    const result = await databaseService.saveFcoin(coin);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving fcoin:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-fcoin-price', async (event, symbol, price) => {
  try {
    const result = await databaseService.updateFcoinPrice(symbol, price);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating fcoin price:', error);
    return { success: false, error: error.message };
  }
});

// Binance Sync Service IPC handlers
ipcMain.handle('manual-sync-coins', async () => {
  try {
    if (binanceSyncService) {
      await binanceSyncService.manualSync();
      await binanceSyncService.syncFuturesCoins();
      return { success: true, message: 'Manual sync completed' };
    } else {
      return { success: false, error: 'BinanceSyncService not initialized' };
    }
  } catch (error) {
    console.error('Error during manual sync:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('manual-sync-futures-coins', async () => {
  try {
    if (binanceSyncService) {
      await binanceSyncService.syncFuturesCoins();
      return { success: true, message: 'Manual futures sync completed' };
    } else {
      return { success: false, error: 'BinanceSyncService not initialized' };
    }
  } catch (error) {
    console.error('Error during manual futures sync:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-sync-status', async () => {
  try {
    if (binanceSyncService) {
      const status = binanceSyncService.getStatus();
      return { success: true, data: status };
    } else {
      return { success: false, error: 'BinanceSyncService not initialized' };
    }
  } catch (error) {
    console.error('Error getting sync status:', error);
    return { success: false, error: error.message };
  }
});

// Accounts IPC handlers
ipcMain.handle('get-all-accounts', async () => {
  try {
    const accounts = await databaseService.getAllAccounts();
    return { success: true, data: accounts };
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-account', async (event, type) => {
  try {
    const account = await databaseService.getAccount(type);
    return { success: true, data: account };
  } catch (error) {
    console.error('Error fetching account:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-account-balance', async (event, type, balance) => {
  try {
    const result = await databaseService.updateAccountBalance(type, balance);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating account balance:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-api-keys', async (event, apiKey, apiSecret, appKey) => {
  try {
    // Save API keys to database (update or insert)
    let result = null;
    if (apiKey && apiSecret) {
      result = await databaseService.updateApiKeys(apiKey, apiSecret);
    }
    // Use update-or-insert behavior for app_key
    if (appKey) {
      try { await databaseService.setAppKey(appKey); } catch (e) { console.error('setAppKey error:', e); }
    }
    // If appKey provided and expired, short-circuit and don't start realtime
    if (appKey) {
      const expiryTs = getAppKeyExpiryTs(appKey);
      if (expiryTs && expiryTs < Date.now()) {
        return { success: true, data: { ...result, balances: { spot: 0, futures: 0 }, appKeyExpired: true } };
      }
    }
    
    let balances = { spot: 0, futures: 0 };
    
    // Fetch balances from Binance
    try {
      balances = await binanceSyncService.updateAccountBalancesFromBinance(apiKey, apiSecret);
      console.log('Successfully fetched balances from Binance:', balances);
    } catch (balanceError) {
      console.error('Error fetching balances from Binance:', balanceError);
      // Continue even if balance fetch fails
    }
    
    // Start realtime services if not already started
    if (!realtimeStarted) {
      if (!priceUpdateService) {
        priceUpdateService = new PriceUpdateService(mainWindow, databaseService, binanceTradingService);
      }
      priceUpdateService.start();
      binanceSyncService.startBalanceUpdates();
      realtimeStarted = true;
      console.log('Realtime services started after API keys update');
    }

    return { success: true, data: { ...result, balances } };
  } catch (error) {
    console.error('Error updating API keys:', error);
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(async () => {
  // Initialize database
  try {
    databaseService = new DatabaseService();
    await databaseService.init();
    console.log('Database initialized successfully');

    // Initialize CoinMarketCap Service
    coinMarketCapService = new CoinMarketCapService(databaseService);
    
    // Fetch và save all coins từ CoinMarketCap API nếu chưa có data
    const existingCMCnCoins = await databaseService.getAllCoinsFromCMC();
    if (existingCMCnCoins.length === 0) {
      console.log('No CMC coins found, fetching from API...');
      await coinMarketCapService.saveAllCoinsToDatabase();
      console.log('CoinMarketCap data saved successfully');
    } else {
      console.log(`Found ${existingCMCnCoins.length} existing CMC coins in database`);
    }
    
    console.log('CoinMarketCapService initialized');

    // Initialize Binance Sync Service
    binanceSyncService = new BinanceSyncService(databaseService);
    binanceSyncService.start();
    console.log('BinanceSyncService started');

    
    // Import coins data from JSON if database is empty
    const existingCoins = await databaseService.getAllCoins();
    if (existingCoins.length === 0) {
      try {
      } catch (error) {
        console.error('Error importing coins data:', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  // Create window first
  createWindow();

  // Initialize Price Update Service after window is created
  if (mainWindow) {
    // Initialize BinanceHelper
    binanceHelper = new BinanceHelper();
    console.log('BinanceHelper initialized');
    
    // Initialize BinanceSpotBuyService
    const BinanceSpotBuyService = require('./BinanceSpotBuyService.cjs');
    const binanceSpotBuyService = new BinanceSpotBuyService(databaseService, mainWindow, binanceHelper);
    console.log('BinanceSpotBuyService initialized');
    
    // Initialize BinanceFuturesService
    const BinanceFuturesService = require('./BinanceFuturesService.cjs');
    const binanceFuturesService = new BinanceFuturesService(databaseService, mainWindow, binanceHelper);
    console.log('BinanceFuturesService initialized');
    
    // Initialize BinanceTradingService
    binanceTradingService = new BinanceTradingService(databaseService, mainWindow);
    binanceTradingService.setBinanceHelper(binanceHelper);
    binanceTradingService.setSpotBuyService(binanceSpotBuyService);
    binanceTradingService.setFuturesService(binanceFuturesService);
    console.log('BinanceTradingService initialized');
    
    // Only check appKey to decide whether to start realtime services
    const info = await databaseService.getApiKeys();
    console.log('info', info);
    const expiryTs = info && info.appKey ? getAppKeyExpiryTs(info.appKey) : 0;
    const isAppKeyExpired = expiryTs && expiryTs < Date.now();
    if (isAppKeyExpired) {
      console.log('AppKey expired. Skipping realtime services start.');
    }
    if (!isAppKeyExpired) {
      priceUpdateService = new PriceUpdateService(mainWindow, databaseService, binanceTradingService);
      priceUpdateService.start();
      console.log('PriceUpdateService started - updating prices every 2 seconds');

      binanceSyncService.mainWindow = mainWindow;
      binanceSyncService.startBalanceUpdates();
      console.log('Balance updates started - every 5 seconds');
      realtimeStarted = true;
    } else {
      console.log('AppKey expired. Realtime services will start after a valid appKey is saved.');
    }
    console.log('BinanceTradingService will use prices from PriceUpdateService');
  }

  // macOS specific: create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Create application menu
  createMenu();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', async () => {
  // Close database connection
  if (databaseService) {
    await databaseService.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Trade',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-trade');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Trade Coin',
          click: () => {
            // You can create an about dialog here
            mainWindow.webContents.send('menu-about');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

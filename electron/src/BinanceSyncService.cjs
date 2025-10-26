// Binance Sync Service cho Electron Backend
// Chạy mỗi 1 giờ để sync coins từ Binance API

const fetch = require('node-fetch');

class BinanceSyncService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.isRunning = false;
    this.intervalId = null;
    this.SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
    this.API_BASE_URL = 'https://api.binance.com';
    
    console.log('BinanceSyncService initialized');
  }

  // Start the background sync service
  start() {
    if (this.isRunning) {
      console.log('BinanceSyncService is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting BinanceSyncService - will sync every 1 hour');

    // Run immediately on start
    this.syncCoins();

    // Then run every hour
    this.intervalId = setInterval(() => {
      this.syncCoins();
    }, this.SYNC_INTERVAL);
  }

  // Stop the background sync service
  stop() {
    if (!this.isRunning) {
      console.log('BinanceSyncService is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('BinanceSyncService stopped');
  }

  // Main sync function
  async syncCoins() {
    try {
      console.log('Starting coin sync at:', new Date().toISOString());
      
      // Step 1: Get exchange info (all symbols)
      const symbols = await this.getExchangeInfo();
      console.log(`Found ${symbols.length} symbols from Binance`);

      // Step 3: Combine data and save to database
      await this.saveCoinsToDatabase(symbols);
      
      console.log('Coin sync completed successfully at:', new Date().toISOString());
    } catch (error) {
      console.error('Error during coin sync:', error);
    }
  }

  // Get exchange info from Binance
  async getExchangeInfo() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/v3/exchangeInfo`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter only active spot trading symbols
      const activeSymbols = data.symbols.filter(symbol => 
        symbol.status === 'TRADING' && 
        symbol.isSpotTradingAllowed
      );

      return activeSymbols;
    } catch (error) {
      console.error('Error getting exchange info:', error);
      return [];
    }
  }

  // Get all current prices from Binance
  async getAllPrices() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/v3/ticker/price`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting all prices:', error);
      return [];
    }
  }

  // Save coins data to database
  async saveCoinsToDatabase(symbols) {
    try {
      

      // Process symbols and prepare data for database
      // Get CMC coins to map icons
      let cmcCoins = [];
      try {
        cmcCoins = await this.databaseService.getAllCoinsFromCMC();
        console.log(`Found ${cmcCoins.length} CMC coins for icon mapping`);
      } catch (error) {
        console.log('No CMC coins found, will use fallback icons');
      }

      // Create a map of symbol -> icon_url from CMC data
      const iconMap = new Map();
      const iconMapSymbol = new Map();

      cmcCoins.forEach(coin => {
        if (coin.icon_url) {
          iconMap.set(coin.slug, coin.icon_url);
          iconMapSymbol.set(coin.symbol.toLowerCase(), coin.icon_url);
        }
      });

      const coinsToSave = await Promise.all(symbols.map(async (symbol) => {
        // Extract base asset (e.g., BTCUSDT -> BTC)
        const baseAsset = symbol.baseAsset.toLowerCase();
        const quoteAsset = symbol.quoteAsset.toLowerCase();
        
        // Get price from price map
        const price = 0;

        // Get icon URL from CMC, or use fallback
        const iconUrl = iconMap.get(baseAsset) || iconMapSymbol.get(baseAsset) || baseAsset.slice(0, 2);
        const name = baseAsset;
        
        return {
          symbol: baseAsset,
          name: name,
          price: price,
          icon: iconUrl,
          quoteAsset: quoteAsset,
          status: symbol.status,
          baseAssetPrecision: symbol.baseAssetPrecision,
          quotePrecision: symbol.quotePrecision,
          isSpotTradingAllowed: symbol.isSpotTradingAllowed,
          isMarginTradingAllowed: symbol.isMarginTradingAllowed
        };
      }));

      // Remove duplicates (same base asset with different quote assets)
      const uniqueCoins = this.removeDuplicateCoins(coinsToSave);

      // Check existing coins and save only new ones
      const existingCoins = await this.databaseService.getAllCoins();
      const existingSymbols = new Set(existingCoins.map(coin => coin.symbol));
      
      const newCoins = uniqueCoins.filter(coin => !existingSymbols.has(coin.symbol));
      
      if (newCoins.length > 0) {
        for (const coin of newCoins) {
          try {
            await this.databaseService.saveCoin(coin);
            console.log(`Saved new coin: ${coin.symbol} - ${coin.name}`);
          } catch (error) {
            console.error(`Error saving coin ${coin.symbol}:`, error);
          }
        }
        console.log(`Saved ${newCoins.length} new coins to database`);
      } else {
        console.log('No new coins to save - all coins already exist');
      }
    } catch (error) {
      console.error('Error saving coins to database:', error);
    }
  }

  // Remove duplicate coins (same symbol)
  removeDuplicateCoins(coins) {
    const seen = new Set();
    return coins.filter(coin => {
      if (seen.has(coin.symbol)) {
        return false;
      }
      seen.add(coin.symbol);
      return true;
    });
  }

  // Manual sync trigger (for testing or immediate sync)
  async manualSync() {
    console.log('Manual sync triggered');
    await this.syncCoins();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextSync: this.isRunning ? new Date(Date.now() + this.SYNC_INTERVAL) : null
    };
  }
}

module.exports = BinanceSyncService;

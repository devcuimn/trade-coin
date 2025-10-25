// Price Update Service cho Real-time Price Updates
// Cập nhật giá từ Binance mỗi 2 giây và gửi về frontend

const fetch = require('node-fetch');

class PriceUpdateService {
  constructor(mainWindow, databaseService) {
    this.mainWindow = mainWindow;
    this.databaseService = databaseService;
    this.isRunning = false;
    this.intervalId = null;
    this.UPDATE_INTERVAL = 2000; // 2 seconds in milliseconds
    this.API_BASE_URL = 'https://api.binance.com';
    this.priceCache = new Map(); // Cache for prices
    
    console.log('PriceUpdateService initialized');
  }

  // Start the price update service
  start() {
    if (this.isRunning) {
      console.log('PriceUpdateService is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting PriceUpdateService - will update every 2 seconds');

    // Run immediately on start
    this.updatePrices();

    // Then run every 2 seconds
    this.intervalId = setInterval(() => {
      this.updatePrices();
    }, this.UPDATE_INTERVAL);
  }

  // Stop the price update service
  stop() {
    if (!this.isRunning) {
      console.log('PriceUpdateService is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('PriceUpdateService stopped');
  }

  // Update prices from Binance
  async updatePrices() {
    try {
      // Get all coins from database
      const coins = await this.databaseService.getAllCoins();
      
      if (coins.length === 0) {
        console.log('No coins found in database');
        return;
      }

      // Build symbols list for Binance API (add USDT suffix)
      const symbols = coins.map(coin => `${coin.symbol}USDT`);
      
      // Get current prices from Binance
      const prices = await this.getPricesFromBinance(symbols);
      
      // Update prices in database
      await this.updatePricesInDatabase(prices);
      
      // Send updated prices to frontend
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // Convert Map to object for IPC
        const pricesObj = Object.fromEntries(prices);
        this.mainWindow.webContents.send('price-update', pricesObj);
      }
      
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }

  // Get prices from Binance API - fetch all prices and filter
  async getPricesFromBinance(symbols) {
    try {
      const priceMap = new Map();
      
      if (symbols.length === 0) {
        return priceMap;
      }
      
      // Create a set for faster lookup
      const symbolSet = new Set(symbols);
      
      // Fetch all prices at once (more reliable)
      const url = `${this.API_BASE_URL}/api/v3/ticker/price`;
      
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Binance API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter and create a map
      if (Array.isArray(data)) {
        data.forEach(ticker => {
          // Only include symbols we care about
          if (symbolSet.has(ticker.symbol) && ticker.symbol.endsWith('USDT')) {
            const baseSymbol = ticker.symbol.replace('USDT', '');
            priceMap.set(baseSymbol, parseFloat(ticker.price));
          }
        });
      }
      
      return priceMap;
      
    } catch (error) {
      console.error('Error getting prices from Binance:', error);
      return new Map();
    }
  }

  // Update prices in database
  async updatePricesInDatabase(prices) {
    try {
      let updatedCount = 0;
      
      for (const [symbol, price] of prices.entries()) {
        try {
          await this.databaseService.updateCoinPrice(symbol, price);
          updatedCount++;
        } catch (error) {
          console.error(`Error updating price for ${symbol}:`, error);
        }
      }
      
      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} coin prices`);
      }
      
    } catch (error) {
      console.error('Error updating prices in database:', error);
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextUpdate: this.isRunning ? new Date(Date.now() + this.UPDATE_INTERVAL) : null,
      cacheSize: this.priceCache.size
    };
  }
}

module.exports = PriceUpdateService;

// Price Update Service cho Real-time Price Updates
// Cập nhật giá từ Binance mỗi 2 giây và gửi về frontend

const fetch = require('node-fetch');

class PriceUpdateService {
  constructor(mainWindow, databaseService, tradingService = null) {
    this.mainWindow = mainWindow;
    this.databaseService = databaseService;
    this.tradingService = tradingService; // Reference to BinanceTradingService
    this.isRunning = false;
    this.intervalId = null;
    this.UPDATE_INTERVAL = 2000; // 2 seconds in milliseconds
    this.API_BASE_URL = 'https://api.binance.com';
    this.FUTURES_API_BASE_URL = 'https://fapi.binance.com';
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
      // Get all spot and futures coins from database
      const [spotCoins, futuresCoins] = await Promise.all([
        this.databaseService.getAllCoins(),
        this.databaseService.getAllFcoins()
      ]);

      if (spotCoins.length === 0 && futuresCoins.length === 0) {
        console.log('No coins found in database');
        return;
      }

      // Build symbols lists for Binance API (add USDT suffix)
      const spotSymbols = spotCoins.map(coin => `${coin.symbol}USDT`);
      const futuresSymbols = futuresCoins.map(coin => `${coin.symbol}USDT`);

      // Get current prices from both Binance Spot and Futures APIs
      const [spotPrices, futuresPrices] = await Promise.all([
        this.getPricesFromBinance(spotSymbols),
        this.getFuturesPricesFromBinance(futuresSymbols)
      ]);
      // Combine both price maps
      const allPrices = new Map([...spotPrices, ...futuresPrices]);

      // Update prices in database
      await Promise.all([
        this.updateSpotPricesInDatabase(spotPrices),
        this.updateFuturesPricesInDatabase(futuresPrices)
      ]);

      // Send updated prices to frontend
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // Convert Map to object for IPC - combined for both spot and futures
        const pricesObj = Object.fromEntries(allPrices);
        this.mainWindow.webContents.send('price-update', pricesObj);

        // Also log which prices are spot vs futures
        console.log(`Price update: ${spotPrices.size} spot, ${futuresPrices.size} futures`);
      }

      // Check for orders using the real-time prices
      if (this.tradingService) {
        await this.tradingService.checkOrdersWithPrices(spotPrices, futuresPrices);
      }

    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }

  // Get prices from Binance Spot API - fetch all prices and filter
  async getPricesFromBinance(symbols) {
    try {
      const priceMap = new Map();

      if (symbols.length === 0) {
        return priceMap;
      }

      // Create a set for faster lookup
      const symbolSet = new Set(symbols.map(symbol => symbol.toUpperCase()));

      // Fetch all prices at once (more reliable)
      const url = `${this.API_BASE_URL}/api/v3/ticker/price`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Binance Spot API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Filter and create a map
      if (Array.isArray(data)) {
        data.forEach(ticker => {
          // Only include symbols we care about
          if (symbolSet.has(ticker.symbol) && ticker.symbol.endsWith('USDT')) {
            const baseSymbol = ticker.symbol.replace('USDT', '');
            priceMap.set(baseSymbol.toLowerCase(), parseFloat(ticker.price));
          }
        });
      }
      return priceMap;

    } catch (error) {
      console.error('Error getting prices from Binance Spot:', error);
      return new Map();
    }
  }

  // Get prices from Binance Futures API
  async getFuturesPricesFromBinance(symbols) {
    try {
      const priceMap = new Map();

      if (symbols.length === 0) {
        return priceMap;
      }

      // Create a set for faster lookup
      const symbolSet = new Set(symbols.map(symbol => symbol.toUpperCase()));

      // Fetch all futures prices at once
      const url = `${this.FUTURES_API_BASE_URL}/fapi/v1/ticker/price`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Binance Futures API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Filter and create a map
      if (Array.isArray(data)) {
        data.forEach(ticker => {
          // Only include symbols we care about
          if (symbolSet.has(ticker.symbol) && ticker.symbol.endsWith('USDT')) {
            const baseSymbol = ticker.symbol.replace('USDT', '');
            priceMap.set(baseSymbol.toLowerCase(), parseFloat(ticker.price));
          }
        });
      }
      return priceMap;

    } catch (error) {
      console.error('Error getting prices from Binance Futures:', error);
      return new Map();
    }
  }

  // Update spot prices in database
  async updateSpotPricesInDatabase(prices) {
    try {
      let updatedCount = 0;

      for (const [symbol, price] of prices.entries()) {
        try {
          await this.databaseService.updateCoinPrice(symbol, price);
          updatedCount++;
        } catch (error) {
          console.error(`Error updating spot price for ${symbol}:`, error);
        }
      }

      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} spot coin prices`);
      }

    } catch (error) {
      console.error('Error updating spot prices in database:', error);
    }
  }

  // Update futures prices in database
  async updateFuturesPricesInDatabase(prices) {
    try {
      let updatedCount = 0;

      for (const [symbol, price] of prices.entries()) {
        try {
          await this.databaseService.updateFcoinPrice(symbol, price);
          updatedCount++;
        } catch (error) {
          console.error(`Error updating futures price for ${symbol}:`, error);
        }
      }

      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} futures coin prices`);
      }

    } catch (error) {
      console.error('Error updating futures prices in database:', error);
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

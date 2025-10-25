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

      // Step 2: Get current prices
      const prices = await this.getAllPrices();
      console.log(`Found ${prices.length} price data from Binance`);

      // Step 3: Combine data and save to database
      await this.saveCoinsToDatabase(symbols, prices);
      
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
  async saveCoinsToDatabase(symbols, prices) {
    try {
      // Create price lookup map
      const priceMap = new Map();
      prices.forEach(ticker => {
        priceMap.set(ticker.symbol, parseFloat(ticker.price));
      });

      // Process symbols and prepare data for database
      const coinsToSave = symbols.map(symbol => {
        // Extract base asset (e.g., BTCUSDT -> BTC)
        const baseAsset = symbol.baseAsset;
        const quoteAsset = symbol.quoteAsset;
        
        // Get price from price map
        const price = priceMap.get(symbol.symbol) || 0;

        // Generate icon URL (using CoinGecko as fallback)
        const icon = this.generateIconUrl(baseAsset);

        return {
          symbol: baseAsset,
          name: this.getCoinName(baseAsset),
          price: price,
          icon: icon,
          quoteAsset: quoteAsset,
          status: symbol.status,
          baseAssetPrecision: symbol.baseAssetPrecision,
          quotePrecision: symbol.quotePrecision,
          isSpotTradingAllowed: symbol.isSpotTradingAllowed,
          isMarginTradingAllowed: symbol.isMarginTradingAllowed
        };
      });

      // Remove duplicates (same base asset with different quote assets)
      const uniqueCoins = this.removeDuplicateCoins(coinsToSave);

      // Save to database
      for (const coin of uniqueCoins) {
        try {
          await this.databaseService.saveCoin(coin);
        } catch (error) {
          console.error(`Error saving coin ${coin.symbol}:`, error);
        }
      }
      console.log(`Saved ${uniqueCoins.length} unique coins to database`);
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

  // Generate icon URL for coin
  generateIconUrl(symbol) {
    // Try CoinGecko API first
    const coinGeckoId = this.getCoinGeckoId(symbol);
    if (coinGeckoId) {
      return `https://assets.coingecko.com/coins/images/${coinGeckoId}/large/${symbol.toLowerCase()}.png`;
    }

    // Fallback to generic icon
    return `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`;
  }

  // Get CoinGecko ID for popular coins
  getCoinGeckoId(symbol) {
    const coinGeckoMap = {
      'BTC': '1',
      'ETH': '279',
      'BNB': '825',
      'SOL': '4128',
      'ADA': '975',
      'XRP': '44',
      'DOT': '12171',
      'LTC': '2',
      'LINK': '877',
      'BCH': '780',
      'ETC': '453',
      'XLM': '100',
      'VET': '1164',
      'TRX': '1094',
      'EOS': '738',
      'FIL': '12817',
      'XTZ': '976',
      'NEO': '480',
      'ATOM': '1481',
      'UNI': '12504'
    };

    return coinGeckoMap[symbol] || null;
  }

  // Get coin name
  getCoinName(symbol) {
    const nameMap = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'Binance Coin',
      'SOL': 'Solana',
      'ADA': 'Cardano',
      'XRP': 'Ripple',
      'DOT': 'Polkadot',
      'LTC': 'Litecoin',
      'LINK': 'Chainlink',
      'BCH': 'Bitcoin Cash',
      'ETC': 'Ethereum Classic',
      'XLM': 'Stellar',
      'VET': 'VeChain',
      'TRX': 'Tron',
      'EOS': 'EOS',
      'FIL': 'Filecoin',
      'XTZ': 'Tezos',
      'NEO': 'Neo',
      'ATOM': 'Cosmos',
      'UNI': 'Uniswap'
    };

    return nameMap[symbol] || symbol;
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

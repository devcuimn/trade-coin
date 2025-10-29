// Binance Sync Service cho Electron Backend
// Chạy mỗi 1 giờ để sync coins từ Binance API

const fetch = require('node-fetch');
const crypto = require('crypto');

class BinanceSyncService {
  constructor(databaseService, mainWindow = null) {
    this.databaseService = databaseService;
    this.mainWindow = mainWindow;
    this.isRunning = false;
    this.intervalId = null;
    this.balanceIntervalId = null;
    this.SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
    this.BALANCE_UPDATE_INTERVAL = 5 * 1000; // 5 seconds in milliseconds
    this.API_BASE_URL = 'https://api.binance.com';
    this.FUTURES_API_BASE_URL = 'https://fapi.binance.com';
    
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
    // this.syncCoins();
    // this.syncFuturesCoins();

    // Then run every hour
    this.intervalId = setInterval(() => {
      this.syncCoins();
      this.syncFuturesCoins();
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

  // Sync futures coins
  async syncFuturesCoins() {
    try {
      console.log('Starting futures coins sync at:', new Date().toISOString());
      
      const symbols = await this.getFuturesExchangeInfo();
      console.log(`Found ${symbols.length} futures symbols from Binance`);
      
      await this.saveFuturesCoinsToDatabase(symbols);
      
      console.log('Futures coins sync completed successfully at:', new Date().toISOString());
    } catch (error) {
      console.error('Error during futures coins sync:', error);
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

  // Get futures exchange info from Binance
  async getFuturesExchangeInfo() {
    try {
      const response = await fetch(`${this.FUTURES_API_BASE_URL}/fapi/v1/exchangeInfo`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter only active futures trading symbols
      const activeSymbols = data.symbols.filter(symbol => 
        symbol.status === 'TRADING' && 
        symbol.contractType === 'PERPETUAL'
      );

      return activeSymbols;
    } catch (error) {
      console.error('Error getting futures exchange info:', error);
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

  // Save futures coins data to database
  async saveFuturesCoinsToDatabase(symbols) {
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
          contractType: symbol.contractType,
          underlyingType: symbol.underlyingType,
          underlyingSubType: symbol.underlyingSubType
        };
      }));

      // Remove duplicates (same base asset with different quote assets)
      const uniqueCoins = this.removeDuplicateCoins(coinsToSave);

      // Check existing coins and save only new ones
      const existingFcoins = await this.databaseService.getAllFcoins();
      const existingSymbols = new Set(existingFcoins.map(coin => coin.symbol));
      
      const newCoins = uniqueCoins.filter(coin => !existingSymbols.has(coin.symbol));
      
      if (newCoins.length > 0) {
        for (const coin of newCoins) {
          try {
            await this.databaseService.saveFcoin(coin);
            console.log(`Saved new futures coin: ${coin.symbol} - ${coin.name}`);
          } catch (error) {
            console.error(`Error saving futures coin ${coin.symbol}:`, error);
          }
        }
        console.log(`Saved ${newCoins.length} new futures coins to database`);
      } else {
        console.log('No new futures coins to save - all coins already exist');
      }
    } catch (error) {
      console.error('Error saving futures coins to database:', error);
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

  // Generate signature for signed requests
  generateSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
  }

  // Fetch account balances from Binance
  async fetchAccountBalances(apiKey, apiSecret) {
    try {
      // Fetch Spot balance
      const spotData = await this.fetchSpotBalance(apiKey, apiSecret);
      
      // Calculate USD value for each spot coin
      const spotCoinsWithValue = await this.calculateSpotCoinsValue(spotData.coins);
      
      // Fetch Futures balance (now returns object with totalBalance, availableBalance, unrealizedPnL)
      const futuresData = await this.fetchFuturesBalance(apiKey, apiSecret);
      
      // Calculate total spot value (USDT + coins in USD)
      const totalSpotValue = spotData.usdtBalance + spotCoinsWithValue.reduce((sum, coin) => sum + coin.value, 0);
      
      return {
        spot: {
          usdtBalance: spotData.usdtBalance,
          coins: spotCoinsWithValue,
          totalValue: totalSpotValue
        },
        futures: futuresData
      };
    } catch (error) {
      console.error('Error fetching Binance account balances:', error);
      throw error;
    }
  }

  // Calculate USD value for spot coins
  async calculateSpotCoinsValue(coins) {
    if (coins.length === 0) return [];
    
    try {
      // Fetch current prices from Binance
      const response = await fetch(`${this.API_BASE_URL}/api/v3/ticker/price`);
      const allPrices = await response.json();
      
      return coins.map(coin => {
        // Find price for this coin in USDT
        const priceData = allPrices.find(p => p.symbol === `${coin.asset}USDT`);
        const price = priceData ? parseFloat(priceData.price) : 0;
        const value = coin.balance * price;
        
        return {
          ...coin,
          price: price,
          value: value
        };
      });
    } catch (error) {
      console.error('Error calculating spot coins value:', error);
      return coins;
    }
  }

  // Fetch Spot balance
  async fetchSpotBalance(apiKey, apiSecret) {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString, apiSecret);

      const url = `${this.API_BASE_URL}/api/v3/account?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const balances = data.balances || [];
      
      // Find USDT balance
      const usdtBalance = balances.find(b => b.asset === 'USDT');
      const spotUSDT = usdtBalance ? parseFloat(usdtBalance.free) : 0;
      
      // Get all coins with balance > 0 (excluding USDT and BUSD)
      const spotCoins = balances
        .filter(b => {
          const balance = parseFloat(b.free);
          return balance > 0 && !['USDT', 'BUSD'].includes(b.asset);
        })
        .map(b => ({
          asset: b.asset,
          balance: parseFloat(b.free),
          value: 0 // Will be calculated later
        }));
      
      return {
        usdtBalance: spotUSDT,
        coins: spotCoins
      };
    } catch (error) {
      console.error('Error fetching Spot balance:', error);
      return { usdtBalance: 0, coins: [] };
    }
  }

  // Fetch Futures balance
  async fetchFuturesBalance(apiKey, apiSecret) {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString, apiSecret);

      const url = `https://fapi.binance.com/fapi/v2/balance?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Find USDT balance
      const usdtBalance = data.find(b => b.asset === 'USDT');
      if (!usdtBalance) return { totalBalance: 0, availableBalance: 0, unrealizedPnL: 0, positions: [] };
      
      // totalBalance = Total balance (includes unrealized PnL)
      // availableBalance = Available balance (excluding unrealized PnL)
      // unrealizedPnL = Unrealized profit/loss from open positions
      const totalBalance = parseFloat(usdtBalance.balance) || 0;
      const availableBalance = parseFloat(usdtBalance.availableBalance) || 0;
      const unrealizedPnL = parseFloat(usdtBalance.crossUnPnl) || 0;
      
      // Fetch open positions
      const positions = await this.fetchOpenPositions(apiKey, apiSecret);
      
      // Calculate total PnL from all positions
      const totalPnLFromPositions = positions.reduce((sum, pos) => sum + pos.unRealizedProfit, 0);
      
      // Use position-based PnL if available, otherwise use crossUnPnl
      const effectivePnL = positions.length > 0 ? totalPnLFromPositions : unrealizedPnL;
      
      console.log('Futures Balance Debug:', {
        crossUnPnl: unrealizedPnL,
        totalPnLFromPositions: totalPnLFromPositions,
        effectivePnL: effectivePnL,
        positionsCount: positions.length
      });
      
      return {
        totalBalance: totalBalance,
        availableBalance: availableBalance,
        unrealizedPnL: effectivePnL,
        positions: positions
      };
    } catch (error) {
      console.error('Error fetching Futures balance:', error);
      return { totalBalance: 0, availableBalance: 0, unrealizedPnL: 0, positions: [] };
    }
  }

  // Fetch open positions
  async fetchOpenPositions(apiKey, apiSecret) {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString, apiSecret);

      const url = `https://fapi.binance.com/fapi/v2/positionRisk?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter only open positions (positionAmt != 0)
      const openPositions = data
        .filter(pos => Math.abs(parseFloat(pos.positionAmt)) > 0)
        .map(pos => ({
          symbol: pos.symbol,
          positionAmt: parseFloat(pos.positionAmt),
          entryPrice: parseFloat(pos.entryPrice),
          markPrice: parseFloat(pos.markPrice),
          unRealizedProfit: parseFloat(pos.unRealizedProfit),
          leverage: parseInt(pos.leverage),
          marginType: pos.marginType,
          positionSide: pos.positionSide
        }));
      
      return openPositions;
    } catch (error) {
      console.error('Error fetching open positions:', error);
      return [];
    }
  }

  // Fetch balances when API keys are updated
  async updateAccountBalancesFromBinance(apiKey, apiSecret) {
    try {
      console.log('Fetching balances from Binance...');
      const balances = await this.fetchAccountBalances(apiKey, apiSecret);
      
      // Update spot balance (use totalValue for database)
      await this.databaseService.updateAccountBalance('spot', balances.spot.totalValue);
      console.log('Updated spot balance:', balances.spot.totalValue);
      
      // Update futures balance (use totalBalance for database)
      await this.databaseService.updateAccountBalance('futures', balances.futures.totalBalance);
      console.log('Updated futures balance:', balances.futures.totalBalance);
      
      return balances;
    } catch (error) {
      console.error('Error updating account balances:', error);
      throw error;
    }
  }

  // Start periodic balance updates
  startBalanceUpdates() {
    if (this.balanceIntervalId) {
      console.log('Balance updates already running');
      return;
    }

    console.log('Starting balance updates every 5 seconds');
    
    this.balanceIntervalId = setInterval(async () => {
      try {
        // Get API keys from database
        const apiKeys = await this.databaseService.getApiKeys();
        if (!apiKeys || !apiKeys.apiKey || !apiKeys.apiSecret) {
          return; // No API keys, skip update
        }

        // Fetch and send balances
        const balances = await this.fetchAccountBalances(apiKeys.apiKey, apiKeys.apiSecret);
        
        // Update database
        await this.databaseService.updateAccountBalance('spot', balances.spot.totalValue);
        await this.databaseService.updateAccountBalance('futures', balances.futures.totalBalance);
        
        // Send to frontend
        if (this.mainWindow) {
          this.mainWindow.webContents.send('balance-update', balances);
        }
        
        console.log('Balances updated:', balances);
        // console.log('Spot balance:', balances.spot.totalValue);
        // console.log('Futures balance:', balances.futures.positions);
        // for (const position of balances.futures.positions) {
        //   console.log('Position:', position);
        // }
      } catch (error) {
        console.error('Error in balance update:', error);
      }
    }, this.BALANCE_UPDATE_INTERVAL);
  }

  // Stop periodic balance updates
  stopBalanceUpdates() {
    if (this.balanceIntervalId) {
      clearInterval(this.balanceIntervalId);
      this.balanceIntervalId = null;
      console.log('Balance updates stopped');
    }
  }
}

module.exports = BinanceSyncService;

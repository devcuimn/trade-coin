// Binance Trading Service - Main service to check and process all orders

class BinanceTradingService {
  constructor(databaseService, mainWindow = null) {
    this.databaseService = databaseService;
    this.mainWindow = mainWindow;
    this.isRunning = false;
    this.binanceHelper = null;
    this.spotBuyService = null;
    this.futuresService = null;
    
    console.log('BinanceTradingService initialized');
  }

  // Set BinanceHelper reference
  setBinanceHelper(binanceHelper) {
    this.binanceHelper = binanceHelper;
  }

  // Set Spot Buy Service reference
  setSpotBuyService(spotBuyService) {
    this.spotBuyService = spotBuyService;
  }

  // Set Futures Service reference
  setFuturesService(futuresService) {
    this.futuresService = futuresService;
  }

  // Start the service
  start() {
    if (this.isRunning) {
      console.log('BinanceTradingService is already running');
      return;
    }

    this.isRunning = true;
    console.log('BinanceTradingService started - will check orders using prices from PriceUpdateService');
  }

  // Stop the service
  stop() {
    if (!this.isRunning) {
      console.log('BinanceTradingService is not running');
      return;
    }

    this.isRunning = false;
    console.log('BinanceTradingService stopped');
  }

  // Check orders with provided prices (called from PriceUpdateService)
  async checkOrdersWithPrices(spotPrices, futuresPrices) {
    try {
      // Get API keys
      const apiKeys = await this.databaseService.getApiKeys();
      if (!apiKeys || !apiKeys.apiKey || !apiKeys.apiSecret) {
        return; // No API keys
      }

      // Convert Maps to objects for easier lookup
      const spotMarketPrices = {};
      for (const [symbol, price] of spotPrices.entries()) {
        spotMarketPrices[`${symbol.toUpperCase()}USDT`] = price;
      }

      const futuresMarketPrices = {};
      for (const [symbol, price] of futuresPrices.entries()) {
        futuresMarketPrices[`${symbol.toUpperCase()}USDT`] = price;
      }

      // Get all pending orders from database
      const pendingOrders = await this.getPendingOrders();
      if (pendingOrders.length === 0) {
        return; // No pending orders
      }

      // Process each pending order based on its mode
      for (const order of pendingOrders) {
        // Use appropriate price source based on order mode
        const marketPrices = order.mode === 'futures' ? futuresMarketPrices : spotMarketPrices;
        await this.processOrder(order, marketPrices, apiKeys);
      }

    } catch (error) {
      console.error('Error in checkOrdersWithPrices:', error);
    }
  }

  // Get all pending orders from database
  async getPendingOrders() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM orders 
        WHERE status = 'pending' 
        ORDER BY timestamp ASC
      `;

      this.databaseService.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching pending orders:', err);
          reject(err);
        } else {
          const orders = rows.map(row => ({
            ...row,
            timestamp: new Date(row.timestamp),
            price: parseFloat(row.price),
            amount: parseFloat(row.amount),
            total: parseFloat(row.total),
            triggerPrice: row.triggerPrice ? parseFloat(row.triggerPrice) : undefined
          }));
          resolve(orders);
        }
      });
    });
  }

  // Process an order (check if should execute)
  async processOrder(order, marketPrices, apiKeys) {
    try {
      // Get current market price
      const symbol = `${order.coin.toUpperCase()}USDT`;
      const marketPrice = marketPrices[symbol];
      
      if (!marketPrice) {
        console.log(`No market price found for ${symbol}`);
        return;
      }

      console.log(`Checking order ${order.id}: coin=${order.coin}, orderPrice=${order.price}, marketPrice=${marketPrice}, mode=${order.mode}, type=${order.type}`);

      // Check conditions based on mode (spot or futures)
      let shouldExecute = false;

      if (order.mode === 'spot') {
        // Spot orders: Buy when market price <= order price
        shouldExecute = (order.type === 'buy' && marketPrice <= order.price);
      } else if (order.mode === 'futures') {
        // Delegate ALL futures orders to FuturesService
        // It handles both limit and stop-limit orders internally
        if (this.futuresService) {
          await this.futuresService.processFuturesOrder(order, marketPrices, apiKeys);
        }
        return; // Exit early, handled by FuturesService
      }

      // Only process spot orders here (futures orders already handled above)
      if (shouldExecute && order.mode === 'spot') {
        console.log(`Price condition met for order ${order.id}`);
        
        // Execute spot buy
        if (order.type === 'buy' && this.spotBuyService) {
          await this.spotBuyService.processSpotOrder(order, marketPrices, apiKeys);
        }
      }

    } catch (error) {
      console.error(`Error processing order ${order.id}:`, error);
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning
    };
  }
}

module.exports = BinanceTradingService;


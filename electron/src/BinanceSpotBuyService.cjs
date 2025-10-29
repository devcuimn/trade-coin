// Binance Spot Buy Service
// Kiểm tra pending spot buy orders và mua khi giá thị trường <= giá order

class BinanceSpotBuyService {
  constructor(databaseService, mainWindow = null, binanceHelper = null, telegramService = null) {
    this.databaseService = databaseService;
    this.mainWindow = mainWindow;
    this.binanceHelper = binanceHelper;
    this.telegramService = telegramService;
    
    console.log('BinanceSpotBuyService initialized');
  }

  // Process spot buy order (called from TradingService)
  async processSpotOrder(order, marketPrices, apiKeys) {
    try {
      // Get current market price
      const symbol = `${order.coin.toUpperCase()}USDT`;
      const marketPrice = marketPrices[symbol];
      
      if (!marketPrice) {
        console.log(`No market price found for ${symbol}`);
        return;
      }

      console.log(`Checking order ${order.id}: coin=${order.coin}, orderPrice=${order.price}, marketPrice=${marketPrice}`);

      // Check if market price <= order price
      if (marketPrice <= order.price) {
        console.log(`Price condition met for order ${order.id}. Market price ${marketPrice} <= order price ${order.price}`);
        
        let orderResult;
        
        // Check if it's a limit order or market order
        if (order.orderType === 'market') {
          // Execute market buy
          orderResult = await this.executeSpotMarketBuy(order, apiKeys);
        } else {
          // Use marketPrice if it's lower than order.price for limit orders
          const effectivePrice = marketPrice < order.price ? marketPrice : order.price;
          orderResult = await this.executeSpotLimitBuy(order, apiKeys, effectivePrice);
        }

        // Save the Binance order result
        await this.saveOrderResult(order, orderResult);

        // Update order status to matched
        await this.databaseService.updateOrderStatus(order.id, 'matched');
        
        // Send notification to frontend
        if (this.mainWindow) {
          this.mainWindow.webContents.send('order-matched', {
            orderId: order.id,
            coin: order.coin,
            type: order.type,
            price: marketPrice,
            binanceOrderResult: orderResult,
          });
        }

        // Send Telegram notification
        if (this.telegramService) {
          await this.telegramService.notifyOrderMatched(order, orderResult);
        }
      }

    } catch (error) {
      console.error(`Error processing order ${order.id}:`, error);
    }
  }

  // Execute spot market buy
  async executeSpotMarketBuy(order, apiKeys) {
    try {
      console.log(`Executing spot market buy for order ${order.id}`);
      
      const symbol = `${order.coin.toUpperCase()}USDT`;
      const quoteOrderQty = order.total; // order.total is total USD to spend
      
      const orderResult = await this.binanceHelper.placeSpotMarketOrderWithQuote(
        apiKeys.apiKey,
        apiKeys.apiSecret,
        symbol,
        'BUY',
        quoteOrderQty
      );

      console.log(`Spot market buy executed successfully:`, orderResult);
      return orderResult;

    } catch (error) {
      console.error(`Error executing spot market buy for order ${order.id}:`, error);
      throw error;
    }
  }

  // Execute spot limit buy
  async executeSpotLimitBuy(order, apiKeys, effectivePrice) {
    try {
      console.log(`Executing spot limit buy for order ${order.id}`);
      
      const symbol = `${order.coin.toUpperCase()}USDT`;
      
      // Get symbol filters from exchange info
      const exchangeInfo = await this.binanceHelper.getExchangeInfo(symbol);
      
      // Calculate quantity from total USD using effective price
      const rawQuantity = order.total / effectivePrice;
      
      // Round quantity and price
      let quantity = this.binanceHelper.roundQuantityToStepSize(rawQuantity, exchangeInfo.stepSize);
      const price = this.binanceHelper.roundPriceToTickSize(effectivePrice, exchangeInfo.tickSize);

      console.log(`Order details: rawQuantity=${rawQuantity}, quantity=${quantity}, price=${price}, symbol=${symbol}`);

      // Validate minimum quantity
      if (quantity < exchangeInfo.minQuantity) {
        throw new Error(`Quantity ${quantity} is below minimum ${exchangeInfo.minQuantity} for ${symbol}`);
      }

      // Validate minimum notional (quantity * price must be >= minNotional)
      const notional = quantity * price;
      if (notional < exchangeInfo.minNotional) {
        console.warn(`Notional ${notional} is below minimum ${exchangeInfo.minNotional}. Adjusting quantity...`);
        // Adjust quantity to meet min notional requirement
        const adjustedQuantity = Math.ceil(exchangeInfo.minNotional / price);
        quantity = this.binanceHelper.roundQuantityToStepSize(adjustedQuantity, exchangeInfo.stepSize);
        
        // Verify again
        const adjustedNotional = quantity * price;
        if (adjustedNotional < exchangeInfo.minNotional) {
          throw new Error(`Order notional ${adjustedNotional} still below minimum ${exchangeInfo.minNotional} for ${symbol}`);
        }
        
        console.log(`Adjusted quantity to ${quantity} to meet min notional. Final notional: ${adjustedNotional}`);
      }

      // Place limit order
      const orderResult = await this.binanceHelper.placeSpotLimitOrder(
        apiKeys.apiKey,
        apiKeys.apiSecret,
        symbol,
        'BUY',
        quantity,
        price
      );

      console.log(`Spot limit buy executed successfully:`, orderResult);
      return orderResult;

    } catch (error) {
      console.error(`Error executing spot limit buy for order ${order.id}:`, error);
      throw error;
    }
  }


  // Save order result to database
  async saveOrderResult(order, orderResult) {
    return new Promise((resolve, reject) => {
      try {
        // Extract executed price from order result using helper
        const executedPrice = this.binanceHelper.extractExecutedPrice(orderResult);

        const sql = `
          UPDATE orders 
          SET 
            binanceOrderId = ?,
            binanceOrderData = ?,
            executedPrice = ?,
            executedAt = ?
          WHERE id = ?
        `;

        const values = [
          orderResult.orderId ? orderResult.orderId.toString() : null,
          JSON.stringify(orderResult),
          executedPrice,
          new Date().toISOString(),
          order.id
        ];

        this.databaseService.db.run(sql, values, (err) => {
          if (err) {
            console.error('Error saving order result:', err);
            reject(err);
          } else {
            console.log(`Saved order result for order ${order.id}`);
            resolve();
          }
        });
      } catch (error) {
        console.error('Error saving order result:', error);
        reject(error);
      }
    });
  }
}

module.exports = BinanceSpotBuyService;


// Binance Futures Service
// Handles futures limit long and short orders

class BinanceFuturesService {
  constructor(databaseService, mainWindow = null, binanceHelper = null) {
    this.databaseService = databaseService;
    this.mainWindow = mainWindow;
    this.binanceHelper = binanceHelper;
    
    console.log('BinanceFuturesService initialized');
  }

  // Process futures order (called from TradingService)
  async processFuturesOrder(order, marketPrices, apiKeys) {
    try {
      // Get current market price
      const symbol = `${order.coin.toUpperCase()}USDT`;
      const marketPrice = marketPrices[symbol];
      
      if (!marketPrice) {
        console.log(`No market price found for ${symbol}`);
        return;
      }

      console.log(`Processing futures order ${order.id}: coin=${order.coin}, orderPrice=${order.price}, marketPrice=${marketPrice}, type=${order.type}, orderType=${order.orderType}, triggerPrice=${order.triggerPrice}`);

      if (order.orderType === 'limit') {
        if (order.type === 'long') {
          // Long: Buy when market price <= order.price
          if (marketPrice <= order.price) {
            const effectivePrice = marketPrice < order.price ? marketPrice : order.price;
            const orderResult = await this.executeFuturesLimitLong(order, apiKeys, effectivePrice);
            
            if (orderResult) {
              await this.saveOrderResult(order, orderResult);
              await this.databaseService.updateOrderStatus(order.id, 'matched');
              
              if (this.mainWindow) {
                this.mainWindow.webContents.send('order-matched', {
                  orderId: order.id,
                  coin: order.coin,
                  type: order.type,
                  price: marketPrice,
                  binanceOrderResult: orderResult,
                });
              }
            }
          }
        } else if (order.type === 'short') {
          // Short: Sell when market price >= order.price
          if (marketPrice >= order.price) {
            const effectivePrice = marketPrice > order.price ? marketPrice : order.price;
            const orderResult = await this.executeFuturesLimitShort(order, apiKeys, effectivePrice);
            
            if (orderResult) {
              await this.saveOrderResult(order, orderResult);
              await this.databaseService.updateOrderStatus(order.id, 'matched');
              
              if (this.mainWindow) {
                this.mainWindow.webContents.send('order-matched', {
                  orderId: order.id,
                  coin: order.coin,
                  type: order.type,
                  price: marketPrice,
                  binanceOrderResult: orderResult,
                });
              }
            }
          }
        }
      }

      // Handle stop-limit orders
      if (order.orderType === 'stop-limit') {
        if (!order.triggerPrice) {
          console.log(`No trigger price for stop-limit order ${order.id}`);
          return;
        }

        if (order.type === 'long') {
          // Long stop-limit: When market price reaches triggerPrice, place limit order at order.price
          // Trigger condition: marketPrice >= triggerPrice (price goes up to our trigger)
          if (marketPrice >= order.triggerPrice) {
            console.log(`Trigger activated for long stop-limit order ${order.id}: marketPrice=${marketPrice} >= triggerPrice=${order.triggerPrice}`);
            
            // When trigger activated, place limit order immediately with order.price as limit
            // Don't wait for additional conditions, let the exchange handle matching
            console.log(`Placing long stop-limit order with limitPrice=${order.price}`);
            const orderResult = await this.executeFuturesLimitLong(order, apiKeys, order.price);
            
            if (orderResult) {
              await this.saveOrderResult(order, orderResult);
              await this.databaseService.updateOrderStatus(order.id, 'matched');
              
              if (this.mainWindow) {
                this.mainWindow.webContents.send('order-matched', {
                  orderId: order.id,
                  coin: order.coin,
                  type: order.type,
                  price: marketPrice,
                  binanceOrderResult: orderResult,
                });
              }
            }
          }
        } else if (order.type === 'short') {
          // Short stop-limit: When market price drops to triggerPrice, place limit order at order.price
          // Trigger condition: marketPrice <= triggerPrice (price goes down to our trigger)
          if (marketPrice <= order.triggerPrice) {
            console.log(`Trigger activated for short stop-limit order ${order.id}: marketPrice=${marketPrice} <= triggerPrice=${order.triggerPrice}`);
            
            // When trigger activated, place limit order immediately with order.price as limit
            // Don't wait for additional conditions, let the exchange handle matching
            console.log(`Placing short stop-limit order with limitPrice=${order.price}`);
            const orderResult = await this.executeFuturesLimitShort(order, apiKeys, order.price);
            
            if (orderResult) {
              await this.saveOrderResult(order, orderResult);
              await this.databaseService.updateOrderStatus(order.id, 'matched');
              
              if (this.mainWindow) {
                this.mainWindow.webContents.send('order-matched', {
                  orderId: order.id,
                  coin: order.coin,
                  type: order.type,
                  price: marketPrice,
                  binanceOrderResult: orderResult,
                });
              }
            }
          }
        }
      }

    } catch (error) {
      console.error(`Error processing futures order ${order.id}:`, error);
    }
  }

  // Execute futures limit long
  async executeFuturesLimitLong(order, apiKeys, effectivePrice) {
    try {
      console.log(`Executing futures limit long for order ${order.id}`);
      
      const symbol = `${order.coin.toUpperCase()}USDT`;
      
      // Check if symbol is available for futures trading
      let exchangeInfo;
      try {
        exchangeInfo = await this.binanceHelper.getFuturesExchangeInfo(symbol);
      } catch (error) {
        console.error(`Symbol ${symbol} is not available for futures trading:`, error.message);
        if (this.mainWindow) {
          this.mainWindow.webContents.send('order-error', {
            orderId: order.id,
            coin: order.coin,
            error: `Symbol ${order.coin} is not available for futures trading on Binance`
          });
        }
        throw error;
      }
      
      const rawQuantity = order.amount;
      console.log(`Exchange info for ${symbol}: stepSize=${exchangeInfo.stepSize}, tickSize=${exchangeInfo.tickSize}, minQuantity=${exchangeInfo.minQuantity}`);
      console.log(`Raw values: rawQuantity=${rawQuantity}, effectivePrice=${effectivePrice}`);
      
      // Format quantity and price as strings with proper precision
      const quantityStr = this.binanceHelper.formatQuantity(rawQuantity, exchangeInfo.stepSize);
      const priceStr = this.binanceHelper.formatPrice(effectivePrice, exchangeInfo.tickSize);
      
      // Convert to numbers for validation
      const quantity = parseFloat(quantityStr);
      const price = parseFloat(priceStr);
      
      console.log(`Formatted values: quantity=${quantityStr}, price=${priceStr}`);
      console.log(`Order details: quantity=${quantityStr}, price=${priceStr}, symbol=${symbol}, leverage=${order.leverage || 'none'}, marginType=${order.marginType || 'isolated'}`);
      
      // Validate minimum quantity
      if (quantity < exchangeInfo.minQuantity) {
        throw new Error(`Quantity ${quantityStr} is below minimum ${exchangeInfo.minQuantity} for ${symbol}`);
      }
      
      // Validate maximum quantity if specified
      if (exchangeInfo.maxQuantity && quantity > exchangeInfo.maxQuantity) {
        throw new Error(`Quantity ${quantityStr} exceeds maximum ${exchangeInfo.maxQuantity} for ${symbol}`);
      }
      
      // Set leverage and margin type before placing order
      const marginType = order.marginType || 'ISOLATED';
      await this.binanceHelper.setFuturesMarginType(apiKeys.apiKey, apiKeys.apiSecret, symbol, marginType);
      
      if (order.leverage) {
        await this.binanceHelper.setFuturesLeverage(apiKeys.apiKey, apiKeys.apiSecret, symbol, order.leverage);
      }
      
      // Place futures limit order
      const orderResult = await this.binanceHelper.placeFuturesLimitOrder(
        apiKeys.apiKey,
        apiKeys.apiSecret,
        symbol,
        'BUY', // Open long position
        quantityStr,
        priceStr,
        'LONG', // Position side
        order.marginType || 'ISOLATED', // Margin type: ISOLATED or CROSSED
        order.leverage // Leverage: 1-125
      );

      console.log(`Futures limit long executed successfully:`, orderResult);
      return orderResult;

    } catch (error) {
      console.error(`Error executing futures limit long for order ${order.id}:`, error);
      throw error;
    }
  }

  // Execute futures limit short
  async executeFuturesLimitShort(order, apiKeys, effectivePrice) {
    try {
      console.log(`Executing futures limit short for order ${order.id}`);
      
      const symbol = `${order.coin.toUpperCase()}USDT`;
      
      // Check if symbol is available for futures trading
      let exchangeInfo;
      try {
        exchangeInfo = await this.binanceHelper.getFuturesExchangeInfo(symbol);
      } catch (error) {
        console.error(`Symbol ${symbol} is not available for futures trading:`, error.message);
        if (this.mainWindow) {
          this.mainWindow.webContents.send('order-error', {
            orderId: order.id,
            coin: order.coin,
            error: `Symbol ${order.coin} is not available for futures trading on Binance`
          });
        }
        throw error;
      }
      
      const rawQuantity = order.amount;
      console.log(`Exchange info for ${symbol}: stepSize=${exchangeInfo.stepSize}, tickSize=${exchangeInfo.tickSize}, minQuantity=${exchangeInfo.minQuantity}`);
      console.log(`Raw values: rawQuantity=${rawQuantity}, effectivePrice=${effectivePrice}`);
      
      // Format quantity and price as strings with proper precision
      const quantityStr = this.binanceHelper.formatQuantity(rawQuantity, exchangeInfo.stepSize);
      const priceStr = this.binanceHelper.formatPrice(effectivePrice, exchangeInfo.tickSize);
      
      // Convert to numbers for validation
      const quantity = parseFloat(quantityStr);
      const price = parseFloat(priceStr);
      
      console.log(`Formatted values: quantity=${quantityStr}, price=${priceStr}`);
      console.log(`Order details: quantity=${quantityStr}, price=${priceStr}, symbol=${symbol}, leverage=${order.leverage || 'none'}, marginType=${order.marginType || 'isolated'}`);
      
      // Validate minimum quantity
      if (quantity < exchangeInfo.minQuantity) {
        throw new Error(`Quantity ${quantityStr} is below minimum ${exchangeInfo.minQuantity} for ${symbol}`);
      }
      
      // Validate maximum quantity if specified
      if (exchangeInfo.maxQuantity && quantity > exchangeInfo.maxQuantity) {
        throw new Error(`Quantity ${quantityStr} exceeds maximum ${exchangeInfo.maxQuantity} for ${symbol}`);
      }
      
      // Set leverage and margin type before placing order
      const marginType = order.marginType || 'ISOLATED';
      await this.binanceHelper.setFuturesMarginType(apiKeys.apiKey, apiKeys.apiSecret, symbol, marginType);
      
      if (order.leverage) {
        await this.binanceHelper.setFuturesLeverage(apiKeys.apiKey, apiKeys.apiSecret, symbol, order.leverage);
      }
      
      // Place futures limit order
      const orderResult = await this.binanceHelper.placeFuturesLimitOrder(
        apiKeys.apiKey,
        apiKeys.apiSecret,
        symbol,
        'SELL', // Open short position
        quantityStr,
        priceStr,
        'SHORT', // Position side
        order.marginType || 'ISOLATED', // Margin type: ISOLATED or CROSSED
        order.leverage // Leverage: 1-125
      );

      console.log(`Futures limit short executed successfully:`, orderResult);
      return orderResult;

    } catch (error) {
      console.error(`Error executing futures limit short for order ${order.id}:`, error);
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

module.exports = BinanceFuturesService;


// Binance Helper - Utility functions for Binance API
const fetch = require('node-fetch');
const crypto = require('crypto');

class BinanceHelper {
  constructor(API_BASE_URL = 'https://api.binance.com') {
    this.API_BASE_URL = API_BASE_URL;
    this.FUTURES_API_BASE_URL = 'https://fapi.binance.com';
  }

  // Get exchange info for symbol precision (Spot)
  async getExchangeInfo(symbol) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/v3/exchangeInfo`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const symbolInfo = data.symbols.find(s => s.symbol === symbol);
      
      if (!symbolInfo) {
        return { 
          stepSize: '0.001',
          tickSize: '0.01',
          minQuantity: 0.001,
          minNotional: 10
        }; // Default values
      }

      // Get filters
      const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
      const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
      const minNotionalFilter = symbolInfo.filters.find(f => f.filterType === 'MIN_NOTIONAL');
      
      return {
        stepSize: lotSizeFilter ? lotSizeFilter.stepSize : '0.001',
        tickSize: priceFilter ? priceFilter.tickSize : '0.01',
        minQuantity: lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : 0.001,
        minNotional: minNotionalFilter ? parseFloat(minNotionalFilter.minNotional) : 10
      };
    } catch (error) {
      console.error('Error getting exchange info:', error);
      return { 
        stepSize: '0.001',
        tickSize: '0.01',
        minQuantity: 0.001,
        minNotional: 10
      };
    }
  }

  // Get exchange info for futures symbol precision
  async getFuturesExchangeInfo(symbol) {
    try {
      const response = await fetch(`${this.FUTURES_API_BASE_URL}/fapi/v1/exchangeInfo`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const symbolInfo = data.symbols.find(s => s.symbol === symbol);
      
      if (!symbolInfo) {
        throw new Error(`Symbol ${symbol} is not available for futures trading on Binance`);
      }

      // Get filters
      const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
      const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
      
      console.log(`Raw filters for ${symbol}: priceFilter=${JSON.stringify(priceFilter)}, lotSizeFilter=${JSON.stringify(lotSizeFilter)}`);
      console.log(`All filters for ${symbol}:`, symbolInfo.filters);
      
      const stepSize = lotSizeFilter ? lotSizeFilter.stepSize : '0.001';
      const tickSize = priceFilter ? priceFilter.tickSize : '0.01';
      
      console.log(`Parsed values: stepSize="${stepSize}", tickSize="${tickSize}"`);
      
      return {
        stepSize: stepSize,
        tickSize: tickSize,
        minQuantity: lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : 0.001,
        maxQuantity: lotSizeFilter ? (lotSizeFilter.maxQty ? parseFloat(lotSizeFilter.maxQty) : null) : null,
        minNotional: 5 // Futures min notional is usually 5 USDT
      };
    } catch (error) {
      console.error('Error getting futures exchange info:', error);
      // Return default values on error so order can still proceed
      return { 
        stepSize: '0.001',
        tickSize: '0.01',
        minQuantity: 0.001,
        maxQuantity: null,
        minNotional: 5
      };
    }
  }

  // Round quantity according to LOT_SIZE step size
  roundQuantityToStepSize(quantity, stepSize) {
    const step = parseFloat(stepSize);
    // Floor to nearest step
    const rounded = Math.floor(quantity / step) * step;
    
    // Calculate the number of decimal places from step size
    let decimals = 0;
    if (stepSize.includes('.')) {
      const decimalPart = stepSize.split('.')[1];
      // Count all significant digits (not just non-zero)
      decimals = decimalPart.length;
    }
    
    // Format to the required decimal places and return as number
    return parseFloat(rounded.toFixed(decimals));
  }
  
  // Format quantity with proper precision for API calls
  formatQuantity(quantity, stepSize) {
    const step = parseFloat(stepSize);
    const rounded = Math.floor(quantity / step) * step;
    
    // Calculate max decimals based on step size
    let maxDecimals = 0;
    if (stepSize.includes('.')) {
      const decimalPart = stepSize.split('.')[1];
      maxDecimals = decimalPart.length;
    }
    // If stepSize is "1" or no decimal point, maxDecimals stays 0 (integers only)
    
    const formatted = rounded.toFixed(maxDecimals);
    console.log(`formatQuantity: quantity=${quantity}, stepSize=${stepSize}, maxDecimals=${maxDecimals}, rounded=${rounded}, formatted="${formatted}"`);
    
    // Format with exact decimal places (don't remove trailing zeros for API)
    return formatted;
  }

  // Round price according to PRICE_FILTER tick size
  roundPriceToTickSize(price, tickSize) {
    const tick = parseFloat(tickSize);
    // Floor to nearest tick
    const rounded = Math.floor(price / tick) * tick;
    
    // Calculate the number of decimal places from tick size
    let decimals = 0;
    if (tickSize.includes('.')) {
      const decimalPart = tickSize.split('.')[1];
      // Count all significant digits (not just non-zero)
      decimals = decimalPart.length;
    }
    
    // Format to the required decimal places and return as number
    return parseFloat(rounded.toFixed(decimals));
  }
  
  // Format price with proper precision for API calls
  formatPrice(price, tickSize) {
    const tick = parseFloat(tickSize);
    const rounded = Math.floor(price / tick) * tick;
    
    // Calculate max decimals based on tick size
    let maxDecimals = 0;
    if (tickSize.includes('.')) {
      const decimalPart = tickSize.split('.')[1];
      maxDecimals = decimalPart.length;
    }
    
    const formatted = rounded.toFixed(maxDecimals);
    console.log(`formatPrice: price=${price}, tickSize=${tickSize}, maxDecimals=${maxDecimals}, rounded=${rounded}, formatted="${formatted}"`);
    
    // Format with exact decimal places (don't remove trailing zeros for API)
    return formatted;
  }

  // Generate signature for signed requests
  generateSignature(queryString, secret) {
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
  }

  // Place limit order on Binance Spot
  async placeSpotLimitOrder(apiKey, apiSecret, symbol, side, quantity, price) {
    try {
      const timestamp = Date.now();
      
      console.log(`Order values: quantity=${quantity}, price=${price}`);
      
      const params = new URLSearchParams({
        symbol: symbol,
        side: side,
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity: quantity.toString(),
        price: price.toString(),
        timestamp: timestamp.toString(),
      });
      const queryString = params.toString();
      const signature = this.generateSignature(queryString, apiSecret);
      const url = `${this.API_BASE_URL}/api/v3/order?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error placing spot limit order:', error);
      throw error;
    }
  }

  // Place market order with quote order quantity (total USD to spend) on Spot
  async placeSpotMarketOrderWithQuote(apiKey, apiSecret, symbol, side, quoteOrderQty) {
    try {
      const timestamp = Date.now();
      const params = new URLSearchParams({
        symbol: symbol,
        side: side,
        type: 'MARKET',
        quoteOrderQty: quoteOrderQty.toString(), // Total USD to spend
        timestamp: timestamp.toString(),
      });

      const queryString = params.toString();
      const signature = this.generateSignature(queryString, apiSecret);

      const url = `${this.API_BASE_URL}/api/v3/order?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error placing spot market order with quote:', error);
      throw error;
    }
  }

  // Set leverage for futures symbol
  async setFuturesLeverage(apiKey, apiSecret, symbol, leverage) {
    if (!leverage || leverage < 1 || leverage > 125) {
      console.log(`Skipping leverage setup for ${symbol}: leverage=${leverage} is invalid`);
      return;
    }

    try {
      const timestamp = Date.now();
      
      const params = new URLSearchParams({
        symbol: symbol,
        leverage: leverage.toString(),
        timestamp: timestamp.toString(),
      });

      const queryString = params.toString();
      const signature = this.generateSignature(queryString, apiSecret);
      const url = `${this.FUTURES_API_BASE_URL}/fapi/v1/leverage?${queryString}&signature=${signature}`;
      
      console.log(`Setting leverage for ${symbol} to ${leverage}x`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const text = await response.text();
          console.error('Set leverage error response:', text);
          try {
            const errorData = JSON.parse(text);
            errorMessage += `, message: ${JSON.stringify(errorData)}`;
          } catch (e) {
            errorMessage += `, response: ${text.substring(0, 500)}`;
          }
        } catch (e) {
          console.error('Unable to read error response:', e);
          errorMessage += `, unable to read response: ${e.message}`;
        }
        // Don't throw error, just log warning
        console.warn(`Warning: Could not set leverage for ${symbol}: ${errorMessage}`);
      } else {
        const result = await response.json();
        console.log(`Leverage set successfully for ${symbol}:`, result);
      }
    } catch (error) {
      // Don't throw error, just log warning
      console.warn(`Warning: Error setting leverage for ${symbol}:`, error);
    }
  }

  // Set margin type for futures symbol (ISOLATED or CROSSED)
  async setFuturesMarginType(apiKey, apiSecret, symbol, marginType) {
    if (!marginType || (marginType !== 'ISOLATED' && marginType !== 'CROSSED')) {
      console.log(`Skipping margin type setup for ${symbol}: marginType=${marginType} is invalid`);
      return;
    }

    try {
      const timestamp = Date.now();
      
      const params = new URLSearchParams({
        symbol: symbol,
        marginType: marginType,
        timestamp: timestamp.toString(),
      });

      const queryString = params.toString();
      const signature = this.generateSignature(queryString, apiSecret);
      const url = `${this.FUTURES_API_BASE_URL}/fapi/v1/marginType?${queryString}&signature=${signature}`;
      
      console.log(`Setting margin type for ${symbol} to ${marginType}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const text = await response.text();
          console.error('Set margin type error response:', text);
          // Don't throw error, just log warning (margin type might already be set)
        } catch (e) {
          console.error('Unable to read error response:', e);
        }
        console.warn(`Warning: Could not set margin type for ${symbol}: ${errorMessage}`);
      } else {
        const result = await response.json();
        console.log(`Margin type set successfully for ${symbol}:`, result);
      }
    } catch (error) {
      // Don't throw error, just log warning (margin type might already be set)
      console.warn(`Warning: Error setting margin type for ${symbol}:`, error);
    }
  }

  // Place limit order on Binance Futures
  async placeFuturesLimitOrder(apiKey, apiSecret, symbol, side, quantity, price, positionSide = 'BOTH', marginType = 'ISOLATED', leverage = null) {
    try {
      const timestamp = Date.now();
      
      console.log(`Futures order values: quantity=${quantity}, price=${price}, positionSide=${positionSide}`);
      console.log(`String values being sent: quantity="${quantity.toString()}", price="${price.toString()}"`);
      console.log(`Quantity length: ${quantity.toString().length}, Price length: ${price.toString().length}`);
      
      const params = new URLSearchParams({
        symbol: symbol,
        side: side,
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity: quantity.toString(),
        price: price.toString(),
        // positionSide is only needed for HEDGE mode
        // For ONE-WAY mode (default), don't include it
        // positionSide: positionSide,
        timestamp: timestamp.toString(),
      });

      const queryString = params.toString();
      const signature = this.generateSignature(queryString, apiSecret);
      // Use futures API endpoint
      const url = `${this.FUTURES_API_BASE_URL}/fapi/v1/order?${queryString}&signature=${signature}`;
      
      console.log(`Futures order URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Get error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const text = await response.text();
          console.error('Futures order error response:', text);
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(text);
            errorMessage += `, message: ${JSON.stringify(errorData)}`;
          } catch (e) {
            errorMessage += `, response: ${text.substring(0, 500)}`;
          }
        } catch (e) {
          console.error('Unable to read error response:', e);
          errorMessage += `, unable to read response: ${e.message}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error placing futures limit order:', error);
      throw error;
    }
  }

  // Extract executed price from order result
  extractExecutedPrice(orderResult) {
    let executedPrice = null;
    
    if (orderResult.fills && orderResult.fills.length > 0) {
      // Market order - calculate average price from fills
      const totalQty = orderResult.fills.reduce((sum, fill) => sum + parseFloat(fill.qty), 0);
      const totalCost = orderResult.fills.reduce((sum, fill) => sum + parseFloat(fill.price) * parseFloat(fill.qty), 0);
      executedPrice = totalCost / totalQty;
    } else if (orderResult.price) {
      // Limit order - use the price from order
      executedPrice = parseFloat(orderResult.price);
    }
    
    return executedPrice;
  }
}

module.exports = BinanceHelper;


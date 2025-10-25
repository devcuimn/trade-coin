// Utility function để update coin prices từ external API
// Bạn có thể gọi function này từ bất kỳ đâu trong app

export async function updateCoinPricesFromAPI() {
  try {
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      return;
    }

    // Ví dụ: Call CoinGecko API để lấy prices
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,cardano,ripple,polkadot,litecoin,chainlink,bitcoin-cash,ethereum-classic,stellar,vechain,tron,eos,filecoin,tezos,neo,cosmos,uniswap&vs_currencies=usd');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Map CoinGecko IDs to symbols
    const coinGeckoMapping = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH', 
      'binancecoin': 'BNB',
      'solana': 'SOL',
      'cardano': 'ADA',
      'ripple': 'XRP',
      'polkadot': 'DOT',
      'litecoin': 'LTC',
      'chainlink': 'LINK',
      'bitcoin-cash': 'BCH',
      'ethereum-classic': 'ETC',
      'stellar': 'XLM',
      'vechain': 'VET',
      'tron': 'TRX',
      'eos': 'EOS',
      'filecoin': 'FIL',
      'tezos': 'XTZ',
      'neo': 'NEO',
      'cosmos': 'ATOM',
      'uniswap': 'UNI'
    };

    // Convert API response to our format
    const pricesData = {};
    for (const [coinGeckoId, priceInfo] of Object.entries(data)) {
      const symbol = coinGeckoMapping[coinGeckoId];
      if (symbol && priceInfo.usd) {
        pricesData[symbol] = priceInfo.usd;
      }
    }

    // Update prices in database
    const result = await window.electronAPI.updateAllCoinPrices(pricesData);
    
    if (result.success) {
      console.log(`Updated prices for ${result.data.updated} coins`);
      return result.data;
    } else {
      console.error('Failed to update coin prices:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error updating coin prices from API:', error);
    return null;
  }
}

// Function để update single coin price
export async function updateSingleCoinPrice(symbol: string, price: number) {
  try {
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      return;
    }

    const result = await window.electronAPI.updateCoinPrice(symbol, price);
    
    if (result.success) {
      console.log(`Updated price for ${symbol}: $${price}`);
      return result.data;
    } else {
      console.error(`Failed to update price for ${symbol}:`, result.error);
      return null;
    }
  } catch (error) {
    console.error(`Error updating price for ${symbol}:`, error);
    return null;
  }
}

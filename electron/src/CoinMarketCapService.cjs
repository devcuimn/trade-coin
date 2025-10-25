// CoinMarketCap Service cho Electron Backend
// Fetch và sync tất cả coins từ CoinMarketCap API

const fetch = require('node-fetch');

class CoinMarketCapService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.API_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';
    this.API_KEY = '2ffd658e-630f-437c-8a7e-c5b51dd58feb';
    
    console.log('CoinMarketCapService initialized');
  }

  // Generate icon URL from coin ID
  getIconUrl(coinId) {
    return `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinId}.png`;
  }

  // Fetch all coins from CoinMarketCap API
  async fetchAllCoins() {
    try {
      console.log('Fetching all coins from CoinMarketCap API...');
      
      const url = `${this.API_BASE_URL}/cryptocurrency/map?CMC_PRO_API_KEY=${this.API_KEY}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CMC_PRO_API_KEY': this.API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status.error_code !== 0) {
        throw new Error(`API error: ${data.status.error_message}`);
      }

      console.log(`Successfully fetched ${data.data.length} coins from CoinMarketCap`);
      return data.data;
      
    } catch (error) {
      console.error('Error fetching coins from CoinMarketCap:', error);
      throw error;
    }
  }

  // Save all coins to database
  async saveAllCoinsToDatabase() {
    try {
      console.log('Starting CoinMarketCap sync...');
      
      // Fetch all coins from API
      const coinsData = await this.fetchAllCoins();
      
      // Save to database
      const result = await this.databaseService.saveAllCoinsFromCMC(coinsData);
      
      console.log(`CoinMarketCap sync completed: ${result.saved} new coins saved, ${result.updated} coins updated`);
      return result;
      
    } catch (error) {
      console.error('Error in CoinMarketCap sync:', error);
      throw error;
    }
  }

  // Get all coins from database
  async getAllCoinsFromDatabase() {
    try {
      const coins = await this.databaseService.getAllCoinsFromCMC();
      console.log(`Retrieved ${coins.length} coins from database`);
      return coins;
    } catch (error) {
      console.error('Error getting coins from database:', error);
      throw error;
    }
  }

  // Clear all coins from database
  async clearAllCoinsFromDatabase() {
    try {
      const result = await this.databaseService.clearAllCoinsFromCMC();
      console.log(`Cleared ${result.changes} coins from database`);
      return result;
    } catch (error) {
      console.error('Error clearing coins from database:', error);
      throw error;
    }
  }

  // Get coins by symbol (search functionality)
  async searchCoinsBySymbol(symbol) {
    try {
      const allCoins = await this.databaseService.getAllCoinsFromCMC();
      const filteredCoins = allCoins.filter(coin => 
        coin.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
        coin.name.toLowerCase().includes(symbol.toLowerCase())
      );
      
      console.log(`Found ${filteredCoins.length} coins matching "${symbol}"`);
      return filteredCoins;
    } catch (error) {
      console.error('Error searching coins:', error);
      throw error;
    }
  }

  // Get top coins by rank
  async getTopCoinsByRank(limit = 100) {
    try {
      const allCoins = await this.databaseService.getAllCoinsFromCMC();
      const topCoins = allCoins
        .filter(coin => coin.rank && coin.rank <= limit)
        .sort((a, b) => a.rank - b.rank);
      
      console.log(`Retrieved top ${topCoins.length} coins by rank`);
      return topCoins;
    } catch (error) {
      console.error('Error getting top coins by rank:', error);
      throw error;
    }
  }

  // Get active coins only
  async getActiveCoins() {
    try {
      const allCoins = await this.databaseService.getAllCoinsFromCMC();
      const activeCoins = allCoins.filter(coin => coin.is_active === 1);
      
      console.log(`Retrieved ${activeCoins.length} active coins`);
      return activeCoins;
    } catch (error) {
      console.error('Error getting active coins:', error);
      throw error;
    }
  }

  // Get coins by platform
  async getCoinsByPlatform(platformName) {
    try {
      const allCoins = await this.databaseService.getAllCoinsFromCMC();
      const platformCoins = allCoins.filter(coin => 
        coin.platform && coin.platform.name.toLowerCase().includes(platformName.toLowerCase())
      );
      
      console.log(`Found ${platformCoins.length} coins on platform "${platformName}"`);
      return platformCoins;
    } catch (error) {
      console.error('Error getting coins by platform:', error);
      throw error;
    }
  }

  // Get service statistics
  async getServiceStats() {
    try {
      const allCoins = await this.databaseService.getAllCoinsFromCMC();
      
      const stats = {
        totalCoins: allCoins.length,
        activeCoins: allCoins.filter(coin => coin.is_active === 1).length,
        inactiveCoins: allCoins.filter(coin => coin.is_active === 0).length,
        coinsWithPlatform: allCoins.filter(coin => coin.platform).length,
        topRank: allCoins.reduce((min, coin) => coin.rank && coin.rank < min ? coin.rank : min, Infinity),
        platforms: [...new Set(allCoins.filter(coin => coin.platform).map(coin => coin.platform.name))],
        lastUpdated: allCoins.length > 0 ? Math.max(...allCoins.map(coin => new Date(coin.updatedAt).getTime())) : null
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting service stats:', error);
      throw error;
    }
  }
}

module.exports = CoinMarketCapService;

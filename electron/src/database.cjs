const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const crypto = require('crypto');

class DatabaseService {
  constructor() {
    this.db = null;
    // Lưu database vào thư mục userData để chạy được trong app.asar
    // (Không thể ghi vào đường dẫn nằm trong asar)
    const userDataDir = app.getPath('userData');
    this.dbPath = path.join(userDataDir, 'trading2.db');
    // Encryption key - trong production nên lưu trong environment variable
    this.encryptionKey = crypto.createHash('sha256').update('trading-app-dev').digest();
  }

  // Encrypt sensitive data
  encrypt(text) {
    try {
      const algorithm = 'aes-256-cbc';
      const iv = crypto.randomBytes(16);
      // Ensure key is 32 bytes
      const key = Buffer.from(this.encryptionKey).slice(0, 32);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedText) {
    try {
      const algorithm = 'aes-256-cbc';
      const parts = encryptedText.split(':');
      
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      // Ensure key is 32 bytes
      const key = Buffer.from(this.encryptionKey).slice(0, 32);
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Đảm bảo thư mục data tồn tại
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created data directory:', dataDir);
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', this.dbPath);
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createCoinsTable = `
        CREATE TABLE IF NOT EXISTS coins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          icon TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createFcoinsTable = `
        CREATE TABLE IF NOT EXISTS fcoins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          icon TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          coin TEXT NOT NULL,
          coinName TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'long', 'short')),
          price REAL NOT NULL,
          amount REAL NOT NULL,
          total REAL NOT NULL,
          leverage INTEGER,
          status TEXT NOT NULL CHECK (status IN ('matched', 'pending')),
          timestamp TEXT NOT NULL,
          mode TEXT NOT NULL CHECK (mode IN ('spot', 'futures')),
          orderType TEXT CHECK (orderType IN ('market', 'limit', 'stop-limit', 'stop-loss')),
          triggerPrice REAL,
          binanceOrderId TEXT,
          binanceOrderData TEXT,
          executedPrice REAL,
          executedAt TEXT
        )
      `;

      const createAllCoinsTable = `
        CREATE TABLE IF NOT EXISTS all_coins (
          id INTEGER PRIMARY KEY,
          rank INTEGER,
          name TEXT NOT NULL,
          symbol TEXT NOT NULL,
          slug TEXT NOT NULL,
          is_active INTEGER NOT NULL,
          status INTEGER NOT NULL,
          first_historical_data TEXT,
          last_historical_data TEXT,
          platform_id INTEGER,
          platform_name TEXT,
          platform_symbol TEXT,
          platform_slug TEXT,
          token_address TEXT,
          icon_url TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(id)
        )
      `;

      const createAccountsTable = `
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('spot', 'futures')),
          balance REAL NOT NULL DEFAULT 0,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createApiKeysTable = `
        CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          apiKey TEXT NOT NULL,
          apiSecret TEXT NOT NULL,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createAppKeyTable = `
        CREATE TABLE IF NOT EXISTS app_key (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          appKey TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createTelegramSettingsTable = `
        CREATE TABLE IF NOT EXISTS telegram_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          botToken TEXT NOT NULL,
          chatId TEXT NOT NULL,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createCoinsTable, (err) => {
        if (err) {
          console.error('Error creating coins table:', err);
          reject(err);
          return;
        }
        console.log('Coins table created successfully');
        
        this.db.run(createFcoinsTable, (err) => {
          if (err) {
            console.error('Error creating fcoins table:', err);
            reject(err);
            return;
          }
          console.log('Fcoins table created successfully');
          
          this.db.run(createOrdersTable, (err) => {
            if (err) {
              console.error('Error creating orders table:', err);
              reject(err);
              return;
            }
            console.log('Orders table created successfully');
            
            // Add new columns if they don't exist
            this.addBinanceOrderColumns();
            
            this.db.run(createAllCoinsTable, (err) => {
              if (err) {
                console.error('Error creating all_coins table:', err);
                reject(err);
                return;
              }
              console.log('All_coins table created successfully');
              
              this.db.run(createAccountsTable, (err) => {
                if (err) {
                  console.error('Error creating accounts table:', err);
                  reject(err);
                  return;
                }
                console.log('Accounts table created successfully');
                
              this.db.run(createApiKeysTable, (err) => {
                  if (err) {
                    console.error('Error creating api_keys table:', err);
                    reject(err);
                  } else {
                  console.log('API keys table created successfully');
                    // Initialize with default balances if empty
                  this.db.run(createAppKeyTable, (err) => {
                    if (err) {
                      console.error('Error creating app_key table:', err);
                      reject(err);
                      return;
                    }
                    console.log('app_key table created successfully');
                    
                    this.db.run(createTelegramSettingsTable, (err) => {
                      if (err) {
                        console.error('Error creating telegram_settings table:', err);
                        reject(err);
                        return;
                      }
                      console.log('telegram_settings table created successfully');
                      this.initializeAccounts().then(resolve).catch(reject);
                    });
                  });
                  }
                });
              });
            });
          });
        });
      });
    });
  }

  // Coins CRUD operations
  async getAllCoins() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM coins ORDER BY symbol ASC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching coins:', err);
          reject(err);
        } else {
          const coins = rows.map(row => ({
            symbol: row.symbol,
            name: row.name,
            price: parseFloat(row.price),
            icon: row.icon || row.symbol.slice(0, 2),
          }));
          resolve(coins);
        }
      });
    });
  }

  async saveCoin(coin) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO coins (symbol, name, price, icon, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const values = [
        coin.symbol,
        coin.name,
        coin.price,
        coin.icon || null
      ];

      this.db.run(sql, values, function(err) {
        if (err) {
          console.error('Error saving coin:', err);
          reject(err);
        } else {
          console.log(`Coin saved: ${coin.symbol}`);
          resolve({ symbol: coin.symbol, changes: this.changes });
        }
      });
    });
  }

  async updateCoinPrice(symbol, price) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE coins SET price = ?, updatedAt = CURRENT_TIMESTAMP WHERE symbol = ?';
      
      this.db.run(sql, [price, symbol], function(err) {
        if (err) {
          console.error('Error updating coin price:', err);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async deleteCoin(symbol) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM coins WHERE symbol = ?';
      
      this.db.run(sql, [symbol], function(err) {
        if (err) {
          console.error('Error deleting coin:', err);
          reject(err);
        } else {
          console.log(`Coin deleted: ${symbol}`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Fcoins CRUD operations
  async getAllFcoins() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM fcoins ORDER BY symbol ASC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching fcoins:', err);
          reject(err);
        } else {
          const fcoins = rows.map(row => ({
            symbol: row.symbol,
            name: row.name,
            price: parseFloat(row.price),
            icon: row.icon || row.symbol.slice(0, 2),
          }));
          resolve(fcoins);
        }
      });
    });
  }

  async saveFcoin(coin) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO fcoins (symbol, name, price, icon, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const values = [
        coin.symbol,
        coin.name,
        coin.price,
        coin.icon || null
      ];

      this.db.run(sql, values, function(err) {
        if (err) {
          console.error('Error saving fcoin:', err);
          reject(err);
        } else {
          console.log(`Fcoin saved: ${coin.symbol}`);
          resolve({ symbol: coin.symbol, changes: this.changes });
        }
      });
    });
  }

  async updateFcoinPrice(symbol, price) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE fcoins SET price = ?, updatedAt = CURRENT_TIMESTAMP WHERE symbol = ?';
      
      this.db.run(sql, [price, symbol], function(err) {
        if (err) {
          console.error('Error updating fcoin price:', err);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async deleteFcoin(symbol) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM fcoins WHERE symbol = ?';
      
      this.db.run(sql, [symbol], function(err) {
        if (err) {
          console.error('Error deleting fcoin:', err);
          reject(err);
        } else {
          console.log(`Fcoin deleted: ${symbol}`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async importCoinsFromJSON(coinsData) {
    return new Promise(async (resolve, reject) => {
      try {
        for (const coin of coinsData) {
          await this.saveCoin(coin);
        }
        console.log(`Imported ${coinsData.length} coins successfully`);
        resolve({ imported: coinsData.length });
      } catch (error) {
        console.error('Error importing coins:', error);
        reject(error);
      }
    });
  }

  async saveOrder(order) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO orders (
          id, coin, coinName, type, price, amount, total, leverage,
          status, timestamp, mode, orderType, triggerPrice
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        order.id,
        order.coin.toLowerCase(),
        order.coinName,
        order.type,
        order.price,
        order.amount,
        order.total,
        order.leverage || null,
        order.status,
        order.timestamp.toISOString(),
        order.mode,
        order.orderType || null,
        order.triggerPrice || null
      ];

      this.db.run(sql, values, function(err) {
        if (err) {
          console.error('Error saving order:', err);
          reject(err);
        } else {
          console.log(`Order saved with ID: ${order.id}`);
          resolve({ id: order.id, changes: this.changes });
        }
      });
    });
  }

  async getAllOrders() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM orders ORDER BY timestamp DESC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching orders:', err);
          reject(err);
        } else {
          const orders = rows.map(row => ({
            ...row,
            timestamp: new Date(row.timestamp),
            price: parseFloat(row.price),
            amount: parseFloat(row.amount),
            total: parseFloat(row.total),
            leverage: row.leverage ? parseInt(row.leverage) : undefined,
            triggerPrice: row.triggerPrice ? parseFloat(row.triggerPrice) : undefined,
            executedPrice: row.executedPrice ? parseFloat(row.executedPrice) : undefined
          }));
          resolve(orders);
        }
      });
    });
  }

  async deleteOrder(orderId) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM orders WHERE id = ?';
      
      this.db.run(sql, [orderId], function(err) {
        if (err) {
          console.error('Error deleting order:', err);
          reject(err);
        } else {
          console.log(`Order deleted: ${orderId}`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async clearMatchedOrders() {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM orders WHERE status = ?';
      
      this.db.run(sql, ['matched'], function(err) {
        if (err) {
          console.error('Error clearing matched orders:', err);
          reject(err);
        } else {
          console.log(`Cleared ${this.changes} matched orders`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async clearAllOrders() {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM orders';
      
      this.db.run(sql, [], function(err) {
        if (err) {
          console.error('Error clearing all orders:', err);
          reject(err);
        } else {
          console.log(`Cleared ${this.changes} orders`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async updateOrderStatus(orderId, status) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE orders SET status = ? WHERE id = ?';
      
      this.db.run(sql, [status, orderId], function(err) {
        if (err) {
          console.error('Error updating order status:', err);
          reject(err);
        } else {
          console.log(`Order status updated: ${orderId} -> ${status}`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async updateAllCoinPrices(pricesData) {
    return new Promise(async (resolve, reject) => {
      try {
        let updatedCount = 0;
        for (const [symbol, price] of Object.entries(pricesData)) {
          try {
            await this.updateCoinPrice(symbol, price);
            updatedCount++;
          } catch (error) {
            console.error(`Error updating price for ${symbol}:`, error);
          }
        }
        console.log(`Updated prices for ${updatedCount} coins`);
        resolve({ updated: updatedCount });
      } catch (error) {
        console.error('Error updating all coin prices:', error);
        reject(error);
      }
    });
  }

  // All Coins CRUD operations (CoinMarketCap data)
  async getAllCoinsFromCMC() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM all_coins ORDER BY rank ASC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching all coins:', err);
          reject(err);
        } else {
          const coins = rows.map(row => ({
            id: row.id,
            rank: row.rank,
            name: row.name,
            symbol: row.symbol,
            slug: row.slug,
            is_active: row.is_active,
            status: row.status,
            first_historical_data: row.first_historical_data,
            last_historical_data: row.last_historical_data,
            platform: row.platform_id ? {
              id: row.platform_id,
              name: row.platform_name,
              symbol: row.platform_symbol,
              slug: row.platform_slug,
              token_address: row.token_address
            } : null,
            icon_url: row.icon_url,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          }));
          resolve(coins);
        }
      });
    });
  }

  async saveAllCoinsFromCMC(coinsData) {
    return new Promise(async (resolve, reject) => {
      try {
        let savedCount = 0;
        let updatedCount = 0;
        
        for (const coin of coinsData) {
          try {
            // Check if coin already exists
            const existingCoin = await this.getCoinById(coin.id);
            
            if (existingCoin) {
              // Update existing coin
              await this.updateAllCoinFromCMC(coin);
              updatedCount++;
            } else {
              // Insert new coin
              await this.insertAllCoinFromCMC(coin);
              savedCount++;
            }
          } catch (error) {
            console.error(`Error processing coin ${coin.symbol} (ID: ${coin.id}):`, error);
          }
        }
        
        console.log(`Saved ${savedCount} new coins and updated ${updatedCount} existing coins`);
        resolve({ saved: savedCount, updated: updatedCount });
      } catch (error) {
        console.error('Error saving all coins from CMC:', error);
        reject(error);
      }
    });
  }

  async getCoinById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM all_coins WHERE id = ?';
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('Error fetching coin by ID:', err);
          reject(err);
        } else {
          if (row) {
            resolve({
              id: row.id,
              rank: row.rank,
              name: row.name,
              symbol: row.symbol,
              slug: row.slug,
              is_active: row.is_active,
              status: row.status,
              first_historical_data: row.first_historical_data,
              last_historical_data: row.last_historical_data,
              platform: row.platform_id ? {
                id: row.platform_id,
                name: row.platform_name,
                symbol: row.platform_symbol,
                slug: row.platform_slug,
                token_address: row.token_address
              } : null,
              icon_url: row.icon_url,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  async insertAllCoinFromCMC(coin) {
    return new Promise((resolve, reject) => {
      // Generate icon URL from coin ID
      const iconUrl = coin.id ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png` : null;
      
      const sql = `
        INSERT INTO all_coins (
          id, rank, name, symbol, slug, is_active, status,
          first_historical_data, last_historical_data,
          platform_id, platform_name, platform_symbol, platform_slug, token_address, icon_url,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const values = [
        coin.id,
        coin.rank,
        coin.name,
        coin.symbol,
        coin.slug,
        coin.is_active,
        coin.status,
        coin.first_historical_data,
        coin.last_historical_data,
        coin.platform ? coin.platform.id : null,
        coin.platform ? coin.platform.name : null,
        coin.platform ? coin.platform.symbol : null,
        coin.platform ? coin.platform.slug : null,
        coin.platform ? coin.platform.token_address : null,
        iconUrl
      ];

      this.db.run(sql, values, function(err) {
        if (err) {
          console.error('Error inserting coin:', err);
          reject(err);
        } else {
          console.log(`Coin inserted: ${coin.symbol} (ID: ${coin.id})`);
          resolve({ id: coin.id, changes: this.changes });
        }
      });
    });
  }

  async updateAllCoinFromCMC(coin) {
    return new Promise((resolve, reject) => {
      // Generate icon URL from coin ID
      const iconUrl = coin.id ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png` : null;
      
      const sql = `
        UPDATE all_coins SET 
          rank = ?, name = ?, symbol = ?, slug = ?, is_active = ?, status = ?,
          first_historical_data = ?, last_historical_data = ?,
          platform_id = ?, platform_name = ?, platform_symbol = ?, platform_slug = ?, token_address = ?, icon_url = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const values = [
        coin.rank,
        coin.name,
        coin.symbol,
        coin.slug,
        coin.is_active,
        coin.status,
        coin.first_historical_data,
        coin.last_historical_data,
        coin.platform ? coin.platform.id : null,
        coin.platform ? coin.platform.name : null,
        coin.platform ? coin.platform.symbol : null,
        coin.platform ? coin.platform.slug : null,
        coin.platform ? coin.platform.token_address : null,
        iconUrl,
        coin.id
      ];

      this.db.run(sql, values, function(err) {
        if (err) {
          console.error('Error updating coin:', err);
          reject(err);
        } else {
          console.log(`Coin updated: ${coin.symbol} (ID: ${coin.id})`);
          resolve({ id: coin.id, changes: this.changes });
        }
      });
    });
  }

  async clearAllCoinsFromCMC() {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM all_coins';
      
      this.db.run(sql, [], function(err) {
        if (err) {
          console.error('Error clearing all coins:', err);
          reject(err);
        } else {
          console.log(`Cleared ${this.changes} coins from all_coins table`);
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Accounts methods
  async initializeAccounts() {
    return new Promise((resolve, reject) => {
      // Check if accounts already exist
      const checkSql = 'SELECT COUNT(*) as count FROM accounts';
      
      this.db.get(checkSql, [], (err, row) => {
        if (err) {
          console.error('Error checking accounts:', err);
          reject(err);
          return;
        }

        // If no accounts exist, create default ones
        if (row.count === 0) {
          const insertSpot = 'INSERT INTO accounts (type, balance) VALUES (?, ?)';
          const insertFutures = 'INSERT INTO accounts (type, balance) VALUES (?, ?)';
          
          this.db.run(insertSpot, ['spot', 50000], (err) => {
            if (err) {
              console.error('Error creating spot account:', err);
              reject(err);
              return;
            }
            
            this.db.run(insertFutures, ['futures', 25000], (err) => {
              if (err) {
                console.error('Error creating futures account:', err);
                reject(err);
              } else {
                console.log('Default accounts created successfully');
                resolve();
              }
            });
          });
        } else {
          resolve();
        }
      });
    });
  }

  async getAccount(type) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM accounts WHERE type = ?';
      
      this.db.get(sql, [type], (err, row) => {
        if (err) {
          console.error('Error fetching account:', err);
          reject(err);
        } else {
          if (row) {
            resolve({
              type: row.type,
              balance: parseFloat(row.balance),
              updatedAt: row.updatedAt
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  async getAllAccounts() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM accounts';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching accounts:', err);
          reject(err);
        } else {
          const accounts = rows.map(row => ({
            type: row.type,
            balance: parseFloat(row.balance),
            updatedAt: row.updatedAt
          }));
          resolve(accounts);
        }
      });
    });
  }

  async updateAccountBalance(type, balance) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE accounts SET balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE type = ?';
      
      this.db.run(sql, [balance, type], function(err) {
        if (err) {
          console.error('Error updating account balance:', err);
          reject(err);
        } else {
          console.log(`Account ${type} balance updated to ${balance}`);
          resolve({ type, balance, changes: this.changes });
        }
      });
    });
  }

  async getApiKeys() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM api_keys ORDER BY id DESC LIMIT 1';
      
      this.db.get(sql, [], (err, row) => {
        if (err) {
          console.error('Error fetching API keys:', err);
          reject(err);
        } else {
          if (row) {
            // Decrypt the API secret
            let decryptedSecret = '';
            try {
              decryptedSecret = this.decrypt(row.apiSecret);
            } catch (error) {
              console.error('Error decrypting API secret:', error);
              // If decryption fails, return empty string
              decryptedSecret = '';
            }
            
            // Also fetch latest appKey from app_key table if present
            this.db.get('SELECT appKey, createdAt FROM app_key ORDER BY id DESC LIMIT 1', [], (appErr, appRow) => {
              if (appErr) {
                console.error('Error fetching app_key:', appErr);
              }
              resolve({
                apiKey: row.apiKey,
                apiSecret: decryptedSecret,
                appKey: (appRow && appRow.appKey) || row.appKey || '',
                appKeyCreatedAt: appRow ? appRow.createdAt : undefined,
                updatedAt: row.updatedAt
              });
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  async updateApiKeys(apiKey, apiSecret) {
    return new Promise((resolve, reject) => {
      // Check if API keys exist
      const checkSql = 'SELECT COUNT(*) as count FROM api_keys';
      
      this.db.get(checkSql, [], (err, row) => {
        if (err) {
          console.error('Error checking API keys:', err);
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Encrypt API secret before saving
          const encryptedSecret = this.encrypt(apiSecret);
          // Insert new API keys
          const insertSql = 'INSERT INTO api_keys (apiKey, apiSecret) VALUES (?, ?)';
          this.db.run(insertSql, [apiKey, encryptedSecret], function(err) {
            if (err) {
              console.error('Error inserting API keys:', err);
              reject(err);
            } else {
              console.log('API keys inserted successfully (encrypted)');
              resolve({ apiKey, apiSecret, changes: this.changes });
            }
          });
        } else {
          // Encrypt API secret before saving
          const encryptedSecret = this.encrypt(apiSecret);
          
          // Update existing API keys
          const updateSql = 'UPDATE api_keys SET apiKey = ?, apiSecret = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM api_keys ORDER BY id DESC LIMIT 1)';
          this.db.run(updateSql, [apiKey, encryptedSecret], function(err) {
            if (err) {
              console.error('Error updating API keys:', err);
              reject(err);
            } else {
              console.log('API keys updated successfully (encrypted)');
              resolve({ apiKey, apiSecret, changes: this.changes });
            }
          });
        }
      });
    });
  }

  async upsertAppKey(appKey) {
    return new Promise((resolve, reject) => {
      console.log('upsertAppKey called with:', appKey);
      if (!appKey) {
        resolve({ changes: 0 });
        return;
      }
      const insertSql = 'INSERT INTO app_key (appKey, createdAt) VALUES (?, CURRENT_TIMESTAMP)';
      this.db.run(insertSql, [appKey], function(err) {
        if (err) {
          console.error('Error inserting app_key:', err);
          reject(err);
        } else {
          console.log('app_key inserted');
          resolve({ changes: 1 });
        }
      });
    });
  }

  // Update latest app_key if exists, otherwise insert new
  async setAppKey(appKey) {
    return new Promise((resolve, reject) => {
      if (!appKey) {
        resolve({ changes: 0 });
        return;
      }
      console.log('setAppKey called with:', appKey);
      // Try update latest row; if no row updated, insert new
      const updateSql = 'UPDATE app_key SET appKey = ? WHERE id = (SELECT id FROM app_key ORDER BY id DESC LIMIT 1)';
      this.db.run(updateSql, [appKey], (updateErr) => {
        if (updateErr) {
          console.error('Error updating app_key:', updateErr);
          reject(updateErr);
          return;
        }
        // Check if any rows were updated using changes()
        this.db.get('SELECT changes() as cnt', [], (cntErr, cntRow) => {
          if (cntErr) {
            console.error('Error checking changes:', cntErr);
            reject(cntErr);
            return;
          }
          const updateCount = cntRow ? cntRow.cnt : 0;
          if (updateCount > 0) {
            console.log('app_key updated, count:', updateCount);
            resolve({ changes: updateCount });
            return;
          }
          // No rows updated, insert new one
          const insertSql = 'INSERT INTO app_key (appKey, createdAt) VALUES (?, CURRENT_TIMESTAMP)';
          this.db.run(insertSql, [appKey], (insertErr) => {
            if (insertErr) {
              console.error('Error inserting app_key:', insertErr);
              reject(insertErr);
            } else {
              console.log('app_key inserted');
              resolve({ changes: 1 });
            }
          });
        });
      });
    });
  }

  async getTelegramSettings() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM telegram_settings ORDER BY id DESC LIMIT 1';
      this.db.get(sql, [], (err, row) => {
        if (err) {
          console.error('Error fetching Telegram settings:', err);
          reject(err);
        } else {
          if (row) {
            resolve({
              botToken: row.botToken,
              chatId: row.chatId,
              updatedAt: row.updatedAt
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  async updateTelegramSettings(botToken, chatId) {
    return new Promise((resolve, reject) => {
      // Check if settings exist
      const checkSql = 'SELECT COUNT(*) as count FROM telegram_settings';
      this.db.get(checkSql, [], (err, row) => {
        if (err) {
          console.error('Error checking Telegram settings:', err);
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Insert new settings
          const insertSql = 'INSERT INTO telegram_settings (botToken, chatId) VALUES (?, ?)';
          this.db.run(insertSql, [botToken, chatId], function(insertErr) {
            if (insertErr) {
              console.error('Error inserting Telegram settings:', insertErr);
              reject(insertErr);
            } else {
              console.log('Telegram settings inserted successfully');
              resolve({ botToken, chatId, changes: this.changes });
            }
          });
        } else {
          // Update existing settings
          const updateSql = 'UPDATE telegram_settings SET botToken = ?, chatId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM telegram_settings ORDER BY id DESC LIMIT 1)';
          this.db.run(updateSql, [botToken, chatId], function(updateErr) {
            if (updateErr) {
              console.error('Error updating Telegram settings:', updateErr);
              reject(updateErr);
            } else {
              console.log('Telegram settings updated successfully');
              resolve({ botToken, chatId, changes: this.changes });
            }
          });
        }
      });
    });
  }

  

  // Add Binance order columns to existing orders table
  addBinanceOrderColumns() {
    try {
      // Check if columns exist and add them if not
      this.db.run('ALTER TABLE orders ADD COLUMN binanceOrderId TEXT', (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding binanceOrderId column:', err);
        }
      });
      
      this.db.run('ALTER TABLE orders ADD COLUMN binanceOrderData TEXT', (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding binanceOrderData column:', err);
        }
      });
      
      this.db.run('ALTER TABLE orders ADD COLUMN executedPrice REAL', (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding executedPrice column:', err);
        }
      });
      
      this.db.run('ALTER TABLE orders ADD COLUMN executedAt TEXT', (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding executedAt column:', err);
        }
      });
    } catch (error) {
      console.error('Error adding Binance order columns:', error);
    }
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseService;

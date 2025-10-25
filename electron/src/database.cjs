const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DatabaseService {
  constructor() {
    this.db = null;
    // Lưu database vào thư mục electron/data
    this.dbPath = path.join(__dirname, '../data/trading.db');
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
          triggerPrice REAL
        )
      `;

      this.db.run(createCoinsTable, (err) => {
        if (err) {
          console.error('Error creating coins table:', err);
          reject(err);
          return;
        }
        console.log('Coins table created successfully');
        
        this.db.run(createOrdersTable, (err) => {
          if (err) {
            console.error('Error creating orders table:', err);
            reject(err);
          } else {
            console.log('Orders table created successfully');
            resolve();
          }
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
            icon: row.icon || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`
          }));
          resolve(coins);
        }
      });
    });
  }

  async saveCoin(coin) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO coins (symbol, name, price, icon, updatedAt)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
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
          console.log(`Coin price updated: ${symbol} -> ${price}`);
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
        order.coin,
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
            triggerPrice: row.triggerPrice ? parseFloat(row.triggerPrice) : undefined
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

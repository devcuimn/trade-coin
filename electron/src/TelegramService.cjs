// Telegram Service - Send notifications via Telegram Bot API

const https = require('https');

class TelegramService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  async sendMessage(botToken, chatId, message) {
    return new Promise((resolve, reject) => {
      if (!botToken || !chatId || !message) {
        reject(new Error('Missing required parameters: botToken, chatId, or message'));
        return;
      }

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const postData = JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.ok) {
              resolve(response);
            } else {
              reject(new Error(response.description || 'Telegram API error'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  async notifyOrderMatched(order, binanceOrderResult) {
    try {
      const settings = await this.databaseService.getTelegramSettings();
      
      if (!settings || !settings.botToken || !settings.chatId) {
        console.log('Telegram settings not configured, skipping notification');
        return;
      }

      const orderType = order.type === 'buy' ? 'BUY' : order.type === 'long' ? 'LONG' : order.type === 'short' ? 'SHORT' : 'SELL';
      const mode = order.mode === 'spot' ? 'SPOT' : 'FUTURES';
      const executedPrice = binanceOrderResult?.price || order.executedPrice || order.price;
      const amount = binanceOrderResult?.executedQty || order.amount;
      const total = executedPrice * amount;

      let message = `🎯 <b>Order Matched!</b>\n\n`;
      message += `📊 <b>Mode:</b> ${mode}\n`;
      message += `🪙 <b>Coin:</b> ${order.coin.toUpperCase()}\n`;
      message += `📈 <b>Type:</b> ${orderType}\n`;
      message += `💰 <b>Price:</b> $${executedPrice.toFixed(8)}\n`;
      message += `📦 <b>Amount:</b> ${amount}\n`;
      message += `💵 <b>Total:</b> $${total.toFixed(2)}\n`;
      
      if (order.leverage && order.leverage > 1) {
        message += `⚡ <b>Leverage:</b> ${order.leverage}x\n`;
      }

      if (binanceOrderResult?.orderId) {
        message += `\n✅ <b>Binance Order ID:</b> ${binanceOrderResult.orderId}`;
      }

      await this.sendMessage(settings.botToken, settings.chatId, message);
      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
      // Don't throw error, just log it so order matching can continue
    }
  }
}

module.exports = TelegramService;


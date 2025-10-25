import { useState, useEffect } from 'react';
import { TradingHeader } from './TradingHeader';
import { TradingModal } from './TradingModal';
import { OrderList } from './OrderList';
import { TrendingUpIcon } from 'lucide-react';

interface Order {
  id: string;
  coin: string;
  coinName: string;
  type: 'buy' | 'sell' | 'long' | 'short';
  price: number;
  amount: number;
  total: number;
  leverage?: number;
  status: 'matched' | 'pending';
  timestamp: Date;
  mode: 'spot' | 'futures';
  orderType?: 'market' | 'limit' | 'stop-limit' | 'stop-loss';
  triggerPrice?: number;
}

declare global {
  interface Window {
    electronAPI: {
      loadCryptoData: () => Promise<{coins: Array<{symbol: string, name: string, price: number, icon?: string}>}>;
      saveCryptoData: (data: any) => Promise<{success: boolean, error?: string}>;
      saveOrder: (order: Order) => Promise<{success: boolean, data?: any, error?: string}>;
      getAllOrders: () => Promise<{success: boolean, data?: Order[], error?: string}>;
      deleteOrder: (orderId: string) => Promise<{success: boolean, data?: any, error?: string}>;
      clearMatchedOrders: () => Promise<{success: boolean, data?: any, error?: string}>;
      getAllCoins: () => Promise<{success: boolean, data?: {symbol: string, name: string, price: number, icon: string}[], error?: string}>;
      saveCoin: (coin: {symbol: string, name: string, price: number, icon: string}) => Promise<{success: boolean, data?: any, error?: string}>;
      updateCoinPrice: (symbol: string, price: number) => Promise<{success: boolean, data?: any, error?: string}>;
      updateAllCoinPrices: (pricesData: Record<string, number>) => Promise<{success: boolean, data?: any, error?: string}>;
      manualSyncCoins: () => Promise<{success: boolean, message?: string, error?: string}>;
      getSyncStatus: () => Promise<{success: boolean, data?: {isRunning: boolean, nextSync: Date | null}, error?: string}>;
    };
  }
}
export function TradingInterface() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [coins, setCoins] = useState<{symbol: string, name: string, price: number, icon: string}[]>([]);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [isFuturesModalOpen, setIsFuturesModalOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<{symbol: string, name: string, price: number, icon: string} | null>(null);
  
  const accountName = 'Trading Account';
  const spotBalance = 50000;
  const futuresBalance = 25000;

  // Load coins data from database
  useEffect(() => {
    const loadCoins = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getAllCoins();
          if (result.success && result.data) {
            setCoins(result.data);
            if (result.data.length > 0) {
              setSelectedCoin(result.data[0]);
            }
          } else {
            console.error('Failed to load coins:', result.error);
          }
        }
      } catch (error) {
        console.error('Error loading coins data:', error);
      }
    };
    loadCoins();
  }, []);

  // Load orders from database
  useEffect(() => {
    const loadOrders = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getAllOrders();
          if (result.success && result.data) {
            setOrders(result.data);
          }
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      }
    };
    loadOrders();
  }, []);
  
  // Manual sync trigger
  const handleManualSync = async () => {
    try {
      const result = await window.electronAPI.manualSyncCoins();
      if (result.success) {
        console.log('Manual sync completed:', result.message);
        // Reload coins after sync
        const coinsResult = await window.electronAPI.getAllCoins();
        if (coinsResult.success && coinsResult.data) {
          setCoins(coinsResult.data);
        }
      } else {
        console.error('Manual sync failed:', result.error);
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
    }
  };

  const formatAmount = (amount: number, coinSymbol: string) => {
    const decimals = coinSymbol === 'BTC' ? 4 : 2;
    const formatted = amount.toFixed(decimals);
    return parseFloat(formatted).toString();
  };

  // Get coin icon
  const getCoinIcon = (coinSymbol: string) => {
    const coin = coins.find(c => c.symbol === coinSymbol);
    return coin?.icon || coinSymbol.slice(0, 2);
  };

  const getCurrentPrice = (coinSymbol: string) => {
    const coin = coins.find(c => c.symbol === coinSymbol);
    return coin ? coin.price : 0;
  };

  const calculatePnL = (order: Order) => {
    const currentPrice = getCurrentPrice(order.coin);
    const purchasePrice = order.price;
    const amount = order.amount;
    
    if (order.type === 'buy' || order.type === 'long') {
      // Long position: profit when current price > purchase price
      return (currentPrice - purchasePrice) * amount;
    } else if (order.type === 'short') {
      // Short position: profit when current price < purchase price
      return (purchasePrice - currentPrice) * amount;
    }
    return 0;
  };

  const handleOrderPlaced = async (newOrder: Order) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveOrder(newOrder);
        if (result.success) {
          setOrders([newOrder, ...orders]);
        } else {
          console.error('Failed to save order:', result.error);
          alert('Failed to save order. Please try again.');
        }
      } else {
        // Fallback to local state if electronAPI not available
        setOrders([newOrder, ...orders]);
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error saving order. Please try again.');
    }
  };

  const handleClearMatchedOrders = async () => {
    const matchedCount = orders.filter(order => order.status === 'matched').length;
    if (matchedCount === 0) {
      alert('No matched orders to clear.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to clear ${matchedCount} matched order(s)? This action cannot be undone.`)) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.clearMatchedOrders();
          if (result.success) {
            setOrders(orders.filter(order => order.status !== 'matched'));
          } else {
            console.error('Failed to clear matched orders:', result.error);
            alert('Failed to clear matched orders. Please try again.');
          }
        } else {
          // Fallback to local state
      setOrders(orders.filter(order => order.status !== 'matched'));
        }
      } catch (error) {
        console.error('Error clearing matched orders:', error);
        alert('Error clearing matched orders. Please try again.');
      }
    }
  };

  const handleClearAllOrders = async () => {
    if (orders.length === 0) {
      alert('No orders to clear.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to clear ALL ${orders.length} order(s)? This action cannot be undone.`)) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.clearAllOrders();
          if (result.success) {
            setOrders([]);
            console.log('All orders cleared successfully');
          } else {
            console.error('Failed to clear all orders:', result.error);
            alert('Failed to clear all orders. Please try again.');
          }
        } else {
          // Fallback to local state
          setOrders([]);
        }
      } catch (error) {
        console.error('Error clearing all orders:', error);
        alert('Error clearing all orders. Please try again.');
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.deleteOrder(orderId);
          if (result.success) {
            setOrders(orders.filter(order => order.id !== orderId));
          } else {
            console.error('Failed to delete order:', result.error);
            alert('Failed to delete order. Please try again.');
          }
        } else {
          // Fallback to local state
          setOrders(orders.filter(order => order.id !== orderId));
        }
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order. Please try again.');
      }
    }
  };
    
    return (
    <div className="w-full min-h-screen gradient-bg text-white p-6 animate-fadeInUp">
      {/* Header with Account Info */}
      <TradingHeader 
        accountName={accountName}
        spotBalance={spotBalance}
        futuresBalance={futuresBalance}
        onManualSync={handleManualSync}
      />
      
      <div className="max-w-6xl mx-auto">
        {/* Order History with Trading Buttons */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-500/10 rounded">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-primary">Order History</h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Trading Buttons */}
              <button 
                onClick={() => setIsSpotModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                title="Spot Trade"
              >
                <div className="w-2 h-2 rounded-full bg-blue-200"></div>
                <TrendingUpIcon className="w-4 h-4" />
                <span>Spot Trade</span>
              </button>
              <button 
                onClick={() => setIsFuturesModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-purple-500/25 flex items-center space-x-2"
                title="Futures Trade"
              >
                <div className="w-2 h-2 rounded-full bg-purple-200"></div>
                <TrendingUpIcon className="w-4 h-4" />
                <span>Futures Trade</span>
              </button>
              <button 
                onClick={handleClearMatchedOrders}
                className="p-2 bg-orange-500/10 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded transition-all"
                title="Clear Matched Orders"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={handleClearAllOrders}
                className="p-2 bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-all"
                title="Clear All Orders"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Order List Content */}
          <OrderList 
            orders={orders}
            onDeleteOrder={handleDeleteOrder}
            getCurrentPrice={getCurrentPrice}
            calculatePnL={calculatePnL}
            formatAmount={formatAmount}
            getCoinIcon={getCoinIcon}
          />
        </div>
      </div>

      {/* Spot Trading Modal */}
      <TradingModal
        isOpen={isSpotModalOpen}
        onClose={() => setIsSpotModalOpen(false)}
        onOrderPlaced={handleOrderPlaced}
        selectedCoin={selectedCoin}
        tradingMode="spot"
        orderType="buy"
        orderExecutionType="limit"
        leverage="1"
        price={selectedCoin?.price.toString() || "0"}
        total=""
        triggerPrice=""
      />

      {/* Futures Trading Modal */}
      <TradingModal
        isOpen={isFuturesModalOpen}
        onClose={() => setIsFuturesModalOpen(false)}
        onOrderPlaced={handleOrderPlaced}
        selectedCoin={selectedCoin}
        tradingMode="futures"
        orderType="long"
        orderExecutionType="limit"
        leverage="10"
        price={selectedCoin?.price.toString() || "0"}
        total=""
        triggerPrice=""
      />
    </div>
  );
}
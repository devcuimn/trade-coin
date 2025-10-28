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
  executedPrice?: number;
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
      clearAllOrders: () => Promise<{success: boolean, data?: any, error?: string}>;
      getAllCoins: () => Promise<{success: boolean, data?: {symbol: string, name: string, price: number, icon: string}[], error?: string}>;
      getAllFcoins: () => Promise<{success: boolean, data?: {symbol: string, name: string, price: number, icon: string}[], error?: string}>;
      saveCoin: (coin: {symbol: string, name: string, price: number, icon: string}) => Promise<{success: boolean, data?: any, error?: string}>;
      updateCoinPrice: (symbol: string, price: number) => Promise<{success: boolean, data?: any, error?: string}>;
      updateAllCoinPrices: (pricesData: Record<string, number>) => Promise<{success: boolean, data?: any, error?: string}>;
      manualSyncCoins: () => Promise<{success: boolean, message?: string, error?: string}>;
      manualSyncFuturesCoins: () => Promise<{success: boolean, message?: string, error?: string}>;
      getSyncStatus: () => Promise<{success: boolean, data?: {isRunning: boolean, nextSync: Date | null}, error?: string}>;
      onPriceUpdate: (callback: (event: any, prices: Record<string, number>) => void) => void;
      onBalanceUpdate: (callback: (event: any, balances: {spot: number, futures: number}) => void) => void;
      onOrderMatched: (callback: (event: any, data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
      getAllAccounts: () => Promise<{success: boolean, data?: any[], error?: string}>;
      updateApiKeys: (apiKey: string, apiSecret: string, appKey?: string) => Promise<{success: boolean, data?: any, error?: string}>;
    };
  }
}
export function TradingInterface() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [coins, setCoins] = useState<{symbol: string, name: string, price: number, icon: string, priceChange?: 'up' | 'down'}[]>([]);
  const [fcoins, setFcoins] = useState<{symbol: string, name: string, price: number, icon: string, priceChange?: 'up' | 'down'}[]>([]);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [isFuturesModalOpen, setIsFuturesModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<{symbol: string, name: string, price: number, icon: string} | null>(null);
  const [selectedFuturesCoin, setSelectedFuturesCoin] = useState<{symbol: string, name: string, price: number, icon: string} | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [appKey, setAppKey] = useState('');
  
  const accountName = 'Trading Account';
  const [spotBalance, setSpotBalance] = useState<number | { usdtBalance: number; coins: any[]; totalValue: number }>(0);
  const [futuresBalance, setFuturesBalance] = useState<number | { totalBalance: number; availableBalance: number; unrealizedPnL: number; positions?: any[] }>(0);

  // Load coins data from database
  useEffect(() => {
    const loadCoins = async () => {
      try {
        if (window.electronAPI) {
          // Load spot coins
          const coinsResult = await window.electronAPI.getAllCoins();
          if (coinsResult.success && coinsResult.data) {
            setCoins(coinsResult.data);
            if (coinsResult.data.length > 0) {
              setSelectedCoin(coinsResult.data[0]);
            }
          } else {
            console.error('Failed to load coins:', coinsResult.error);
          }
          
          // Load futures coins
          const fcoinsResult = await window.electronAPI.getAllFcoins();
          if (fcoinsResult.success && fcoinsResult.data) {
            setFcoins(fcoinsResult.data);
            console.log('Loaded fcoins:', fcoinsResult.data.length);
            if (fcoinsResult.data.length > 0) {
              setSelectedFuturesCoin(fcoinsResult.data[0]);
            }
          } else {
            console.error('Failed to load fcoins:', fcoinsResult.error);
          }
        }
      } catch (error) {
        console.error('Error loading coins data:', error);
      }
    };
    loadCoins();
  }, []);

  // Listen for real-time price updates
  // Note: prices object contains combined prices from both spot and futures APIs
  // Both coins (spot) and fcoins (futures) are updated from the same price data
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onPriceUpdate) {
      const handlePriceUpdate = (event: any, prices: Record<string, number>) => { 
        // Don't update prices if any modal is open
        if (isSpotModalOpen || isFuturesModalOpen) {
          return;
        }
        
        // Update spot coin prices (coins array)
        setCoins(prevCoins => 
          prevCoins.map(coin => {
            const newPrice = prices[coin.symbol];
            if (newPrice !== undefined) {
              // Keep the current priceChange status
              let priceChange = coin.priceChange;
              
              if (newPrice > coin.price) {
                priceChange = 'up'; // Giá tăng = màu xanh
              } else if (newPrice < coin.price) {
                priceChange = 'down'; // Giá giảm = màu đỏ
              }
              
              return { ...coin, price: newPrice, priceChange };
            }
            return coin;
          })
        );
        
        // Update futures coin prices (fcoins array)
        setFcoins(prevFcoins =>
          prevFcoins.map(fcoin => {
            const newPrice = prices[fcoin.symbol];
            if (newPrice !== undefined) {
              let priceChange = fcoin.priceChange;
              
              if (newPrice > fcoin.price) {
                priceChange = 'up';
              } else if (newPrice < fcoin.price) {
                priceChange = 'down';
              }
              
              return { ...fcoin, price: newPrice, priceChange };
            }
            return fcoin;
          })
        );
      };

      // Register listener
      window.electronAPI.onPriceUpdate(handlePriceUpdate);
      
      // Cleanup function
      return () => {
        window.electronAPI.removeAllListeners('price-update');
      };
    }
  }, [isSpotModalOpen, isFuturesModalOpen]);

  // Update selectedFuturesCoin when fcoins change (only when modal is closed)
  useEffect(() => {
    if (!isFuturesModalOpen && selectedFuturesCoin) {
      const updatedCoin = fcoins.find(c => c.symbol === selectedFuturesCoin.symbol);
      if (updatedCoin && updatedCoin.price !== selectedFuturesCoin.price) {
        setSelectedFuturesCoin(updatedCoin);
      }
    }
  }, [fcoins, selectedFuturesCoin, isFuturesModalOpen]);

  // Update selectedCoin when modal closes
  useEffect(() => {
    if (!isSpotModalOpen && selectedCoin) {
      const updatedCoin = coins.find(c => c.symbol === selectedCoin.symbol);
      if (updatedCoin && updatedCoin.price !== selectedCoin.price) {
        setSelectedCoin(updatedCoin);
      }
    }
  }, [coins, selectedCoin, isSpotModalOpen]);

  // Listen for real-time balance updates
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onBalanceUpdate) {
      const handleBalanceUpdate = (event: any, balances: {spot: number | { usdtBalance: number; coins: any[]; totalValue: number }, futures: number | { totalBalance: number; availableBalance: number; unrealizedPnL: number; positions?: any[] }}) => {
        console.log('Balance update received:', balances);
        setSpotBalance(balances.spot);
        setFuturesBalance(balances.futures);
      };

      // Register listener
      window.electronAPI.onBalanceUpdate(handleBalanceUpdate);
      
      // Cleanup function
      return () => {
        window.electronAPI.removeAllListeners('balance-update');
      };
    }
  }, []);

  // Listen for order matched events
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onOrderMatched) {
      const handleOrderMatched = (event: any, data: any) => {
        console.log('Order matched event received:', data);
        
        // Reload orders to get updated status
        const reloadOrders = async () => {
          try {
            if (window.electronAPI) {
              const result = await window.electronAPI.getAllOrders();
              if (result.success && result.data) {
                setOrders(result.data);
                console.log('Orders updated after match');
              }
            }
          } catch (error) {
            console.error('Error reloading orders:', error);
          }
        };
        
        reloadOrders();
      };

      // Register listener
      window.electronAPI.onOrderMatched(handleOrderMatched);
      
      // Cleanup function
      return () => {
        window.electronAPI.removeAllListeners('order-matched');
      };
    }
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
    // Format with thousands separator and handle decimal places
    if (isNaN(amount) || amount === 0) return '0';
    
    // Determine decimal places based on coin type
    const decimals = coinSymbol === 'BTC' ? 4 : 2;
    const formatted = amount.toFixed(decimals);
    const numValue = parseFloat(formatted);
    
    // Format with thousands separators
    const parts = numValue.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Handle decimal places
    if (parts[1]) {
      // Remove trailing zeros
      parts[1] = parts[1].replace(/0+$/, '');
      if (parts[1].length > decimals) {
        parts[1] = parts[1].substring(0, decimals);
      }
      return parts[1] ? parts.join('.') : parts[0];
    }
    
    return parts[0];
  };

  // Get coin icon
  const getCoinIcon = (coinSymbol: string, mode?: 'spot' | 'futures') => {
    if (mode === 'futures') {
      const coin = fcoins.find(c => c.symbol === coinSymbol);
      return coin?.icon || coinSymbol.slice(0, 2);
    }
    const coin = coins.find(c => c.symbol === coinSymbol);
    return coin?.icon || coinSymbol.slice(0, 2);
  };

  const getCurrentPrice = (coinSymbol: string, mode?: 'spot' | 'futures') => {
    // Check both spot and futures coins
    const spotCoin = coins.find(c => c.symbol === coinSymbol);
    const futuresCoin = fcoins.find(c => c.symbol === coinSymbol);
    
    // If mode is specified, use that specific source
    if (mode === 'futures') {
      return futuresCoin ? futuresCoin.price : (spotCoin ? spotCoin.price : 0);
    } else if (mode === 'spot') {
      return spotCoin ? spotCoin.price : 0;
    }
    
    // Otherwise, prefer futures if available, else spot
    return futuresCoin ? futuresCoin.price : (spotCoin ? spotCoin.price : 0);
  };

  const getPriceChangeColor = (coinSymbol: string, mode?: 'spot' | 'futures') => {
    if (mode === 'futures') {
      const coin = fcoins.find(c => c.symbol === coinSymbol);
      if (coin?.priceChange === 'up') {
        return '!text-green-500 font-bold';
      } else if (coin?.priceChange === 'down') {
        return '!text-red-500 font-bold';
      }
      return 'text-white';
    }
    
    const coin = coins.find(c => c.symbol === coinSymbol);
    if (coin?.priceChange === 'up') {
      return '!text-green-500 font-bold'; // Giá tăng = xanh đậm + bold
    } else if (coin?.priceChange === 'down') {
      return '!text-red-500 font-bold'; // Giá giảm = đỏ đậm + bold
    }
    return 'text-white'; // Giữ nguyên màu trước đó
  };

  const calculatePnL = (order: Order) => {
    // Only calculate P&L for matched orders
    if (order.status !== 'matched') {
      return 0;
    }
    
    // Use order.mode to get the correct price source
    const currentPrice = getCurrentPrice(order.coin, order.mode);
    // Use executedPrice if available, otherwise fallback to order.price
    const purchasePrice = order.executedPrice || order.price;
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

  const handleOpenApiKeyModal = () => {
    setApiKey('');
    setApiSecret('');
    setAppKey('');
    setIsApiKeyModalOpen(true);
  };

  const handleSaveApiKeys = async () => {
    // Chỉ yêu cầu API Key/Secret khi không nhập APP Key
    if (!appKey && (!apiKey || !apiSecret)) {
      alert('Please enter both API Key and Secret');
      return;
    }

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.updateApiKeys(apiKey, apiSecret, appKey);
        console.log('API Keys result:', result);
        if (result.success) {
          // Update balances from API response
          console.log('Full result.data:', result.data);
          if (result.data?.balances) {
            console.log('Updating balances:', result.data.balances);
            setSpotBalance(result.data.balances.spot);
            setFuturesBalance(result.data.balances.futures);
          }
          alert('API Keys saved successfully! Balances updated.');
          setIsApiKeyModalOpen(false);
          setApiKey('');
          setApiSecret('');
          setAppKey('');
        } else {
          console.error('Failed to save API keys:', result.error);
          alert('Failed to save API keys. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving API keys:', error);
      alert('Error saving API keys. Please try again.');
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
        onOpenApiKeyModal={handleOpenApiKeyModal}
        coins={coins}
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
            getPriceChangeColor={getPriceChangeColor}
          />
        </div>
      </div>

      {/* API Key Configuration Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Configure API Keys
              </h2>
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API Key"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your Secret Key"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  APP Key (Optional)
                </label>
                <input
                  type="text"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  placeholder="Enter your APP Key (optional)"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveApiKeys}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        availableCoins={coins}
      />

      {/* Futures Trading Modal */}
      <TradingModal
        isOpen={isFuturesModalOpen}
        onClose={() => setIsFuturesModalOpen(false)}
        onOrderPlaced={handleOrderPlaced}
        selectedCoin={selectedFuturesCoin}
        tradingMode="futures"
        orderType="long"
        orderExecutionType="limit"
        leverage="10"
        price={selectedFuturesCoin?.price.toString() || "0"}
        total=""
        triggerPrice=""
        availableCoins={fcoins}
      />
    </div>
  );
}
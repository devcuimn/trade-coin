import { useState, useRef, useCallback, useEffect } from 'react';
import { WalletIcon, TrendingUpIcon, TrendingDownIcon, DollarSignIcon, ClockIcon, CheckCircleIcon, ClockIcon as PendingIcon } from 'lucide-react';

// Declare electronAPI type
declare global {
  interface Window {
    electronAPI: {
      loadCryptoData: () => Promise<{coins: Array<{symbol: string, name: string, price: number}>}>;
      saveCryptoData: (data: any) => Promise<{success: boolean, error?: string}>;
    };
  }
}

// Default coins data
const DEFAULT_COINS: {symbol: string, name: string, price: number, icon: string}[] = [{
  symbol: 'BTC',
  name: 'Bitcoin',
  price: 45000,
  icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
}, {
  symbol: 'ETH',
  name: 'Ethereum',
  price: 2500,
  icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
}, {
  symbol: 'BNB',
  name: 'Binance Coin',
  price: 320,
  icon: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png'
}, {
  symbol: 'SOL',
  name: 'Solana',
  price: 95,
  icon: 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
}, {
  symbol: 'ADA',
  name: 'Cardano',
  price: 0.45,
  icon: 'https://assets.coingecko.com/coins/images/975/large/cardano.png'
}];
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
}
export function TradingInterface() {
  const [coins, setCoins] = useState(DEFAULT_COINS);
  const [selectedCoin, setSelectedCoin] = useState(DEFAULT_COINS[0]);
  const [price, setPrice] = useState(selectedCoin?.price?.toString() || '0');
  const [total, setTotal] = useState('');
  const [tradingMode, setTradingMode] = useState<'spot' | 'futures'>('spot');
  const [orderType, setOrderType] = useState<'buy' | 'long' | 'short'>('buy');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leverage, setLeverage] = useState('10');

  // Leverage handler with useCallback
  const handleLeverageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Leverage change:', e.target.value);
    setLeverage(e.target.value);
  }, []);

  const handleLeverageInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    console.log('Leverage input:', target.value);
    setLeverage(target.value);
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const totalInputRef = useRef<HTMLInputElement>(null);
  
  // Smart autocomplete states
  const [coinSearchTerm, setCoinSearchTerm] = useState('');
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const [filteredCoins, setFilteredCoins] = useState(coins);
  const [displayedCoins, setDisplayedCoins] = useState(coins.slice(0, 8)); // Show only 8 items
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Load crypto data from Electron on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (window.electronAPI) {
          const data = await window.electronAPI.loadCryptoData();
          setCoins(data.coins);
          setSelectedCoin(data.coins[0]);
          setPrice(data.coins[0].price.toString());
          setCoinSearchTerm(`${data.coins[0].symbol} - ${data.coins[0].name} ($${data.coins[0].price.toLocaleString()})`);
        }
      } catch (error) {
        console.error('Error loading crypto data:', error);
        // Fallback to default data
        setCoins(DEFAULT_COINS);
        setSelectedCoin(DEFAULT_COINS[0]);
        setPrice(DEFAULT_COINS[0].price.toString());
        setCoinSearchTerm(`${DEFAULT_COINS[0].symbol} - ${DEFAULT_COINS[0].name} ($${DEFAULT_COINS[0].price.toLocaleString()})`);
      }
    };
    
    loadData();
  }, []);

  // Smart filtering with debounce and pagination
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (coinSearchTerm.length === 0) {
        // Show top coins when no search
        setFilteredCoins(coins.slice(0, 20));
        setDisplayedCoins(coins.slice(0, 8));
      } else if (coinSearchTerm.length >= 1) {
        // Smart search: prioritize exact symbol matches, then name matches
        const exactMatches = coins.filter(coin => 
          coin.symbol.toLowerCase() === coinSearchTerm.toLowerCase()
        );
        
        const symbolStartsWith = coins.filter(coin => 
          coin.symbol.toLowerCase().startsWith(coinSearchTerm.toLowerCase()) &&
          coin.symbol.toLowerCase() !== coinSearchTerm.toLowerCase()
        );
        
        const nameStartsWith = coins.filter(coin => 
          coin.name.toLowerCase().startsWith(coinSearchTerm.toLowerCase())
        );
        
        const symbolContains = coins.filter(coin => 
          coin.symbol.toLowerCase().includes(coinSearchTerm.toLowerCase()) &&
          !coin.symbol.toLowerCase().startsWith(coinSearchTerm.toLowerCase())
        );
        
        const nameContains = coins.filter(coin => 
          coin.name.toLowerCase().includes(coinSearchTerm.toLowerCase()) &&
          !coin.name.toLowerCase().startsWith(coinSearchTerm.toLowerCase())
        );
        
        const combined = [...exactMatches, ...symbolStartsWith, ...nameStartsWith, ...symbolContains, ...nameContains];
        const unique = combined.filter((coin, index, self) => 
          index === self.findIndex(c => c.symbol === coin.symbol)
        );
        
        setFilteredCoins(unique);
        setDisplayedCoins(unique.slice(0, 8));
      }
    }, coinSearchTerm.length === 0 ? 0 : 300); // No delay for clearing, 300ms delay for search

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [coinSearchTerm, coins]);
  
  const handlePriceChange = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setPrice(value);
  }, []);
  
  const handleTotalChange = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setTotal(value);
  }, []);
  
  const handlePriceBlur = useCallback(() => {
    if (priceInputRef.current) {
      setPrice(priceInputRef.current.value);
    }
  }, []);
  
  const handleTotalBlur = useCallback(() => {
    if (totalInputRef.current) {
      setTotal(totalInputRef.current.value);
    }
  }, []);

  // Smart autocomplete handlers
  const handleCoinSearch = (value: string) => {
    setCoinSearchTerm(value);
    setShowCoinDropdown(true);
  };

  const handleCoinSelect = (coin: typeof DEFAULT_COINS[0]) => {
    setSelectedCoin(coin);
    setCoinSearchTerm(`${coin.symbol} - ${coin.name} ($${coin.price.toLocaleString()})`);
    setPrice(coin.price.toString());
    setShowCoinDropdown(false);
  };

  const handleCoinInputFocus = () => {
    setShowCoinDropdown(true);
  };

  const handleCoinInputBlur = () => {
    // Delay hiding dropdown to allow click on option
    setTimeout(() => setShowCoinDropdown(false), 200);
  };
    
  const accountName = 'Trading Account';
  const spotBalance = 50000;
  const futuresBalance = 25000;

  const formatAmount = (amount: number, coinSymbol: string) => {
    const decimals = coinSymbol === 'BTC' ? 4 : 2;
    const formatted = amount.toFixed(decimals);
    // Remove trailing zeros and unnecessary decimal point
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

  const calculateCurrentTotal = (order: Order) => {
    const currentPrice = getCurrentPrice(order.coin);
    return currentPrice * order.amount;
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
  const handleCoinChange = (coinSymbol: string) => {
    const coin = coins.find(c => c.symbol === coinSymbol);
    if (coin) {
      setSelectedCoin(coin);
      setPrice(coin.price.toString());
    }
  };
  const handleModeChange = (mode: 'spot' | 'futures') => {
    setTradingMode(mode);
    setOrderType(mode === 'spot' ? 'buy' : 'long');
  };
  const calculateAmount = () => {
    const priceNum = parseFloat(price) || 0;
    const totalNum = parseFloat(total) || 0;
    if (priceNum === 0) return '0';
    const amount = totalNum / priceNum;
    return formatAmount(amount, selectedCoin?.symbol || 'BTC');
  };
  const handlePlaceOrder = () => {
    const priceValue = priceInputRef.current?.value || price;
    const totalValue = totalInputRef.current?.value || total;
    
    // Validate input format
    if (!/^\d*\.?\d*$/.test(priceValue) || !/^\d*\.?\d*$/.test(totalValue)) {
      alert('Please enter valid numbers only');
      return;
    }
    
    const priceNum = parseFloat(priceValue);
    const totalNum = parseFloat(totalValue);
    const amountNum = parseFloat(calculateAmount());
    const leverageNum = tradingMode === 'futures' ? parseFloat(leverage) : undefined;
    
    if (!priceNum || !totalNum || amountNum <= 0) {
      alert('Please enter valid price and total amount');
      return;
    }
    
    if (tradingMode === 'futures' && (!leverageNum || leverageNum < 1 || leverageNum > 100)) {
      alert('Please enter valid leverage (1-100x)');
      return;
    }
    
    const newOrder: Order = {
      id: Date.now().toString(),
      coin: selectedCoin?.symbol || 'BTC',
      coinName: selectedCoin?.name || 'Bitcoin',
      type: orderType,
      price: priceNum,
      amount: amountNum,
      total: totalNum,
      leverage: leverageNum,
      status: 'pending',
      timestamp: new Date(),
      mode: tradingMode
    };
    setOrders([newOrder, ...orders]);
    setTotal('');
    setIsModalOpen(false); // Close modal after placing order
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this pending order?')) {
      setOrders(orders.filter(order => order.id !== orderId));
    }
  };

  const handleClearMatchedOrders = () => {
    const matchedCount = orders.filter(order => order.status === 'matched').length;
    if (matchedCount === 0) {
      alert('No matched orders to clear.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to clear ${matchedCount} matched order(s)? This action cannot be undone.`)) {
      setOrders(orders.filter(order => order.status !== 'matched'));
    }
  };

  const TradingModal = () => {
    if (!isModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Trade Cryptocurrency</h2>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="text-gray-400 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* Trading Mode Selection */}
          <div className="mb-4">
            <div className="flex gap-2">
              <button onClick={() => handleModeChange('spot')} className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${tradingMode === 'spot' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                Spot
              </button>
              <button onClick={() => handleModeChange('futures')} className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${tradingMode === 'futures' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                Futures
              </button>
            </div>
          </div>
          
          {/* Coin Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Coin
            </label>
            <div className="relative">
              <input
                type="text"
                value={coinSearchTerm}
                onChange={e => handleCoinSearch(e.target.value)}
                onFocus={handleCoinInputFocus}
                onBlur={handleCoinInputBlur}
                placeholder="Search coins..."
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-200"
              />
              {coinSearchTerm && (
                <button
                  onClick={() => {
                    setCoinSearchTerm('');
                    setShowCoinDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-slate-600/50 hover:bg-slate-500/50 flex items-center justify-center transition-all duration-200"
                >
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {showCoinDropdown && displayedCoins.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-slate-800/95 backdrop-blur-md border border-slate-600/30 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                  <div className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
                    {displayedCoins.map((coin, index) => (
                      <div
                        key={coin.symbol}
                        onClick={() => handleCoinSelect(coin)}
                        className={`px-4 py-3 cursor-pointer transition-all duration-150 flex items-center justify-between group ${
                          selectedCoin.symbol === coin.symbol 
                            ? 'bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white' 
                            : 'hover:bg-slate-700/50 text-slate-200'
                        } ${index === 0 ? 'rounded-t-xl' : ''} ${index === displayedCoins.length - 1 ? 'rounded-b-xl' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            selectedCoin.symbol === coin.symbol 
                              ? 'bg-white/20 text-white' 
                              : 'bg-slate-600/50 text-slate-300'
                          }`}>
                            {coin.icon?.startsWith('http') ? (
                              <img 
                                src={coin.icon} 
                                alt={coin.symbol}
                                className="w-6 h-6 rounded-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const span = target.nextElementSibling as HTMLElement;
                                  if (span) span.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <span style={{display: coin.icon?.startsWith('http') ? 'none' : 'block'}}>
                              {coin.icon || coin.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{coin.symbol}</div>
                            <div className="text-xs opacity-75">{coin.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            ${coin.price.toLocaleString()}
                          </span>
                          {selectedCoin.symbol === coin.symbol && (
                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                              <CheckCircleIcon className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredCoins.length > 8 && (
                    <div className="px-4 py-2 text-xs text-slate-400 bg-slate-700/30 border-t border-slate-600/30">
                      Showing 8 of {filteredCoins.length} results
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Order Type Toggle */}
          <div className="mb-4">
            {tradingMode === 'spot' ? <button className="w-full py-2 rounded-lg font-semibold bg-green-600 text-white text-sm">
                <TrendingUpIcon className="w-4 h-4 inline mr-2" />
                Buy
              </button> : <div className="flex gap-2">
                <button onClick={() => setOrderType('long')} className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${orderType === 'long' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  <TrendingUpIcon className="w-4 h-4 inline mr-2" />
                  Long
                </button>
                <button onClick={() => setOrderType('short')} className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${orderType === 'short' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  <TrendingDownIcon className="w-4 h-4 inline mr-2" />
                  Short
                </button>
              </div>}
          </div>
          
          {/* Leverage Input (only for Futures) */}
          {tradingMode === 'futures' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Leverage
              </label>
              <div className="py-4">
                <div className="flex items-center gap-2">
                  {/* Quick leverage buttons */}
                  {[5, 10, 20, 50, 100].map(lev => (
                    <button
                      key={lev}
                      onClick={() => setLeverage(lev.toString())}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        leverage === lev.toString() 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                  
                  {/* Manual input */}
                  <button 
                    onClick={() => {
                      const newVal = Math.max(1, parseInt(leverage) - 1);
                      setLeverage(newVal.toString());
                    }}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white text-sm"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={leverage} 
                    onChange={e => setLeverage(e.target.value)}
                    min="1" 
                    max="100"
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm"
                  />
                  <button 
                    onClick={() => {
                      const newVal = Math.min(100, parseInt(leverage) + 1);
                      setLeverage(newVal.toString());
                    }}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Price Input */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Price (USD)
              </label>
              <div className="relative">
                <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input ref={priceInputRef} type="text" defaultValue={price} onBlur={handlePriceBlur} placeholder="0.00" className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {/* Total Input */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Total (USD)
              </label>
              <div className="relative">
                <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input ref={totalInputRef} type="text" defaultValue={total} onBlur={handleTotalBlur} placeholder="0.00" className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
          
          {/* Calculated Amount Display */}
          <div className="bg-gray-700 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Amount ({selectedCoin?.symbol || 'BTC'})</span>
              <span className="text-xl font-bold text-white">
                {calculateAmount()}
              </span>
            </div>
          </div>
          
          {/* Execute Button */}
          <button onClick={handlePlaceOrder} className={`w-full py-3 rounded-lg font-bold transition-all ${orderType === 'buy' || orderType === 'long' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
            {orderType === 'buy' && `Buy ${selectedCoin?.symbol || 'BTC'}`}
            {orderType === 'long' && `Long ${selectedCoin?.symbol || 'BTC'}`}
            {orderType === 'short' && `Short ${selectedCoin?.symbol || 'BTC'}`}
          </button>
        </div>
      </div>
    );
  };
  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'buy':
      case 'long':
        return 'bg-green-600 text-white';
      case 'sell':
      case 'short':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };
  return <div className="w-full min-h-screen gradient-bg text-white p-6 animate-fadeInUp">
      {/* Header with Account Info */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <WalletIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">{accountName}</h1>
                <p className="text-secondary text-xs">Professional Crypto Trading Platform</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="glass rounded-xl px-6 py-3 min-w-[140px]">
                <p className="text-muted text-xs mb-1 font-medium">Spot Balance</p>
                <p className="text-2xl font-bold text-green-400">
                  ${spotBalance.toLocaleString()}
                </p>
              </div>
              <div className="glass rounded-xl px-6 py-3 min-w-[140px]">
                <p className="text-muted text-xs mb-1 font-medium">Futures Balance</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${futuresBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto">
        {/* Order History */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-500/10 rounded">
                <ClockIcon className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-primary">Order History</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClearMatchedOrders}
                className="p-2 bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-all"
                title="Clear Matched Orders"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="p-2 bg-green-500/10 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded transition-all"
                title="New Trade"
              >
                <TrendingUpIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          {orders.length > 0 && <div className="order-history-scroll table-modern" style={{maxHeight: '450px', overflowX: 'hidden', width: '100%'}}>
              <table className="w-full" style={{tableLayout: 'fixed', width: '100%'}}>
                <thead>
                  <tr className="border-b border-gray-500/30">
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '5%'}}>
                      #
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '8%'}}>
                      Asset
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '8%'}}>
                      Mode
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '7%'}}>
                      Lev
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '12%'}}>
                      Entry
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '10%'}}>
                      Amount
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '12%'}}>
                      Current
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '12%'}}>
                      Value
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '10%'}}>
                      P&L
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '8%'}}>
                      Type
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-bold text-secondary" style={{width: '8%'}}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const currentPrice = getCurrentPrice(order.coin);
                    const currentTotal = calculateCurrentTotal(order);
                    const pnl = calculatePnL(order);
                    const pnlColor = pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'neutral';
                    
                    return <tr key={order.id} className={`table-row ${index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-700/20'}`}>
                      <td className="py-3 px-2 text-sm font-bold text-primary">
                        {orders.length - index}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-600/50 flex items-center justify-center text-xs font-bold text-slate-300">
                            {getCoinIcon(order.coin)?.startsWith('http') ? (
                              <img 
                                src={getCoinIcon(order.coin)} 
                                alt={order.coin}
                                className="w-5 h-5 rounded-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const span = target.nextElementSibling as HTMLElement;
                                  if (span) span.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <span style={{display: getCoinIcon(order.coin)?.startsWith('http') ? 'none' : 'block'}}>
                              {getCoinIcon(order.coin)}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-primary">{order.coin}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={order.mode === 'spot' ? 'badge-spot' : 'badge-futures'}>
                          {order.mode.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-sm font-semibold text-secondary">
                          {order.leverage ? `${order.leverage}x` : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-sm font-semibold text-primary">
                          ${order.price.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-sm font-semibold text-primary">
                          {formatAmount(order.amount, order.coin)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-sm font-semibold text-primary">
                          ${currentPrice.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-sm font-semibold text-primary">
                          {order.status === 'matched' ? `$${currentTotal.toLocaleString()}` : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className={`text-sm font-bold ${pnlColor}`}>
                          {order.status === 'matched' ? `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={order.type === 'buy' || order.type === 'long' ? 'badge-buy' : 'badge-sell'}>
                          {order.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {order.status === 'matched' ? <div className="flex items-center gap-1 text-green-400" title="Đã khớp lệnh">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="text-sm font-semibold">
                              ✓
                            </span>
                          </div> : <div className="flex items-center gap-1 text-yellow-400" title="Đang chờ">
                            <PendingIcon className="w-4 h-4" />
                            <span className="text-sm font-semibold">
                              ⏳
                            </span>
                          </div>}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>}
        </div>
      </div>
      
      {/* Trading Modal */}
      <TradingModal />
    </div>;
}
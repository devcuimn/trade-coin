import { useState, useRef, useEffect, useMemo } from 'react';
import { TrendingUpIcon, TrendingDownIcon, DollarSignIcon, CheckCircleIcon } from 'lucide-react';

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

interface TradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (order: Order) => void;
  selectedCoin: {symbol: string, name: string, price: number, icon: string} | null;
  tradingMode: 'spot' | 'futures';
  orderType: 'buy' | 'long' | 'short';
  orderExecutionType: 'market' | 'limit' | 'stop-limit' | 'stop-loss';
  leverage: string;
  price: string;
  total: string;
  triggerPrice: string;
  availableCoins?: {symbol: string, name: string, price: number, icon: string}[];
}

export function TradingModal({
  isOpen,
  onClose,
  onOrderPlaced,
  selectedCoin,
  tradingMode,
  orderType,
  orderExecutionType,
  leverage,
  price,
  total,
  triggerPrice,
  availableCoins
}: TradingModalProps) {
  const [coins, setCoins] = useState<{symbol: string, name: string, price: number, icon: string}[]>([]);
  const [coinSearchTerm, setCoinSearchTerm] = useState('');
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const [currentSelectedCoin, setCurrentSelectedCoin] = useState<{symbol: string, name: string, price: number, icon: string} | null>(selectedCoin);
  const [currentTradingMode, setCurrentTradingMode] = useState<'spot' | 'futures'>(tradingMode);
  const [currentOrderType, setCurrentOrderType] = useState<'buy' | 'long' | 'short'>(orderType);
  const [currentOrderExecutionType, setCurrentOrderExecutionType] = useState<'market' | 'limit' | 'stop-limit' | 'stop-loss'>(orderExecutionType);
  const [currentLeverage, setCurrentLeverage] = useState(leverage);
  const [currentPrice, setCurrentPrice] = useState(price);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [currentTriggerPrice, setCurrentTriggerPrice] = useState(triggerPrice);

  const priceInputRef = useRef<HTMLInputElement>(null);
  const totalInputRef = useRef<HTMLInputElement>(null);
  const triggerPriceInputRef = useRef<HTMLInputElement>(null);
  const coinSearchInputRef = useRef<HTMLInputElement>(null);

  // Update trading mode when props change
  useEffect(() => {
    setCurrentTradingMode(tradingMode);
    setCurrentOrderType(orderType);
    setCurrentOrderExecutionType(orderExecutionType);
    setCurrentLeverage(leverage);
    setCurrentPrice(price);
    setCurrentTotal(total);
    setCurrentTriggerPrice(triggerPrice);
    setCurrentSelectedCoin(selectedCoin);
  }, [tradingMode, orderType, orderExecutionType, leverage, price, total, triggerPrice, selectedCoin]);

  // Load coins data
  useEffect(() => {
    if (availableCoins && availableCoins.length > 0) {
      setCoins(availableCoins);
      // If no selected coin is set, use the first coin from available coins
      if (!selectedCoin && availableCoins.length > 0) {
        setCurrentSelectedCoin(availableCoins[0]);
      }
    } else {
      const loadCoins = async () => {
        if (window.electronAPI) {
          const result = await window.electronAPI.getAllCoins();
          if (result.success && result.data) {
            setCoins(result.data);
            if (!selectedCoin && result.data.length > 0) {
              setCurrentSelectedCoin(result.data[0]);
            }
          }
        }
      };
      loadCoins();
    }
  }, [availableCoins, selectedCoin]);

  // Filter coins for search
  const { displayedCoins } = useMemo(() => {
    if (coinSearchTerm.length === 0) {
      return { displayedCoins: coins.slice(0, 8) };
    }
    
    const filtered = coins.filter(coin => 
      coin.symbol.toLowerCase().includes(coinSearchTerm.toLowerCase()) ||
      coin.name.toLowerCase().includes(coinSearchTerm.toLowerCase())
    );
    
    return { displayedCoins: filtered.slice(0, 8) };
  }, [coinSearchTerm, coins]);

  const formatAmount = (amount: number) => {
    // Format with thousands separator and handle decimal places
    if (isNaN(amount) || amount === 0) return '0';
    
    // Format with thousands separators
    const parts = amount.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Handle decimal places - show up to 8 decimal places for crypto
    if (parts[1]) {
      // Remove trailing zeros
      parts[1] = parts[1].replace(/0+$/, '');
      if (parts[1].length > 8) {
        parts[1] = parts[1].substring(0, 8);
      }
      return parts[1] ? parts.join('.') : parts[0];
    }
    
    return parts[0];
  };

  const handleCoinSelect = (coin: {symbol: string, name: string, price: number, icon: string}) => {
    // Update selected coin state
    setCurrentSelectedCoin(coin);
    
    setCoinSearchTerm(`${coin.symbol.toUpperCase()} - ${coin.name} ($${coin.price.toString()})`);
    setShowCoinDropdown(false);
    if (coinSearchInputRef.current) {
      coinSearchInputRef.current.value = `${coin.symbol.toUpperCase()} - ${coin.name} ($${coin.price.toString()})`;
    }
    
    // Clear price, total and trigger price when selecting new coin
    setCurrentPrice('');
    setCurrentTotal('');
    setCurrentTriggerPrice('');
    
    // Clear input fields
    if (priceInputRef.current) {
      priceInputRef.current.value = '';
    }
    if (totalInputRef.current) {
      totalInputRef.current.value = '';
    }
    if (triggerPriceInputRef.current) {
      triggerPriceInputRef.current.value = '';
    }
  };

  const calculateAmount = () => {
    const priceNum = parseFloat(currentPrice.replace(/[^0-9.]/g, '')) || 0;
    const totalNum = parseFloat(currentTotal.replace(/[^0-9.]/g, '')) || 0;
    if (priceNum === 0) return '0';
    
    // For Futures: amount = (total * leverage) / price
    // For Spot: amount = total / price
    if (currentTradingMode === 'futures' && currentLeverage) {
      const leverageNum = parseFloat(currentLeverage) || 1;
      const amount = (totalNum * leverageNum) / priceNum;
      return formatAmount(amount);
    } else {
      const amount = totalNum / priceNum;
      return formatAmount(amount);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700/50 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {currentTradingMode === 'spot' ? 'Spot Trading' : 'Futures Trading'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Order Type & Action */}
        <div className="mb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
              <div className="flex gap-2">
                {(currentTradingMode === 'spot' ? ['limit'] : ['limit', 'stop-limit']).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCurrentOrderExecutionType(type as 'market' | 'limit' | 'stop-limit' | 'stop-loss')}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                      currentOrderExecutionType === type
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
              {currentTradingMode === 'spot' ? (
                <div className="w-full py-2 px-3 rounded-lg font-medium bg-gradient-to-r from-green-500 to-green-600 text-white text-center shadow-lg shadow-green-500/25">
                  <div className="flex items-center justify-center space-x-2">
                    <TrendingUpIcon className="w-4 h-4" />
                    <span>Buy</span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentOrderType('long')} 
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                      currentOrderType === 'long' 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25' 
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingUpIcon className="w-3 h-3" />
                      <span>Long</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => setCurrentOrderType('short')} 
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                      currentOrderType === 'short' 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25' 
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingDownIcon className="w-3 h-3" />
                      <span>Short</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coin Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Coin</label>
          <div className="relative">
            <input
              ref={coinSearchInputRef}
              type="text"
              defaultValue={currentSelectedCoin ? `${currentSelectedCoin.symbol.toUpperCase()} - ${currentSelectedCoin.name} ($${currentSelectedCoin.price.toString()})` : ''}
              onChange={(e) => {
                const value = e.target.value;
                setCoinSearchTerm(value);
                setShowCoinDropdown(true);
              }}
              onFocus={() => setShowCoinDropdown(true)}
              onBlur={() => setTimeout(() => setShowCoinDropdown(false), 200)}
              onClick={() => setShowCoinDropdown(true)}
              placeholder="Search coins..."
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-200 placeholder-gray-400"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {coinSearchTerm && (
                <button
                  onClick={() => {
                    setCoinSearchTerm('');
                    if (coinSearchInputRef.current) {
                      coinSearchInputRef.current.value = '';
                    }
                  }}
                  className="w-5 h-5 rounded-full bg-slate-600/50 hover:bg-slate-500/50 flex items-center justify-center transition-all duration-200"
                >
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {showCoinDropdown && displayedCoins.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-slate-800/95 backdrop-blur-md border border-slate-600/30 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                <div className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
                  {displayedCoins.map((coin, index) => (
                    <div
                      key={coin.symbol}
                      onClick={() => handleCoinSelect(coin)}
                      className={`px-4 py-2 cursor-pointer transition-all duration-150 flex items-center justify-between group ${
                        currentSelectedCoin?.symbol === coin.symbol 
                          ? 'bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white' 
                          : 'hover:bg-slate-700/50 text-slate-200'
                      } ${index === 0 ? 'rounded-t-xl' : ''} ${index === displayedCoins.length - 1 ? 'rounded-b-xl' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          currentSelectedCoin?.symbol === coin.symbol 
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
                          <div className="font-semibold text-sm">{coin.symbol.toUpperCase()}</div>
                          <div className="text-xs opacity-75">{coin.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          ${coin.price.toString()}
                        </span>
                        {currentSelectedCoin?.symbol === coin.symbol && (
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <CheckCircleIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leverage Input (only for Futures) */}
        {currentTradingMode === 'futures' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-300 mb-1">Leverage</label>
            
            {/* Preset Buttons + Manual Input in one row */}
            <div className="flex items-center gap-2">
              {/* Preset Leverage Buttons */}
              <div className="flex gap-1">
                {[5, 10, 20, 40, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCurrentLeverage(preset.toString())}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                      currentLeverage === preset.toString()
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {preset}x
                  </button>
                ))}
              </div>

              {/* Manual Leverage Input */}
              <div className="flex items-center gap-1 ml-2">
                <button 
                  onClick={() => {
                    const newVal = Math.max(1, parseInt(currentLeverage) - 1);
                    setCurrentLeverage(newVal.toString());
                  }}
                  className="w-6 h-6 bg-slate-700/50 hover:bg-slate-700 rounded flex items-center justify-center text-white transition-all duration-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <div className="relative">
                  <input 
                    type="number" 
                    value={currentLeverage} 
                    onChange={e => setCurrentLeverage(e.target.value)}
                    min="1" 
                    max="100"
                    className="w-16 bg-slate-800/50 border border-slate-600/50 rounded px-2 py-1 text-white text-center text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200"
                  />
                  <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs font-medium">
                    x
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const newVal = Math.min(100, parseInt(currentLeverage) + 1);
                    setCurrentLeverage(newVal.toString());
                  }}
                  className="w-6 h-6 bg-slate-700/50 hover:bg-slate-700 rounded flex items-center justify-center text-white transition-all duration-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stop, Limit and Total Inputs */}
        <div className="mb-4">
          <div className="flex gap-3">
            {/* Trigger Price Input (for Stop orders) */}
            {currentOrderExecutionType === 'stop-limit' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Stop
                </label>
                <div className="relative">
                  <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={triggerPriceInputRef}
                    type="text"
                    defaultValue={currentTriggerPrice}
                    onBlur={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue && !isNaN(parseFloat(inputValue))) {
                        setCurrentTriggerPrice(inputValue);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Price Input */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-300 mb-1">Limit</label>
              <div className="relative">
                <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={priceInputRef}
                  type="text"
                  defaultValue={currentPrice}
                  onBlur={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue && !isNaN(parseFloat(inputValue))) {
                      setCurrentPrice(inputValue);
                    }
                  }}
                  placeholder="0.00"
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                />
              </div>
            </div>
            
            {/* Total Input */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-300 mb-1">Total (USD)</label>
              <div className="relative">
                <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  ref={totalInputRef} 
                  type="text" 
                  defaultValue={currentTotal} 
                  onBlur={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue && !isNaN(parseFloat(inputValue))) {
                      setCurrentTotal(inputValue);
                    }
                  }}
                  placeholder="0.00" 
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200" 
                />
              </div>
            </div>
          </div>
          {currentOrderExecutionType === 'stop-limit' && (
            <small className="text-gray-400 text-xs mt-1 block">
              Stop Limit: Mua/Bán khi giá đạt đến mức này
            </small>
          )}
        </div>

        {/* Calculated Amount Display */}
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-sm">Amount ({currentSelectedCoin?.symbol || 'BTC'})</span>
            <span className="text-xl font-bold text-white">
              {calculateAmount()}
            </span>
          </div>
        </div>

        {/* Execute Button */}
        <button 
          onClick={() => {
            const priceValue = priceInputRef.current?.value || currentPrice;
            const totalValue = totalInputRef.current?.value || currentTotal;
            
            // Remove formatting for calculation
            const priceNum = parseFloat(priceValue.replace(/[^0-9.]/g, ''));
            const totalNum = parseFloat(totalValue.replace(/[^0-9.]/g, ''));
            
            // Calculate amount based on trading mode
            let amountNum: number;
            if (currentTradingMode === 'futures' && currentLeverage) {
              const leverageNum = parseFloat(currentLeverage) || 1;
              amountNum = (totalNum * leverageNum) / priceNum;
            } else {
              amountNum = totalNum / priceNum;
            }
            
            const leverageNum = currentTradingMode === 'futures' ? parseFloat(currentLeverage) : undefined;
            
            if (!priceNum || !totalNum || amountNum <= 0) {
              alert('Please enter valid price and total amount');
              return;
            }
            
            if (currentTradingMode === 'futures' && (!leverageNum || leverageNum < 1 || leverageNum > 100)) {
              alert('Please enter valid leverage (1-100x)');
              return;
            }
            
            const newOrder: Order = {
              id: Date.now().toString(),
              coin: currentSelectedCoin?.symbol || 'BTC',
              coinName: currentSelectedCoin?.name || 'Bitcoin',
              type: currentOrderType,
              price: priceNum,
              amount: amountNum,
              total: totalNum,
              leverage: leverageNum,
              status: 'pending',
              timestamp: new Date(),
              mode: currentTradingMode,
              orderType: currentOrderExecutionType,
              triggerPrice: currentOrderExecutionType === 'stop-limit' ? parseFloat(triggerPriceInputRef.current?.value || '0') : undefined
            };
            
            onOrderPlaced(newOrder);
            
            // Clear all inputs after placing order
            setCurrentPrice('');
            setCurrentTotal('');
            setCurrentTriggerPrice('');
            
            // Clear input fields
            if (priceInputRef.current) {
              priceInputRef.current.value = '';
            }
            if (totalInputRef.current) {
              totalInputRef.current.value = '';
            }
            if (triggerPriceInputRef.current) {
              triggerPriceInputRef.current.value = '';
            }
            
            onClose();
          }}
          className={`w-full py-2 rounded-lg font-bold transition-all ${
            currentOrderType === 'buy' || currentOrderType === 'long' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {currentOrderType === 'buy' && `Buy ${(currentSelectedCoin?.symbol || 'BTC').toUpperCase()}`}
          {currentOrderType === 'long' && `Long ${(currentSelectedCoin?.symbol || 'BTC').toUpperCase()}`}
          {currentOrderType === 'short' && `Short ${(currentSelectedCoin?.symbol || 'BTC').toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

import { useState, useRef, useCallback, useMemo } from 'react';

interface Coin {
  symbol: string;
  name: string;
  price: number;
  icon: string;
}

interface CoinSearchInputProps {
  coins: Coin[];
  selectedCoin: Coin | null;
  onCoinSelect: (coin: Coin) => void;
  onClear: () => void;
}

export function CoinSearchInput({ coins, selectedCoin, onCoinSelect, onClear }: CoinSearchInputProps) {
  const [coinSearchTerm, setCoinSearchTerm] = useState('');
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const coinSearchInputRef = useRef<HTMLInputElement>(null);

  // Filter coins inline để tránh re-render
  const { displayedCoins, filteredCoins } = useMemo(() => {
    if (coinSearchTerm.length === 0) {
      const allCoins = coins.slice(0, 20);
      return { displayedCoins: allCoins.slice(0, 8), filteredCoins: allCoins };
    }
    
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
    
    return { displayedCoins: unique.slice(0, 8), filteredCoins: unique };
  }, [coinSearchTerm, coins]);

  const handleCoinSearch = useCallback((value: string) => {
    setCoinSearchTerm(value);
    setShowCoinDropdown(true);
  }, []);

  const handleCoinSelect = useCallback((coin: Coin) => {
    onCoinSelect(coin);
    const searchText = `${coin.symbol} - ${coin.name} ($${coin.price.toLocaleString()})`;
    setCoinSearchTerm(searchText);
    
    if (coinSearchInputRef.current) {
      coinSearchInputRef.current.value = searchText;
    }
    
    setShowCoinDropdown(false);
  }, [onCoinSelect]);

  const handleCoinInputFocus = useCallback(() => {
    setShowCoinDropdown(true);
  }, []);

  const handleCoinInputClick = useCallback(() => {
    setShowCoinDropdown(true);
  }, []);

  const handleCoinInputBlur = useCallback(() => {
    setTimeout(() => setShowCoinDropdown(false), 200);
  }, []);

  const handleClearCoinSearch = useCallback(() => {
    setCoinSearchTerm('');
    setShowCoinDropdown(false);
    if (coinSearchInputRef.current) {
      coinSearchInputRef.current.value = '';
    }
    onClear();
  }, [onClear]);

  // Set initial value when selectedCoin changes
  useMemo(() => {
    if (selectedCoin && coinSearchInputRef.current) {
      const searchText = `${selectedCoin.symbol} - ${selectedCoin.name} ($${selectedCoin.price.toLocaleString()})`;
      coinSearchInputRef.current.value = searchText;
      setCoinSearchTerm(searchText);
    }
  }, [selectedCoin]);

  return (
    <div className="relative">
      <input
        ref={coinSearchInputRef}
        type="text"
        onChange={(e) => {
          const value = e.target.value;
          setCoinSearchTerm(value);
          setShowCoinDropdown(true);
        }}
        onFocus={handleCoinInputFocus}
        onBlur={handleCoinInputBlur}
        onClick={handleCoinInputClick}
        placeholder="Search coins..."
        className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-200"
      />
      {coinSearchTerm && (
        <button
          onClick={handleClearCoinSearch}
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
                className={`px-4 py-2 cursor-pointer transition-all duration-150 flex items-center justify-between group ${
                  selectedCoin?.symbol === coin.symbol 
                    ? 'bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white' 
                    : 'hover:bg-slate-700/50 text-slate-200'
                } ${index === 0 ? 'rounded-t-xl' : ''} ${index === displayedCoins.length - 1 ? 'rounded-b-xl' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    selectedCoin?.symbol === coin.symbol 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-600/50 text-slate-300'
                  }`}>
                    {coin.icon?.startsWith('http') ? (
                      <img
                        src={coin.icon}
                        alt={coin.symbol}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={coin.icon?.startsWith('http') ? 'hidden' : ''}>
                      {coin.symbol.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{coin.symbol}</div>
                    <div className="text-xs text-slate-400">{coin.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">${coin.price.toLocaleString()}</div>
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
  );
}

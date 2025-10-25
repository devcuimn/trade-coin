import { useState, useRef, useCallback } from 'react';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface OrderTypeSelectorProps {
  tradingMode: 'spot' | 'futures';
  orderType: 'buy' | 'long' | 'short';
  onOrderTypeChange: (type: 'buy' | 'long' | 'short') => void;
}

export function OrderTypeSelector({ tradingMode, orderType, onOrderTypeChange }: OrderTypeSelectorProps) {
  const getOrderTypeColor = (type: string) => {
    if (type === 'buy' || type === 'long') return 'text-green-400';
    return 'text-red-400';
  };

  const getOrderTypeIcon = (type: string) => {
    if (type === 'buy' || type === 'long') return <TrendingUpIcon className="w-4 h-4" />;
    return <TrendingDownIcon className="w-4 h-4" />;
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Order Type
      </label>
      <div className="flex space-x-2">
        {tradingMode === 'spot' ? (
          <>
            <button
              onClick={() => onOrderTypeChange('buy')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border transition-all ${
                orderType === 'buy'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {getOrderTypeIcon('buy')}
              <span>Buy</span>
            </button>
            <button
              onClick={() => onOrderTypeChange('sell')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border transition-all ${
                orderType === 'sell'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {getOrderTypeIcon('sell')}
              <span>Sell</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onOrderTypeChange('long')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border transition-all ${
                orderType === 'long'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {getOrderTypeIcon('long')}
              <span>Long</span>
            </button>
            <button
              onClick={() => onOrderTypeChange('short')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border transition-all ${
                orderType === 'short'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {getOrderTypeIcon('short')}
              <span>Short</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

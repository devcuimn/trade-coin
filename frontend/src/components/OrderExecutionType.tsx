import { useState, useRef, useCallback } from 'react';

interface OrderExecutionTypeProps {
  tradingMode: 'spot' | 'futures';
  orderExecutionType: 'market' | 'limit' | 'stop-limit' | 'stop-loss';
  onOrderExecutionTypeChange: (type: 'market' | 'limit' | 'stop-limit' | 'stop-loss') => void;
}

export function OrderExecutionType({ tradingMode, orderExecutionType, onOrderExecutionTypeChange }: OrderExecutionTypeProps) {
  const getOrderTypeDescription = (type: string) => {
    switch (type) {
      case 'market':
        return 'Execute immediately at current market price';
      case 'limit':
        return 'Execute only at specified price or better';
      case 'stop-limit':
        return 'Buy/Sell when price reaches trigger level';
      case 'stop-loss':
        return 'Sell when price drops to trigger level';
      default:
        return '';
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'market':
        return 'text-blue-400';
      case 'limit':
        return 'text-green-400';
      case 'stop-limit':
        return 'text-yellow-400';
      case 'stop-loss':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const availableTypes = tradingMode === 'spot' 
    ? ['limit'] 
    : ['limit', 'stop-limit'];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Order Execution Type
      </label>
      <div className="space-y-2">
        {availableTypes.map((type) => (
          <div key={type} className="flex items-center space-x-3">
            <input
              type="radio"
              id={type}
              name="orderExecutionType"
              value={type}
              checked={orderExecutionType === type}
              onChange={() => onOrderExecutionTypeChange(type as any)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
            />
            <label htmlFor={type} className="flex-1 cursor-pointer">
              <div className={`font-medium ${getOrderTypeColor(type)}`}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
              </div>
              <div className="text-xs text-gray-400">
                {getOrderTypeDescription(type)}
              </div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

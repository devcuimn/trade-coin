import { useState, useRef, useCallback } from 'react';
import { DollarSignIcon } from 'lucide-react';

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

export function PriceInput({ value, onChange, placeholder = "0.00", label }: PriceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue && !isNaN(parseFloat(inputValue))) {
      const formatted = parseFloat(inputValue).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      if (inputRef.current) {
        inputRef.current.value = formatted;
      }
      onChange(formatted);
    }
  }, [onChange]);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

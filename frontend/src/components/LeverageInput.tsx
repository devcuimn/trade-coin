import { useState, useRef, useCallback } from 'react';

interface LeverageInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function LeverageInput({ value, onChange }: LeverageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLeverageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '' || (!isNaN(parseFloat(inputValue)) && parseFloat(inputValue) >= 1 && parseFloat(inputValue) <= 125)) {
      onChange(inputValue);
    }
  }, [onChange]);

  const handleLeverageInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.value === '') {
      input.value = '1';
      onChange('1');
    }
  }, [onChange]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Leverage
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleLeverageChange}
          onInput={handleLeverageInput}
          placeholder="10"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
          x
        </div>
      </div>
    </div>
  );
}

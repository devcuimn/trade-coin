import { WalletIcon, RefreshCwIcon } from 'lucide-react';

interface TradingHeaderProps {
  accountName: string;
  spotBalance: number;
  futuresBalance: number;
  onManualSync?: () => void;
}

export function TradingHeader({ accountName, spotBalance, futuresBalance, onManualSync }: TradingHeaderProps) {
  return (
    <div className="max-w-6xl mx-auto mb-6">
      <div className="glass-card rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <WalletIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary">{accountName}</h1>
              <p className="text-secondary text-xs">Professional Crypto Trading Platform</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="glass rounded-lg px-4 py-2 min-w-[120px]">
              <p className="text-muted text-xs mb-1 font-medium">Spot Balance</p>
              <p className="text-lg font-bold text-green-400">
                ${spotBalance.toLocaleString()}
              </p>
            </div>
            <div className="glass rounded-lg px-4 py-2 min-w-[120px]">
              <p className="text-muted text-xs mb-1 font-medium">Futures Balance</p>
              <p className="text-lg font-bold text-blue-400">
                ${futuresBalance.toLocaleString()}
              </p>
            </div>
            {onManualSync && (
              <div className="flex items-center">
                <button
                  onClick={onManualSync}
                  className="p-2 bg-green-500/10 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-all"
                  title="Sync Coins from Binance"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

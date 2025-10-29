import { WalletIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface Position {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unRealizedProfit: number;
  leverage: number;
  marginType: string;
  positionSide: string;
}

interface SpotCoin {
  asset: string;
  balance: number;
  price: number;
  value: number;
}

interface TradingHeaderProps {
  accountName: string;
  spotBalance: number | { usdtBalance: number; coins: SpotCoin[]; totalValue: number };
  futuresBalance: number | { totalBalance: number; availableBalance: number; unrealizedPnL: number; positions?: Position[] };
  onManualSync?: () => void;
  onOpenApiKeyModal?: () => void;
  onOpenTelegramModal?: () => void;
  coins?: { symbol: string; name: string; price: number; icon: string }[];
}

export function TradingHeader({ accountName, spotBalance, futuresBalance, onManualSync, onOpenApiKeyModal, onOpenTelegramModal, coins = [] }: TradingHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: Total USD */}
      <div className="glass-card rounded-xl p-4 shadow-xl">
        <div className="glass rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <WalletIcon className="w-4 h-4 text-gray-400" />
              <p className="text-muted text-xs font-medium">Total USD</p>
            </div>
            {onManualSync && (
              <button
                onClick={onManualSync}
                className="p-2 bg-green-500/10 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-all"
                title="Sync Coins from Binance"
              >
                <RefreshCwIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-2xl font-bold text-white">
            ${((typeof spotBalance === 'object' ? spotBalance.totalValue : spotBalance) + (typeof futuresBalance === 'object' ? futuresBalance.totalBalance + futuresBalance.unrealizedPnL : futuresBalance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {typeof futuresBalance === 'object' && futuresBalance.unrealizedPnL !== 0 && (
            <p className={`text-xs mt-0.5 ${futuresBalance.unrealizedPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
              PnL: {futuresBalance.unrealizedPnL > 0 ? '+' : ''}${futuresBalance.unrealizedPnL.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: 2 Wallets (Spot & Futures) */}
      <div className="glass-card rounded-xl p-4 shadow-xl">
        <div className="flex items-stretch gap-4">
          <div className="glass rounded-lg px-4 py-3 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUpIcon className="w-4 h-4 text-green-400" />
              <p className="text-muted text-xs font-medium">Spot</p>
            </div>
            {typeof spotBalance === 'object' ? (
              <p className="text-lg font-bold text-gray-400">
                ${spotBalance.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="text-lg font-bold text-gray-400">
                ${spotBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
          
          <div className="glass rounded-lg px-4 py-3 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDownIcon className="w-4 h-4 text-blue-400" />
              <p className="text-muted text-xs font-medium">Futures</p>
            </div>
            {typeof futuresBalance === 'object' ? (
              <div>
                <p className={`text-lg font-bold ${futuresBalance.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${(futuresBalance.totalBalance + futuresBalance.unrealizedPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Avail: ${futuresBalance.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {futuresBalance.unrealizedPnL !== 0 && (
                  <p className={`text-xs mt-0.5 ${futuresBalance.unrealizedPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    PnL: {futuresBalance.unrealizedPnL > 0 ? '+' : ''}${futuresBalance.unrealizedPnL.toFixed(2)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-lg font-bold text-gray-400">
                ${futuresBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {onOpenApiKeyModal && (
              <button
                onClick={onOpenApiKeyModal}
                className="p-2 bg-purple-500/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all"
                title="Configure API Keys"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            )}
            {onOpenTelegramModal && (
              <button
                onClick={onOpenTelegramModal}
                className="p-2 bg-blue-500/10 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all"
                title="Configure Telegram Notifications"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Spot Coins List */}
      {typeof spotBalance === 'object' && spotBalance.coins && spotBalance.coins.filter(c => c.value > 1).length > 0 && (
        <div className="glass-card rounded-xl p-4 shadow-xl">
          <p className="text-muted text-xs mb-2 font-medium">Spot Coins</p>
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {spotBalance.coins.filter((c) => c.value > 1).map((coin, idx) => (
              <div key={idx} className="text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-blue-400">{coin.asset.charAt(0)}</span>
                  </div>
                  <span className="text-gray-300">{coin.asset}</span>
                </div>
                <span className="text-gray-400 font-medium">${coin.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: Open Positions */}
      {typeof futuresBalance === 'object' && futuresBalance.positions && futuresBalance.positions.length > 0 && (
        <div className="glass-card rounded-xl p-4 shadow-xl">
          <p className="text-muted text-xs mb-2 font-medium">Open Positions</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {futuresBalance.positions.map((pos, idx) => (
              <div key={idx} className="text-xs flex justify-between items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-gray-300 font-medium">{pos.symbol.replace('USDT', '')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-medium">
                    {pos.leverage}x
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-medium">
                    {pos.marginType.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className={`font-medium ${pos.unRealizedProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pos.unRealizedProfit > 0 ? '+' : ''}{pos.unRealizedProfit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
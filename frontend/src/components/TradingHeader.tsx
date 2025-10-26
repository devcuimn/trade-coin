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
}

export function TradingHeader({ accountName, spotBalance, futuresBalance, onManualSync, onOpenApiKeyModal }: TradingHeaderProps) {
  return (
    <div className="max-w-6xl mx-auto mb-6">
      <div className="glass-card rounded-xl p-4 shadow-xl">
        <div className="flex items-stretch gap-8">
          <div className="glass rounded-lg px-4 py-2 w-[130px] relative">
            <div className="flex items-center gap-2 mb-1">
              <WalletIcon className="w-4 h-4 text-gray-400" />
              <p className="text-muted text-xs font-medium">Total USD</p>
            </div>
            <p className="text-2xl font-bold text-white">
              ${((typeof spotBalance === 'object' ? spotBalance.totalValue : spotBalance) + (typeof futuresBalance === 'object' ? futuresBalance.totalBalance : futuresBalance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {typeof futuresBalance === 'object' && futuresBalance.unrealizedPnL !== 0 && (
              <p className={`text-xs mt-0.5 ${futuresBalance.unrealizedPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
                PnL: {futuresBalance.unrealizedPnL > 0 ? '+' : ''}${futuresBalance.unrealizedPnL.toFixed(2)}
              </p>
            )}
          </div>
          
          <div className="flex-1 flex justify-end">
            <div className="flex items-stretch gap-4">
            <div className="glass rounded-lg px-3 py-2 w-[130px] relative">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUpIcon className="w-4 h-4 text-green-400" />
                <p className="text-muted text-[10px] font-medium whitespace-nowrap">Spot</p>
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
            {typeof spotBalance === 'object' && spotBalance.coins && spotBalance.coins.length > 0 && (
              <div className="glass rounded-lg px-4 py-2 w-[150px] relative">
                <p className="text-muted text-xs mb-1 font-medium">Spot Coins</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {spotBalance.coins.map((coin, idx) => (
                    <div key={idx} className="text-xs flex justify-between items-center">
                      <span className="text-gray-300">{coin.asset}</span>
                      <span className="ml-2 text-gray-400 font-medium">${coin.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="glass rounded-lg px-4 py-2 w-[130px] relative">
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
            {typeof futuresBalance === 'object' && futuresBalance.positions && futuresBalance.positions.length > 0 && (
              <div className="glass rounded-lg px-4 py-2 w-[150px] relative">
                <p className="text-muted text-xs mb-1 font-medium">Open Positions</p>
                <div className="space-y-1">
                  {futuresBalance.positions.map((pos, idx) => (
                    <div key={idx} className="text-xs flex justify-between items-center">
                      <span className="text-gray-300">{pos.symbol.replace('USDT', '')}</span>
                      <span className={`ml-2 font-medium ${pos.unRealizedProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pos.unRealizedProfit > 0 ? '+' : ''}{pos.unRealizedProfit.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

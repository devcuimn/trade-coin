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
  executedPrice?: number;
}

interface OrderListProps {
  orders: Order[];
  onDeleteOrder: (orderId: string) => void;
  getCurrentPrice: (coinSymbol: string, mode?: 'spot' | 'futures') => number;
  calculatePnL: (order: Order) => number;
  formatAmount: (amount: number, coinSymbol: string) => string;
  getCoinIcon: (coinSymbol: string, mode?: 'spot' | 'futures') => string;
  getPriceChangeColor: (coinSymbol: string, mode?: 'spot' | 'futures') => string;
}

export function OrderList({ 
  orders, 
  onDeleteOrder,
  getCurrentPrice, 
  calculatePnL, 
  formatAmount, 
  getCoinIcon,
  getPriceChangeColor
}: OrderListProps) {
  return (
    <div>
      {orders.length > 0 && (
        <div className="overflow-x-auto custom-scrollbar" style={{maxHeight: '450px', overflowY: 'auto'}}>
          <table className="w-full min-w-max">
            <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm">
              <tr className="border-b border-slate-600/30">
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-24">
                  Time
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-20">
                  Asset
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 w-16">
                  Current
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Stop
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Limit
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Total USD
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-20">
                  Amount
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-12">
                  P&L
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-12">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const currentPrice = getCurrentPrice(order.coin, order.mode);
                const pnl = calculatePnL(order);
                
                // Format timestamp
                const timestamp = new Date(order.timestamp);
                const year = timestamp.getFullYear();
                const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                const day = String(timestamp.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                const timeStr = timestamp.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
                
                return (
                  <tr key={order.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-2 px-2 text-xs font-medium text-slate-300">
                      <div className="flex items-center space-x-2">
                        <div className={`w-0.5 h-6 ${
                          order.mode === 'spot' ? 'bg-blue-400' : 'bg-purple-400'
                        }`}></div>
                        <div className="flex flex-col">
                          <span>{dateStr}</span>
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1">
                          <div className="w-5 h-5 rounded-full bg-slate-600/50 flex items-center justify-center text-xs font-bold text-slate-300">
                            {getCoinIcon(order.coin, order.mode)?.startsWith('http') ? (
                              <>
                                <img 
                                  src={getCoinIcon(order.coin, order.mode)} 
                                  alt={order.coin}
                                  className="w-4 h-4 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                                <span style={{display: 'none'}}>{order.coin.slice(0, 2)}</span>
                              </>
                            ) : (
                              <span>{getCoinIcon(order.coin, order.mode)}</span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-white">{order.coin.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className={`text-xs font-bold px-1 py-0.5 rounded ${
                            order.type === 'buy' || order.type === 'long'
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {order.type === 'buy' ? 'B' : order.type === 'long' ? 'L' : order.type === 'short' ? 'S' : 'S'}
                          </span>
                          {order.leverage && order.leverage > 1 && (
                            <span className="text-xs font-bold px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">
                              {order.leverage}x
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-xs font-medium ${getPriceChangeColor(order.coin, order.mode)}`}>
                        ${currentPrice.toString()}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-xs font-medium text-slate-300">
                        {order.triggerPrice ? `$${order.triggerPrice.toString()}` : '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-white">
                          ${order.price.toString()}
                        </span>
                        {order.executedPrice && (
                          <span className="text-xs font-medium text-green-400">
                            ${order.executedPrice.toFixed(8)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-xs font-medium text-white">
                        ${order.total.toString()}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-xs font-medium text-white">
                        {formatAmount(order.amount, order.coin)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-xs font-medium ${
                        order.status === 'matched' && pnl > 0 ? 'text-green-400' : 
                        order.status === 'matched' && pnl < 0 ? 'text-red-400' : 'text-slate-300'
                      }`}>
                        {order.status === 'matched' && pnl !== 0 ? `$${pnl.toFixed(1)}` : '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {order.status === 'matched' ? (
                        <div className="p-1 text-green-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                          title="Delete Order"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
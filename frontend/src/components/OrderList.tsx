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

interface OrderListProps {
  orders: Order[];
  onDeleteOrder: (orderId: string) => void;
  getCurrentPrice: (coinSymbol: string) => number;
  calculatePnL: (order: Order) => number;
  formatAmount: (amount: number, coinSymbol: string) => string;
  getCoinIcon: (coinSymbol: string) => string;
}

export function OrderList({ 
  orders, 
  onDeleteOrder,
  getCurrentPrice, 
  calculatePnL, 
  formatAmount, 
  getCoinIcon 
}: OrderListProps) {
  return (
    <div>
      {orders.length > 0 && (
        <div className="overflow-x-auto custom-scrollbar" style={{maxHeight: '450px', overflowY: 'auto'}}>
          <table className="w-full min-w-max">
            <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm">
              <tr className="border-b border-slate-600/30">
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-10">
                  #
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Asset
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 w-16">
                  Current
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Trigger
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Entry
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Total USD
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-20">
                  Amount
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-slate-400 w-16">
                  Value
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
              {orders.map((order, index) => {
                const currentPrice = getCurrentPrice(order.coin);
                const pnl = calculatePnL(order);
                
                return (
                  <tr key={order.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-2 px-2 text-xs font-medium text-slate-300">
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          order.mode === 'spot' ? 'bg-blue-400' : 'bg-purple-400'
                        }`}></div>
                        <span>{orders.length - index}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center space-x-1">
                        <div className="w-5 h-5 rounded-full bg-slate-600/50 flex items-center justify-center text-xs font-bold text-slate-300">
                          {getCoinIcon(order.coin)?.startsWith('http') ? (
                            <img 
                              src={getCoinIcon(order.coin)} 
                              alt={order.coin}
                              className="w-4 h-4 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const span = target.nextElementSibling as HTMLElement;
                                if (span) span.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <span style={{display: getCoinIcon(order.coin)?.startsWith('http') ? 'none' : 'block'}}>
                            {getCoinIcon(order.coin)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-white">{order.coin}</span>
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
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                        <span className="text-xs font-medium text-white">
                          ${currentPrice.toString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-xs font-medium text-slate-300">
                        {order.triggerPrice ? `$${order.triggerPrice.toString()}` : '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-xs font-medium text-white">
                        ${order.price.toString()}
                      </span>
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
                      <span className="text-xs font-medium text-slate-300">
                        -
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-xs font-medium ${
                        order.status === 'matched' && pnl > 0 ? 'text-green-400' : 
                        order.status === 'matched' && pnl < 0 ? 'text-red-400' : 'text-slate-300'
                      }`}>
                        {order.status === 'matched' && pnl !== 0 ? `$${pnl.toString()}` : '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
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
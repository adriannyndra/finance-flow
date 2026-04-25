'use client';

import { useState } from 'react';
import { MOCK_INVESTMENTS } from '@/lib/mock-data';
import { Investment, InvestmentType } from '@/lib/types';

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>(MOCK_INVESTMENTS);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    type: 'stock' as InvestmentType,
    quantity: '',
    buyPrice: '',
    currentPrice: '',
  });

  const totalInvested = investments.reduce((acc, inv) => acc + (inv.buyPrice * inv.quantity), 0);
  const currentValue = investments.reduce((acc, inv) => acc + (inv.currentPrice * inv.quantity), 0);
  const totalGainLoss = currentValue - totalInvested;
  const totalGainLossPercentage = (totalGainLoss / totalInvested) * 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newInv: Investment = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      symbol: formData.symbol.toUpperCase(),
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      buyPrice: parseFloat(formData.buyPrice),
      currentPrice: parseFloat(formData.currentPrice),
      date: new Date().toISOString().split('T')[0],
    };

    setInvestments([newInv, ...investments]);
    setIsAdding(false);
    setFormData({
      name: '',
      symbol: '',
      type: 'stock',
      quantity: '',
      buyPrice: '',
      currentPrice: '',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Portfolio</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Track your assets and performance</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-500 transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add Asset'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Total Invested</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-50">
            ${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Current Value</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-50">
            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Total Gain/Loss</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold mt-1 ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalGainLoss >= 0 ? '+' : ''}${Math.abs(totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className={`text-sm font-medium ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ({totalGainLossPercentage >= 0 ? '+' : ''}{totalGainLossPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Asset Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="e.g. Bitcoin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Symbol</label>
                <input
                  type="text"
                  required
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="e.g. BTC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as InvestmentType })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                >
                  <option value="stock">Stock / Saham</option>
                  <option value="crypto">Crypto</option>
                  <option value="stake">Stake / Ownership</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Quantity</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Buy Price (Avg)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.buyPrice}
                  onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Price</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-500 transition-colors mt-2"
            >
              Add to Portfolio
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Holdings</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Buy Price</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Current</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Gain/Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {investments.map((inv) => {
                const invGainLoss = (inv.currentPrice - inv.buyPrice) * inv.quantity;
                const invGainLossPerc = ((inv.currentPrice - inv.buyPrice) / inv.buyPrice) * 100;
                
                return (
                  <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{inv.name}</span>
                        <span className="text-xs text-zinc-500">{inv.symbol} • {inv.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50 text-right">
                      {inv.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 text-right">
                      ${inv.buyPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50 text-right font-medium">
                      ${inv.currentPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold ${invGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {invGainLoss >= 0 ? '+' : ''}${Math.abs(invGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-xs font-medium ${invGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {invGainLossPerc >= 0 ? '+' : ''}{invGainLossPerc.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

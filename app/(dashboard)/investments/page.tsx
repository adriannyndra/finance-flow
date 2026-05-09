'use client';

import { useState, useMemo, useEffect } from 'react';
import { Investment, InvestmentType } from '@/lib/types';
import StockChart from '@/components/StockChart';
import { Trash2, Filter, Search, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [filter, setFilter] = useState<'all' | InvestmentType>('all');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const supabase = createClient();
  const userId = getUserId();

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    type: 'stock' as InvestmentType,
    totalInvested: '',
    buyPrice: '',
    currentPrice: '',
  });

  useEffect(() => {
    fetchInvestments();
  }, [userId]);

  const fetchInvestments = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ff_investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investments:', error);
    } else {
      const mappedData: Investment[] = (data || []).map(inv => ({
        id: inv.id,
        name: inv.name,
        symbol: inv.symbol,
        type: inv.type,
        quantity: Number(inv.quantity),
        buyPrice: Number(inv.buy_price),
        currentPrice: Number(inv.current_price || 0),
        date: inv.date
      }));
      setInvestments(mappedData);
      if (mappedData.length > 0 && !selectedInvestment) {
        setSelectedInvestment(mappedData.find(inv => inv.type !== 'stake') || mappedData[0]);
      }
    }
    setLoading(false);
  };

  const fetchCurrentPrice = async () => {
    if (!formData.symbol) return;
    setIsFetchingPrice(true);
    try {
      const response = await fetch(`/api/stock/history?symbol=${formData.symbol}&range=1d`);
      const data = await response.json();
      if (response.ok && data.length > 0) {
        const price = data[data.length - 1].price;
        setFormData(prev => ({ ...prev, currentPrice: price.toString() }));
      } else {
        alert(`Gagal mengambil harga untuk ${formData.symbol}. Mohon cek kembali simbolnya (contoh: BBCA.JK atau BTC).`);
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat mengambil harga.');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const filteredInvestments = useMemo(() => {
    if (filter === 'all') return investments;
    return investments.filter(inv => inv.type === filter);
  }, [investments, filter]);

  const totalInvested = investments.reduce((acc, inv) => acc + (inv.buyPrice * inv.quantity), 0);
  const currentValue = investments.reduce((acc, inv) => acc + (inv.currentPrice * inv.quantity), 0);
  const totalGainLoss = currentValue - totalInvested;
  const totalGainLossPercentage = totalInvested !== 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const buyPrice = parseFloat(formData.buyPrice);
    const totalAmount = parseFloat(formData.totalInvested);
    const quantity = totalAmount / buyPrice;

    const { data, error } = await supabase
      .from('ff_investments')
      .insert([
        {
          user_id: userId,
          name: formData.name,
          symbol: formData.symbol.toUpperCase(),
          type: formData.type,
          quantity: quantity,
          buy_price: buyPrice,
          current_price: parseFloat(formData.currentPrice),
          date: new Date().toISOString().split('T')[0],
        }
      ])
      .select();

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
    } else {
      setInvestments([data[0], ...investments]);
      setIsAdding(false);
      setFormData({
        name: '',
        symbol: '',
        type: 'stock',
        totalInvested: '',
        buyPrice: '',
        currentPrice: '',
      });
    }
  };

  const deleteInvestment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus aset ini?')) return;

    const { error } = await supabase
      .from('ff_investments')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      setInvestments(investments.filter(inv => inv.id !== id));
      if (selectedInvestment?.id === id) {
        setSelectedInvestment(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

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
            {formatIDR(totalInvested)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Current Value</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-50">
            {formatIDR(currentValue)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Total Gain/Loss</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold mt-1 ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalGainLoss >= 0 ? '+' : '-'}{formatIDR(Math.abs(totalGainLoss))}
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
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Symbol</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    placeholder="e.g. BTC"
                  />
                  {formData.type !== 'stake' && (
                    <button
                      type="button"
                      onClick={fetchCurrentPrice}
                      disabled={isFetchingPrice || !formData.symbol}
                      className="bg-zinc-100 p-2 rounded-lg text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      title="Ambil Harga Terbaru"
                    >
                      {isFetchingPrice ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                  )}
                </div>
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
                  <option value="stake">Lainnya / Others</option>
                </select>
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
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Money Invested</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.totalInvested}
                  onChange={(e) => setFormData({ ...formData, totalInvested: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Current Price {formData.type !== 'stake' && <span className="text-[10px] text-emerald-600 font-bold ml-1">(Auto-fetched)</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  disabled={formData.type !== 'stake'}
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white disabled:bg-zinc-50 dark:disabled:bg-zinc-900/50"
                  placeholder={formData.type === 'stake' ? "0" : "Klik cari untuk isi"}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!formData.currentPrice}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-500 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Portfolio
            </button>
          </form>
        </div>
      )}

      {selectedInvestment && selectedInvestment.type !== 'stake' && (
        <StockChart 
          symbol={selectedInvestment.symbol} 
          name={selectedInvestment.name} 
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-lg dark:bg-zinc-800 shrink-0">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-bold text-zinc-500 uppercase">Filters</span>
          </div>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('stock')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              filter === 'stock'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
            }`}
          >
            Saham
          </button>
          <button
            onClick={() => setFilter('crypto')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              filter === 'crypto'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
            }`}
          >
            Crypto
          </button>
          <button
            onClick={() => setFilter('stake')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              filter === 'stake'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
            }`}
          >
            Lainnya
          </button>
        </div>

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
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredInvestments.map((inv) => {
                  const invGainLoss = (inv.currentPrice - inv.buyPrice) * inv.quantity;
                  const invGainLossPerc = ((inv.currentPrice - inv.buyPrice) / inv.buyPrice) * 100;
                  const isSelected = selectedInvestment?.id === inv.id;
                  
                  return (
                    <tr 
                      key={inv.id} 
                      onClick={() => inv.type !== 'stake' && setSelectedInvestment(inv)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected 
                          ? 'bg-emerald-50/50 dark:bg-emerald-900/10' 
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{inv.name}</span>
                          <span className="text-xs text-zinc-500">{inv.symbol} • {inv.type === 'stake' ? 'Lainnya' : inv.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50 text-right">
                        {inv.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 text-right">
                        {formatIDR(inv.buyPrice)}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50 text-right font-medium">
                        {formatIDR(inv.currentPrice)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold ${invGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {invGainLoss >= 0 ? '+' : '-'}{formatIDR(Math.abs(invGainLoss))}
                          </span>
                          <span className={`text-xs font-medium ${invGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {invGainLossPerc >= 0 ? '+' : ''}{invGainLossPerc.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => deleteInvestment(inv.id, e)}
                          className="p-2 text-zinc-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus Aset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, Trash2 } from 'lucide-react';

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const supabase = createClient();
  const userId = getUserId();

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense' as TransactionType,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const initTransactions = async () => {
      if (userId) {
        await fetchTransactions(userId);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetchTransactions(user.id);
        } else {
          setLoading(false);
        }
      }
    };
    initTransactions();
  }, [userId]);

  const fetchTransactions = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ff_transactions')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const { data, error } = await supabase
      .from('ff_transactions')
      .insert([
        {
          user_id: userId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category: formData.category,
          type: formData.type,
          date: formData.date,
        }
      ])
      .select();

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
    } else {
      setTransactions([data[0], ...transactions]);
      setIsAdding(false);
      setFormData({
        amount: '',
        description: '',
        category: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;

    const { error } = await supabase
      .from('ff_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      setTransactions(transactions.filter(t => t.id !== id));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Transactions</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-500 transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add New'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                >
                  <option value="expense">Expense / Pengeluaran</option>
                  <option value="income">Income / Pemasukan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount (IDR)</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="Beli apa?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="Makanan, Gaji, Transport..."
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-500 transition-colors mt-2"
            >
              Save Transaction
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap">{t.date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">{t.description}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    <span className="px-2 py-1 bg-zinc-100 rounded-md text-xs font-medium dark:bg-zinc-800 dark:text-zinc-400">
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${
                    t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-50'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

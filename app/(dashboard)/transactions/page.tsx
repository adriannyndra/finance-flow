'use client';

import { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, Trash2, Edit2, X, Check } from 'lucide-react';

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper to format input string with thousands separators
const formatNumberInput = (value: string) => {
  if (!value) return '';
  const number = value.replace(/\D/g, '');
  if (!number) return '';
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper to parse the formatted string back to a number
const parseNumberInput = (formattedValue: string) => {
  return formattedValue.replace(/\./g, '');
};

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Housing & Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Personal Care",
  "Education",
  "Gifts & Donations",
  "Bills",
  "Other"
];

const INCOME_CATEGORIES = [
  "Primary",
  "Secondary",
  "Other"
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(getUserId());

  const supabase = createClient();

  const [formData, setFormData] = useState({
    amountDisplay: '',
    description: '',
    category: EXPENSE_CATEGORIES[0],
    type: 'expense' as TransactionType,
    date: new Date().toISOString().split('T')[0],
  });

  const [editFormData, setEditFormData] = useState({
    amountDisplay: '',
    description: '',
    category: '',
    type: 'expense' as TransactionType,
    date: '',
  });

  // Reset category when type changes in main form
  useEffect(() => {
    if (!isAdding) return;
    const categories = formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    setFormData(prev => ({ ...prev, category: categories[0] }));
  }, [formData.type, isAdding]);

  // Reset category when type changes in edit form
  useEffect(() => {
    if (!editingId) return;
    const categories = editFormData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!categories.includes(editFormData.category)) {
        setEditFormData(prev => ({ ...prev, category: categories[0] }));
    }
  }, [editFormData.type, editingId]);

  useEffect(() => {
    const initTransactions = async () => {
      let uid = currentUserId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          uid = user.id;
          setCurrentUserId(user.id);
        }
      }

      if (uid) {
        await fetchTransactions(uid);
      } else {
        setLoading(false);
      }
    };
    initTransactions();
  }, []);

  const fetchTransactions = async (uid: string) => {
    setLoading(true);
    try {
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
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let uid = currentUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uid = user.id;
        setCurrentUserId(user.id);
      } else {
        alert("Sesi berakhir. Silakan login kembali.");
        return;
      }
    }

    const rawAmount = parseNumberInput(formData.amountDisplay);
    if (!rawAmount) {
      alert("Masukkan jumlah nominal.");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('ff_transactions')
        .insert([
          {
            user_id: uid,
            amount: parseFloat(rawAmount),
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
          amountDisplay: '',
          description: '',
          category: formData.type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
          type: formData.type,
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (id: string) => {
    const rawAmount = parseNumberInput(editFormData.amountDisplay);
    if (!rawAmount) return;

    try {
      const { data, error } = await supabase
        .from('ff_transactions')
        .update({
          amount: parseFloat(rawAmount),
          description: editFormData.description,
          category: editFormData.category,
          type: editFormData.type,
          date: editFormData.date,
        })
        .eq('id', id)
        .select();

      if (error) {
        alert(`Gagal memperbarui: ${error.message}`);
      } else {
        setTransactions(transactions.map(t => t.id === id ? data[0] : t));
        setEditingId(null);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setEditFormData({
      amountDisplay: formatNumberInput(t.amount.toString()),
      description: t.description,
      category: t.category,
      type: t.type,
      date: t.date,
    });
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;

    try {
      const { error } = await supabase
        .from('ff_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Gagal menghapus: ${error.message}`);
      } else {
        setTransactions(transactions.filter(t => t.id !== id));
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  const currentCategories = formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const editCategories = editFormData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Transactions</h2>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
          }}
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
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">Rp</span>
                  <input
                    type="text"
                    required
                    value={formData.amountDisplay}
                    onChange={(e) => setFormData({ ...formData, amountDisplay: formatNumberInput(e.target.value) })}
                    className="block w-full rounded-lg border border-zinc-300 pl-10 pr-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
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
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                >
                  {currentCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-500 transition-colors mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Transaction'
              )}
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
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  {editingId === t.id ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="date"
                          value={editFormData.date}
                          onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={editFormData.category}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        >
                          {editCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <select
                            value={editFormData.type}
                            onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as TransactionType })}
                            className="text-xs rounded border border-zinc-300 px-1 dark:bg-zinc-800 dark:border-zinc-700"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">Rp</span>
                            <input
                              type="text"
                              value={editFormData.amountDisplay}
                              onChange={(e) => setEditFormData({ ...editFormData, amountDisplay: formatNumberInput(e.target.value) })}
                              className="w-32 rounded-md border border-zinc-300 pl-6 pr-2 py-1 text-sm text-right dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditSubmit(t.id)}
                            className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Simpan"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors"
                            title="Batal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEditing(t)}
                            className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(t.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

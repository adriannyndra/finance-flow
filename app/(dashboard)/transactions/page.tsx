'use client';

import { useState } from 'react';
import { MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { Transaction, TransactionType } from '@/lib/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense' as TransactionType,
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      type: formData.type,
      date: formData.date,
    };

    setTransactions([newTransaction, ...transactions]);
    setIsAdding(false);
    setFormData({
      amount: '',
      description: '',
      category: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
    });
  };

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
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                  placeholder="0.00"
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
                  placeholder="Where did it go?"
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
                  placeholder="Food, Rent, Salary..."
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
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
                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
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

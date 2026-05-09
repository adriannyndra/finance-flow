'use client';

import { useState, useEffect } from 'react';
import { Transaction, Investment } from '@/lib/types';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import Link from 'next/link';

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');

  const supabase = createClient();
  const userId = getUserId();

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch user info
      const { data: userData } = await supabase
        .from('ff_user')
        .select('username')
        .eq('id', userId)
        .single();
      
      if (userData) setUserName(userData.username);

      // Fetch transactions
      const { data: transData } = await supabase
        .from('ff_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      // Fetch investments
      const { data: investData } = await supabase
        .from('ff_investments')
        .select('*')
        .eq('user_id', userId);

      setTransactions(transData || []);
      setInvestments(investData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpenses;

  const totalInvested = investments.reduce((acc, inv) => acc + (inv.buyPrice * inv.quantity), 0);
  const currentInvestValue = investments.reduce((acc, inv) => acc + (inv.currentPrice * inv.quantity), 0);
  const investGainLoss = currentInvestValue - totalInvested;

  const recentTransactions = transactions.slice(0, 5);

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
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Overview</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Selamat datang kembali, {userName}!</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 dark:bg-emerald-900/20 dark:text-emerald-400">
          <Wallet className="w-4 h-4" />
          {formatIDR(balance + currentInvestValue)} Net Worth
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Saldo Tunai</p>
          <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-rose-600'}`}>
            {formatIDR(balance)}
          </p>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center text-xs font-medium text-emerald-600">
              <ArrowDownLeft className="w-3 h-3 mr-1" /> {formatIDR(totalIncome)}
            </div>
            <div className="flex items-center text-xs font-medium text-rose-600">
              <ArrowUpRight className="w-3 h-3 mr-1" /> {formatIDR(totalExpenses)}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Nilai Investasi</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-50">
            {formatIDR(currentInvestValue)}
          </p>
          <div className={`flex items-center mt-4 text-xs font-medium ${investGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {investGainLoss >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {investGainLoss >= 0 ? '+' : ''}{formatIDR(investGainLoss)} total profit
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-center">
          <p className="text-sm font-medium text-zinc-500 text-center">Mulai Kelola Keuangan</p>
          <div className="flex gap-2 mt-4">
            <Link href="/transactions" className="flex-1 text-center bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-500 transition-colors">
              + Transaksi
            </Link>
            <Link href="/investments" className="flex-1 text-center bg-zinc-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors dark:bg-zinc-800 dark:hover:bg-zinc-700">
              + Aset
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Aktivitas Terakhir</h3>
          <Link href="/transactions" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">Lihat semua</Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
          {recentTransactions.length > 0 ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentTransactions.map((t) => (
                <li key={t.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {t.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t.description}</p>
                      <p className="text-xs text-zinc-500">{t.category} • {t.date}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${
                    t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-50'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-zinc-500">Belum ada transaksi terbaru.</div>
          )}
        </div>
      </div>
    </div>
  );
}

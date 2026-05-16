'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction, Investment } from '@/core/entities';
import { formatIDR } from '@/core/formatters/currency';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import DashboardChart from '@/components/DashboardChart';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

const transactionRepository = new SupabaseTransactionRepository();

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  
  // Table state
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const supabase = createClient();
  const userId = getUserId();

  useEffect(() => {
    const initDashboard = async () => {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) uid = user.id;
      }

      if (uid) {
        await fetchDashboardData(uid);
      } else {
        setLoading(false);
      }
    };
    
    initDashboard();
  }, [userId]);

  const fetchDashboardData = async (uid: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
        setUserName(displayName);
      }

      const transData = await transactionRepository.getTransactions(uid);

      const { data: investData } = await supabase
        .from('ff_investments')
        .select('*')
        .eq('user_id', uid);

      const mappedInvestments: Investment[] = (investData || []).map(inv => ({
        id: inv.id,
        name: inv.name,
        symbol: inv.symbol,
        type: inv.type,
        quantity: Number(inv.quantity),
        buyPrice: Number(inv.buy_price),
        currentPrice: Number(inv.current_price || 0),
        date: inv.date
      }));

      setTransactions(transData || []);
      setInvestments(mappedInvestments);
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

  // Table Logic
  const processedTransactions = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    let filtered = transactions.filter(t => new Date(t.date) >= oneMonthAgo);
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  }, [transactions, sortOrder]);

  const totalPages = Math.ceil(processedTransactions.length / pageSize);
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest');
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
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <DashboardChart transactions={transactions} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Aktivitas Terakhir (1 Bulan Terakhir)</h3>
            
            <div className="flex items-center gap-3">
              <select 
                value={pageSize} 
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={10}>10 Baris</option>
                <option value={50}>50 Baris</option>
                <option value={100}>100 Baris</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Deskripsi</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Jumlah</th>
                  </tr>
                </thead>                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((t) => (
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
                          {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500">Belum ada transaksi dalam 1 bulan terakhir.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 flex items-center justify-between">
                <div className="text-xs text-zinc-500 font-medium">
                  Halaman {currentPage} dari {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 disabled:opacity-50 hover:bg-zinc-50 transition-colors dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <select
                    value={currentPage}
                    onChange={(e) => goToPage(Number(e.target.value))}
                    className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 outline-none"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <option key={p} value={p}>Hal {p}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 disabled:opacity-50 hover:bg-zinc-50 transition-colors dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction } from '@/core/entities';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import { formatIDR } from '@/core/formatters/currency';
import DashboardChart from '@/components/DashboardChart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function StatisticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'6mo' | '1y' | 'all'>('6mo');

  const supabase = createClient();
  const userId = getUserId();

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        let uid = userId;
        if (!uid) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) uid = user.id;
        }

        if (uid) {
          const { data } = await supabase
            .from('ff_transactions')
            .select('*')
            .eq('user_id', uid)
            .order('date', { ascending: true });
          setTransactions(data || []);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userId]);

  const monthlyData = useMemo(() => {
    const data: Record<string, { month: string; income: number; expense: number }> = {};
    
    // Sort transactions by date first
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

      if (!data[monthKey]) {
        data[monthKey] = { month: monthLabel, income: 0, expense: 0 };
      }

      if (t.type === 'income') {
        data[monthKey].income += t.amount;
      } else {
        data[monthKey].expense += t.amount;
      }
    });

    return Object.values(data).slice(-6); // Last 6 months for now
  }, [transactions]);

  const categoryData = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const totals: Record<string, number> = {};

    expenseTransactions.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Statistik Keuangan</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Analisis mendalam pengeluaran dan pemasukan Anda.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1 rounded-lg dark:bg-zinc-900 dark:border-zinc-800">
          <button 
            onClick={() => setTimeRange('6mo')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === '6mo' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'text-zinc-500'}`}
          >
            6 Bulan
          </button>
          <button 
            onClick={() => setTimeRange('1y')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === '1y' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'text-zinc-500'}`}
          >
            1 Tahun
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Total Pemasukan</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{formatIDR(totalIncome)}</p>
          <div className="mt-2 text-xs text-zinc-400">Semua waktu</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Total Pengeluaran</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">{formatIDR(totalExpenses)}</p>
          <div className="mt-2 text-xs text-zinc-400">Semua waktu</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Rasio Menabung</p>
          <p className={`text-2xl font-bold mt-1 ${savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {savingsRate.toFixed(1)}%
          </p>
          <div className="mt-2 text-xs text-zinc-400">Dari total pemasukan</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cash Flow Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-6">Arus Kas Bulanan</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#71717a' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#71717a' }}
                  tickFormatter={(value) => `${value / 1000000}jt`}
                />
                <Tooltip 
                  formatter={(value: any) => formatIDR(value)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <DashboardChart transactions={transactions} />
      </div>

      {/* Category Bar Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[500px] flex flex-col">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-6">Detail Pengeluaran per Kategori</h3>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} layout="vertical" margin={{ left: 40, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
              <XAxis 
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#71717a' }}
                tickFormatter={(value) => `${value / 1000000}jt`}
              />
              <YAxis 
                dataKey="name" 
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#71717a' }}
                width={120}
              />
              <Tooltip 
                formatter={(value: any) => formatIDR(value)}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7' }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={[
                    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
                    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'
                  ][index % 10]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Investment, Bill, Budget } from '@/core/entities';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, TrendingUp, TrendingDown, Target, CreditCard, BarChart3, LayoutGrid } from 'lucide-react';
import { formatIDR } from '@/core/formatters/currency';
import DashboardChart from '@/components/DashboardChart';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { SupabaseBillRepository } from '@/features/bills/infrastructure/SupabaseBillRepository';
import { SupabaseBudgetRepository } from '@/features/budgets/infrastructure/SupabaseBudgetRepository';
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
  PieChart,
  Pie,
} from 'recharts';

const transactionRepository = new SupabaseTransactionRepository();
const billRepository = new SupabaseBillRepository();
const budgetRepository = new SupabaseBudgetRepository();

export default function StatisticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'6mo' | '1y' | 'all'>('6mo');
  const [billGrouping, setBillGrouping] = useState<'category' | 'term'>('term');

  const supabase = createClient();
  const userId = getUserId();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const fetchData = useCallback(async (uid: string) => {
    try {
      const [transData, billsData, budgetsData] = await Promise.all([
        transactionRepository.getTransactions(uid),
        billRepository.getBills(uid),
        budgetRepository.getBudgets(uid, currentMonthStr)
      ]);

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
      setBills(billsData || []);
      setBudgets(budgetsData || []);
      setInvestments(mappedInvestments);
    } catch (error) {
      console.error('Error fetching stats data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentMonthStr]);

  useEffect(() => {
    const init = async () => {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) uid = user.id;
      }

      if (uid) {
        await fetchData(uid);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [userId, supabase.auth, fetchData]);

  // Section 2: Budget vs Actual Logic
  const budgetVsActualData = useMemo(() => {
    return budgets.map(budget => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === budget.category && t.date.startsWith(currentMonthStr))
        .reduce((acc, t) => acc + t.amount, 0);
      
      return {
        category: budget.category,
        Budget: budget.amount,
        Actual: spent
      };
    }).sort((a, b) => b.Budget - a.Budget);
  }, [budgets, transactions, currentMonthStr]);

  // Section 2: Bills Logic (Key Terms)
  const billAnalysisData = useMemo(() => {
    if (billGrouping === 'category') {
      const totals: Record<string, number> = {};
      bills.forEach(b => {
        if (!b.active) return;
        totals[b.category] = (totals[b.category] || 0) + b.amount;
      });
      return Object.entries(totals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }

    // Key Terms grouping
    const termsMap: Record<string, number> = {};
    bills.forEach(b => {
      if (!b.active) return;
      const words = b.name.split(' ');
      // Key term is first 2 words (e.g. "Gopay Pinjam")
      const term = words.slice(0, 2).join(' ');
      termsMap[term] = (termsMap[term] || 0) + b.amount;
    });

    return Object.entries(termsMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bills, billGrouping]);

  // Section 3: Investment Logic
  const investmentAllocation = useMemo(() => {
    const totals: Record<string, number> = {};
    investments.forEach(inv => {
      const value = inv.currentPrice * inv.quantity;
      totals[inv.type] = (totals[inv.type] || 0) + value;
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [investments]);

  const investmentPerformance = useMemo(() => {
    return investments.map(inv => ({
      name: inv.name,
      profit: (inv.currentPrice - inv.buyPrice) * inv.quantity
    })).sort((a, b) => b.profit - a.profit);
  }, [investments]);

  // Section 4: Arus Kas Logic
  const monthlyData = useMemo(() => {
    const data: Record<string, { month: string; income: number; expense: number }> = {};
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

    return Object.values(data).slice(-6);
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
    <div className="space-y-12 pb-12">
      {/* SECTION 1: HEADER & KPI OVERVIEW */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Financial Report</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Deep analysis of your assets and spending.</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1 rounded-lg dark:bg-zinc-900 dark:border-zinc-800">
            {(['6mo', '1y'] as const).map((r) => (
              <button 
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === r ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'text-zinc-500'}`}
              >
                {r === '6mo' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-zinc-500">Total Income</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{formatIDR(totalIncome)}</p>
              <div className="mt-2 text-xs text-zinc-400">Cumulative history</div>
            </div>
            <TrendingUp className="absolute -right-2 -bottom-2 w-24 h-24 text-emerald-50/50 dark:text-emerald-900/5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-zinc-500">Total Expenses</p>
              <p className="text-2xl font-bold mt-1 text-rose-600">{formatIDR(totalExpenses)}</p>
              <div className="mt-2 text-xs text-zinc-400">Cumulative history</div>
            </div>
            <TrendingDown className="absolute -right-2 -bottom-2 w-24 h-24 text-rose-50/50 dark:text-rose-900/5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-zinc-500">Savings Rate</p>
              <p className={`text-2xl font-bold mt-1 ${savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {savingsRate.toFixed(1)}%
              </p>
              <div className="mt-2 text-xs text-zinc-400">Financial efficiency</div>
            </div>
            <Target className="absolute -right-2 -bottom-2 w-24 h-24 text-amber-50/50 dark:text-amber-900/5 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>

      {/* SECTION 2: BUDGETS & BILLS ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget vs Actual */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Budget vs Actual</h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">This Month</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVsActualData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => formatIDR(value)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Budget" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Actual" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bills Treemap/Bar Analysis */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Bills Analysis</h3>
            </div>
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg dark:bg-zinc-800">
              <button 
                onClick={() => setBillGrouping('term')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${billGrouping === 'term' ? 'bg-white shadow-sm text-amber-600 dark:bg-zinc-700' : 'text-zinc-500'}`}
              >
                Key Terms
              </button>
              <button 
                onClick={() => setBillGrouping('category')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${billGrouping === 'category' ? 'bg-white shadow-sm text-amber-600 dark:bg-zinc-700' : 'text-zinc-500'}`}
              >
                Category
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billAnalysisData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#e4e4e7" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => formatIDR(value)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {billAnalysisData.map((_, index) => (
                    <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.1)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: INVESTMENT PORTFOLIO */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-zinc-900 dark:text-zinc-50" />
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Investment Portfolio</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[400px] flex flex-col">
            <h4 className="text-sm font-bold text-zinc-500 mb-6 uppercase tracking-wider">Asset Allocation</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={investmentAllocation}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {investmentAllocation.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatIDR(value)} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[400px] flex flex-col">
            <h4 className="text-sm font-bold text-zinc-500 mb-6 uppercase tracking-wider">Profit/Loss Performance</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={investmentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis hide />
                  <Tooltip formatter={(value: number) => formatIDR(value)} />
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                    {investmentPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: DEEP DIVE & TRENDS */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-zinc-900 dark:text-zinc-50" />
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Advanced Analysis</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cash Flow Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[400px] flex flex-col">
            <h4 className="text-sm font-bold text-zinc-500 mb-6 uppercase tracking-wider">Monthly Cash Flow</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => `${v/1000000}m`} />
                  <Tooltip formatter={(value: number) => formatIDR(value)} />
                  <Legend iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown (Existing) */}
          <DashboardChart transactions={transactions} />
        </div>
      </div>
    </div>
  );
}

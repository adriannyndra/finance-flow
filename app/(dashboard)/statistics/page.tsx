'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Investment, Bill, Budget, WishlistItem } from '@/core/entities';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, TrendingUp, TrendingDown, Target, CreditCard, BarChart3, LayoutGrid, Wallet, Info, PieChart as PieIcon } from 'lucide-react';
import { formatIDR } from '@/core/formatters/currency';
import DashboardChart from '@/components/DashboardChart';
import { CategoryBreakdownModal } from '@/components/CategoryBreakdownModal';
import { InfoModal } from '@/components/InfoModal';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { SupabaseBillRepository } from '@/features/bills/infrastructure/SupabaseBillRepository';
import { SupabaseBudgetRepository } from '@/features/budgets/infrastructure/SupabaseBudgetRepository';
import { SupabaseWishlistRepository } from '@/features/wishlist/infrastructure/SupabaseWishlistRepository';
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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const transactionRepository = new SupabaseTransactionRepository();
const billRepository = new SupabaseBillRepository();
const budgetRepository = new SupabaseBudgetRepository();
const wishlistRepository = new SupabaseWishlistRepository();

export default function StatisticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'6mo' | '1y' | 'all'>('6mo');
  const [billGrouping, setBillGrouping] = useState<'category' | 'term'>('term');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    items: { term: string; definition: string; color?: string; }[];
  }>({
    isOpen: false,
    title: '',
    items: [],
  });

  const supabase = createClient();
  const userId = getUserId();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const fetchData = useCallback(async (uid: string) => {
    try {
      const [transData, billsData, budgetsData, wishlistData] = await Promise.all([
        transactionRepository.getTransactions(uid),
        billRepository.getBills(uid),
        budgetRepository.getBudgets(uid, currentMonthStr),
        wishlistRepository.getWishlist(uid)
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
      setWishlist(wishlistData || []);
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

  // Section 0: Net Worth Logic
  const netWorthData = useMemo(() => {
    const monthsToShow = timeRange === '6mo' ? 6 : (timeRange === '1y' ? 12 : 24);
    const data = [];
    const now = new Date();
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Timezone-safe monthKey generation
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      // 1. Calculate Cumulative Cash (Excluding Wishlist to avoid double counting)
      const cashTransactions = transactions.filter(t => t.date <= lastDayOfMonth && !t.wishlistId);
      const cashBalance = cashTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

      // 2. Calculate Investment Value
      const investValue = investments
        .filter(inv => inv.date <= lastDayOfMonth)
        .reduce((acc, inv) => acc + (inv.currentPrice * inv.quantity), 0);

      // 3. Calculate Wishlist Savings (Cumulative)
      const wishlistSavings = transactions
        .filter(t => t.wishlistId && t.date <= lastDayOfMonth)
        .reduce((acc, t) => acc + (t.type === 'expense' ? t.amount : -t.amount), 0);

      // 4. Calculate Liabilities (Simplified: Total Debt remaining)
      const liabilities = bills.filter(b => b.billType === 'installment').reduce((acc, bill) => {
        return acc + (bill.totalAmount || 0);
      }, 0);

      data.push({
        month: monthLabel,
        Cash: cashBalance,
        Investments: investValue,
        Wishlist: wishlistSavings,
        Liabilities: -liabilities,
        Total: cashBalance + investValue + wishlistSavings - liabilities
      });
    }
    return data;
  }, [transactions, investments, bills, timeRange]);

  // Section 2: Budget vs Actual Logic (Synced with Budgets Page)
  const budgetVsActualData = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr));
    
    // Get all categories that either have a budget OR have spending
    const budgetCategories = budgets.map(b => b.category);
    const spendingCategories = expenseTransactions.map(t => t.category);
    const allCategories = Array.from(new Set([...budgetCategories, ...spendingCategories]));

    return allCategories.map(category => {
      const budget = budgets.find(b => b.category === category);
      const spent = expenseTransactions
        .filter(t => t.category === category)
        .reduce((acc, t) => acc + t.amount, 0);
      
      return {
        category: category,
        Budget: budget ? budget.amount : 0,
        Actual: spent
      };
    }).sort((a, b) => b.Budget - a.Budget || b.Actual - a.Actual);
  }, [budgets, transactions, currentMonthStr]);

  // Section 2: Bills Logic (Analytics)
  const billAnalysisData = useMemo(() => {
    if (billGrouping === 'type') {
        const totals: Record<string, number> = {
            'recurring': 0,
            'installment': 0,
            'one-time': 0
        };
        bills.forEach(b => {
            totals[b.billType] = (totals[b.billType] || 0) + b.amount;
        });
        
        const labels: Record<string, string> = {
            'recurring': 'Subscription',
            'installment': 'Installment',
            'one-time': 'One-time'
        };

        return Object.entries(totals)
            .map(([key, value]) => ({ name: labels[key], value }))
            .sort((a, b) => b.value - a.value);
    }

    if (billGrouping === 'category') {
      const totals: Record<string, number> = {};
      bills.forEach(b => {
        totals[b.category] = (totals[b.category] || 0) + b.amount;
      });
      return Object.entries(totals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }

    const termsMap: Record<string, number> = {};
    bills.forEach(b => {
      const words = b.name.split(' ');
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

  const growthBridgeData = useMemo(() => {
    const principal = investments.reduce((acc, inv) => acc + (inv.buyPrice * inv.quantity), 0);
    const profit = investments.reduce((acc, inv) => acc + (inv.currentPrice - inv.buyPrice) * inv.quantity, 0);
    
    return [
      { name: 'Principal', value: principal, fill: '#94a3b8' },
      { name: 'Growth', value: Math.max(0, profit), fill: '#10b981' },
      { name: 'Loss', value: Math.min(0, profit) * -1, fill: '#ef4444' }
    ].filter(item => item.value !== 0);
  }, [investments]);

  const riskMapData = useMemo(() => {
    const tiers: Record<string, number> = {
      'Speculative (Crypto)': 0,
      'Moderate (Stocks)': 0,
      'Other / Diversified': 0
    };

    investments.forEach(inv => {
      const val = inv.currentPrice * inv.quantity;
      if (inv.type === 'crypto') tiers['Speculative (Crypto)'] += val;
      else if (inv.type === 'stock') tiers['Moderate (Stocks)'] += val;
      else tiers['Other / Diversified'] += val;
    });

    return Object.entries(tiers)
      .map(([name, value]) => ({ name, value }))
      .filter(t => t.value > 0);
  }, [investments]);

  // Section 4: Trend Analysis Logic
  const monthlyData = useMemo(() => {
    const monthsToShow = timeRange === '6mo' ? 6 : (timeRange === '1y' ? 12 : 24);
    const data: Record<string, { month: string; monthKey: string; income: number; expense: number; wishlist: number }> = {};
    const now = new Date();

    for (let i = monthsToShow - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        // Timezone-safe monthKey generation
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        
        data[monthKey] = { month: monthLabel, monthKey, income: 0, expense: 0, wishlist: 0 };
    }

    transactions.forEach(t => {
      const monthKey = t.date.slice(0, 7);
      if (data[monthKey]) {
        if (t.type === 'income') {
          data[monthKey].income += t.amount;
        } else {
          if (t.wishlistId) {
            data[monthKey].wishlist += t.amount;
          } else {
            data[monthKey].expense += t.amount;
          }
        }
      }
    });

    return Object.values(data);
  }, [transactions, timeRange]);

  const savingsRateData = useMemo(() => {
    return monthlyData.map(m => {
      const realSavings = (m.income - m.expense); // wishlist is already separated out of expense in this monthlyData
      const rate = m.income > 0 ? (realSavings / m.income) * 100 : 0;
      return {
        month: m.month,
        rate: Math.max(0, parseFloat(rate.toFixed(1))),
        surplus: realSavings
      };
    });
  }, [monthlyData]);

  const trendInsights = useMemo(() => {
    if (monthlyData.length < 2) return null;
    
    const lastMonth = monthlyData[monthlyData.length - 1];
    const prevMonth = monthlyData[monthlyData.length - 2];
    
    const totalExpense = lastMonth.expense + lastMonth.wishlist;
    const prevTotalExpense = prevMonth.expense + prevMonth.wishlist;
    
    const expenseChange = prevTotalExpense > 0 
      ? ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100 
      : 0;
      
    const avgExpense = monthlyData.reduce((acc, curr) => acc + curr.expense + curr.wishlist, 0) / monthlyData.length;
    const vsAvg = ((totalExpense - avgExpense) / avgExpense) * 100;

    return {
      expenseChange,
      vsAvg,
      avgExpense
    };
  }, [monthlyData]);

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

      {/* SECTION 1.5: CORE MOMENTUM (NET WORTH & TRENDS) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Net Worth Growth */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Net Worth</h3>
                  <button 
                    onClick={() => setInfoModal({
                      isOpen: true,
                      title: 'Net Worth Breakdown',
                      items: [
                        { term: 'Cash', definition: 'Liquid balance from income and expenses (excluding dedicated wishlist funds).', color: 'text-emerald-600' },
                        { term: 'Investments', definition: 'Current total market value of your stocks, crypto, and other assets.', color: 'text-blue-600' },
                        { term: 'Wishlist', definition: 'Dedicated savings accumulated for your specific wishlist goals.', color: 'text-amber-600' },
                        { term: 'Liabilities', definition: 'Total remaining debt from all active installment plans and bills.', color: 'text-rose-600' },
                        { term: 'Net Worth', definition: 'Your total financial value (Cash + Investments + Wishlist - Liabilities).', color: 'text-indigo-600' }
                      ]
                    })}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-indigo-600"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Growth over time</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Current Total</p>
              <p className="text-2xl font-black text-indigo-600">{formatIDR(netWorthData[netWorthData.length - 1]?.Total || 0)}</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number, name: string, entry: any) => {
                    const color = (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b');
                    return [
                      <span key="val" style={{ color }}>{formatIDR(value)}</span>,
                      <span key="name" style={{ color }}>{name}</span>
                    ];
                  }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#18181b' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px', textTransform: 'uppercase' }} />
                <Area type="monotone" dataKey="Cash" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Investments" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Wishlist" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Liabilities" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                <Line type="monotone" dataKey="Total" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income vs Expense Trend */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Cash Flow</h3>
                  <button 
                    onClick={() => setInfoModal({
                      isOpen: true,
                      title: 'Cash Flow Analysis',
                      items: [
                        { term: 'Income', definition: 'All incoming funds recorded in the selected period.', color: 'text-emerald-600' },
                        { term: 'Expense', definition: 'All outgoing funds, excluding dedicated wishlist transfers.', color: 'text-rose-600' },
                        { term: 'Momentum', definition: 'The trend of your spending relative to your income over time.' }
                      ]
                    })}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-emerald-600"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Income vs spending momentum</p>
              </div>
            </div>
            {trendInsights && (
              <div className={`flex flex-col items-end`}>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">vs Prev Month</p>
                <div className={`flex items-center gap-1 text-sm font-black px-2 py-0.5 rounded-lg ${trendInsights.expenseChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {trendInsights.expenseChange <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {Math.abs(trendInsights.expenseChange).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number, name: string, entry: any) => {
                    const color = (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b');
                    return [
                      <span key="val" style={{ color }}>{formatIDR(value)}</span>,
                      <span key="name" style={{ color }}>{name}</span>
                    ];
                  }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#18181b' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px', textTransform: 'uppercase' }} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Budget vs Actual</h3>
                <button 
                  onClick={() => setInfoModal({
                    isOpen: true,
                    title: 'Budgeting Logic',
                    items: [
                      { term: 'Budget', definition: 'The spending limit you set for a specific category this month.', color: 'text-zinc-400' },
                      { term: 'Actual', definition: 'The real amount spent in that category so far.', color: 'text-emerald-600' },
                      { term: 'Unplanned', definition: 'Spending in categories where no budget limit was explicitly set.' }
                    ]
                  })}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-emerald-600"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsBreakdownOpen(true)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-emerald-600"
                title="View Category Distribution"
              >
                <PieIcon className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">This Month</span>
            </div>
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
                  formatter={(value: number, name: string, entry: any) => [
                    <span key="val" style={{ color: (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b') }}>{formatIDR(value)}</span>,
                    <span key="name" style={{ color: '#18181b' }}>{name}</span>
                  ]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#18181b' }}
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
                onClick={() => setBillGrouping('type')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${billGrouping === 'type' ? 'bg-white shadow-sm text-amber-600 dark:bg-zinc-700' : 'text-zinc-500'}`}
              >
                Type
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
                  formatter={(value: number, name: string, entry: any) => [
                    <span key="val" style={{ color: (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b') }}>{formatIDR(value)}</span>,
                    <span key="name" style={{ color: '#18181b' }}>{name}</span>
                  ]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#18181b' }}
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

      {/* SECTION 2.5: SAVINGS CONSISTENCY */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Savings Rate</h3>
              <p className="text-xs text-zinc-500">Percentage of income saved or invested monthly</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Last Month Surplus</p>
            <p className="text-2xl font-black text-emerald-600">{formatIDR(savingsRateData[savingsRateData.length - 1]?.surplus || 0)}</p>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={savingsRateData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value: number, name: string, entry: any) => [
                  <span key="val" style={{ color: entry.fill }}>{value}%</span>,
                  <span key="name" style={{ color: '#18181b' }}>Savings Rate</span>
                ]}
                contentStyle={{ 
                  backgroundColor: '#fff',
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                labelStyle={{ color: '#18181b' }}
              />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={40}>
                {savingsRateData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.rate >= 20 ? '#10b981' : entry.rate >= 10 ? '#3b82f6' : '#f59e0b'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Excellent (&gt;20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Good (10-20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Needs Attention (&lt;10%)</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: INVESTMENT PORTFOLIO */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-zinc-900 dark:text-zinc-50" />
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Investment Portfolio</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Asset Allocation */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[350px] flex flex-col">
            <h4 className="text-[10px] font-bold text-zinc-400 mb-6 uppercase tracking-wider">Asset Allocation</h4>
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
                  <Tooltip 
                    formatter={(value: number, name: string, entry: any) => [
                      <span key="val" style={{ color: (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b') }}>{formatIDR(value)}</span>,
                      <span key="name" style={{ color: '#18181b' }}>{name}</span>
                    ]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#18181b' }}
                  />

                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
               {investmentAllocation.map((entry, index) => (
                 <div key={entry.name} className="flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 4] }} />
                   <span className="text-[8px] font-bold text-zinc-500 uppercase">{entry.name}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Growth Bridge */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[350px] flex flex-col">
            <h4 className="text-[10px] font-bold text-zinc-400 mb-6 uppercase tracking-wider">Growth Bridge</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                    { name: 'Portfolio', Principal: growthBridgeData.find(d => d.name === 'Principal')?.value || 0, Profit: growthBridgeData.find(d => d.name === 'Growth')?.value || 0, Loss: growthBridgeData.find(d => d.name === 'Loss')?.value || 0 }
                ]} margin={{ left: -30 }}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(value: number, name: string, entry: any) => [
                      <span key="val" style={{ color: (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b') }}>{formatIDR(value)}</span>,
                      <span key="name" style={{ color: '#18181b' }}>{name}</span>
                    ]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#18181b' }}
                  />

                  <Bar dataKey="Principal" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} barSize={60} />
                  <Bar dataKey="Profit" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} barSize={60} />
                  <Bar dataKey="Loss" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
               <div className="flex justify-between text-[10px] font-bold">
                 <span className="text-zinc-400 uppercase">Capital</span>
                 <span className="text-zinc-500">{formatIDR(growthBridgeData.find(d => d.name === 'Principal')?.value || 0)}</span>
               </div>
               <div className="flex justify-between text-[10px] font-bold">
                 <span className="text-zinc-400 uppercase">Net Result</span>
                 <span className={ (growthBridgeData.find(d => d.name === 'Growth')?.value || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    { (growthBridgeData.find(d => d.name === 'Growth')?.value || 0) > 0 ? '+' : '-' }
                    { formatIDR(Math.abs((growthBridgeData.find(d => d.name === 'Growth')?.value || 0) - (growthBridgeData.find(d => d.name === 'Loss')?.value || 0))) }
                 </span>
               </div>
            </div>
          </div>

          {/* Risk Map */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[350px] flex flex-col">
            <h4 className="text-[10px] font-bold text-zinc-400 mb-6 uppercase tracking-wider">Risk Profile</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskMapData}
                    innerRadius={0}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {riskMapData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name.includes('Speculative') ? '#ef4444' : entry.name.includes('Moderate') ? '#3b82f6' : '#10b981'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, entry: any) => [
                      <span key="val" style={{ color: (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b') }}>{formatIDR(value)}</span>,
                      <span key="name" style={{ color: '#18181b' }}>{name}</span>
                    ]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#18181b' }}
                  />

                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
               {riskMapData.map((entry) => (
                 <div key={entry.name} className="flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.name.includes('Speculative') ? '#ef4444' : entry.name.includes('Moderate') ? '#3b82f6' : '#10b981' }} />
                   <span className="text-[8px] font-bold text-zinc-500 uppercase">{entry.name.split(' ')[0]}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Performance Bar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[350px] flex flex-col">
            <h4 className="text-[10px] font-bold text-zinc-400 mb-6 uppercase tracking-wider">Asset Performance</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={investmentPerformance} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip 
                    formatter={(value: number, name: string, entry: any) => [
                      <span key="val" style={{ color: (entry.color === '#e2e8f0' || entry.fill === '#e2e8f0') ? '#18181b' : (entry.color || entry.fill || '#18181b') }}>{formatIDR(value)}</span>,
                      <span key="name" style={{ color: '#18181b' }}>{name}</span>
                    ]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#18181b' }}
                  />

                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
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

      <CategoryBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        transactions={transactions}
        title={`All spending categories for the selected period`}
      />

      <InfoModal 
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        title={infoModal.title}
        items={infoModal.items}
      />
    </div>
  );
}

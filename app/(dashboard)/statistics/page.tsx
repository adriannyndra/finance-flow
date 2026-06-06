'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Investment, Bill, Budget, WishlistItem } from '@/core/entities';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, TrendingUp, TrendingDown, Target, CreditCard, BarChart3, LayoutGrid, Wallet, Info, PieChart as PieIcon } from 'lucide-react';
import { formatIDR } from '@/core/formatters/currency';
import CategoryBreakdownModal from '@/components/CategoryBreakdownModal';
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
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie
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
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1mo' | '6mo' | '1y' | 'all'>('6mo');
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
      const [transData, billsData, budgetsData] = await Promise.all([
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
    const monthsToShow = timeRange === '1mo' ? 1 : (timeRange === '6mo' ? 6 : (timeRange === '1y' ? 12 : 24));
    const data = [];
    const now = new Date();
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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

  // Snapshot Logic (Current Month)
  const snapshot = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonthStr));
    const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const surplus = income - expense;
    
    return { income, expense, savingsRate, surplus };
  }, [transactions, currentMonthStr]);

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
    const monthsToShow = timeRange === '1mo' ? 1 : (timeRange === '6mo' ? 6 : (timeRange === '1y' ? 12 : 24));
    const data: Record<string, { month: string; monthKey: string; income: number; expense: number; wishlist: number }> = {};
    const now = new Date();

    for (let i = monthsToShow - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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
      const realSavings = (m.income - m.expense); 
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

  return (
    <div className="space-y-12 pb-12">
      {/* SECTION 1: HEADER & KPI OVERVIEW */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Financial Report</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Deep analysis of your assets and spending.</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1 rounded-xl dark:bg-zinc-900 dark:border-zinc-800">
            {(['1mo', '6mo', '1y'] as const).map((r) => (
              <button 
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange === r ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 shadow-md' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
              >
                {r === '1mo' ? '1 Mo' : r === '6mo' ? '6 Mo' : '1 Yr'}
              </button>
            ))}
          </div>
        </div>

        {/* This Month Snapshot Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full -mr-20 -mt-20 blur-3xl dark:bg-emerald-900/10 pointer-events-none" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">This Month at a Glance</h3>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500 dark:bg-zinc-800">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE TRACKING
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Income</p>
                        <p className="text-xl font-black text-emerald-600">{formatIDR(snapshot.income)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Expenses</p>
                        <p className="text-xl font-black text-rose-600">{formatIDR(snapshot.expense)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Savings Rate</p>
                        <p className={`text-xl font-black ${snapshot.savingsRate >= 15 ? 'text-emerald-600' : 'text-amber-500'}`}>{snapshot.savingsRate.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Monthly Surplus</p>
                        <p className={`text-xl font-black ${snapshot.surplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatIDR(snapshot.surplus)}</p>
                    </div>
                </div>
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
                  formatter={(value: number, name: string) => [formatIDR(value), name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ padding: '2px 0' }}
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
                  formatter={(value: number, name: string) => [formatIDR(value), name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
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
                  formatter={(value: number, name: string) => [formatIDR(value), name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Budget" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Actual" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bills Analysis */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Bills Analysis</h3>
            </div>
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg dark:bg-zinc-800">
              <button 
                onClick={() => setBillGrouping('term')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${billGrouping === 'term' ? 'bg-white shadow-sm text-amber-600 dark:bg-zinc-700' : 'text-zinc-500'}`}
              >
                Key Terms
              </button>
              <button 
                onClick={() => setBillGrouping('category')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${billGrouping === 'category' ? 'bg-white shadow-sm text-amber-600 dark:bg-zinc-700' : 'text-zinc-500'}`}
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
                  formatter={(value: number, name: string) => [formatIDR(value), name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', fontWeight: 'bold' }}
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

      <CategoryBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        transactions={transactions}
        title={`Spending distribution for ${new Date().toLocaleString('en-US', { month: 'long' })}`}
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

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Investment, Bill, Budget, WishlistItem, BillItem } from '@/core/entities';
import { createClient } from '@/utils/supabase/client';
import { getUserId } from '@/utils/auth/get-user-id';
import { Loader2, TrendingUp, TrendingDown, Target, CreditCard, BarChart3, LayoutGrid, Wallet, Info, PieChart as PieIcon, Check } from 'lucide-react';
import { formatIDR } from '@/core/formatters/currency';
import DashboardChart from '@/components/DashboardChart';
import CategoryBreakdownModal from '@/components/CategoryBreakdownModal';
import { InfoModal } from '@/components/InfoModal';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { SupabaseBillRepository } from '@/features/bills/infrastructure/SupabaseBillRepository';
import { SupabaseBudgetRepository } from '@/features/budgets/infrastructure/SupabaseBudgetRepository';
import { SupabaseWishlistRepository } from '@/features/wishlist/infrastructure/SupabaseWishlistRepository';
import { DetailListModal } from '@/components/DetailListModal';
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
  const [billItems, setBillItems] = useState<BillItem[]>([]);
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
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    items: { name: string; amount: number; detail: string; type?: string }[];
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    items: [],
  });

  const [activeTab, setActiveTab] = useState<'bills' | 'spending' | 'assets' | 'budgets'>('spending');
  const [heatmapHover, setHeatmapHover] = useState<{
    date: string;
    count: number;
    total: number;
    bills: any[];
    x: number;
    y: number;
  } | null>(null);

  const supabase = createClient();
  const userId = getUserId();
  const now = useMemo(() => new Date(), []);
  const currentMonthStr = now.toISOString().slice(0, 7);

  const handleProjectorClick = (monthLabel: string) => {
    const dataPoint = billsIntelligence.projectorData.find(p => p.month === monthLabel);
    if (!dataPoint) return;

    setDetailModal({
      isOpen: true,
      title: `Obligations for ${monthLabel}`,
      subtitle: `Forecasted bills and recurring costs`,
      items: dataPoint.bills.map(b => ({
        name: b.name,
        amount: b.amount,
        detail: b.detail,
        type: b.billType
      }))
    });
  };

  const handleHeatmapClick = (heatmapItem: any, dateLabel: string) => {
    setDetailModal({
      isOpen: true,
      title: `Bills on ${dateLabel}`,
      subtitle: `${heatmapItem.count} obligations due today`,
      items: heatmapItem.bills.map((b: any) => ({
        name: b.name,
        amount: b.amount,
        detail: b.category,
        type: b.billType
      }))
    });
  };

  const fetchData = useCallback(async (uid: string) => {
    try {
      const [transData, billsData, budgetsData, billItemsData] = await Promise.all([
        transactionRepository.getTransactions(uid),
        billRepository.getBills(uid),
        budgetRepository.getBudgets(uid, currentMonthStr),
        billRepository.getBillItems(uid)
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
      setBillItems(billItemsData || []);
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
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      // 1. Calculate Cumulative Cash
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

      // 4. Calculate Liabilities (Remaining Debt)
      const installmentBills = bills.filter(b => b.billType === 'installment');
      const liabilities = installmentBills.reduce((acc, bill) => {
        const total = bill.totalAmount || 0;
        const paidSoFar = billItems
          .filter(item => item.billId === bill.id && item.status === 'paid' && item.dueDate <= lastDayOfMonth)
          .reduce((sum, item) => sum + item.amount, 0);
        
        return acc + Math.max(0, total - paidSoFar);
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
  }, [transactions, investments, bills, billItems, timeRange, now]);

  // Snapshot Logic (Current Month)
  const snapshot = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonthStr));
    const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const surplus = income - expense;
    
    return { income, expense, savingsRate, surplus };
  }, [transactions, currentMonthStr]);

  // Section 2: Budget vs Actual Logic
  const budgetVsActualData = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr));
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
      const term = b.name.split(' ').slice(0, 2).join(' ');
      termsMap[term] = (termsMap[term] || 0) + b.amount;
    });

    return Object.entries(termsMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bills, billGrouping]);

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

  const monthlyData = useMemo(() => {
    const monthsToShow = timeRange === '1mo' ? 1 : (timeRange === '6mo' ? 6 : (timeRange === '1y' ? 12 : 24));
    const data: Record<string, { month: string; monthKey: string; income: number; expense: number; wishlist: number }> = {};

    for (let i = monthsToShow - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        data[monthKey] = { month: monthLabel, monthKey, income: 0, expense: 0, wishlist: 0 };
    }

    transactions.forEach(t => {
      const monthKey = t.date.slice(0, 7);
      if (data[monthKey]) {
        if (t.type === 'income') data[monthKey].income += t.amount;
        else if (t.wishlistId) data[monthKey].wishlist += t.amount;
        else data[monthKey].expense += t.amount;
      }
    });

    return Object.values(data);
  }, [transactions, timeRange, now]);

  const billsIntelligence = useMemo(() => {
    const futureMonths = 12;
    const projectorData = [];
    const shiftStartDay = 4;
    const shiftEndDay = 3;

    for (let i = 0; i < futureMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const rangeStart = new Date(d.getFullYear(), d.getMonth(), shiftStartDay);
      const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 1, shiftEndDay, 23, 59, 59);

      let monthlyTotal = 0;
      const billsForMonth: any[] = [];
      const rangeItems = billItems.filter(item => {
        const due = new Date(item.dueDate);
        return due >= rangeStart && due <= rangeEnd;
      });

      rangeItems.filter(item => item.status === 'pending').forEach(item => {
        const bill = bills.find(b => b.id === item.billId);
        if (bill) {
          monthlyTotal += item.amount;
          billsForMonth.push({ ...bill, amount: item.amount, detail: `Due ${new Date(item.dueDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}` });
        }
      });

      bills.filter(b => b.active).forEach(bill => {
        if (rangeItems.some(item => item.billId === bill.id)) return;
        let fallsInRange = false;
        let predictedDueDate = "";

        if (bill.billType === 'recurring') {
          if (bill.billing_day >= shiftStartDay) {
            fallsInRange = true;
            predictedDueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(bill.billing_day).padStart(2, '0')}`;
          } else if (bill.billing_day <= shiftEndDay) {
            fallsInRange = true;
            const nextM = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            predictedDueDate = `${nextM.getFullYear()}-${String(nextM.getMonth() + 1).padStart(2, '0')}-${String(bill.billing_day).padStart(2, '0')}`;
          }
        } else if (bill.endDate) {
          const end = new Date(bill.endDate);
          if (end >= rangeStart && end <= rangeEnd) {
            fallsInRange = true;
            predictedDueDate = bill.endDate;
          }
        }

        if (fallsInRange && (!bill.endDate || bill.endDate >= predictedDueDate)) {
          monthlyTotal += bill.amount;
          billsForMonth.push({ ...bill, detail: `Est. ${new Date(predictedDueDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}` });
        }
      });
      projectorData.push({ month: monthLabel, amount: monthlyTotal, bills: billsForMonth });
    }

    const maturityTimeline = bills.filter(b => b.active && b.endDate).filter(bill => {
      const hasPaidThisMonth = billItems.some(item => item.billId === bill.id && item.status === 'paid' && item.dueDate.startsWith(currentMonthStr));
      if (hasPaidThisMonth) return false;
      if (bill.billType === 'installment' && bill.totalAmount) {
        const totalPaid = billItems.filter(item => item.billId === bill.id && item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
        if (totalPaid >= bill.totalAmount) return false;
      }
      return true;
    }).map(b => ({ name: b.name, endDate: b.endDate!, amount: b.amount, type: b.billType })).sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 5);

    const fixedCostRatio = (bills.filter(b => b.active).reduce((acc, b) => acc + b.amount, 0) / (monthlyData.reduce((acc, m) => acc + m.income, 0) / (monthlyData.length || 1) || 1)) * 100;
    const activeCount = bills.filter(b => b.active && (!b.endDate || new Date(b.endDate) >= now)).length;
    const archivedCount = bills.filter(b => !b.active || (b.endDate && new Date(b.endDate) < now)).length;

    const heatmap = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayBills = bills.filter(b => b.active && (b.billing_day === d.getDate() || (new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getDate() === 1 && b.billing_day > d.getDate())));
      if (dayBills.length > 0) {
        const allPaid = dayBills.every(bill => billItems.some(item => item.billId === bill.id && item.status === 'paid' && (item.dueDate === dateStr || item.dueDate.startsWith(dateStr.slice(0, 7)))));
        heatmap.push({ date: dateStr, day: d.getDate(), count: dayBills.length, total: dayBills.reduce((acc, b) => acc + b.amount, 0), bills: dayBills, isPaid: allPaid });
      }
    }

    return { projectorData, maturityTimeline, fixedCostRatio, subscriptionFatigue: { activeCount, archivedCount }, heatmap };
  }, [bills, billItems, monthlyData, now, currentMonthStr]);

  const spendingIQ = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonthStr) && t.type === 'expense');
    const merchantMap: Record<string, { amount: number, count: number }> = {};
    monthTransactions.forEach(t => {
      const name = t.description.split(' ').slice(0, 2).join(' ').replace(/[^a-zA-Z\s]/g, '').trim() || 'Other';
      if (!merchantMap[name]) merchantMap[name] = { amount: 0, count: 0 };
      merchantMap[name].amount += t.amount;
      merchantMap[name].count += 1;
    });

    const topMerchants = Object.entries(merchantMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const fixedCategories = ['Bills', 'Utilities', 'Rent', 'Debt', 'Installment'];
    const discretionaryTransactions = monthTransactions.filter(t => !fixedCategories.includes(t.category));
    const daysInMonthSoFar = now.getDate();
    const lifestyleSpent = discretionaryTransactions.reduce((acc, t) => acc + t.amount, 0);
    const lifestyleVelocity = daysInMonthSoFar > 0 ? lifestyleSpent / daysInMonthSoFar : 0;
    const unpaidJuneBills = billsIntelligence.projectorData.find(p => p.month === now.toLocaleString('default', { month: 'short', year: '2-digit' }))?.amount || 0;
    const systemVelocity = (snapshot.expense + unpaidJuneBills) / 30;

    const needsCategories = ['Bills', 'Utilities', 'Rent', 'Groceries', 'Transport', 'Healthcare', 'Education'];
    let needsAmount = 0, wantsAmount = 0;
    monthTransactions.forEach(t => { if (needsCategories.includes(t.category)) needsAmount += t.amount; else wantsAmount += t.amount; });
    const total = needsAmount + wantsAmount;
    const needsPercent = total > 0 ? (needsAmount / total) * 100 : 0;
    const wantsPercent = total > 0 ? (wantsAmount / total) * 100 : 0;

    return { topMerchants, lifestyleVelocity, systemVelocity, lifestyleRatio: { needsPercent, wantsPercent, needsAmount, wantsAmount } };
  }, [transactions, currentMonthStr, now, billsIntelligence.projectorData, snapshot.expense]);

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Financial Intelligence</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Strategic overview of your capital and obligations.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-zinc-200 p-1.5 rounded-2xl dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          {(['1mo', '6mo', '1y', 'all'] as const).map((r) => (
            <button key={r} onClick={() => setTimeRange(r)} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${timeRange === r ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 shadow-lg' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>{r === '1mo' ? '1 Mo' : r === '6mo' ? '6 Mo' : r === '1y' ? '1 Yr' : 'All'}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600"><Wallet className="w-4 h-4" /></div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Net Worth</p>
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600">{formatIDR(netWorthData[netWorthData.length - 1]?.Total || 0)}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full w-fit"><TrendingUp className="w-3 h-3" /> Growth Tracked</div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600"><BarChart3 className="w-4 h-4" /></div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Monthly Surplus</p>
            </div>
          </div>
          <p className={`text-2xl font-black ${snapshot.surplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatIDR(snapshot.surplus)}</p>
          <p className="text-[10px] text-zinc-500 font-bold mt-2 uppercase tracking-tight">For {now.toLocaleString('en-US', { month: 'long' })}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600"><Target className="w-4 h-4" /></div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Savings Rate</p>
            </div>
          </div>
          <p className={`text-2xl font-black ${snapshot.savingsRate >= 20 ? 'text-emerald-600' : 'text-amber-500'}`}>{snapshot.savingsRate.toFixed(1)}%</p>
          <div className="mt-2 w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${Math.min(100, snapshot.savingsRate)}%` }} /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative group/card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600"><CreditCard className="w-4 h-4" /></div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Debt</p>
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{formatIDR(Math.abs(netWorthData[netWorthData.length - 1]?.Liabilities || 0))}</p>
          <p className="text-[10px] text-zinc-500 font-bold mt-2 uppercase tracking-tight">Active Obligations</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20"><TrendingUp className="w-6 h-6" /></div>
            <div><h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Core Momentum</h3><p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Net Worth Growth Trajectory</p></div>
          </div>
          <button onClick={() => setInfoModal({ isOpen: true, title: 'Net Worth Breakdown', items: [ { term: 'Cash', definition: 'Liquid balance from income and expenses.', color: 'text-emerald-600' }, { term: 'Investments', definition: 'Current total market value of your assets.', color: 'text-blue-600' }, { term: 'Wishlist', definition: 'Dedicated savings for specific goals.', color: 'text-amber-600' }, { term: 'Liabilities', definition: 'Total remaining debt from installment plans.', color: 'text-rose-600' } ] })} className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-[10px] font-black text-zinc-500 transition-all uppercase tracking-widest"><Info className="w-4 h-4" /> Explanation</button>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02}/></linearGradient><linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} tickFormatter={(v) => `Rp ${(v/1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value: number, name: string) => [formatIDR(value), name]} contentStyle={{ backgroundColor: '#fff', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '900' }} itemStyle={{ padding: '4px 0' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '800', paddingBottom: '30px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              <Area type="monotone" dataKey="Cash" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#colorCash)" />
              <Area type="monotone" dataKey="Investments" stackId="1" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.1} />
              <Area type="monotone" dataKey="Wishlist" stackId="1" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.1} />
              <Area type="monotone" dataKey="Liabilities" stackId="1" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.1} />
              <Area type="monotone" dataKey="Total" stroke="#4f46e5" strokeWidth={4} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-1.5 bg-white border border-zinc-200 p-1.5 rounded-[1.5rem] dark:bg-zinc-900 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none">
          {[ { id: 'bills', label: 'Bill Intelligence', icon: CreditCard }, { id: 'spending', label: 'Spending IQ', icon: PieIcon }, { id: 'assets', label: 'Asset Allocation', icon: Wallet }, { id: 'budgets', label: 'Budget Efficiency', icon: Target }, ].map((tab) => { const Icon = tab.icon; const isActive = activeTab === tab.id; return ( <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-[1.25rem] text-sm font-black transition-all duration-300 ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`} > <Icon className="w-4 h-4" /> {tab.label} </button> ); })}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'bills' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col min-h-[450px]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-indigo-600" /><h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Obligation Projector</h3></div>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={billsIntelligence.projectorData} onClick={(data) => data && data.activeLabel && handleProjectorClick(data.activeLabel)} >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }} />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => [formatIDR(value), 'Expected Bills']} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="amount" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={3} className="cursor-pointer" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col min-h-[450px]">
              <div className="flex items-center gap-3 mb-6"><Target className="w-5 h-5 text-emerald-600" /><h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Maturity Timeline</h3></div>
              <div className="space-y-4 overflow-y-auto">
                {billsIntelligence.maturityTimeline.map((item, idx) => ( <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800"> <div><p className="text-xs font-black text-zinc-900 dark:text-zinc-50">{item.name}</p><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Ends: {item.endDate}</p></div> <div className="text-right"><p className="text-xs font-black text-emerald-600">{formatIDR(item.amount)}</p><p className="text-[9px] font-black text-zinc-400 uppercase">{item.type}</p></div> </div> ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col min-h-[450px] justify-center items-center text-center">
                <div className="w-24 h-24 rounded-full border-8 border-zinc-100 dark:border-zinc-800 flex items-center justify-center relative mb-4"><div className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent -rotate-45" style={{ clipPath: `conic-gradient(from 0deg, #10b981 ${billsIntelligence.fixedCostRatio}%, transparent 0)` }} /><span className="text-xl font-black text-zinc-900 dark:text-zinc-50">{billsIntelligence.fixedCostRatio.toFixed(0)}%</span></div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">Fixed Cost Ratio</h3>
                <div className="mt-6 flex items-center gap-4"> <div className="text-left"><p className="text-[10px] font-bold text-zinc-400 uppercase">Commitment</p><p className="text-sm font-black text-emerald-600">{formatIDR(bills.filter(b => b.active).reduce((acc, b) => acc + b.amount, 0))}</p></div> <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" /> <div className="text-left"><p className="text-[10px] font-bold text-zinc-400 uppercase">Avg Income</p><p className="text-sm font-black text-zinc-900 dark:text-zinc-50">{formatIDR(monthlyData.reduce((acc, m) => acc + m.income, 0) / (monthlyData.length || 1))}</p></div> </div>
            </div>
          </div>
        )}

        {activeTab === 'spending' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20"><LayoutGrid className="w-4 h-4" /></div>
                    <div><h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Spending Rhythm</h3><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">30-Day Master Heatmap</p></div>
                  </div>
                  <button onClick={() => setIsBreakdownOpen(true)} className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-[9px] font-black text-zinc-500 hover:text-emerald-600 transition-all uppercase tracking-widest border border-zinc-100 dark:border-zinc-800">Detective Hub &rarr;</button>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 max-w-md w-full">
                    <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => ( <div key={i} className="text-[7px] font-black text-zinc-300 dark:text-zinc-600 text-center uppercase tracking-widest">{day}</div> ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => { const boxes = []; const firstDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); const startPadding = firstDate.getDay(); for (let p = 0; p < startPadding; p++) boxes.push(<div key={`pad-${p}`} className="aspect-square opacity-0" />); for (let i = 0; i < 30; i++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i); const dateStr = d.toISOString().slice(0, 10); const amount = transactions.filter(t => t.date === dateStr && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0); const intensity = Math.min(amount / 1000000, 1); const isWeekend = d.getDay() === 0 || d.getDay() === 6; boxes.push( <div key={i} className={`group relative aspect-square rounded-md transition-all hover:scale-110 cursor-help flex items-center justify-center overflow-hidden border ${isWeekend ? 'border-zinc-100 dark:border-zinc-800' : 'border-transparent'} ${amount === 0 ? 'bg-zinc-50/50 dark:bg-zinc-800/20' : 'bg-zinc-50 dark:bg-zinc-800/50'}`} > <div className="absolute inset-0 rounded-md bg-emerald-500" style={{ opacity: intensity > 0 ? 0.1 + (intensity * 0.9) : 0 }} /> <span className={`relative z-10 text-[8px] font-black ${intensity > 0.4 ? 'text-white' : 'text-zinc-400'}`}>{d.getDate()}</span> <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none"> <div className="bg-zinc-900 text-white text-[8px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap">{d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}: {formatIDR(amount)}</div> </div> </div> ); } return boxes; })()}
                    </div>
                  </div>
                  <div className="hidden md:block w-px h-32 bg-zinc-100 dark:bg-zinc-800" />
                  <div className="w-full md:w-auto flex flex-row md:flex-col gap-6 md:gap-4 justify-between md:justify-center">
                      <div><p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Peak Day</p><p className="text-[9px] font-black text-zinc-900 dark:text-zinc-50 uppercase">{(() => { const dailyTotals = Array.from({ length: 30 }).map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i); const dateStr = d.toISOString().slice(0, 10); return { label: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), amount: transactions.filter(t => t.date === dateStr && t.type === 'expense').reduce((a, b) => a + b.amount, 0) }; }); const max = dailyTotals.reduce((prev, current) => (prev.amount > current.amount) ? prev : current, dailyTotals[0]); return max.amount > 0 ? max.label : 'None'; })()}</p></div>
                      <div><p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Quiet Streak</p><p className="text-[9px] font-black text-emerald-600 uppercase">{(() => { let streak = 0; for (let i = 29; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i); const dateStr = d.toISOString().slice(0, 10); const amount = transactions.filter(t => t.date === dateStr && t.type === 'expense').reduce((a, b) => a + b.amount, 0); if (amount === 0) streak++; else break; } return `${streak} Days`; })()}</p></div>
                      <div><p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Volatility</p><p className="text-[9px] font-black text-indigo-600 uppercase">{(() => { const dailyTotals = Array.from({ length: 30 }).map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i); const dateStr = d.toISOString().slice(0, 10); return transactions.filter(t => t.date === dateStr && t.type === 'expense').reduce((a, b) => a + b.amount, 0); }).filter(a => a > 0); if (dailyTotals.length < 2) return 'Stable'; const avg = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length, variance = dailyTotals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / dailyTotals.length, stdDev = Math.sqrt(variance), cv = stdDev / avg; return cv > 1 ? 'High' : (cv > 0.5 ? 'Med' : 'Low'); })()}</p></div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[320px] self-stretch"><div className="flex items-center gap-3 mb-2"><PieIcon className="w-4 h-4 text-emerald-600" /><h4 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Distribution</h4></div><div className="flex-1 min-h-0"><DashboardChart transactions={transactions.filter(t => t.date.startsWith(currentMonthStr))} onCategoryClick={() => setIsBreakdownOpen(true)} /></div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-between h-[400px]">
                <div><div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20"><TrendingUp className="w-4 h-4" /></div><div><h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Daily Velocity</h3><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Real-Time Burn</p></div></div></div><div className="text-center py-4"><p className="text-3xl font-black text-emerald-600">{formatIDR(spendingIQ.lifestyleVelocity)}</p><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Lifestyle Burn (Daily)</p></div></div>
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3"><div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">System Load (Avg)</span><span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{formatIDR(spendingIQ.systemVelocity)}</span></div><div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Month Projection</span><span className="text-xs font-black text-zinc-900 dark:text-zinc-50">{formatIDR(spendingIQ.systemVelocity * 30)}</span></div></div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[400px]"><div className="flex items-center gap-2 mb-8"><LayoutGrid className="w-4 h-4 text-emerald-600" /><h4 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Top Merchants</h4></div><div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">{spendingIQ.topMerchants.map((m, i) => ( <div key={i} className="flex items-center justify-between group/item p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-emerald-500 transition-all"> <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400 group-hover/item:text-emerald-600 transition-colors uppercase shadow-sm">{m.name.slice(0, 2)}</div><div><p className="text-xs font-black text-zinc-900 dark:text-zinc-50 truncate w-28">{m.name}</p><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{m.count} Transactions</p></div></div> <p className="text-xs font-black text-zinc-900 dark:text-zinc-50">{formatIDR(m.amount)}</p> </div> ))}</div></div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[400px]"><div className="flex items-center gap-2 mb-8"><BarChart3 className="w-4 h-4 text-emerald-600" /><h4 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Lifestyle Ratio</h4></div><div className="flex-1 flex flex-col justify-center space-y-8"><div className="text-center"><p className="text-4xl font-black text-zinc-900 dark:text-zinc-50">{spendingIQ.lifestyleRatio.wantsPercent.toFixed(0)}%</p><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Wants / Discretionary</p></div><div className="space-y-6"><div><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black text-zinc-400 uppercase">Survival (Needs)</span><span className="text-xs font-black text-zinc-900 dark:text-zinc-50">{spendingIQ.lifestyleRatio.needsPercent.toFixed(0)}%</span></div><div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20" style={{ width: `${spendingIQ.lifestyleRatio.needsPercent}%` }} /></div></div><div><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black text-zinc-400 uppercase">Lifestyle (Wants)</span><span className="text-xs font-black text-zinc-900 dark:text-zinc-50">{spendingIQ.lifestyleRatio.wantsPercent.toFixed(0)}%</span></div><div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full shadow-lg shadow-amber-500/20" style={{ width: `${spendingIQ.lifestyleRatio.wantsPercent}%` }} /></div></div></div><p className="text-[9px] text-zinc-500 font-bold text-center uppercase tracking-tight px-4 leading-relaxed">A balanced lifestyle typically follows a 50% Needs / 30% Wants / 20% Savings allocation.</p></div></div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[500px]">
              <div className="flex items-center justify-between mb-10"><div className="flex items-center gap-3"><BarChart3 className="w-6 h-6 text-emerald-600" /><div><h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Cash Flow Momentum</h3><p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Historical Income vs. Expense Tracking</p></div></div></div>
              <div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} /><Tooltip formatter={(value: number, name: string) => [formatIDR(value), name]} contentStyle={{ backgroundColor: '#fff', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '900' }} /><Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={5} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} /><Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={5} dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div>
            </div>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[600px]"><div className="flex items-center gap-3 mb-8"><Target className="w-5 h-5 text-emerald-600" /><h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Budget Efficiency</h3></div><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={budgetVsActualData} layout="vertical" margin={{ left: 40, right: 30 }}><CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" /><XAxis type="number" hide /><YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number, name: string) => [formatIDR(value), name]} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', fontWeight: 'bold' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} /><Bar dataKey="Budget" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={20} /><Bar dataKey="Actual" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer></div></div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[450px]"><div className="flex items-center gap-3 mb-8"><Wallet className="w-5 h-5 text-emerald-600" /><h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Allocation</h3></div><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={investmentAllocation} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" >{investmentAllocation.map((_, index) => ( <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} /> ))}</Pie><Tooltip formatter={(value: number) => formatIDR(value)} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></div></div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[450px]"><div className="flex items-center gap-3 mb-8"><TrendingUp className="w-5 h-5 text-emerald-600" /><h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Profit/Loss Performance</h3></div><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={investmentPerformance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" /><XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `Rp ${(v/1000).toFixed(0)}k`} /><Tooltip formatter={(value: number) => formatIDR(value)} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} /><Bar dataKey="profit" radius={[4, 4, 0, 0]}>{investmentPerformance.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} /> ))}</Bar></BarChart></ResponsiveContainer></div></div>
          </div>
        )}
      </div>

      <CategoryBreakdownModal isOpen={isBreakdownOpen} onClose={() => setIsBreakdownOpen(false)} transactions={transactions.filter(t => t.date.startsWith(currentMonthStr))} title={`${now.toLocaleString('default', { month: 'long', year: 'numeric' })} Spending Overview`} />
      <InfoModal isOpen={infoModal.isOpen} onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))} title={infoModal.title} items={infoModal.items} />
      <DetailListModal isOpen={detailModal.isOpen} onClose={() => setDetailModal(prev => ({ ...prev, isOpen: false }))} title={detailModal.title} subtitle={detailModal.subtitle} items={detailModal.items} />

      {heatmapHover && (
        <div className="fixed z-[200] pointer-events-none -translate-x-1/2 -translate-y-full mb-4 animate-in fade-in zoom-in-95 duration-200" style={{ left: heatmapHover.x, top: heatmapHover.y }} >
          <div className="bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl border border-zinc-800 w-56">
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{heatmapHover.date}</p><div className="px-1.5 py-0.5 bg-rose-500 rounded text-[9px] font-black text-white">{heatmapHover.count} Bills</div></div>
            <div className="space-y-1.5">{heatmapHover.bills.map((b, i) => ( <div key={i} className="flex items-center justify-between gap-4"><p className="text-[10px] font-bold truncate text-zinc-100">{b.name}</p><p className="text-[10px] font-black text-rose-400 whitespace-nowrap">{formatIDR(b.amount)}</p></div> ))}</div>
            <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between"><p className="text-[9px] font-bold text-zinc-500 uppercase">Total Day</p><p className="text-[10px] font-black text-white">{formatIDR(heatmapHover.total)}</p></div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
          </div>
        </div>
      )}
    </div>
  );
}

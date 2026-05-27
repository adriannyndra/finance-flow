'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  CreditCard,
  Check
} from 'lucide-react';
import Link from 'next/link';
import DashboardChart from '@/components/DashboardChart';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { SupabaseBudgetRepository } from '@/features/budgets/infrastructure/SupabaseBudgetRepository';
import { GetBudgetProgress, BudgetProgress } from '@/features/budgets/use-cases/GetBudgetProgress';
import { SupabaseBillRepository } from '@/features/bills/infrastructure/SupabaseBillRepository';
import { ProcessBills } from '@/features/bills/use-cases/ProcessBills';
import { Bill } from '@/core/entities';

const transactionRepository = new SupabaseTransactionRepository();
const budgetRepository = new SupabaseBudgetRepository();
const billRepository = new SupabaseBillRepository();
const getBudgetProgress = new GetBudgetProgress(budgetRepository, transactionRepository);
const processBills = new ProcessBills(billRepository, transactionRepository);

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  
  // Table state
  const [sortOrder] = useState<'latest' | 'oldest'>('latest');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const supabase = createClient();
  const userId = getUserId();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const fetchDashboardData = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
        setUserName(displayName);
      }

      // 1. Process recurring transactions (cleanup only)
      await processBills.execute(uid);

      // 2. Fetch fresh data
      const [transData, budgets, billsData] = await Promise.all([
        transactionRepository.getTransactions(uid),
        getBudgetProgress.execute(uid, currentMonthStr),
        billRepository.getBills(uid)
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
      setInvestments(mappedInvestments);
      setBudgetProgress(budgets);
      setBills(billsData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentMonthStr]);

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
  }, [userId, supabase.auth, fetchDashboardData]);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalIncomeThisMonth = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(currentMonthStr))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpensesThisMonth = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthlySurplus = totalIncomeThisMonth - totalExpensesThisMonth;

  const balance = totalIncome - totalExpenses;

  const totalInvested = investments.reduce((acc, inv) => acc + (inv.buyPrice * inv.quantity), 0);
  const currentInvestValue = investments.reduce((acc, inv) => acc + (inv.currentPrice * inv.quantity), 0);
  const investGainLoss = currentInvestValue - totalInvested;

  const unpaidBills = bills.filter(b => b.active && b.lastGeneratedMonth !== currentMonthStr);
  const showingNextMonth = unpaidBills.length === 0 && bills.length > 0;
  
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthStr = nextMonthDate.toISOString().slice(0, 7);

  const displayBills = showingNextMonth 
    ? bills.filter(b => {
        if (!b.active) return false;
        if (b.endDate && b.endDate < nextMonthStr + "-01") return false;
        return true;
      })
    : unpaidBills;

  const totalNextMonthAmount = displayBills.reduce((acc, b) => acc + b.amount, 0);
  const nearestNextMonthBill = showingNextMonth && displayBills.length > 0
    ? [...displayBills].sort((a, b) => a.billing_day - b.billing_day)[0]
    : null;

  const totalUpcomingBills = unpaidBills.reduce((acc, b) => acc + b.amount, 0);

  // Table Logic
  const processedTransactions = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const filtered = transactions.filter(t => new Date(t.date) >= oneMonthAgo);
    
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
          <p className="text-zinc-500 dark:text-zinc-400">Welcome back, {userName}!</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 dark:bg-emerald-900/20 dark:text-emerald-400">
          <Wallet className="w-4 h-4" />
          {formatIDR(balance + currentInvestValue)} Net Worth
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Cash Balance</p>
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
          <p className="text-sm font-medium text-zinc-500">Investment Value</p>
          <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-50">
            {formatIDR(currentInvestValue)}
          </p>
          <div className={`flex items-center mt-4 text-xs font-medium ${investGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {investGainLoss >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {investGainLoss >= 0 ? '+' : ''}{formatIDR(investGainLoss)} total profit
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Upcoming Bills</p>
          <p className={`text-2xl font-bold mt-1 ${totalUpcomingBills > 0 ? 'text-amber-600' : 'text-zinc-900 dark:text-zinc-50'}`}>
            {formatIDR(totalUpcomingBills)}
          </p>
          <div className="flex items-center mt-4 text-xs font-medium text-zinc-400">
            {showingNextMonth ? 'All bills paid! Showing next month' : `${unpaidBills.length} unpaid bills remaining`}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Monthly Surplus</p>
          <p className={`text-2xl font-bold mt-1 ${monthlySurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatIDR(monthlySurplus)}
          </p>
          <div className="flex items-center mt-4 text-xs font-medium text-zinc-400">
            {monthlySurplus >= 0 ? (
              <span className="flex items-center text-emerald-600"><TrendingUp className="w-3 h-3 mr-1" /> Great! You saved money this month.</span>
            ) : (
              <span className="flex items-center text-rose-600"><TrendingDown className="w-3 h-3 mr-1" /> Heads up: Over-spending this month.</span>
            )}
          </div>
        </div>
      </div>

      {/* Budget & Bills Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Overview */}
        {budgetProgress.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-fit">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Budget Summary (This Month)</h3>
              <Link href="/budgets" className="text-sm font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                View All &rarr;
              </Link>
            </div>
            <div className="space-y-6">
              {budgetProgress.slice(0, 4).map((p) => {
                const isOver = p.percentage >= 100;
                const isWarning = p.percentage >= 80;
                return (
                  <div key={p.category} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{p.category}</span>
                      <span className={`text-xs font-bold ${isOver ? 'text-rose-600' : isWarning ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {p.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden dark:bg-zinc-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(p.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-zinc-400">
                      <span>{formatIDR(p.spentAmount)}</span>
                      <span>Limit: {formatIDR(p.budgetAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bills Overview */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {showingNextMonth ? 'Estimated Total Bills' : 'Upcoming Bills'}
            </h3>
            <Link href="/bills" className="text-sm font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
              View All &rarr;
            </Link>
          </div>
          
          {showingNextMonth ? (
            <div className="flex items-center justify-between p-6 rounded-2xl bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Total Estimated</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{formatIDR(totalNextMonthAmount)}</p>
                <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                  {displayBills.length} bills scheduled for {new Date(nextMonthStr + "-01").toLocaleString('en-US', { month: 'long' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-400 uppercase mb-1 text-right">Next</p>
                {nearestNextMonthBill ? (
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 max-w-[150px] truncate">{nearestNextMonthBill.name}</p>
                    <p className="text-xs text-emerald-600 font-bold mt-0.5">
                      {nearestNextMonthBill.billing_day} {new Date(nextMonthStr + "-01").toLocaleString('en-US', { month: 'long' })}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium">{formatIDR(nearestNextMonthBill.amount)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">-</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {displayBills.length > 0 ? (
                displayBills.slice(0, 5).map((bill) => {
                  // Calculate progress for bills with totalAmount
                  // We need to fetch items for this, but currently dashboard doesn't fetch bill items.
                  // For now, let's at least show the bar if totalAmount exists, even if 0% progress.
                  // Ideally we should fetch bill items in fetchDashboardData.
                  return (
                    <div key={bill.id} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 dark:bg-amber-900/20 dark:text-emerald-400">
                            <CreditCard className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{bill.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">Due date: {bill.billing_day} {new Date().toLocaleString('en-US', { month: 'short' })}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{formatIDR(bill.amount)}</p>
                      </div>
                      
                      {bill.totalAmount !== undefined && (
                        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
                          <div 
                            className={`h-full transition-all duration-500 ${bill.billType === 'installment' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: '0%' }} // Placeholder since we don't have items here yet
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">All bills for this month are paid!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <DashboardChart transactions={transactions} />
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            <div className="p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Recent Activity (Last 1 Month)</h3>
              
              <div className="flex items-center gap-3">
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs font-medium dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={5}>5 Rows</option>
                  <option value={10}>10 Rows</option>
                  <option value={50}>50 Rows</option>
                  <option value={100}>100 Rows</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Amount</th>
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
                      <td colSpan={4} className="p-8 text-center text-zinc-500">No transactions in the last month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 flex items-center justify-between">
                <div className="text-xs text-zinc-500 font-medium">
                  Page {currentPage} of {totalPages}
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

'use client';

import { useState, useEffect } from 'react';
import { EXPENSE_CATEGORIES } from '@/features/transactions/domain/types';
import { SupabaseBudgetRepository } from '@/features/budgets/infrastructure/SupabaseBudgetRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { SupabaseWishlistRepository } from '@/features/wishlist/infrastructure/SupabaseWishlistRepository';
import { GetBudgetProgress, BudgetProgress } from '@/features/budgets/use-cases/GetBudgetProgress';
import { SetBudget } from '@/features/budgets/use-cases/SetBudget';
import { DeleteBudget } from '@/features/budgets/use-cases/DeleteBudget';
import { WishlistItem, Transaction } from '@/core/entities';
import { formatIDR } from '@/core/formatters/currency';
import { getUserId } from '@/utils/auth/get-user-id';
import { createClient } from '@/utils/supabase/client';
import { AddFundsModal } from '@/components/AddFundsModal';
import { AddBudgetWishlistModal } from '@/components/AddBudgetWishlistModal';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';
import { 
  Loader2, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Star,
  Gift,
  History,
  AlertTriangle
} from 'lucide-react';

const budgetRepository = new SupabaseBudgetRepository();
const transactionRepository = new SupabaseTransactionRepository();
const wishlistRepository = new SupabaseWishlistRepository();

const getBudgetProgress = new GetBudgetProgress(budgetRepository, transactionRepository);
const setBudgetUseCase = new SetBudget(budgetRepository);
const deleteBudgetUseCase = new DeleteBudget(budgetRepository);

export default function BudgetsPage() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [userId, setUserId] = useState<string | null>(getUserId());
  const supabase = createClient();

  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialCreateData, setInitialCreateData] = useState<any>(null);

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    transactions: Transaction[];
    loading: boolean;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    transactions: [],
    loading: false
  });

  const [year, month] = currentMonth.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());

  const fetchData = async (uid: string, m: string) => {
    setLoading(true);
    try {
      const [budgetData, wishlistData] = await Promise.all([
        getBudgetProgress.execute(uid, m),
        wishlistRepository.getWishlist(uid)
      ]);
      setProgress(budgetData);
      setWishlist(wishlistData);
    } catch {
      console.error('Error fetching budget/wishlist data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          uid = user.id;
          setUserId(user.id);
        }
      }
      if (uid) {
        await fetchData(uid, currentMonth);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [currentMonth, userId, supabase.auth]);

  const handleShowBudgetHistory = async (p: BudgetProgress) => {
    if (!userId) return;
    setHistoryModal({
      ...historyModal,
      isOpen: true,
      title: `${p.category} History`,
      subtitle: `Transactions for ${months[parseInt(month) - 1]} ${year}`,
      loading: true,
      transactions: []
    });

    try {
      const data = await transactionRepository.getTransactionsByCategoryAndMonth(userId, p.category, currentMonth);
      setHistoryModal(prev => ({ ...prev, transactions: data, loading: false }));
    } catch {
      alert('Failed to fetch history');
      setHistoryModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleShowWishlistHistory = async (item: WishlistItem) => {
    if (!userId) return;
    setHistoryModal({
      ...historyModal,
      isOpen: true,
      title: `${item.name} History`,
      subtitle: 'Savings contributions and withdrawals',
      loading: true,
      transactions: []
    });

    try {
      const data = await transactionRepository.getTransactionsByWishlistId(userId, item.id);
      setHistoryModal(prev => ({ ...prev, transactions: data, loading: false }));
    } catch {
      alert('Failed to fetch history');
      setHistoryModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleCreateConfirm = async (data: any) => {
    if (!userId) return;

    if (data.type === 'budget') {
      try {
        await setBudgetUseCase.execute(userId, data.category, data.amount, currentMonth);
        await fetchData(userId, currentMonth);
      } catch {
        alert('Failed to save budget');
      }
    } else {
      try {
        await wishlistRepository.addWishlistItem(userId, {
          name: data.name,
          targetAmount: data.amount,
          currentAmount: 0,
          category: data.category,
          priority: data.priority,
          isPurchased: false
        });
        await fetchData(userId, currentMonth);
      } catch (err: any) {
        alert(`Failed to save wishlist item: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Remove this goal from your wishlist?')) return;
    try {
      await wishlistRepository.deleteWishlistItem(id);
      if (userId) await fetchData(userId, currentMonth);
    } catch {
      alert('Failed to delete wishlist item');
    }
  };

  const handleAddFunds = (item: WishlistItem) => {
    setSelectedWishlistItem(item);
    setIsAddFundsOpen(true);
  };

  const handleConfirmAddFunds = async (amount: number, type: 'add' | 'withdraw') => {
    if (!userId || !selectedWishlistItem) return;

    try {
      const newAmount = type === 'add' 
        ? selectedWishlistItem.currentAmount + amount 
        : selectedWishlistItem.currentAmount - amount;

      // 1. Create Transaction
      await transactionRepository.addTransaction(userId, {
        amount: amount,
        category: '🎯 Wishlist',
        description: `${type === 'add' ? '[Deposit]' : '[Withdrawal]'} ${selectedWishlistItem.name}`,
        date: new Date().toISOString().split('T')[0],
        type: type === 'add' ? 'expense' : 'income',
        wishlistId: selectedWishlistItem.id
      });

      // 2. Update Wishlist Item
      await wishlistRepository.updateWishlistItem(userId, selectedWishlistItem.id, {
        currentAmount: newAmount,
        isPurchased: type === 'add' && newAmount >= selectedWishlistItem.targetAmount
      });

      await fetchData(userId, currentMonth);
    } catch (err) {
      console.error(err);
      alert('Failed to update progress');
    }
  };

  const handleTogglePurchased = async (item: WishlistItem) => {
    if (!userId) return;

    // If marking as purchased and not yet fully funded
    if (!item.isPurchased && item.currentAmount < item.targetAmount) {
      const remaining = item.targetAmount - item.currentAmount;
      if (confirm(`Goal not reached. Add remaining ${formatIDR(remaining)} as expense and mark as bought?`)) {
        try {
          // Add transaction for remaining balance
          await transactionRepository.addTransaction(userId, {
            amount: remaining,
            category: '🎯 Wishlist',
            description: `[Final Payment] ${item.name}`,
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            wishlistId: item.id
          });

          await wishlistRepository.updateWishlistItem(userId, item.id, {
            currentAmount: item.targetAmount,
            isPurchased: true
          });
          await fetchData(userId, currentMonth);
          return;
        } catch (err) {
          console.error(err);
          alert('Failed to finalize purchase');
          return;
        }
      } else {
        return;
      }
    }

    try {
      await wishlistRepository.updateWishlistItem(userId, item.id, {
        isPurchased: !item.isPurchased
      });
      await fetchData(userId, currentMonth);
    } catch {
      alert('Failed to update status');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    try {
      if (id) await deleteBudgetUseCase.execute(id);
      if (userId) await fetchData(userId, currentMonth);
    } catch {
      alert('Failed to delete budget');
    }
  };

  const changeMonth = (delta: number) => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + delta);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const handlePickerChange = (newYear: string, newMonth: string) => {
    setCurrentMonth(`${newYear}-${newMonth}`);
  };

  const plannedBudgets = progress.filter(p => p.hasBudget);
  const unplannedBudgets = progress.filter(p => !p.hasBudget && p.spentAmount > 0);

  if (loading && progress.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Budgets & Limits</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Set and track your monthly spending limits.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setInitialCreateData(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>

          <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-xl dark:bg-zinc-900 dark:border-zinc-800">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors dark:hover:bg-zinc-800">
              <ChevronLeft className="w-5 h-5 text-zinc-500" />
            </button>
            
            <div className="flex items-center gap-1 px-1">
              <select
                value={month}
                onChange={(e) => handlePickerChange(year, e.target.value)}
                className="bg-transparent text-sm font-bold outline-none cursor-pointer hover:text-emerald-600 transition-colors"
              >
                {months.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => handlePickerChange(e.target.value, month)}
                className="bg-transparent text-sm font-bold outline-none cursor-pointer hover:text-emerald-600 transition-colors"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors dark:hover:bg-zinc-800">
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 lg:col-span-3">
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20 sticky top-24">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <h4 className="text-emerald-800 font-bold text-lg mb-2 dark:text-emerald-400">Integrated Planning</h4>
            <p className="text-emerald-700 text-sm leading-relaxed dark:text-emerald-500/80 mb-4">
              Budgets help you control monthly spending, while Savings Goals help you set aside surplus for the things you really want.
            </p>
            <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800/50">
              <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Active Targets</p>
              <div className="flex justify-between text-sm font-medium text-emerald-800 dark:text-emerald-400">
                <span>Monthly Budgets</span>
                <span className="font-bold">{plannedBudgets.length}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-emerald-800 dark:text-emerald-400 mt-1">
                <span>Wishlist Goals</span>
                <span className="font-bold">{wishlist.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 lg:col-span-9 space-y-12">
          {/* Planned Budget Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Monthly Budget Progress
            </h3>
            
            {plannedBudgets.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-zinc-300 text-center dark:bg-zinc-900 dark:border-zinc-800">
                <p className="text-zinc-500 text-sm font-medium">No budgets set for this month yet.</p>
                <button 
                  onClick={() => {
                    setInitialCreateData(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                >
                  Set your first budget &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {plannedBudgets.map((p) => {
                  const isOverBudget = p.percentage >= 100;
                  const isWarning = p.percentage >= 80 && p.percentage < 100;

                  return (
                    <div key={p.category} className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-zinc-50">{p.category}</h4>
                          <p className="text-xs text-zinc-500">
                            Spent {formatIDR(p.spentAmount)} of {formatIDR(p.budgetAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${isOverBudget ? 'text-rose-600' : isWarning ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {p.percentage.toFixed(0)}%
                          </div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">
                            {isOverBudget ? 'Exceeded' : 'Remaining'}
                          </p>
                        </div>
                      </div>

                      <div className="relative h-2 w-full bg-zinc-100 rounded-full overflow-hidden dark:bg-zinc-800">
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                            isOverBudget ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(p.percentage, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1.5">
                          {isOverBudget ? (
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className={`text-xs font-medium ${isOverBudget ? 'text-rose-600' : 'text-zinc-500'}`}>
                            {isOverBudget 
                              ? `Over by ${formatIDR(Math.abs(p.remainingAmount))}` 
                              : `${formatIDR(p.remainingAmount)} left to spend`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleShowBudgetHistory(p)}
                            className="text-zinc-400 hover:text-amber-600 transition-colors"
                            title="View History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setInitialCreateData({
                                type: 'budget',
                                category: p.category,
                                amountDisplay: p.budgetAmount.toString(),
                                name: '',
                                priority: 'medium'
                              });
                              setIsCreateModalOpen(true);
                            }}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-500"
                          >
                            Adjust
                          </button>
                          <button 
                            onClick={() => handleDeleteBudget(p.id!)}
                            className="text-zinc-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unplanned Section */}
          {unplannedBudgets.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Unplanned Spending
              </h3>
              <div className="grid grid-cols-1 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                {unplannedBudgets.map((p) => (
                  <div key={p.category} className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-50">{p.category}</h4>
                        <p className="text-xs text-zinc-500">You&apos;ve spent {formatIDR(p.spentAmount)} without a limit</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleShowBudgetHistory(p)}
                          className="p-2 text-zinc-400 hover:text-amber-600 transition-colors bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                          title="View History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            setInitialCreateData({
                              type: 'budget',
                              category: p.category,
                              amountDisplay: p.spentAmount.toString(),
                              name: '',
                              priority: 'medium'
                            });
                            setIsCreateModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Set Limit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wishlist Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              Wishlist & Savings Goals
            </h3>
            
            {wishlist.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-zinc-300 text-center dark:bg-zinc-900 dark:border-zinc-800">
                <p className="text-zinc-500 text-sm font-medium">No savings goals yet.</p>
                <p className="text-zinc-400 text-xs mt-1">Items you add to your wishlist will persist across months.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {wishlist.map((item) => {
                  const progressVal = (item.currentAmount / item.targetAmount) * 100;
                  const isCompleted = progressVal >= 100 || item.isPurchased;

                  return (
                    <div key={item.id} className={`bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative group transition-all ${isCompleted ? 'opacity-75 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-bold text-zinc-900 dark:text-zinc-50 ${isCompleted ? 'line-through' : ''}`}>{item.name}</h4>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                              item.priority === 'high' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' :
                              item.priority === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                              'bg-zinc-50 text-zinc-500 dark:bg-zinc-800'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">{item.category}</p>
                        </div>
                        <div className="flex items-center gap-1 transition-opacity">
                            <button onClick={() => handleShowWishlistHistory(item)} className="p-1.5 text-zinc-400 hover:text-amber-600 transition-colors"><History className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteGoal(item.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-zinc-400 uppercase tracking-tighter">Savings Progress</span>
                          <span className={isCompleted ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-100'}>
                            {formatIDR(item.currentAmount)} / {formatIDR(item.targetAmount)}
                          </span>
                        </div>
                        <div className="relative h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden dark:bg-zinc-800">
                          <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(progressVal, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
                        <button 
                          onClick={() => handleTogglePurchased(item)}
                          className={`text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${item.isPurchased ? 'text-emerald-600' : 'text-zinc-400 hover:text-emerald-600'}`}
                        >
                          {item.isPurchased ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                          {item.isPurchased ? 'Purchased' : 'Mark Bought'}
                        </button>
                        {!item.isPurchased && (
                          <button 
                            onClick={() => handleAddFunds(item)}
                            className="bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 px-3 py-1 rounded-lg text-[10px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Funds
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddFundsModal
        isOpen={isAddFundsOpen}
        item={selectedWishlistItem}
        onConfirm={handleConfirmAddFunds}
        onCancel={() => {
          setIsAddFundsOpen(false);
          setSelectedWishlistItem(null);
        }}
      />

      <AddBudgetWishlistModal
        isOpen={isCreateModalOpen}
        initialData={initialCreateData}
        onClose={() => {
          setIsCreateModalOpen(false);
          setInitialCreateData(null);
        }}
        onConfirm={handleCreateConfirm}
      />

      <TransactionHistoryModal
        isOpen={historyModal.isOpen}
        title={historyModal.title}
        subtitle={historyModal.subtitle}
        loading={historyModal.loading}
        transactions={historyModal.transactions}
        onClose={() => setHistoryModal({ ...historyModal, isOpen: false })}
      />
    </div>
  );
}

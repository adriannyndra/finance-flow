'use client';

import { useState, useEffect } from 'react';
import { EXPENSE_CATEGORIES } from '@/features/transactions/domain/types';
import { SupabaseBudgetRepository } from '@/features/budgets/infrastructure/SupabaseBudgetRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { GetBudgetProgress, BudgetProgress } from '@/features/budgets/use-cases/GetBudgetProgress';
import { SetBudget } from '@/features/budgets/use-cases/SetBudget';
import { DeleteBudget } from '@/features/budgets/use-cases/DeleteBudget';
import { formatIDR, formatNumberInput, parseNumberInput } from '@/core/formatters/currency';
import { getUserId } from '@/utils/auth/get-user-id';
import { createClient } from '@/utils/supabase/client';
import { 
  Loader2, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';

const budgetRepository = new SupabaseBudgetRepository();
const transactionRepository = new SupabaseTransactionRepository();
const getBudgetProgress = new GetBudgetProgress(budgetRepository, transactionRepository);
const setBudgetUseCase = new SetBudget(budgetRepository);
const deleteBudgetUseCase = new DeleteBudget(budgetRepository);

export default function BudgetsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [userId, setUserId] = useState<string | null>(getUserId());

  const supabase = createClient();

  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0],
    amountDisplay: '',
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
      const data = await getBudgetProgress.execute(uid, m);
      setProgress(data);
    } catch {
      console.error('Error fetching budget progress');
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

  const handleSetBudget = async (category: string, amount: number) => {
    if (!userId) return;
    setSaving(category);
    try {
      await setBudgetUseCase.execute(userId, category, amount, currentMonth);
      await fetchData(userId, currentMonth);
      setFormData({ category: EXPENSE_CATEGORIES[0], amountDisplay: '' });
    } catch {
      alert('Failed to save budget');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await deleteBudgetUseCase.execute(id);
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
        <div className="flex items-center gap-2 bg-white border border-zinc-200 p-2 rounded-xl dark:bg-zinc-900 dark:border-zinc-800">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Set Budget</h3>
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const amount = parseNumberInput(formData.amountDisplay);
              if (amount) handleSetBudget(formData.category, parseFloat(amount));
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Monthly Limit (Rp)</label>
                <input
                  type="text"
                  value={formData.amountDisplay}
                  onChange={(e) => setFormData({ ...formData, amountDisplay: formatNumberInput(e.target.value) })}
                  placeholder="e.g. 1.000.000"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!!saving || !formData.amountDisplay}
                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Set Budget'}
              </button>
            </form>
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20">
            <h4 className="text-emerald-800 font-bold text-sm mb-2 dark:text-emerald-400">Why set budgets?</h4>
            <p className="text-emerald-700 text-xs leading-relaxed dark:text-emerald-500/80">
              Setting limits helps you stay mindful of your spending. We&apos;ll track your expenses in real-time and let you know how much you have left to spend in each category.
            </p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Budget Progress</h3>
          
          {progress.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-zinc-300 text-center dark:bg-zinc-900 dark:border-zinc-800">
              <div className="bg-zinc-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-zinc-800">
                <Target className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-zinc-500 text-sm font-medium">No budgets set for this month yet.</p>
              <p className="text-zinc-400 text-xs mt-1">Start by adding a category limit on the left.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {progress.map((p) => {
                const isOverBudget = p.percentage >= 100;
                const isWarning = p.percentage >= 80 && p.percentage < 100;

                return (
                  <div key={p.category} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
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
                          onClick={() => {
                            setFormData({ category: p.category, amountDisplay: formatNumberInput(p.budgetAmount.toString()) });
                          }}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-500"
                        >
                          Adjust
                        </button>
                        <button 
                          onClick={() => handleDeleteBudget(p.id)}
                          className="text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Delete Budget"
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
      </div>
    </div>
  );
}

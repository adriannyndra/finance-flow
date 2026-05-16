'use client';

import { useState, useEffect } from 'react';
import { Bill, BillFrequency } from '@/core/entities';
import { EXPENSE_CATEGORIES } from '@/features/transactions/domain/types';
import { SupabaseBillRepository } from '@/features/bills/infrastructure/SupabaseBillRepository';
import { GetBills } from '@/features/bills/use-cases/GetBills';
import { AddBill } from '@/features/bills/use-cases/AddBill';
import { UpdateBill } from '@/features/bills/use-cases/UpdateBill';
import { DeleteBill } from '@/features/bills/use-cases/DeleteBill';
import { MarkBillAsPaid } from '@/features/bills/use-cases/MarkBillAsPaid';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { formatIDR, formatNumberInput, parseNumberInput } from '@/core/formatters/currency';
import { getUserId } from '@/utils/auth/get-user-id';
import { createClient } from '@/utils/supabase/client';
import { 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Edit2,
  Check,
  Calendar,
  CreditCard,
  AlertCircle
} from 'lucide-react';

const repository = new SupabaseBillRepository();
const transactionRepo = new SupabaseTransactionRepository();
const getBillsUseCase = new GetBills(repository);
const addBillUseCase = new AddBill(repository);
const updateBillUseCase = new UpdateBill(repository);
const deleteBillUseCase = new DeleteBill(repository);
const markBillAsPaidUseCase = new MarkBillAsPaid(repository, transactionRepo);

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(getUserId());

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const handleMarkAsPaid = async (bill: Bill) => {
    if (!userId || !confirm(`Mark ${bill.name} as paid for this month?`)) return;
    try {
      await markBillAsPaidUseCase.execute(userId, bill);
      setBills(bills.map(b => b.id === bill.id ? { ...b, lastGeneratedMonth: currentMonthStr } : b));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    }
  };

  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    amountDisplay: '',
    category: EXPENSE_CATEGORIES[0],
    frequency: 'monthly' as BillFrequency,
    billing_day: 1,
    endDate: '',
  });

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
        const data = await getBillsUseCase.execute(uid);
        setBills(data);
      }
      setLoading(false);
    };
    init();
  }, [userId, supabase.auth]);

  const handleEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setIsAdding(true);
    setFormData({
      name: bill.name,
      amountDisplay: formatNumberInput(bill.amount.toString()),
      category: bill.category,
      frequency: bill.frequency,
      billing_day: bill.billing_day,
      endDate: bill.endDate || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNumberInput(formData.amountDisplay);
    if (!amount || !userId) return;

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await updateBillUseCase.execute(editingId, {
          name: formData.name,
          amount: parseFloat(amount),
          category: formData.category,
          frequency: formData.frequency,
          billing_day: formData.billing_day,
          endDate: formData.endDate || undefined
        });
        setBills(bills.map(b => b.id === editingId ? updated : b));
      } else {
        const newBill = await addBillUseCase.execute(userId, {
          name: formData.name,
          amount: parseFloat(amount),
          category: formData.category,
          frequency: formData.frequency,
          billing_day: formData.billing_day,
          active: true,
          endDate: formData.endDate || undefined
        });
        setBills([...bills, newBill]);
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        name: '',
        amountDisplay: '',
        category: EXPENSE_CATEGORIES[0],
        frequency: 'monthly',
        billing_day: 1,
        endDate: '',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBill = async (id: string) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await deleteBillUseCase.execute(id);
      setBills(bills.filter(s => s.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
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
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bills</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Manage your recurring expenses and bills.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (isAdding) setEditingId(null);
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-500 transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add Bill'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-4">{editingId ? 'Edit Bill' : 'New Bill'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                  placeholder="e.g. Netflix"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount (Rp)</label>
                <input
                  type="text"
                  required
                  value={formData.amountDisplay}
                  onChange={(e) => setFormData({ ...formData, amountDisplay: formatNumberInput(e.target.value) })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Billing Day (Date)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={formData.billing_day}
                  onChange={(e) => setFormData({ ...formData, billing_day: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as BillFrequency })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50">
              {isSaving ? 'Saving...' : (editingId ? 'Update Bill' : 'Save Bill')}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bills.map((bill) => (
          <div key={bill.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative group">
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(bill)}
                className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"
                title="Edit Bill"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteBill(bill.id)}
                className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                title="Delete Bill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{bill.name}</h3>
                <p className="text-xs text-zinc-500">{bill.category}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Amount</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-50">{formatIDR(bill.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Billing Date</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">Every {bill.billing_day}{bill.billing_day === 1 ? 'st' : bill.billing_day === 2 ? 'nd' : bill.billing_day === 3 ? 'rd' : 'th'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Frequency</span>
                <span className="px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-bold uppercase dark:bg-zinc-800">{bill.frequency}</span>
              </div>
              {bill.endDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">End Date</span>
                  <span className="font-medium text-rose-600 dark:text-rose-400">{bill.endDate}</span>
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Calendar className="w-3 h-3" />
                <span>Next: {bill.billing_day} {new Date().toLocaleString('default', { month: 'short' })}</span>
              </div>
              
              {bill.lastGeneratedMonth === currentMonthStr ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md dark:bg-emerald-900/20 dark:text-emerald-400">
                  <Check className="w-3 h-3" /> Paid
                </span>
              ) : (
                <button
                  onClick={() => handleMarkAsPaid(bill)}
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase hover:text-emerald-600 transition-colors bg-zinc-50 px-2 py-1 rounded-md dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-emerald-400"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        ))}
        {bills.length === 0 && !isAdding && (
          <div className="col-span-full py-12 bg-white rounded-2xl border border-dashed border-zinc-300 text-center dark:bg-zinc-900 dark:border-zinc-800">
            <CreditCard className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No active bills found.</p>
            <button onClick={() => setIsAdding(true)} className="text-emerald-600 font-bold text-sm mt-2">Add your first bill &rarr;</button>
          </div>
        )}
      </div>

      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20 flex gap-4">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
        <div>
          <h4 className="text-amber-800 font-bold text-sm dark:text-amber-400">How auto-tracking works</h4>
          <p className="text-amber-700 text-xs leading-relaxed mt-1 dark:text-amber-500/80">
            When you add a bill, the system will automatically create a transaction for it every month on your specified billing day. You don&apos;t have to add them manually anymore!
          </p>
        </div>
      </div>
    </div>
  );
}

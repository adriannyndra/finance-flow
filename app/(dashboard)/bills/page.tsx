'use client';

import { useState, useEffect } from 'react';
import { Bill, BillFrequency, BillType, BillItem } from '@/core/entities';
import { EXPENSE_CATEGORIES } from '@/features/transactions/domain/types';
import { SupabaseBillRepository } from '@/features/bills/infrastructure/SupabaseBillRepository';
import { GetBills } from '@/features/bills/use-cases/GetBills';
import { AddBill } from '@/features/bills/use-cases/AddBill';
import { UpdateBill } from '@/features/bills/use-cases/UpdateBill';
import { DeleteBill } from '@/features/bills/use-cases/DeleteBill';
import { MarkBillAsPaid } from '@/features/bills/use-cases/MarkBillAsPaid';
import { PayInstallmentItem } from '@/features/bills/use-cases/PayInstallmentItem';
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
  AlertCircle,
  Clock,
  X,
  ChevronRight,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  PlusCircle,
  Pencil,
  History,
  Layers
} from 'lucide-react';

const repository = new SupabaseBillRepository();
const transactionRepo = new SupabaseTransactionRepository();
const getBillsUseCase = new GetBills(repository);
const addBillUseCase = new AddBill(repository);
const updateBillUseCase = new UpdateBill(repository);
const deleteBillUseCase = new DeleteBill(repository);
const markBillAsPaidUseCase = new MarkBillAsPaid(repository, transactionRepo);
const payInstallmentItemUseCase = new PayInstallmentItem(repository, transactionRepo);

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [billItems, setBillItems] = useState<Record<string, BillItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(getUserId());
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const fetchBillItems = async (uid: string) => {
    try {
      const items = await repository.getBillItems(uid);
      const grouped = items.reduce((acc, item) => {
        if (!acc[item.billId]) acc[item.billId] = [];
        acc[item.billId].push(item);
        return acc;
      }, {} as Record<string, BillItem[]>);
      setBillItems(grouped);
    } catch (err) {
      console.error('Failed to fetch bill items', err);
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    if (!userId || !confirm(`Mark ${bill.name} as paid for this month?`)) return;
    try {
      await markBillAsPaidUseCase.execute(userId, bill);
      setBills(bills.map(b => b.id === bill.id ? { ...b, lastGeneratedMonth: currentMonthStr } : b));
      fetchBillItems(userId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    }
  };

  const handlePayItem = async (bill: Bill, item: BillItem) => {
    if (!userId || !confirm(`Pay this installment for ${item.dueDate}?`)) return;
    try {
      await payInstallmentItemUseCase.execute(userId, bill, item);
      const billsData = await getBillsUseCase.execute(userId);
      setBills(billsData);
      fetchBillItems(userId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    }
  };

  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    amountDisplay: '',
    totalAmountDisplay: '',
    category: EXPENSE_CATEGORIES[0],
    frequency: 'monthly' as BillFrequency,
    billType: 'recurring' as BillType,
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
        await fetchBillItems(uid);
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
      totalAmountDisplay: bill.totalAmount ? formatNumberInput(bill.totalAmount.toString()) : '',
      category: bill.category,
      frequency: bill.frequency,
      billType: bill.billType,
      billing_day: bill.billing_day,
      endDate: bill.endDate || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNumberInput(formData.amountDisplay);
    const totalAmount = formData.totalAmountDisplay ? parseNumberInput(formData.totalAmountDisplay) : undefined;
    if (!amount || !userId) return;

    setIsSaving(true);
    try {
      const billData: any = {
        name: formData.name,
        amount: parseFloat(amount),
        category: formData.category,
        frequency: formData.frequency,
        billType: formData.billType,
        endDate: formData.endDate || undefined
      };

      if (formData.billType === 'one-time' && formData.endDate) {
          billData.billing_day = new Date(formData.endDate).getDate();
      } else {
          billData.billing_day = formData.billing_day;
      }

      if (formData.billType === 'installment' && totalAmount) {
          billData.totalAmount = parseFloat(totalAmount);
      }

      if (editingId) {
        const updated = await updateBillUseCase.execute(editingId, billData);
        setBills(bills.map(b => b.id === editingId ? updated : b));
      } else {
        const newBill = await addBillUseCase.execute(userId, {
          ...billData,
          active: true
        });
        setBills([...bills, newBill]);
        await fetchBillItems(userId);
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        name: '',
        amountDisplay: '',
        totalAmountDisplay: '',
        category: EXPENSE_CATEGORIES[0],
        frequency: 'monthly',
        billType: 'recurring',
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
    if (!confirm('Delete this bill? This will also delete all its payment history.')) return;
    try {
      await deleteBillUseCase.execute(id);
      setBills(bills.filter(s => s.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    }
  };

  const handleDeleteItem = async (itemId: string, bill: Bill) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      const items = billItems[bill.id] || [];
      const itemToDelete = items.find(i => i.id === itemId);
      if (!itemToDelete) return;

      const currentItemsTotal = items.reduce((s, i) => s + i.amount, 0);
      const isSynced = bill.totalAmount !== undefined && Math.abs(bill.totalAmount - currentItemsTotal) < 1;

      await repository.deleteBillItem(itemId);
      
      if (bill.billType === 'installment' && bill.totalAmount !== undefined && isSynced) {
          const newTotal = bill.totalAmount - itemToDelete.amount;
          const updated = await updateBillUseCase.execute(bill.id, { totalAmount: newTotal });
          setBills(bills.map(b => b.id === bill.id ? updated : b));
      }
      
      if (userId) fetchBillItems(userId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateItemAmount = async (item: BillItem, bill: Bill) => {
    const newAmountStr = prompt('Enter new amount for this payment:', item.amount.toString());
    if (newAmountStr === null) return;
    
    const newAmount = parseFloat(newAmountStr);
    if (isNaN(newAmount)) return alert('Invalid amount');

    try {
      const items = billItems[bill.id] || [];
      const currentItemsTotal = items.reduce((s, i) => s + i.amount, 0);
      const isSynced = bill.totalAmount !== undefined && Math.abs(bill.totalAmount - currentItemsTotal) < 1;
      const diff = newAmount - item.amount;
      const newItemsTotal = currentItemsTotal + diff;

      await repository.updateBillItem(item.id, { amount: newAmount });
      
      if (bill.billType === 'installment' && bill.totalAmount !== undefined) {
          const newHeader = isSynced ? (bill.totalAmount + diff) : Math.max(bill.totalAmount, newItemsTotal);
          
          if (newHeader !== bill.totalAmount) {
            const updated = await updateBillUseCase.execute(bill.id, { totalAmount: newHeader });
            setBills(bills.map(b => b.id === bill.id ? updated : b));
          }
      }

      if (userId) fetchBillItems(userId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateTotalDebt = async (bill: Bill) => {
    const newTotalStr = prompt('Enter new Total Debt amount:', bill.totalAmount?.toString() || '0');
    if (newTotalStr === null) return;

    const newTotal = parseFloat(newTotalStr);
    if (isNaN(newTotal)) return alert('Invalid amount');

    try {
      const updated = await updateBillUseCase.execute(bill.id, { totalAmount: newTotal });
      setBills(bills.map(b => b.id === bill.id ? updated : b));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddManualItem = async (bill: Bill) => {
    const items = billItems[bill.id] || [];
    const lastItem = items[items.length - 1];
    const baseDate = lastItem ? new Date(lastItem.dueDate) : new Date();
    const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, bill.billing_day);
    
    const amountStr = prompt('Enter amount for new installment:', bill.amount.toString());
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    
    const dateStr = prompt('Enter due date (YYYY-MM-DD):', nextDate.toISOString().split('T')[0]);
    if (!dateStr) return;

    try {
      if (!userId) return;
      const currentItemsTotal = items.reduce((s, i) => s + i.amount, 0);
      const isSynced = bill.totalAmount !== undefined && Math.abs(bill.totalAmount - currentItemsTotal) < 1;
      const newItemsTotal = currentItemsTotal + amount;

      await repository.addBillItem(userId, {
        billId: bill.id,
        amount,
        dueDate: dateStr,
        status: 'pending'
      });
      
      if (bill.totalAmount !== undefined) {
          const newHeader = isSynced ? (bill.totalAmount + amount) : Math.max(bill.totalAmount, newItemsTotal);
          if (newHeader !== bill.totalAmount) {
            const updated = await updateBillUseCase.execute(bill.id, { totalAmount: newHeader });
            setBills(bills.map(b => b.id === bill.id ? updated : b));
          }
      }
      
      fetchBillItems(userId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const selectedBill = bills.find(b => b.id === selectedBillId);
  const selectedItems = selectedBillId ? billItems[selectedBillId] || [] : [];
  const totalItemsAmount = selectedItems.reduce((sum, i) => sum + i.amount, 0);
  const unallocatedAmount = selectedBill?.totalAmount ? selectedBill.totalAmount - totalItemsAmount : 0;

  const groupedBills: Record<BillType, Bill[]> = {
    recurring: bills.filter(b => b.billType === 'recurring'),
    installment: bills.filter(b => b.billType === 'installment'),
    'one-time': bills.filter(b => b.billType === 'one-time'),
  };

  const sections = [
    { id: 'recurring' as BillType, label: 'Recurring', icon: RefreshCw, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'installment' as BillType, label: 'Installments & Debt', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'one-time' as BillType, label: 'One-time Bills', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bills & Installments</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Manage recurring payments, debt installments, and one-time bills.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (isAdding) setEditingId(null);
          }}
          className="bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'Add Bill'}
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
                  placeholder="e.g. Laptop Installment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Bill Type</label>
                <select
                  value={formData.billType}
                  onChange={(e) => setFormData({ ...formData, billType: e.target.value as BillType })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <option value="recurring">Recurring (Subscription)</option>
                  <option value="installment">Installment (Debt/Cicilan)</option>
                  <option value="one-time">One-time Bill</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {formData.billType === 'recurring' ? 'Monthly Amount' : 'Payment Amount'} (Rp)
                </label>
                <input
                  type="text"
                  required
                  value={formData.amountDisplay}
                  onChange={(e) => setFormData({ ...formData, amountDisplay: formatNumberInput(e.target.value) })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                  placeholder="0"
                />
              </div>
              {formData.billType === 'installment' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Debt Amount</label>
                  <input
                    type="text"
                    required
                    value={formData.totalAmountDisplay}
                    onChange={(e) => setFormData({ ...formData, totalAmountDisplay: formatNumberInput(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700 font-bold text-emerald-600"
                    placeholder="Total amount to be paid"
                  />
                </div>
              )}
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
              {formData.billType !== 'one-time' && (
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
              )}
              <div className={formData.billType === 'one-time' ? 'col-span-1' : ''}>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {formData.billType === 'one-time' ? 'Deadline Date' : 'End Date (Optional)'}
                </label>
                <input
                  type="date"
                  required={formData.billType === 'one-time'}
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

      {sections.map((section) => {
        const sectionBills = groupedBills[section.id];
        if (sectionBills.length === 0) return null;

        return (
          <div key={section.id} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <section.icon className={`w-5 h-5 ${section.color}`} />
                <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">{section.label}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sectionBills.map((bill) => {
                const items = billItems[bill.id] || [];
                const paidItems = items.filter(i => i.status === 'paid');
                const totalPaid = paidItems.reduce((sum, item) => sum + item.amount, 0);
                const progress = bill.totalAmount ? Math.min((totalPaid / bill.totalAmount) * 100, 100) : 0;
                const currentUnallocated = bill.totalAmount ? bill.totalAmount - items.reduce((s, i) => s + i.amount, 0) : 0;

                return (
                  <div key={bill.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 relative group flex flex-col">
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(bill)} className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteBill(bill.id)} className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${section.bg} ${section.color}`}>
                        <section.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{bill.name}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{bill.category}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 flex-grow">
                      {bill.billType !== 'installment' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Amount</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-50">{formatIDR(bill.amount)}</span>
                        </div>
                      )}

                      {bill.billType === 'installment' && bill.totalAmount !== undefined && (
                        <>
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400">
                              <span>Progress</span>
                              <span>{formatIDR(totalPaid)} / {formatIDR(bill.totalAmount)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          {Math.abs(currentUnallocated) > 1 && (
                            <div className="flex items-center gap-2 text-[10px] font-bold p-2 rounded-lg mt-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Mismatch detected in schedule</span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">{bill.billType === 'one-time' ? 'Due Date' : 'Billing'}</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {bill.billType === 'one-time' ? bill.endDate : `Every ${bill.billing_day}${bill.billing_day === 1 ? 'st' : bill.billing_day === 2 ? 'nd' : bill.billing_day === 3 ? 'rd' : 'th'}`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedBillId(bill.id)}
                        className="text-[10px] font-bold text-emerald-600 uppercase hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors dark:hover:bg-emerald-900/20 flex items-center gap-1"
                      >
                        {bill.billType === 'installment' ? <Layers className="w-3 h-3" /> : <History className="w-3 h-3" />}
                        {bill.billType === 'installment' ? 'View Schedule' : 'History'}
                      </button>
                      
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
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Bill Items Detail Modal */}
      {selectedBillId && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <div>
                <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-50">{selectedBill.name}</h3>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">{selectedBill.billType} Roadmap</p>
              </div>
              <button onClick={() => setSelectedBillId(null)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-500" /></button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Debt (Header)</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{formatIDR(selectedBill.totalAmount || 0)}</p>
                  </div>
                  {selectedBill.billType === 'installment' && (
                      <button onClick={() => handleUpdateTotalDebt(selectedBill)} className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Pencil className="w-4 h-4" /></button>
                  )}
                </div>
                <div className={`p-4 rounded-2xl border transition-colors ${Math.abs(unallocatedAmount) < 1 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10'}`}>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Unallocated Balance</p>
                  <p className={`text-lg font-bold ${Math.abs(unallocatedAmount) < 1 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatIDR(unallocatedAmount)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Installment Schedule</h4>
                  {selectedBill.billType === 'installment' && (
                    <button onClick={() => handleAddManualItem(selectedBill)} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors dark:bg-emerald-900/20"><PlusCircle className="w-3 h-3" /> Add Item</button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedItems.map((item) => {
                    const isOverdue = item.status === 'pending' && new Date(item.dueDate) < new Date();
                    return (
                      <div key={item.id} className={`group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border rounded-2xl transition-all shadow-sm ${item.status === 'paid' ? 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50' : isOverdue ? 'border-rose-200 bg-rose-50/20' : 'border-zinc-200 dark:border-zinc-700'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-zinc-100 text-zinc-400'}`}>
                            {item.status === 'paid' ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{formatIDR(item.amount)}</p>
                            <p className={`text-[10px] font-bold ${isOverdue ? 'text-rose-500' : 'text-zinc-500'}`}>{new Date(item.dueDate).toLocaleDateString(undefined, { dateStyle: 'long' })}{isOverdue && ' (Overdue)'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'pending' && (
                            <button onClick={() => handlePayItem(selectedBill, item)} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-500 transition-colors"><ArrowUpRight className="w-3 h-3" /> Pay</button>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <button onClick={() => handleUpdateItemAmount(item, selectedBill)} className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteItem(item.id, selectedBill)} className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button onClick={() => setSelectedBillId(null)} className="bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 px-6 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

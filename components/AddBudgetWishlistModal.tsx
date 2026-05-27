'use client';

import { X, Target, Gift, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EXPENSE_CATEGORIES } from '@/features/transactions/domain/types';
import { formatNumberInput, parseNumberInput } from '@/core/formatters/currency';

interface AddBudgetWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
  initialData?: {
    type: 'budget' | 'wishlist';
    category: string;
    amountDisplay: string;
    name: string;
    priority: 'low' | 'medium' | 'high';
  } | null;
}

export function AddBudgetWishlistModal({
  isOpen,
  onClose,
  onConfirm,
  initialData
}: AddBudgetWishlistModalProps) {
  const [formType, setFormType] = useState<'budget' | 'wishlist'>('budget');
  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0],
    amountDisplay: '',
    name: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormType(initialData.type);
      setFormData({
        category: initialData.category,
        amountDisplay: initialData.amountDisplay,
        name: initialData.name,
        priority: initialData.priority,
      });
    } else {
      setFormType('budget');
      setFormData({
        category: EXPENSE_CATEGORIES[0],
        amountDisplay: '',
        name: '',
        priority: 'medium',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm({
        type: formType,
        ...formData,
        amount: parseFloat(parseNumberInput(formData.amountDisplay))
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {initialData ? 'Adjust Planning' : 'New Planning'}
            </h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6">
            <button 
              onClick={() => setFormType('budget')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${formType === 'budget' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              Spending Limit
            </button>
            <button 
              onClick={() => setFormType('wishlist')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${formType === 'wishlist' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              Saving Goal
            </button>
          </div>

          <div className="flex items-center justify-between mb-4 px-1">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
              {formType === 'budget' ? 'Monthly Budget' : 'Wishlist Item'}
            </h4>
            {formType === 'budget' ? <Target className="w-5 h-5 text-emerald-600" /> : <Gift className="w-5 h-5 text-amber-600" />}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formType === 'wishlist' && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. New MacBook"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all text-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all text-zinc-900 dark:text-zinc-100"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                {formType === 'budget' ? 'Monthly Limit (Rp)' : 'Target Price (Rp)'}
              </label>
              <input
                type="text"
                required
                value={formData.amountDisplay}
                onChange={(e) => setFormData({ ...formData, amountDisplay: formatNumberInput(e.target.value) })}
                placeholder="0"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-zinc-500/10 transition-all text-zinc-900 dark:text-zinc-100 font-bold"
              />
            </div>

            {formType === 'wishlist' && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p })}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${formData.priority === p ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.amountDisplay || (formType === 'wishlist' && !formData.name)}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-sm ${formType === 'budget' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (initialData ? 'Update Plan' : 'Create Plan')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

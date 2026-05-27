'use client';

import { X, Wallet, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WishlistItem } from '@/core/entities';
import { formatIDR, formatNumberInput, parseNumberInput } from '@/core/formatters/currency';

interface AddFundsModalProps {
  isOpen: boolean;
  item: WishlistItem | null;
  onConfirm: (amount: number, type: 'add' | 'withdraw') => Promise<void>;
  onCancel: () => void;
}

export function AddFundsModal({
  isOpen,
  item,
  onConfirm,
  onCancel,
}: AddFundsModalProps) {
  const [mode, setMode] = useState<'add' | 'withdraw'>('add');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const remaining = item ? item.targetAmount - item.currentAmount : 0;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setMode('add');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleAmountChange = (val: string) => {
    const formatted = formatNumberInput(val);
    const numeric = parseFloat(parseNumberInput(formatted) || '0');
    
    if (mode === 'add' && numeric > remaining) {
      setAmount(formatNumberInput(remaining.toString()));
    } else if (mode === 'withdraw' && numeric > item.currentAmount) {
      setAmount(formatNumberInput(item.currentAmount.toString()));
    } else {
      setAmount(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(parseNumberInput(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setLoading(true);
    try {
      await onConfirm(parsedAmount, mode);
      onCancel();
    } catch (error) {
      console.error('Failed to process funds:', error);
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
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                mode === 'add' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-rose-50 dark:bg-rose-900/20'
              }`}>
                {mode === 'add' ? (
                  <Wallet className="w-5 h-5 text-amber-600" />
                ) : (
                  <ArrowDownLeft className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {mode === 'add' ? 'Add Funds' : 'Withdraw Funds'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.name}</p>
              </div>
            </div>
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6">
            <button 
              onClick={() => {
                setMode('add');
                setAmount('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'add' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              <ArrowUpRight className="w-3 h-3" /> Deposit
            </button>
            <button 
              onClick={() => {
                setMode('withdraw');
                setAmount('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'withdraw' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              <ArrowDownLeft className="w-3 h-3" /> Withdraw
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-bold text-zinc-400 uppercase">Amount (Rp)</label>
                <button 
                  type="button"
                  onClick={() => handleAmountChange(mode === 'add' ? remaining.toString() : item.currentAmount.toString())}
                  className="text-[10px] font-bold text-amber-600 hover:underline uppercase"
                >
                  Use Max
                </button>
              </div>
              <input
                autoFocus
                type="text"
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className={`w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-lg font-bold dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 transition-all text-zinc-900 dark:text-zinc-100 ${
                  mode === 'add' ? 'focus:ring-amber-500/20' : 'focus:ring-rose-500/20'
                }`}
              />
              <div className="mt-3 flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-medium">
                  <span className="text-zinc-400 uppercase">Target</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold">{formatIDR(item.targetAmount)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-medium">
                  <span className="text-zinc-400 uppercase">Currently Saved</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold">{formatIDR(item.currentAmount)}</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
                   <div 
                    className={`h-full transition-all duration-500 ${mode === 'add' ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(100, (item.currentAmount / item.targetAmount) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {mode === 'withdraw' && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-xl">
                <p className="text-[10px] text-rose-700 dark:text-rose-400 font-medium leading-relaxed">
                  Withdrawal will move funds back to your spending balance and be recorded as income.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !amount}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-sm disabled:opacity-50 ${
                  mode === 'add' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : mode === 'add' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

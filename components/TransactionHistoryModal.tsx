'use client';

import { X, History, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Transaction } from '@/core/entities';
import { formatIDR } from '@/core/formatters/currency';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  transactions: Transaction[];
  loading?: boolean;
}

export function TransactionHistoryModal({
  isOpen,
  title,
  subtitle,
  onClose,
  transactions,
  loading = false,
}: TransactionHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
                {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-zinc-500">No transactions found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      t.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'
                    }`}>
                      {t.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t.description}</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{t.date}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${
                    t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-50'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            {transactions.length} Total Records
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { X, List, CreditCard, Calendar } from 'lucide-react';
import { formatIDR } from '@/core/formatters/currency';

interface DetailListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: { name: string; amount: number; detail: string; type?: string }[];
}

export function DetailListModal({
  isOpen,
  onClose,
  title,
  subtitle,
  items,
}: DetailListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {items.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No items found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <Calendar className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">{item.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{item.detail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-rose-600">{formatIDR(item.amount)}</p>
                    {item.type && <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{item.type}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
            {items.length} obligations
          </p>
          <p className="text-xs font-black text-zinc-900 dark:text-zinc-50">
            Total: {formatIDR(items.reduce((acc, curr) => acc + curr.amount, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}

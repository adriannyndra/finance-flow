'use client';

import { X, Info } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: {
    term: string;
    definition: string;
    color?: string;
  }[];
}

export function InfoModal({
  isOpen,
  onClose,
  title,
  items,
}: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
              <p className="text-xs text-zinc-500">Financial Terminology</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {items.map((item, index) => (
            <div key={index} className="space-y-1">
              <p className={`text-xs font-black uppercase tracking-widest ${item.color || 'text-zinc-400'}`}>
                {item.term}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {item.definition}
              </p>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <button 
            onClick={onClose}
            className="w-full py-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

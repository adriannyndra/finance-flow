'use client';

import { X, TrendingUp, LayoutGrid, BarChart3, ChevronLeft, Search, Filter } from 'lucide-react';
import { Transaction } from '@/core/entities';
import { formatIDR } from '@/core/formatters/currency';
import { useMemo, useState } from 'react';

interface CategoryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  title: string;
}

export default function CategoryBreakdownModal({ isOpen, onClose, transactions, title }: CategoryBreakdownModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 1. Calculate Top Categories for the sidebar
  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const topCategories = useMemo(() => categories.slice(0, 5), [categories]);

  // 2. Daily Data for the Big Calendar
  const dailyData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const map: Record<number, number> = {};
    
    const filteredTrans = transactions.filter(t => 
      t.type === 'expense' && 
      (!selectedCategory || t.category === selectedCategory)
    );

    filteredTrans.forEach(t => {
      const day = new Date(t.date).getDate();
      map[day] = (map[day] || 0) + t.amount;
    });

    return { map, daysInMonth };
  }, [transactions, selectedCategory]);

  // 3. Category Details (Merchants)
  const categoryDetails = useMemo(() => {
    if (!selectedCategory) return null;
    
    const catTrans = transactions.filter(t => t.category === selectedCategory && t.type === 'expense');
    const merchantMap: Record<string, number> = {};
    
    catTrans.forEach(t => {
      const name = t.description.split(' ').slice(0, 2).join(' ').replace(/[^a-zA-Z\s]/g, '').trim() || 'Other';
      merchantMap[name] = (merchantMap[name] || 0) + t.amount;
    });

    const merchants = Object.entries(merchantMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const totalExpense = transactions.reduce((acc, t) => acc + (t.type === 'expense' ? t.amount : 0), 0);
    const catTotal = categories.find(c => c.name === selectedCategory)?.amount || 0;
    const efficiency = (catTotal / (totalExpense || 1)) * 100;

    return { merchants, efficiency, total: catTotal };
  }, [selectedCategory, transactions, categories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white dark:bg-zinc-950 w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Unified Detective</h2>
              <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">{selectedCategory ? `Viewing ${selectedCategory}` : title}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all text-zinc-400 hover:text-rose-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          
          {/* LEFT: MASTER CALENDAR (2/3) */}
          <div className="flex-[2] p-8 lg:p-12 overflow-y-auto border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Spending Heatmap</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
                  {selectedCategory ? `Daily Intensity for ${selectedCategory}` : 'Aggregate Daily Volume'}
                </p>
              </div>
              {selectedCategory && (
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-zinc-500 hover:text-emerald-600 transition-all flex items-center gap-2 shadow-sm"
                >
                  <ChevronLeft className="w-3 h-3" /> Reset View
                </button>
              )}
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-7 md:grid-cols-7 lg:grid-cols-7 gap-3">
              {Array.from({ length: dailyData.daysInMonth }).map((_, i) => {
                const day = i + 1;
                const amount = dailyData.map[day] || 0;
                
                // Max amount for intensity (cap at 1M or local max for better visibility)
                const maxAmount = selectedCategory ? 500000 : 2000000;
                const intensity = Math.min(amount / maxAmount, 1);
                
                return (
                  <div 
                    key={i} 
                    className="group relative aspect-square rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 transition-all hover:scale-105 shadow-sm overflow-hidden"
                  >
                    <div 
                      className={`absolute inset-0 ${selectedCategory ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                      style={{ opacity: intensity > 0 ? 0.05 + (intensity * 0.95) : 0 }} 
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <span className={`text-[10px] font-black mb-1 ${intensity > 0.4 ? 'text-white' : 'text-zinc-400'}`}>{day}</span>
                        {amount > 0 && (
                            <span className={`text-[8px] font-bold text-center leading-none ${intensity > 0.6 ? 'text-white' : (intensity > 0.4 ? 'text-zinc-50' : 'text-zinc-900 dark:text-zinc-50')} opacity-80`}>
                                {(amount/1000).toFixed(0)}k
                            </span>
                        )}
                    </div>

                    {/* Tooltip */}
                    {amount > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                        <div className="bg-zinc-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap">
                          {formatIDR(amount)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-12 p-6 bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Selected Period Peak</p>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">
                            {formatIDR(Math.max(...Object.values(dailyData.map), 0))}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Focused Spend</p>
                    <p className="text-sm font-black text-emerald-600">
                        {formatIDR(Object.values(dailyData.map).reduce((a, b) => a + b, 0))}
                    </p>
                </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE SIDEBAR (1/3) */}
          <div className="flex-1 bg-white dark:bg-zinc-950 overflow-hidden relative">
            <div className={`absolute inset-0 transition-transform duration-500 ease-in-out p-8 flex flex-col ${selectedCategory ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Top Performers</h4>
                </div>
              </div>
              
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {topCategories.map((cat, i) => {
                   const weight = (cat.amount / (categories.reduce((a, b) => a + b.amount, 0) || 1)) * 100;
                   return (
                    <button 
                      key={i}
                      onClick={() => setSelectedCategory(cat.name)}
                      className="w-full group p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-emerald-500 transition-all text-left"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 group-hover:text-emerald-600 transition-colors">{cat.name}</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-50">{formatIDR(cat.amount)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${weight}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-zinc-400">{weight.toFixed(0)}%</span>
                      </div>
                    </button>
                   );
                })}
              </div>
              
              <div className="mt-auto pt-8 border-t border-zinc-100 dark:border-zinc-800">
                 <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Detective Tip</p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">Click a category to filter the master calendar and analyze its specific daily frequency.</p>
                 </div>
              </div>
            </div>

            {/* DETAIL SLIDE */}
            <div className={`absolute inset-0 transition-transform duration-500 ease-in-out p-8 flex flex-col bg-zinc-50 dark:bg-zinc-900/30 ${selectedCategory ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
               <button 
                 onClick={() => setSelectedCategory(null)}
                 className="flex items-center gap-2 text-zinc-500 hover:text-emerald-600 transition-colors mb-8 group"
               >
                 <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Back to Overview</span>
               </button>

               <div className="mb-8">
                 <h4 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none mb-2">{selectedCategory}</h4>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            {categoryDetails?.efficiency.toFixed(1)}% of Budget
                        </span>
                    </div>
                    <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-800" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        {formatIDR(categoryDetails?.total || 0)}
                    </span>
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Search className="w-3.5 h-3.5 text-zinc-400" />
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Granular Merchant Flow</p>
                    </div>
                    {categoryDetails?.merchants.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate w-32">{m.name}</span>
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-50">{formatIDR(m.amount)}</span>
                        </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-center">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            Fiscal Intelligence Hub &bull; Strategic Deep Dive
          </p>
        </div>
      </div>
    </div>
  );
}

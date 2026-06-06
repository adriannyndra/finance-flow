'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

interface MonthYearPickerProps {
  selectedMonth: string; // '01' - '12' or 'all'
  selectedYear: string; // 'YYYY' or 'all'
  availableYears: string[];
  onChange: (month: string, year: string) => void;
  onReset?: () => void;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function MonthYearPicker({
  selectedMonth,
  selectedYear,
  availableYears,
  onChange,
  onReset
}: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = selectedMonth === 'all' && selectedYear === 'all'
    ? 'All Time'
    : `${selectedMonth === 'all' ? 'All' : MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear === 'all' ? '' : selectedYear}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-zinc-50 transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
      >
        <Calendar className="w-4 h-4 text-emerald-600" />
        {currentLabel}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-[100] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Select Period</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Year Selection */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Year</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onChange(selectedMonth, 'all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === 'all'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  All
                </button>
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => onChange(selectedMonth, year)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedYear === year
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Month Selection */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Month</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onChange('all', selectedYear)}
                  className={`col-span-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedMonth === 'all'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  All Months
                </button>
                {MONTHS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => onChange(m.value, selectedYear)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedMonth === m.value
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {m.label.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {onReset && (
              <button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className="w-full py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all border border-emerald-100 dark:border-emerald-900/30"
              >
                Reset to Current Month
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

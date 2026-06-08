'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (value: any) => void;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down';
}

export function Dropdown({ value, options, onChange, label, icon, className = '', direction = 'down' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm shadow-sm hover:bg-zinc-50 transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
      >
        <span className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-ellipsis">
          {icon}
          {selectedOption ? selectedOption.label : value}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-[100] w-full bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden dark:bg-zinc-900 dark:border-zinc-800 animate-in fade-in zoom-in duration-100 max-h-60 overflow-y-auto ${
          direction === 'up' ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'
        }`}>
          <div className="py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors text-left ${
                  value === opt.value
                    ? 'bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

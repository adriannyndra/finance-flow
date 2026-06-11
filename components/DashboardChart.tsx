'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Transaction } from '@/core/entities';
import { formatIDR } from '@/core/formatters/currency';

interface DashboardChartProps {
  transactions: Transaction[];
  title?: string;
  onCategoryClick?: (category: string) => void;
}

const COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#a855f7', // Purple
];

export default function DashboardChart({ transactions, title, onCategoryClick }: DashboardChartProps) {
  const chartData = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};

    expenseTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center opacity-50">
        <p className="text-zinc-500 text-sm font-medium text-center italic">No expense data recorded.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {title && <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 text-center">{title}</h3>}
      <div className="flex-1 w-full min-h-[300px] relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Spend</p>
            <p className="text-xl font-black text-zinc-900 dark:text-zinc-50">{formatIDR(chartData.reduce((acc, curr) => acc + curr.value, 0))}</p>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={105}
              paddingAngle={2}
              dataKey="value"
              onClick={(data: any) => data && onCategoryClick?.(data.name)}
              className="cursor-pointer outline-none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                formatIDR(value),
                name
              ]}
              contentStyle={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: '900',
                color: '#18181b'
              }}
              itemStyle={{ padding: '2px 0' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {chartData.slice(0, 5).map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onCategoryClick?.(entry.name)}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">{entry.name}</span>
            </div>
        ))}
      </div>
    </div>
  );
}

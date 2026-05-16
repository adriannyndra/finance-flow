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

export default function DashboardChart({ transactions }: DashboardChartProps) {
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
      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <p className="text-zinc-500 text-sm">Belum ada data pengeluaran untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 h-[400px] flex flex-col">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Pengeluaran per Kategori</h3>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatIDR(value)}
              contentStyle={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #e4e4e7',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

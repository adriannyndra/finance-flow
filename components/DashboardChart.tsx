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

export default function DashboardChart({ transactions, title }: DashboardChartProps) {
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
    <div className="w-full h-full flex flex-col">
      {title && <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 text-center">{title}</h3>}
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, entry: any) => [
                <span key="val" style={{ color: entry.color || entry.payload.fill || '#18181b' }}>{formatIDR(value)}</span>,
                <span key="name" style={{ color: '#18181b' }}>{name}</span>
              ]}
              contentStyle={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

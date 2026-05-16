'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface DataPoint {
  date: string;
  price: number;
}

interface StockChartProps {
  symbol: string;
  name: string;
}

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function StockChart({ symbol, name }: StockChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('1mo');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/stock/history?symbol=${symbol}&range=${range}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.details || result.error || 'Failed to fetch data');
        }
        
        setData(result);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (symbol) {
      fetchData();
    }
  }, [symbol, range]);

  const latestPrice = data.length > 0 ? data[data.length - 1].price : 0;
  const initialPrice = data.length > 0 ? data[0].price : 0;
  const change = latestPrice - initialPrice;
  const changePercent = initialPrice !== 0 ? (change / initialPrice) * 100 : 0;
  const isPositive = change >= 0;

  if (loading && data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-zinc-500 text-sm">Loading market data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <p className="text-rose-600 font-medium">Unable to load chart</p>
        <p className="text-zinc-500 text-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{name}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {symbol}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatIDR(latestPrice)}
            </p>
            <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg dark:bg-zinc-800">
          {['1w', '1mo', '3mo', '1y'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                range === r
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-zinc-700 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis 
              dataKey="date" 
              hide={true}
            />
            <YAxis 
              hide={true} 
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border border-zinc-200 rounded-lg shadow-xl dark:bg-zinc-900 dark:border-zinc-800">
                      <p className="text-xs text-zinc-500 font-medium mb-1">{payload[0].payload.date}</p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {formatIDR(payload[0].value as number)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

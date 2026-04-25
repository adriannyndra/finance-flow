import { MOCK_TRANSACTIONS } from '@/lib/mock-data';

export default function DashboardPage() {
  const totalIncome = MOCK_TRANSACTIONS
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = MOCK_TRANSACTIONS
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpenses;

  const recentTransactions = [...MOCK_TRANSACTIONS]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Overview</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Welcome back, John!</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Total Balance</p>
          <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-rose-600'}`}>
            ${balance.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Monthly Income</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            +${totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">Monthly Expenses</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">
            -${totalExpenses.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Recent Activity</h3>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-500">View all</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentTransactions.map((t) => (
              <li key={t.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                    t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {t.type === 'income' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t.description}</p>
                    <p className="text-xs text-zinc-500">{t.category} • {t.date}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${
                  t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-50'
                }`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

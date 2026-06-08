'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType } from '@/core/entities';
import { formatIDR, formatNumberInput, parseNumberInput } from '@/core/formatters/currency';
import { getUserId } from '@/utils/auth/get-user-id';
import { 
  Loader2, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Download, 
  Upload,
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Filter,
} from 'lucide-react';

// Clean Architecture Imports
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/features/transactions/domain/types';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { GetUserTransactions } from '@/features/transactions/use-cases/GetUserTransactions';
import { AddTransaction } from '@/features/transactions/use-cases/AddTransaction';
import { UpdateTransaction } from '@/features/transactions/use-cases/UpdateTransaction';
import { DeleteTransaction } from '@/features/transactions/use-cases/DeleteTransaction';
import { ImportTransactions } from '@/features/transactions/use-cases/ImportTransactions';
import { createClient } from '@/utils/supabase/client';
import { CSVImporter } from '@/components/CSVImporter';
import { ConfirmationModal } from '@/components/ConfirmationModal';

import { MonthYearPicker } from '@/components/design/MonthYearPicker';
import { DatePicker } from '@/components/design/DatePicker';
import { Dropdown } from '@/components/design/Dropdown';

const repository = new SupabaseTransactionRepository();
const getUserTransactions = new GetUserTransactions(repository);
const addTransactionUseCase = new AddTransaction(repository);
const updateTransactionUseCase = new UpdateTransaction(repository);
const deleteTransactionUseCase = new DeleteTransaction(repository);
const importTransactionsUseCase = new ImportTransactions(repository);

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].sort();

const SortIcon = ({ 
  field, 
  sortField, 
  sortDirection 
}: { 
  field: 'date' | 'amount' | 'category'; 
  sortField: 'date' | 'amount' | 'category';
  sortDirection: 'asc' | 'desc';
}) => {
  if (sortField !== field) return <div className="w-3 h-3 text-zinc-300"><ChevronUp className="w-3 h-3" /></div>;
  return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-600" /> : <ChevronDown className="w-3 h-3 text-emerald-600" />;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(getUserId());

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Default to current month and year
  const now = new Date();
  const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
  const currentYearStr = now.getFullYear().toString();

  // Filter & Sort State
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr); 
  const [filterYear, setFilterYear] = useState<string>(currentYearStr);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const supabase = createClient();

  const [formData, setFormData] = useState({
    amountDisplay: '',
    description: '',
    category: EXPENSE_CATEGORIES[0],
    type: 'expense' as TransactionType,
    date: new Date().toISOString().split('T')[0],
  });

  const [editFormData, setEditFormData] = useState({
    amountDisplay: '',
    description: '',
    category: '',
    type: 'expense' as TransactionType,
    date: '',
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Derived years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    // Always include current year
    years.add(new Date().getFullYear().toString());
    transactions.forEach(t => years.add(t.date.split('-')[0]));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Description suggestion logic
  const descriptionHistory = useMemo(() => {
    const history: Record<string, { category: string; type: TransactionType; count: number; lastUsed: number }> = {};
    const prefixCounts: Record<string, Set<string>> = {};

    transactions.forEach((t) => {
      const desc = t.description.trim();
      const lowerDesc = desc.toLowerCase();
      const time = new Date(t.date).getTime();
      
      if (!history[lowerDesc] || time > history[lowerDesc].lastUsed) {
        history[lowerDesc] = { 
          category: t.category, 
          type: t.type, 
          count: (history[lowerDesc]?.count || 0) + 1,
          lastUsed: time
        };
      } else {
        history[lowerDesc].count++;
      }

      const words = desc.split(/\s+/);
      if (words.length >= 2) {
        const p2 = words.slice(0, 2).join(' ').toLowerCase();
        if (!prefixCounts[p2]) prefixCounts[p2] = new Set();
        prefixCounts[p2].add(lowerDesc);
      }
      if (words.length >= 3) {
        const p3 = words.slice(0, 3).join(' ').toLowerCase();
        if (!prefixCounts[p3]) prefixCounts[p3] = new Set();
        prefixCounts[p3].add(lowerDesc);
      }
    });

    const suggestionsMap: Record<string, { category: string; type: TransactionType; isKeyTerm: boolean; lastUsed: number }> = {};
    Object.entries(history).forEach(([desc, data]) => {
      suggestionsMap[desc] = { ...data, isKeyTerm: false };
    });

    Object.entries(prefixCounts).forEach(([prefix, fullDescs]) => {
      if (fullDescs.size > 1) {
        let latestTime = -1;
        let bestCategory = '';
        let bestType: TransactionType = 'expense';
        fullDescs.forEach(fd => {
          if (history[fd].lastUsed > latestTime) {
            latestTime = history[fd].lastUsed;
            bestCategory = history[fd].category;
            bestType = history[fd].type;
          }
        });
        if (!suggestionsMap[prefix] || latestTime > suggestionsMap[prefix].lastUsed) {
          suggestionsMap[prefix] = { category: bestCategory, type: bestType, isKeyTerm: true, lastUsed: latestTime };
        }
      }
    });
    return suggestionsMap;
  }, [transactions]);

  const handleDescriptionChange = (val: string) => {
    setFormData({ ...formData, description: val });
    if (val.length > 1) {
      const valLower = val.toLowerCase();
      const filtered = Object.entries(descriptionHistory)
        .filter(([desc]) => desc.includes(valLower))
        .sort((a, b) => {
          const aStarts = a[0].startsWith(valLower);
          const bStarts = b[0].startsWith(valLower);
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
          if (a[1].isKeyTerm !== b[1].isKeyTerm) return a[1].isKeyTerm ? -1 : 1;
          return b[1].lastUsed - a[1].lastUsed;
        })
        .slice(0, 5)
        .map(([desc]) => desc);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    const data = descriptionHistory[suggestion.toLowerCase()];
    if (data) {
      const originalDesc = transactions.find(t => t.description.toLowerCase() === suggestion.toLowerCase())?.description || suggestion;
      setFormData({ ...formData, description: originalDesc, category: data.category, type: data.type });
    } else {
      setFormData({ ...formData, description: suggestion });
    }
    setShowSuggestions(false);
  };

  // Filtered & Sorted Data
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    if (filterMonth !== 'all') {
      filtered = filtered.filter(t => t.date.split('-')[1] === filterMonth);
    }
    if (filterYear !== 'all') {
      filtered = filtered.filter(t => t.date.split('-')[0] === filterYear);
    }

    filtered.sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, filterCategory, filterMonth, filterYear, sortField, sortDirection]);

  const totalPages = Math.ceil(processedTransactions.length / pageSize);
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSort = (field: 'date' | 'amount' | 'category') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  useEffect(() => {
    const initTransactions = async () => {
      let uid = currentUserId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          uid = user.id;
          setCurrentUserId(user.id);
        }
      }
      if (uid) {
        const data = await getUserTransactions.execute(uid);
        setTransactions(data);
      }
      setLoading(false);
    };
    initTransactions();
  }, [currentUserId, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = parseNumberInput(formData.amountDisplay);
    if (!rawAmount || !currentUserId) return;

    setIsSaving(true);
    try {
      const newTransaction = await addTransactionUseCase.execute(currentUserId, {
        amount: parseFloat(rawAmount),
        description: formData.description,
        category: formData.category,
        type: formData.type,
        date: formData.date,
      });
      setTransactions([newTransaction, ...transactions]);
      setIsAdding(false);
      setFormData({
        amountDisplay: '',
        description: '',
        category: formData.type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
        type: formData.type,
        date: new Date().toISOString().split('T')[0],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (id: string) => {
    const rawAmount = parseNumberInput(editFormData.amountDisplay);
    if (!rawAmount) return;
    try {
      const updated = await updateTransactionUseCase.execute(id, {
        amount: parseFloat(rawAmount),
        description: editFormData.description,
        category: editFormData.category,
        type: editFormData.type,
        date: editFormData.date,
      });
      setTransactions(transactions.map(t => t.id === id ? updated : t));
      setEditingId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteTransactionUseCase.execute(id);
          setTransactions(transactions.filter(t => t.id !== id));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          alert(`Error: ${message}`);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleImport = async (data: Omit<Transaction, 'id'>[]) => {
    if (!currentUserId) return;
    try {
      const imported = await importTransactionsUseCase.execute(currentUserId, data);
      setTransactions([...imported, ...transactions]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(message);
    }
  };

  const exportToCSV = () => {
    if (processedTransactions.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = processedTransactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.type,
      t.amount
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-export.csv`);
    link.click();
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Transactions</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImporting(true)}
            className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-zinc-50 transition-colors dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={exportToCSV}
            disabled={processedTransactions.length === 0}
            className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-zinc-50 transition-colors disabled:opacity-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-500 transition-colors"
          >
            {isAdding ? 'Cancel' : '+ Add New'}
          </button>
        </div>
      </div>

      {isImporting && (
        <CSVImporter 
          onImport={handleImport} 
          onClose={() => setIsImporting(false)} 
        />
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Dropdown
                label="Type"
                value={formData.type}
                options={[
                  { label: 'Expense', value: 'expense' },
                  { label: 'Income', value: 'income' }
                ]}
                onChange={(newType) => {
                  setFormData({ 
                    ...formData, 
                    type: newType,
                    category: newType === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]
                  });
                }}
              />
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount (Rp)</label>
                <input
                  type="text"
                  required
                  value={formData.amountDisplay}
                  onChange={(e) => setFormData({ ...formData, amountDisplay: formatNumberInput(e.target.value) })}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                  placeholder="0"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                  placeholder="Beli apa?"
                />
                {showSuggestions && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 rounded-lg shadow-lg">
                    {suggestions.map(s => (
                      <button key={s} type="button" onClick={() => selectSuggestion(s)} className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-zinc-700">{s}</button>
                    ))}
                  </div>
                )}
              </div>
              <Dropdown
                label="Category"
                value={formData.category}
                options={(formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => ({ label: cat, value: cat }))}
                onChange={(val) => setFormData({ ...formData, category: val })}
              />
              <div>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(val) => setFormData({ ...formData, date: val })}
                />
              </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Transaction'}
            </button>
          </form>
        </div>
      )}

      {/* Filters & Rows Per Page */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Filters:</span>
          </div>
          
          <Dropdown
            value={filterCategory}
            options={[{ label: 'All Categories', value: 'all' }, ...ALL_CATEGORIES.map(cat => ({ label: cat, value: cat }))]}
            onChange={(val) => { setFilterCategory(val); setCurrentPage(1); }}
            className="w-48"
          />

          <MonthYearPicker
            selectedMonth={filterMonth}
            selectedYear={filterYear}
            availableYears={availableYears}
            onChange={(m, y) => {
              setFilterMonth(m);
              setFilterYear(y);
              setCurrentPage(1);
            }}
            onReset={() => {
              setFilterMonth(currentMonthStr);
              setFilterYear(currentYearStr);
              setCurrentPage(1);
            }}
          />

          <button 
            onClick={() => { setFilterCategory('all'); setFilterMonth('all'); setFilterYear('all'); setCurrentPage(1); }}
            className="text-xs font-bold text-zinc-400 hover:text-emerald-600 transition-colors"
          >
            Show All Time
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Rows:</span>
          <Dropdown
            value={pageSize}
            options={[10, 20, 50, 100].map(size => ({ label: size.toString(), value: size }))}
            onChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}
            className="w-20"
            direction="up"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">Date <SortIcon field="date" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('category')}>
                  <div className="flex items-center gap-1">Category <SortIcon field="category" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1 justify-end">Amount <SortIcon field="amount" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  {editingId === t.id ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <DatePicker
                          value={editFormData.date}
                          onChange={(val) => setEditFormData({ ...editFormData, date: val })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Dropdown
                          value={editFormData.category}
                          options={(editFormData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => ({ label: cat, value: cat }))}
                          onChange={(val) => setEditFormData({ ...editFormData, category: val })}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="text"
                          value={editFormData.amountDisplay}
                          onChange={(e) => setEditFormData({ ...editFormData, amountDisplay: formatNumberInput(e.target.value) })}
                          className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm text-right dark:bg-zinc-800 dark:border-zinc-700"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditSubmit(t.id)} className="text-emerald-600 hover:text-emerald-500 transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-zinc-400 hover:text-rose-600 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap">{t.date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">{t.description}</td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        <span className="px-2 py-1 bg-zinc-100 rounded-md text-xs font-medium dark:bg-zinc-800 dark:text-zinc-400">{t.category}</span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-50'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => {
                            setEditingId(t.id);
                            setEditFormData({
                              amountDisplay: formatNumberInput(t.amount.toString()),
                              description: t.description,
                              category: t.category,
                              type: t.type,
                              date: t.date,
                            });
                          }} className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteTransaction(t.id)} className="p-2 text-zinc-400 hover:text-rose-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {paginatedTransactions.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm font-medium">No transactions found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-zinc-500 font-medium">
              Page {currentPage} of {totalPages} ({processedTransactions.length} total)
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Go to:</span>
                <Dropdown
                  value={currentPage}
                  options={Array.from({ length: totalPages }, (_, i) => i + 1).map(p => ({ label: `Page ${p}`, value: p }))}
                  onChange={(val) => setCurrentPage(Number(val))}
                  className="w-28"
                  direction="up"
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white disabled:opacity-50 hover:bg-zinc-50 transition-colors dark:bg-zinc-900 dark:border-zinc-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white disabled:opacity-50 hover:bg-zinc-50 transition-colors dark:bg-zinc-900 dark:border-zinc-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

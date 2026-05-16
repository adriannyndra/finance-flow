'use client';

import { useState, useRef } from 'react';
import { Transaction, TransactionType } from '@/core/entities';
import Papa, { ParseResult } from 'papaparse';
import { X, Upload, Check, AlertCircle, ChevronLeft } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/features/transactions/domain/types';
import { formatIDR } from '@/core/formatters/currency';

interface CSVImporterProps {
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

type Mapping = {
  date: string;
  description: string;
  category: string;
  amount: string;
  type: string;
};

export function CSVImporter({ onImport, onClose }: CSVImporterProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map, 3: Preview
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    date: '',
    description: '',
    category: '',
    amount: '',
    type: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, string>>) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
            setCsvData(results.data);
            
            // Try to auto-map
            const newMapping = { ...mapping };
            results.meta.fields.forEach(h => {
              const lower = h.toLowerCase();
              if (lower.includes('date') || lower.includes('tanggal')) newMapping.date = h;
              if (lower.includes('desc') || lower.includes('detail') || lower.includes('ket') || lower.includes('uraian')) newMapping.description = h;
              if (lower.includes('cat') || lower.includes('kategori')) newMapping.category = h;
              if (lower.includes('amount') || lower.includes('nominal') || lower.includes('jumlah')) newMapping.amount = h;
              if (lower.includes('type') || lower.includes('tipe') || lower.includes('jenis')) newMapping.type = h;
            });
            setMapping(newMapping);
            setStep(2);
          }
        },
      });
    }
  };

  const validateMapping = () => {
    return mapping.date && mapping.description && mapping.amount;
  };

  const getMappedTransactions = (): Omit<Transaction, 'id'>[] => {
    return csvData.map(row => {
      let amount = parseFloat(row[mapping.amount]?.toString().replace(/[^\d.-]/g, '') || '0');
      let type: TransactionType = 'expense';
      
      if (mapping.type && row[mapping.type]) {
        const typeVal = row[mapping.type].toLowerCase();
        if (typeVal.includes('in') || typeVal.includes('kredit') || typeVal.includes('cr')) {
          type = 'income';
        }
      }

      // Ensure amount is absolute for our storage, type handles the sign
      amount = Math.abs(amount);

      return {
        date: row[mapping.date] || new Date().toISOString().split('T')[0],
        description: row[mapping.description] || 'Imported Transaction',
        category: row[mapping.category] || (type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
        amount: amount,
        type: type,
      };
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const transactions = getMappedTransactions();
      await onImport(transactions);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Import failed: ${message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Import Transactions</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-500 transition-colors"
            >
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Click to upload CSV</p>
                <p className="text-sm text-zinc-500">Only .csv files are supported</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl flex gap-3 border border-amber-100 dark:border-amber-900/30">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Map your CSV columns to the required fields. We&apos;ve tried to guess them for you.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['date', 'description', 'amount', 'category', 'type'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      {field} {['date', 'description', 'amount'].includes(field) && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      value={mapping[field]}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select column...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-zinc-500">Preview of {csvData.length} transactions to be imported:</p>
              <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-2 font-bold">Date</th>
                      <th className="px-4 py-2 font-bold">Description</th>
                      <th className="px-4 py-2 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {getMappedTransactions().slice(0, 5).map((t, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-zinc-500">{t.date}</td>
                        <td className="px-4 py-2 font-medium">{t.description}</td>
                        <td className={`px-4 py-2 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : ''}`}>
                          {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvData.length > 5 && (
                  <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 text-center text-xs text-zinc-400">
                    Showing first 5 of {csvData.length} rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
          <button 
            onClick={() => setStep(s => (s - 1) as (1 | 2 | 3))}
            disabled={step === 1}
            className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 disabled:opacity-0 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex gap-3">
            {step === 2 && (
              <button 
                onClick={() => setStep(3)}
                disabled={!validateMapping()}
                className="bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={handleImport}
                disabled={isImporting}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Confirm Import'}
                {!isImporting && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: TransactionType;
}

export interface Summary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

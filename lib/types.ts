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

export type InvestmentType = 'stock' | 'crypto' | 'stake';

export interface Investment {
  id: string;
  name: string;
  symbol: string;
  type: InvestmentType;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  date: string;
}

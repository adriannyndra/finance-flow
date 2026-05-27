export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: TransactionType;
  wishlistId?: string;
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

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  month: string; // Format: YYYY-MM
}

export type BillFrequency = 'monthly' | 'yearly';
export type BillType = 'recurring' | 'installment' | 'one-time';
export type BillItemStatus = 'pending' | 'paid' | 'skipped';

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  frequency: BillFrequency;
  billing_day: number; // 1-31
  active: boolean;
  lastGeneratedMonth?: string; // YYYY-MM to prevent duplicate generation
  endDate?: string; // Format: YYYY-MM-DD
  billType: BillType;
  totalAmount?: number;
}

export interface BillItem {
  id: string;
  billId: string;
  userId: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paidAt?: string;
  status: BillItemStatus;
  transactionId?: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  priority: 'low' | 'medium' | 'high';
  url?: string;
  isPurchased: boolean;
  createdAt: string;
}

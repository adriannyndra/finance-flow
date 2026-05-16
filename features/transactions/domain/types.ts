import { TransactionType } from '@/core/entities';

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Housing & Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Personal Care",
  "Education",
  "Gifts & Donations",
  "Bills",
  "Other"
];

export const INCOME_CATEGORIES = [
  "Primary",
  "Secondary",
  "Other"
];

export interface TransactionFormData {
  amountDisplay: string;
  description: string;
  category: string;
  type: TransactionType;
  date: string;
}

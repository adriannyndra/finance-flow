import { Transaction } from './types';

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    amount: 2500,
    category: 'Salary',
    description: 'Monthly Salary',
    date: '2024-04-01',
    type: 'income',
  },
  {
    id: '2',
    amount: 50,
    category: 'Food',
    description: 'Grocery Shopping',
    date: '2024-04-02',
    type: 'expense',
  },
  {
    id: '3',
    amount: 120,
    category: 'Utilities',
    description: 'Electricity Bill',
    date: '2024-04-03',
    type: 'expense',
  },
  {
    id: '4',
    amount: 30,
    category: 'Transport',
    description: 'Bus Pass',
    date: '2024-04-04',
    type: 'expense',
  },
  {
    id: '5',
    amount: 150,
    category: 'Freelance',
    description: 'Logo Design Project',
    date: '2024-04-05',
    type: 'income',
  },
];

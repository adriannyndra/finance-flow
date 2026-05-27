import { SupabaseBudgetRepository } from '../infrastructure/SupabaseBudgetRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export interface BudgetProgress {
  id?: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  hasBudget: boolean;
}

export class GetBudgetProgress {
  constructor(
    private budgetRepository: SupabaseBudgetRepository,      
    private transactionRepository: SupabaseTransactionRepository
  ) {}

  async execute(userId: string, month: string): Promise<BudgetProgress[]> {
    const budgets = await this.budgetRepository.getBudgets(userId, month);
    const transactions = await this.transactionRepository.getTransactions(userId);

    // Filter transactions by month
    const monthTransactions = transactions.filter(t => t.date.startsWith(month) && t.type === 'expense');

    // Get all categories that either have a budget OR have spending
    const budgetCategories = budgets.map(b => b.category);
    const spendingCategories = monthTransactions.map(t => t.category);
    const allCategories = Array.from(new Set([...budgetCategories, ...spendingCategories]));

    const progress: BudgetProgress[] = allCategories.map(category => {
      const budget = budgets.find(b => b.category === category);
      const spent = monthTransactions
        .filter(t => t.category === category)
        .reduce((sum, t) => sum + t.amount, 0);

      const budgetAmount = budget ? budget.amount : 0;

      return {
        id: budget?.id,
        category: category,
        budgetAmount: budgetAmount,
        spentAmount: spent,
        remainingAmount: budgetAmount - spent,
        percentage: budgetAmount > 0 ? (spent / budgetAmount) * 100 : (spent > 0 ? 100 : 0),
        hasBudget: !!budget
      };
    });

    return progress;
  }
}

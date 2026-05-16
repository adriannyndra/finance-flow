import { SupabaseBudgetRepository } from '../infrastructure/SupabaseBudgetRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export interface BudgetProgress {
  id: string; // Add ID
  category: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
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

    const progress: BudgetProgress[] = budgets.map(budget => {
      const spent = monthTransactions
        .filter(t => t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        id: budget.id,
        category: budget.category,
        budgetAmount: budget.amount,
        spentAmount: spent,
        remainingAmount: budget.amount - spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      };
    });

    return progress;
  }
}

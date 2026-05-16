import { Budget } from '@/core/entities';
import { SupabaseBudgetRepository } from '../infrastructure/SupabaseBudgetRepository';

export class SetBudget {
  constructor(private repository: SupabaseBudgetRepository) {}

  async execute(userId: string, category: string, amount: number, month: string): Promise<Budget> {
    return this.repository.setBudget(userId, category, amount, month);
  }
}

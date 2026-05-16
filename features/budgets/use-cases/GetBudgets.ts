import { Budget } from '@/core/entities';
import { SupabaseBudgetRepository } from '../infrastructure/SupabaseBudgetRepository';

export class GetBudgets {
  constructor(private repository: SupabaseBudgetRepository) {}

  async execute(userId: string, month: string): Promise<Budget[]> {
    return this.repository.getBudgets(userId, month);
  }
}

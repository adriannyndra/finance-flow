import { SupabaseBudgetRepository } from '../infrastructure/SupabaseBudgetRepository';

export class DeleteBudget {
  constructor(private repository: SupabaseBudgetRepository) {}
  async execute(id: string): Promise<void> {
    return this.repository.deleteBudget(id);
  }
}

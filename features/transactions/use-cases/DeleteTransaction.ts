import { SupabaseTransactionRepository } from '../infrastructure/SupabaseTransactionRepository';

export class DeleteTransaction {
  constructor(private repository: SupabaseTransactionRepository) {}

  async execute(id: string): Promise<void> {
    return this.repository.deleteTransaction(id);
  }
}

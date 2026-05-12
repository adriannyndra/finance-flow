import { Transaction } from '@/core/entities';
import { SupabaseTransactionRepository } from '../infrastructure/SupabaseTransactionRepository';

export class UpdateTransaction {
  constructor(private repository: SupabaseTransactionRepository) {}

  async execute(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    return this.repository.updateTransaction(id, transaction);
  }
}

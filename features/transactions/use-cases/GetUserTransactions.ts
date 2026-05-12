import { Transaction } from '@/core/entities';
import { SupabaseTransactionRepository } from '../infrastructure/SupabaseTransactionRepository';

export class GetUserTransactions {
  constructor(private repository: SupabaseTransactionRepository) {}

  async execute(userId: string): Promise<Transaction[]> {
    return this.repository.getTransactions(userId);
  }
}

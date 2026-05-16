import { Transaction } from '@/core/entities';
import { SupabaseTransactionRepository } from '../infrastructure/SupabaseTransactionRepository';

export class ImportTransactions {
  constructor(private repository: SupabaseTransactionRepository) {}

  async execute(userId: string, transactions: Omit<Transaction, 'id'>[]): Promise<Transaction[]> {
    if (transactions.length === 0) return [];
    return this.repository.addTransactions(userId, transactions);
  }
}

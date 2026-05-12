import { Transaction } from '@/core/entities';
import { SupabaseTransactionRepository } from '../infrastructure/SupabaseTransactionRepository';

export class AddTransaction {
  constructor(private repository: SupabaseTransactionRepository) {}

  async execute(userId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    return this.repository.addTransaction(userId, transaction);
  }
}

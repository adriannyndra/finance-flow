import { createClient } from '@/utils/supabase/client';
import { Transaction } from '@/core/entities';

export class SupabaseTransactionRepository {
  private supabase = createClient();

  async getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('ff_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from('ff_transactions')
      .insert([{ ...transaction, user_id: userId }])
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from('ff_transactions')
      .update(transaction)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ff_transactions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

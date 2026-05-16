import { createClient } from '@/utils/supabase/client';
import { Transaction } from '@/core/entities';

export class SupabaseTransactionRepository {
  private supabase = createClient();

  /**
   * Generates a unique numeric offset based on the user's ID.
   * This masks the data from "peeking" in the database without 
   * needing a global secret in environment variables.
   */
  private getOffset(userId: string): number {
    const numericPart = userId.split('-').reduce((acc, part) => acc + parseInt(part.substring(0, 4), 16), 0);
    return (numericPart % 10000) * 100; // Example: different offset for every user
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    const offset = this.getOffset(userId);
    const { data, error } = await this.supabase
      .from('ff_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    
    return (data || []).map(t => ({
      ...t,
      amount: t.amount - offset
    }));
  }

  async addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const offset = this.getOffset(userId);
    const maskedTransaction = {
      ...transaction,
      amount: transaction.amount + offset,
      user_id: userId
    };

    const { data, error } = await this.supabase
      .from('ff_transactions')
      .insert([maskedTransaction])
      .select();

    if (error) throw new Error(error.message);
    
    return {
      ...data[0],
      amount: data[0].amount - offset
    };
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    // Note: We need the userId to get the offset. 
    // In your current implementation, updateTransaction only receives ID.
    // We'll fetch the transaction first to get the user_id if amount is being updated.
    
    let offset = 0;
    if (transaction.amount !== undefined) {
      const { data: current } = await this.supabase
        .from('ff_transactions')
        .select('user_id')
        .eq('id', id)
        .single();
      
      if (current) {
        offset = this.getOffset(current.user_id);
      }
    }

    const updateData = { ...transaction };
    if (updateData.amount !== undefined) {
      updateData.amount = updateData.amount + offset;
    }

    const { data, error } = await this.supabase
      .from('ff_transactions')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    
    return {
      ...data[0],
      amount: data[0].amount - offset
    };
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ff_transactions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

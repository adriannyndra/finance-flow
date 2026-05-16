import { createClient } from '@/utils/supabase/client';
import { Budget } from '@/core/entities';

export class SupabaseBudgetRepository {
  private supabase = createClient();

  /**
   * Generates a unique numeric offset based on the user's ID.
   * Consistent with SupabaseTransactionRepository.
   */
  private getOffset(userId: string): number {
    const numericPart = userId.split('-').reduce((acc, part) => acc + parseInt(part.substring(0, 4), 16), 0);
    return (numericPart % 10000) * 100;
  }

  async getBudgets(userId: string, month: string): Promise<Budget[]> {
    const offset = this.getOffset(userId);
    const { data, error } = await this.supabase
      .from('ff_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month);

    if (error) throw new Error(error.message);
    
    return (data || []).map(b => ({
      id: b.id,
      userId: b.user_id,
      category: b.category,
      amount: b.amount - offset,
      month: b.month
    }));
  }

  async setBudget(userId: string, category: string, amount: number, month: string): Promise<Budget> {
    const offset = this.getOffset(userId);
    const maskedAmount = amount + offset;

    // Check if budget already exists for this category/month
    const { data: existing } = await this.supabase
      .from('ff_budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('month', month)
      .single();

    if (existing) {
      const { data, error } = await this.supabase
        .from('ff_budgets')
        .update({ amount: maskedAmount })
        .eq('id', existing.id)
        .select();

      if (error) throw new Error(error.message);
      return {
        id: data[0].id,
        userId: data[0].user_id,
        category: data[0].category,
        amount: data[0].amount - offset,
        month: data[0].month
      };
    } else {
      const { data, error } = await this.supabase
        .from('ff_budgets')
        .insert([{
          user_id: userId,
          category,
          amount: maskedAmount,
          month
        }])
        .select();

      if (error) throw new Error(error.message);
      return {
        id: data[0].id,
        userId: data[0].user_id,
        category: data[0].category,
        amount: data[0].amount - offset,
        month: data[0].month
      };
    }
  }

  async deleteBudget(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ff_budgets')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

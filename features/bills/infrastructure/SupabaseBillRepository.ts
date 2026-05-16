import { createClient } from '@/utils/supabase/client';
import { Bill } from '@/core/entities';

export class SupabaseBillRepository {
  private supabase = createClient();

  private getOffset(userId: string): number {
    const numericPart = userId.split('-').reduce((acc, part) => acc + parseInt(part.substring(0, 4), 16), 0);
    return (numericPart % 10000) * 100;
  }

  async getBills(userId: string): Promise<Bill[]> {
    const offset = this.getOffset(userId);
    const { data, error } = await this.supabase
      .from('ff_bills')
      .select('*')
      .eq('user_id', userId)
      .order('billing_day', { ascending: true });

    if (error) throw new Error(error.message);
    
    return (data || []).map(s => ({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      amount: s.amount - offset,
      category: s.category,
      frequency: s.frequency,
      billing_day: s.billing_day,
      active: s.active,
      lastGeneratedMonth: s.last_generated_month,
      endDate: s.end_date
    }));
  }

  async addBill(userId: string, bill: Omit<Bill, 'id' | 'userId'>): Promise<Bill> {
    const offset = this.getOffset(userId);
    const maskedAmount = bill.amount + offset;

    const { data, error } = await this.supabase
      .from('ff_bills')
      .insert([{
        user_id: userId,
        name: bill.name,
        amount: maskedAmount,
        category: bill.category,
        frequency: bill.frequency,
        billing_day: bill.billing_day,
        active: bill.active,
        end_date: bill.endDate
      }])
      .select();

    if (error) throw new Error(error.message);
    
    return {
      id: data[0].id,
      userId: data[0].user_id,
      name: data[0].name,
      amount: data[0].amount - offset,
      category: data[0].category,
      frequency: data[0].frequency,
      billing_day: data[0].billing_day,
      active: data[0].active,
      endDate: data[0].end_date
    };
  }

  async updateBill(id: string, bill: Partial<Bill>): Promise<Bill> {
    const { data: current } = await this.supabase
      .from('ff_bills')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!current) throw new Error('Bill not found');
    const offset = this.getOffset(current.user_id);

    const updateData: Partial<{
      name: string;
      amount: number;
      category: string;
      frequency: string;
      billing_day: number;
      active: boolean;
      last_generated_month: string;
      end_date: string;
    }> = {};
    if (bill.name !== undefined) updateData.name = bill.name;
    if (bill.amount !== undefined) updateData.amount = bill.amount + offset;
    if (bill.category !== undefined) updateData.category = bill.category;
    if (bill.frequency !== undefined) updateData.frequency = bill.frequency;
    if (bill.billing_day !== undefined) updateData.billing_day = bill.billing_day;
    if (bill.active !== undefined) updateData.active = bill.active;
    if (bill.lastGeneratedMonth !== undefined) updateData.last_generated_month = bill.lastGeneratedMonth;
    if (bill.endDate !== undefined) updateData.end_date = bill.endDate;

    const { data, error } = await this.supabase
      .from('ff_bills')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    
    return {
      id: data[0].id,
      userId: data[0].user_id,
      name: data[0].name,
      amount: data[0].amount - offset,
      category: data[0].category,
      frequency: data[0].frequency,
      billing_day: data[0].billing_day,
      active: data[0].active,
      lastGeneratedMonth: data[0].last_generated_month,
      endDate: data[0].end_date
    };
  }

  async deleteBill(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ff_bills')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

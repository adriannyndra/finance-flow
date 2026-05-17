import { createClient } from '@/utils/supabase/client';
import { Bill, BillItem, BillType, BillItemStatus } from '@/core/entities';

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
      endDate: s.end_date,
      billType: (s.bill_type as BillType) || 'recurring',
      totalAmount: s.total_amount ? s.total_amount - offset : undefined
    }));
  }

  async addBill(userId: string, bill: Omit<Bill, 'id' | 'userId'>): Promise<Bill> {
    const offset = this.getOffset(userId);
    const maskedAmount = bill.amount + offset;
    const maskedTotalAmount = bill.totalAmount ? bill.totalAmount + offset : null;

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
        end_date: bill.endDate,
        bill_type: bill.billType,
        total_amount: maskedTotalAmount
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
      endDate: data[0].end_date,
      billType: data[0].bill_type as BillType,
      totalAmount: data[0].total_amount ? data[0].total_amount - offset : undefined
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
      bill_type: string;
      total_amount: number | null;
    }> = {};
    if (bill.name !== undefined) updateData.name = bill.name;
    if (bill.amount !== undefined) updateData.amount = bill.amount + offset;
    if (bill.category !== undefined) updateData.category = bill.category;
    if (bill.frequency !== undefined) updateData.frequency = bill.frequency;
    if (bill.billing_day !== undefined) updateData.billing_day = bill.billing_day;
    if (bill.active !== undefined) updateData.active = bill.active;
    if (bill.lastGeneratedMonth !== undefined) updateData.last_generated_month = bill.lastGeneratedMonth;
    if (bill.endDate !== undefined) updateData.end_date = bill.endDate;
    if (bill.billType !== undefined) updateData.bill_type = bill.billType;
    if (bill.totalAmount !== undefined) updateData.total_amount = bill.totalAmount !== undefined ? bill.totalAmount + offset : null;

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
      endDate: data[0].end_date,
      billType: data[0].bill_type as BillType,
      totalAmount: data[0].total_amount ? data[0].total_amount - offset : undefined
    };
  }

  async deleteBill(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ff_bills')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async getBillItems(userId: string, billId?: string): Promise<BillItem[]> {
    const offset = this.getOffset(userId);
    let query = this.supabase
      .from('ff_bill_items')
      .select('*')
      .eq('user_id', userId);
    
    if (billId) {
      query = query.eq('bill_id', billId);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(item => ({
      id: item.id,
      billId: item.bill_id,
      userId: item.user_id,
      amount: item.amount - offset,
      dueDate: item.due_date,
      paidAt: item.paid_at,
      status: item.status as BillItemStatus,
      transactionId: item.transaction_id
    }));
  }

  async addBillItem(userId: string, item: Omit<BillItem, 'id' | 'userId'>): Promise<BillItem> {
    const offset = this.getOffset(userId);
    const maskedAmount = item.amount + offset;

    const { data, error } = await this.supabase
      .from('ff_bill_items')
      .insert([{
        user_id: userId,
        bill_id: item.billId,
        amount: maskedAmount,
        due_date: item.dueDate,
        status: item.status,
        paid_at: item.paidAt,
        transaction_id: item.transactionId
      }])
      .select();

    if (error) throw new Error(error.message);

    return {
      id: data[0].id,
      billId: data[0].bill_id,
      userId: data[0].user_id,
      amount: data[0].amount - offset,
      dueDate: data[0].due_date,
      paidAt: data[0].paid_at,
      status: data[0].status as BillItemStatus,
      transactionId: data[0].transaction_id
    };
  }

  async updateBillItem(id: string, item: Partial<BillItem>): Promise<BillItem> {
    const { data: current } = await this.supabase
      .from('ff_bill_items')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!current) throw new Error('Bill item not found');
    const offset = this.getOffset(current.user_id);

    const updateData: any = {};
    if (item.amount !== undefined) updateData.amount = item.amount + offset;
    if (item.dueDate !== undefined) updateData.due_date = item.dueDate;
    if (item.status !== undefined) updateData.status = item.status;
    if (item.paidAt !== undefined) updateData.paid_at = item.paidAt;
    if (item.transactionId !== undefined) updateData.transaction_id = item.transactionId;

    const { data, error } = await this.supabase
      .from('ff_bill_items')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);

    return {
      id: data[0].id,
      billId: data[0].bill_id,
      userId: data[0].user_id,
      amount: data[0].amount - offset,
      dueDate: data[0].due_date,
      paidAt: data[0].paid_at,
      status: data[0].status as BillItemStatus,
      transactionId: data[0].transaction_id
    };
  }

  async deleteBillItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ff_bill_items')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

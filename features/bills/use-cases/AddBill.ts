import { Bill, BillItem } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';

export class AddBill {
  constructor(private repository: SupabaseBillRepository) {}

  async execute(userId: string, bill: Omit<Bill, 'id' | 'userId'>): Promise<Bill> {
    const newBill = await this.repository.addBill(userId, bill);

    // If it's an installment with a total amount, pre-generate the schedule
    if (newBill.billType === 'installment' && newBill.totalAmount && newBill.amount > 0) {
      const numberOfPayments = Math.ceil(newBill.totalAmount / newBill.amount);
      const now = new Date();

      for (let i = 0; i < numberOfPayments; i++) {
        const dueDate = new Date(now.getFullYear(), now.getMonth() + i, newBill.billing_day);

        // Ensure amount doesn't exceed remaining total for the last payment
        const remainingTotal = newBill.totalAmount - (i * newBill.amount);
        const itemAmount = Math.min(newBill.amount, remainingTotal);

        if (itemAmount <= 0) break;

        await this.repository.addBillItem(userId, {
          billId: newBill.id,
          amount: itemAmount,
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
      }
    }

    return newBill;
  }
}


import { Bill, BillItem } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';

export class AddBill {
  constructor(private repository: SupabaseBillRepository) {}

  async execute(userId: string, bill: Omit<Bill, 'id' | 'userId'>, tenure?: number): Promise<Bill> {
    const newBill = await this.repository.addBill(userId, bill);

    // If it's an installment with a total amount, pre-generate the schedule
    if (newBill.billType === 'installment' && newBill.totalAmount) {
      // Use tenure to split, or fall back to monthly amount if tenure isn't provided
      const numberOfPayments = tenure || (newBill.amount > 0 ? Math.ceil(newBill.totalAmount / newBill.amount) : 0);
      const splitAmount = tenure ? Math.floor(newBill.totalAmount / tenure) : newBill.amount;
      const now = new Date();

      let allocatedTotal = 0;
      for (let i = 0; i < numberOfPayments; i++) {
        const dueDate = new Date(now.getFullYear(), now.getMonth() + i, newBill.billing_day);

        // On the last payment, take the remainder to ensure exact total match
        const isLast = i === numberOfPayments - 1;
        const itemAmount = isLast ? (newBill.totalAmount - allocatedTotal) : splitAmount;

        if (itemAmount <= 0 && !isLast) continue;

        await this.repository.addBillItem(userId, {
          billId: newBill.id,
          amount: itemAmount,
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
        allocatedTotal += itemAmount;
      }
    } else if (newBill.billType === 'one-time' && newBill.endDate) {
      // For one-time bills, create a single pending item for the due date
      await this.repository.addBillItem(userId, {
        billId: newBill.id,
        amount: newBill.amount,
        dueDate: newBill.endDate,
        status: 'pending'
      });
    }

    return newBill;
  }

}


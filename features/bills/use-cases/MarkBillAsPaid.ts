import { Bill, Transaction } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export class MarkBillAsPaid {
  constructor(
    private billRepository: SupabaseBillRepository,
    private transactionRepository: SupabaseTransactionRepository
  ) {}

  async execute(userId: string, bill: Bill, targetMonth?: string): Promise<Transaction> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const resolvedMonth = targetMonth || today.slice(0, 7); // Use targetMonth or default to current month

    // 1. Create the transaction
    const transaction = await this.transactionRepository.addTransaction(userId, {
      amount: bill.amount,
      description: `[Paid] ${bill.name} (${resolvedMonth})`,
      category: bill.category,
      type: 'expense',
      date: today
    });

    // 2. Create the bill item (Detail)
    await this.billRepository.addBillItem(userId, {
      billId: bill.id,
      amount: bill.amount,
      dueDate: today,
      status: 'paid',
      paidAt: new Date().toISOString(),
      transactionId: transaction.id
    });

    // 3. Update the bill's last generated month
    await this.billRepository.updateBill(bill.id, {
      lastGeneratedMonth: resolvedMonth
    });

    return transaction;
  }
}

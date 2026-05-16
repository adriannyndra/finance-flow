import { Bill, Transaction } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export class MarkBillAsPaid {
  constructor(
    private billRepository: SupabaseBillRepository,
    private transactionRepository: SupabaseTransactionRepository
  ) {}

  async execute(userId: string, bill: Bill): Promise<Transaction> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Create the transaction
    const transaction = await this.transactionRepository.addTransaction(userId, {
      amount: bill.amount,
      description: `[Paid] ${bill.name}`,
      category: bill.category,
      type: 'expense',
      date: today
    });

    // 2. Update the bill's last generated month
    await this.billRepository.updateBill(bill.id, {
      lastGeneratedMonth: currentMonth
    });

    return transaction;
  }
}

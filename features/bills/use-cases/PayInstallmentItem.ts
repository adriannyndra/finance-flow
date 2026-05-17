import { Bill, BillItem, Transaction } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export class PayInstallmentItem {
  constructor(
    private billRepository: SupabaseBillRepository,
    private transactionRepository: SupabaseTransactionRepository
  ) {}

  async execute(userId: string, bill: Bill, item: BillItem): Promise<Transaction> {
    const today = new Date().toISOString().split('T')[0];

    // 1. Create the transaction
    const transaction = await this.transactionRepository.addTransaction(userId, {
      amount: item.amount,
      description: `[Installment] ${bill.name} - ${item.dueDate}`,
      category: bill.category,
      type: 'expense',
      date: today
    });

    // 2. Update the bill item to paid
    await this.billRepository.updateBillItem(item.id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      transactionId: transaction.id
    });

    // 3. Update the header's last generated month if this is the current month's item
    const currentMonth = today.slice(0, 7);
    if (item.dueDate.startsWith(currentMonth)) {
        await this.billRepository.updateBill(bill.id, {
            lastGeneratedMonth: currentMonth
        });
    }

    return transaction;
  }
}

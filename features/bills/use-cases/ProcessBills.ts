import { Transaction } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export class ProcessBills {
  constructor(
    private billRepository: SupabaseBillRepository,
    private transactionRepository: SupabaseTransactionRepository
  ) {}

  async execute(userId: string): Promise<Transaction[]> {
    const bills = await this.billRepository.getBills(userId);
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const generatedTransactions: Transaction[] = [];

    for (const bill of bills) {
      if (!bill.active) continue;

      // ONLY automatically process standard 'recurring' bills.
      // Installments and One-time bills are handled via manual roadmap interaction
      // or specific deadline logic.
      if (bill.billType !== 'recurring') continue;

      // 1. Check if bill has expired
      if (bill.endDate) {
        const endDate = new Date(bill.endDate);
        if (now > endDate) {
          // Auto-deactivate expired bills
          await this.billRepository.updateBill(bill.id, { active: false });
          continue;
        }
      }

      // 2. Check if transaction should be generated for this month
      // We generate it if:
      // - It hasn't been generated for the current month yet
      // - The billing day has arrived or passed
      const hasBeenGenerated = bill.lastGeneratedMonth === currentMonth;
      const isDayToGenerate = now.getDate() >= bill.billing_day;

      if (!hasBeenGenerated && isDayToGenerate) {
        // Generate the transaction for the billing day of the current month
        // We use a helper to ensure the date is valid (e.g. Feb 31 becomes Feb 28)
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        
        // This will automatically adjust to the last day of the month if bill.billing_day is too high
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const safeDay = Math.min(bill.billing_day, lastDayOfMonth);
        
        const transactionDate = `${currentMonth}-${String(safeDay).padStart(2, '0')}`;
        
        const newTransaction = await this.transactionRepository.addTransaction(userId, {
          amount: bill.amount,
          description: `[Recur] ${bill.name}`,
          category: bill.category,
          type: 'expense',
          date: transactionDate
        });

        // Create the bill item (Detail)
        await this.billRepository.addBillItem(userId, {
          billId: bill.id,
          amount: bill.amount,
          dueDate: transactionDate,
          status: 'paid',
          paidAt: new Date().toISOString(),
          transactionId: newTransaction.id
        });

        // Update the bill's last generated month to prevent double generation
        await this.billRepository.updateBill(bill.id, {
          lastGeneratedMonth: currentMonth
        });

        generatedTransactions.push(newTransaction);
      }
    }

    return generatedTransactions;
  }
}

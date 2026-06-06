import { Transaction } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export class ProcessBills {
  constructor(
    private billRepository: SupabaseBillRepository,
    private transactionRepository: SupabaseTransactionRepository
  ) {}

  /**
   * Cleans up expired bills and returns IDs of bills that have expired.
   * NO LONGER automatically generates transactions to ensure user control.
   */
  async execute(userId: string): Promise<string[]> {
    const bills = await this.billRepository.getBills(userId);
    const now = new Date();
    const deactivatedIds: string[] = [];

    for (const bill of bills) {
      if (!bill.active) continue;

      // Check if bill has expired
      if (bill.endDate) {
        const endDate = new Date(bill.endDate);
        if (now > endDate) {
          // Auto-deactivate expired bills
          await this.billRepository.updateBill(bill.id, { active: false });
          deactivatedIds.push(bill.id);
        }
      }
    }

    return deactivatedIds;
  }
}

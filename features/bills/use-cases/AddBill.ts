import { Bill } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';

export class AddBill {
  constructor(private repository: SupabaseBillRepository) {}
  async execute(userId: string, bill: Omit<Bill, 'id' | 'userId'>): Promise<Bill> {
    return this.repository.addBill(userId, bill);
  }
}

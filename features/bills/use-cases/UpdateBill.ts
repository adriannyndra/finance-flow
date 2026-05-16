import { Bill } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';

export class UpdateBill {
  constructor(private repository: SupabaseBillRepository) {}

  async execute(id: string, bill: Partial<Bill>): Promise<Bill> {
    return this.repository.updateBill(id, bill);
  }
}

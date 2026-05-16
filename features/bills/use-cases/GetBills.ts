import { Bill } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';

export class GetBills {
  constructor(private repository: SupabaseBillRepository) {}
  async execute(userId: string): Promise<Bill[]> {
    return this.repository.getBills(userId);
  }
}

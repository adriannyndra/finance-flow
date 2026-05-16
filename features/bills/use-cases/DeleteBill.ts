import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';

export class DeleteBill {
  constructor(private repository: SupabaseBillRepository) {}
  async execute(id: string): Promise<void> {
    return this.repository.deleteBill(id);
  }
}

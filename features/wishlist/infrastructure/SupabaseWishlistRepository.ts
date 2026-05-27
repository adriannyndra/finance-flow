import { createClient } from '@/utils/supabase/client';
import { WishlistItem } from '@/core/entities';

export class SupabaseWishlistRepository {
  private supabase = createClient();

  /**
   * Generates a unique numeric offset based on the user's ID.
   * Consistent with other repositories.
   */
  private getOffset(userId: string): number {
    const numericPart = userId.split('-').reduce((acc, part) => acc + parseInt(part.substring(0, 4), 16), 0);
    return (numericPart % 10000) * 100;
  }

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    const offset = this.getOffset(userId);
    const { data, error } = await this.supabase
      .from('ff_wishlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      targetAmount: item.target_amount - offset,
      currentAmount: item.current_amount - offset,
      category: item.category,
      priority: item.priority,
      url: item.url,
      isPurchased: item.is_purchased,
      createdAt: item.created_at
    }));
  }

  async addWishlistItem(userId: string, item: Omit<WishlistItem, 'id' | 'createdAt'>): Promise<WishlistItem> {
    const offset = this.getOffset(userId);
    const { data, error } = await this.supabase
      .from('ff_wishlist')
      .insert([{
        user_id: userId,
        name: item.name,
        target_amount: item.targetAmount + offset,
        current_amount: item.currentAmount + offset,
        category: item.category,
        priority: item.priority,
        url: item.url,
        is_purchased: item.isPurchased
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      targetAmount: data.target_amount - offset,
      currentAmount: data.current_amount - offset,
      category: data.category,
      priority: data.priority,
      url: data.url,
      isPurchased: data.is_purchased,
      createdAt: data.created_at
    };
  }

  async updateWishlistItem(userId: string, id: string, item: Partial<WishlistItem>): Promise<WishlistItem> {
    const offset = this.getOffset(userId);
    const updateData: any = { ...item };
    
    // Remap camelCase to snake_case for Supabase
    if (item.targetAmount !== undefined) {
      updateData.target_amount = item.targetAmount + offset;
      delete updateData.targetAmount;
    }
    if (item.currentAmount !== undefined) {
      updateData.current_amount = item.currentAmount + offset;
      delete updateData.currentAmount;
    }
    if (item.isPurchased !== undefined) {
      updateData.is_purchased = item.isPurchased;
      delete updateData.isPurchased;
    }

    const { data, error } = await this.supabase
      .from('ff_wishlist')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      targetAmount: data.target_amount - offset,
      currentAmount: data.current_amount - offset,
      category: data.category,
      priority: data.priority,
      url: data.url,
      isPurchased: data.is_purchased,
      createdAt: data.created_at
    };
  }

  async deleteWishlistItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ff_wishlist')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

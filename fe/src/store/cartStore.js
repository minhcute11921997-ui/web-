import { create } from 'zustand';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api/cartApi';

const useCartStore = create((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await getCart();
      set({ items: res.data.data?.items || [] });
    } catch {
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity) => {
    try {
      const res = await addToCart({ productId, quantity });
      console.log('addToCart response:', res.data);
      if (res.data.success) {
        try {
          await get().fetchCart();
        } catch (fetchError) {
          console.warn('fetchCart failed after addToCart:', fetchError);
          // Don't throw, just log - cart was added successfully
        }
      } else {
        throw new Error(res.data.message || 'Thêm giỏ hàng thất bại');
      }
    } catch (error) {
      console.error('addItem error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Lỗi không xác định';
      throw new Error(errorMsg);
    }
  },

  updateItem: async (id, quantity) => {
    if (quantity < 1) return;
    await updateCartItem(id, { quantity });
    get().fetchCart();
  },

  removeItem: async (id) => {
    await removeFromCart(id);
    get().fetchCart();
  },

  clearAll: async () => {
    await clearCart();
    set({ items: [] });
  },
}));

export default useCartStore;

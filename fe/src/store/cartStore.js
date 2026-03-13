import { create } from 'zustand';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api/cartApi';

const useCartStore = create((set, get) => ({
  items: [],
  loading: false,
  selectedItems: [],

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await getCart();
      const items = res.data.data?.items || [];
      const currentSelected = get().selectedItems;

      // Nếu chưa có selection nào (lần đầu load) → auto-select tất cả
      // Nếu đã có selection rồi → giữ nguyên, chỉ loại bỏ id không còn tồn tại
      const newItemIds = items.map(item => item.id);
      const updatedSelected = currentSelected.length === 0
        ? newItemIds
        : currentSelected.filter(id => newItemIds.includes(id));

      set({ items, selectedItems: updatedSelected });
    } catch {
      set({ items: [], selectedItems: [] });
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
    set({ items: [], selectedItems: [] });
  },

  toggleSelectedItem: (itemId) => {
    const selectedItems = get().selectedItems;
    if (selectedItems.includes(itemId)) {
      set({ selectedItems: selectedItems.filter(id => id !== itemId) });
    } else {
      set({ selectedItems: [...selectedItems, itemId] });
    }
  },

  toggleSelectAll: () => {
    const items = get().items;
    const selectedItems = get().selectedItems;
    if (selectedItems.length === items.length) {
      set({ selectedItems: [] });
    } else {
      set({ selectedItems: items.map(item => item.id) });
    }
  },
}));

export default useCartStore;

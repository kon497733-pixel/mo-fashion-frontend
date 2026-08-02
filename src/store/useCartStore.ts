import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// কার্ট আইটেমের টাইপ (কী কী তথ্য থাকবে)
export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  imageUrl: string;
  stock: number;
  discount?: number;
}

// কুপনের টাইপ
export interface AppliedCoupon {
  code: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
}

// স্টোরের টাইপ
interface CartStore {
  items: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number | string, size: string, color: string) => void;
  updateQuantity: (id: number | string, size: string, color: string, type: 'increase' | 'decrease') => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  clearCart: () => void;
}

// গ্লোবাল স্টোর তৈরি (Local Storage এ সেভ রাখার জন্য persist ব্যবহার করা হলো)
export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      appliedCoupon: null,

      // ১. কার্টে প্রোডাক্ট যোগ করা
      addToCart: (newItem) => 
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.id === newItem.id && item.size === newItem.size && item.color === newItem.color
          );

          if (existingItemIndex >= 0) {
            // আগে থেকে থাকলে শুধু পরিমাণ বাড়বে (স্টকের বেশি নয়)
            const updatedItems = [...state.items];
            const newQuantity = updatedItems[existingItemIndex].quantity + newItem.quantity;
            updatedItems[existingItemIndex].quantity = newQuantity > newItem.stock ? newItem.stock : newQuantity;
            return { items: updatedItems };
          } else {
            // নতুন আইটেম যুক্ত হবে
            return { items: [...state.items, newItem] };
          }
        }),

      // ২. কার্ট থেকে প্রোডাক্ট মুছে ফেলা
      removeFromCart: (id, size, color) =>
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === id && item.size === size && item.color === color)
          ),
        })),

      // ৩. পরিমাণ (Quantity) আপডেট করা
      updateQuantity: (id, size, color, type) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === id && item.size === size && item.color === color) {
              if (type === 'increase' && item.quantity < item.stock) {
                return { ...item, quantity: item.quantity + 1 };
              }
              if (type === 'decrease' && item.quantity > 1) {
                return { ...item, quantity: item.quantity - 1 };
              }
            }
            return item;
          }),
        })),

      // ৪. কুপন অ্যাপ্লাই করা
      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),

      // ৫. কুপন রিমুভ করা
      removeCoupon: () => set({ appliedCoupon: null }),

      // ৬. কার্ট খালি করা
      clearCart: () => set({ items: [], appliedCoupon: null }),
    }),
    {
      name: 'mo_fashion_cart', // Local Storage Key
    }
  )
);
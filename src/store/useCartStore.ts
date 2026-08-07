import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase'; // 🚀 সুপাবেস ক্লায়েন্ট ইম্পোর্ট

// কার্ট আইটেমের টাইপ (কী কী তথ্য থাকবে)
export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  imageUrl?: string;
  image?: string;
  stock: number;
  discount?: number;
  originalPrice?: number;
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
  syncWithCloud: (userId: string) => Promise<void>; // 🚀 ক্লাউড সিঙ্ক মেকানিজম অ্যাকশন
}

// ক্লাউডে কার্ট আপলোড করার অ্যাসিনক্রোনাস হেল্পার
const syncCartToCloud = async (userId: string, items: CartItem[]) => {
  try {
    const { error } = await supabase
      .from('mo_fashion_carts')
      .upsert({ 
        user_id: userId, 
        items: items, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'user_id' });
    if (error) console.warn('Cloud cart sync warning:', error.message);
  } catch (e) {
    console.warn('Cloud cart sync failed:', e);
  }
};

// গ্লোবাল স্টোর তৈরি (Local Storage এ সেভ রাখার জন্য persist ব্যবহার করা হলো)
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,

      // ১. কার্টে প্রোডাক্ট যোগ করা এবং লগইন থাকলে ক্লাউডে সিঙ্ক করা
      addToCart: (newItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.id === newItem.id && item.size === newItem.size && item.color === newItem.color
          );

          let updatedItems: CartItem[] = [];

          if (existingItemIndex >= 0) {
            updatedItems = [...state.items];
            const newQuantity = updatedItems[existingItemIndex].quantity + newItem.quantity;
            updatedItems[existingItemIndex].quantity = newQuantity > newItem.stock ? newItem.stock : newQuantity;
          } else {
            updatedItems = [...state.items, newItem];
          }

          // লগইন কাস্টমার থাকলে অ্যাসিনক্রোনাসলি ক্লাউড ডাটাবেজে সিঙ্ক হবে
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
          if (currentUser) {
            const userId = currentUser.email || currentUser.uid || currentUser.id;
            syncCartToCloud(userId, updatedItems);
          }

          return { items: updatedItems };
        });
      },

      // ২. কার্ট থেকে প্রোডাক্ট মুছে ফেলা এবং ক্লাউডে সিঙ্ক করা
      removeFromCart: (id, size, color) => {
        set((state) => {
          const updatedItems = state.items.filter(
            (item) => !(item.id === id && item.size === size && item.color === color)
          );

          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
          if (currentUser) {
            const userId = currentUser.email || currentUser.uid || currentUser.id;
            syncCartToCloud(userId, updatedItems);
          }

          return { items: updatedItems };
        });
      },

      // ৩. পরিমাণ (Quantity) আপডেট করা এবং ক্লাউডে সিঙ্ক করা
      updateQuantity: (id, size, color, type) => {
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.id === id && item.size === size && item.color === color) {
              if (type === 'increase' && item.quantity < item.stock) {
                return { ...item, quantity: item.quantity + 1 };
              }
              if (type === 'decrease' && item.quantity > 1) {
                return { ...item, quantity: item.quantity - 1 };
              }
            }
            return item;
          });

          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
          if (currentUser) {
            const userId = currentUser.email || currentUser.uid || currentUser.id;
            syncCartToCloud(userId, updatedItems);
          }

          return { items: updatedItems };
        });
      },

      // ৪. কুপন অ্যাপ্লাই করা
      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),

      // ৫. কুপন রিমুভ করা
      removeCoupon: () => set({ appliedCoupon: null }),

      // ৬. কার্ট খালি করা এবং ক্লাউড কার্ট রিসেট করা
      clearCart: () => {
        set({ items: [], appliedCoupon: null });
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (currentUser) {
          const userId = currentUser.email || currentUser.uid || currentUser.id;
          syncCartToCloud(userId, []);
        }
      },

      // 🚀 ৭. ব্যবহারকারী লগইন করার পর ক্লাউড কার্ট ডেটা লোকাল কার্টের সাথে সিঙ্ক ও মার্জ করার ফাংশন
      syncWithCloud: async (userId) => {
        try {
          const { data, error } = await supabase
            .from('mo_fashion_carts')
            .select('items')
            .eq('user_id', userId)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.warn('Error fetching cloud cart:', error.message);
            return;
          }

          if (data && Array.isArray(data.items)) {
            const cloudItems: CartItem[] = data.items;
            const localItems = get().items;

            // লোকাল কার্ট এবং ক্লাউড কার্ট মার্জ করা (যাতে কোনো ডুপ্লিকেট না হয়)
            const mergedMap = new Map<string, CartItem>();

            [...localItems, ...cloudItems].forEach((item) => {
              const key = `${item.id}-${item.size}-${item.color}`;
              if (mergedMap.has(key)) {
                const existing = mergedMap.get(key)!;
                existing.quantity = Math.min(item.stock, existing.quantity + item.quantity);
              } else {
                mergedMap.set(key, { ...item });
              }
            });

            const mergedItems = Array.from(mergedMap.values());
            set({ items: mergedItems });

            // মার্জড কার্টটি ডাটাবেজে আপডেট করে রাখা
            await syncCartToCloud(userId, mergedItems);
          } else {
            // যদি ক্লাউডে কোনো কার্ট না থাকে, তবে বর্তমান লোকাল কার্টটিই ক্লাউডে আপলোড হবে
            const localItems = get().items;
            if (localItems.length > 0) {
              await syncCartToCloud(userId, localItems);
            }
          }
        } catch (e) {
          console.warn('Sync with cloud failed:', e);
        }
      }
    }),
    {
      name: 'mo_fashion_cart', // Local Storage Key
    }
  )
);
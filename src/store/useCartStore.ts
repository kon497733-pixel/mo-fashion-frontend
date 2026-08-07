import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

// কার্ট আইটেমের টাইপ
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
  clearCartAndSession: () => void; // 🚀 লগআউটের সময় কার্ট ক্লিয়ার করার স্পেশাল ফাংশন
  syncWithCloud: (userId: string) => Promise<void>;
}

// ক্লাউডে কার্ট সেভ করার অ্যাসিনক্রোনাস হেল্পার
const syncCartToCloud = async (userId: string, items: CartItem[]) => {
  if (!userId) return;
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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,

      // ১. কার্টে প্রোডাক্ট যোগ করা এবং লগইন থাকলে ক্লাউডে সিঙ্ক করা
      addToCart: (newItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => String(item.id) === String(newItem.id) && item.size === newItem.size && item.color === newItem.color
          );

          let updatedItems: CartItem[] = [];

          if (existingItemIndex >= 0) {
            updatedItems = [...state.items];
            const newQuantity = updatedItems[existingItemIndex].quantity + newItem.quantity;
            updatedItems[existingItemIndex].quantity = newQuantity > newItem.stock ? newItem.stock : newQuantity;
          } else {
            updatedItems = [...state.items, newItem];
          }

          const currentUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null');
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
            (item) => !(String(item.id) === String(id) && item.size === size && item.color === color)
          );

          const currentUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null');
          if (currentUser) {
            const userId = currentUser.email || currentUser.uid || currentUser.id;
            syncCartToCloud(userId, updatedItems);
          }

          return { items: updatedItems };
        });
      },

      // ৩. পরিমাণ (Quantity) আপডেট করা
      updateQuantity: (id, size, color, type) => {
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (String(item.id) === String(id) && item.size === size && item.color === color) {
              if (type === 'increase' && item.quantity < item.stock) {
                return { ...item, quantity: item.quantity + 1 };
              }
              if (type === 'decrease' && item.quantity > 1) {
                return { ...item, quantity: item.quantity - 1 };
              }
            }
            return item;
          });

          const currentUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null');
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

      // ৬. কার্ট খালি করা
      clearCart: () => {
        set({ items: [], appliedCoupon: null });
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null');
        if (currentUser) {
          const userId = currentUser.email || currentUser.uid || currentUser.id;
          syncCartToCloud(userId, []);
        }
      },

      // 🚀 ৭. লগআউট করার সময় সম্পূর্ণ মেমোরি ও কার্ট ফাঁকা করা (Strict Logout Security)
      clearCartAndSession: () => {
        set({ items: [], appliedCoupon: null });
        localStorage.removeItem('mo_fashion_cart');
      },

      // 🚀 ৮. লগইন করার পর ইউজারের সুনির্দিষ্ট ক্লাউড কার্ট ডেটা লোড করা
      syncWithCloud: async (userId) => {
        if (!userId) return;
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

            await syncCartToCloud(userId, mergedItems);
          } else {
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
      name: 'mo_fashion_cart',
    }
  )
);
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ইউজারের ডাটা কেমন হবে তার একটি বিস্তারিত টাইপ (Type) তৈরি করা হলো
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'customer';
  // প্রোফাইল পেজের জন্য অতিরিক্ত ফিল্ডসমূহ
  phone?: string;
  address?: string;
  memberSince?: string;
}

// Zustand স্টোরের টাইপ
interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUserProfile: (updates: Partial<User>) => void; // প্রোফাইলের ছবি বা ডাটা এডিট করার ফাংশন
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

// Auth Store তৈরি করা হলো (persist ব্যবহার করে Local Storage এ সেভ রাখা হচ্ছে)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, // শুরুতে কোনো ইউজার লগিন করা নেই
      isLoading: false, 
      
      // নতুন ইউজার লগিন বা রেজিস্ট্রেশন করলে ডাটা সেট করার ফাংশন
      setUser: (user) => set({ user }),
      
      // প্রোফাইলের ছবি, নাম, ঠিকানা পরিবর্তন করলে তা সেভ করার ফাংশন
      updateUserProfile: (updates) => 
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        })),

      setLoading: (isLoading) => set({ isLoading }),
      
      // লগআউট করার ফাংশন
      logout: () => set({ user: null }),
    }),
    {
      name: 'mo_fashion_auth', // এই নামে ব্রাউজারের Local Storage-এ লগিন সেশন সেভ থাকবে
    }
  )
);
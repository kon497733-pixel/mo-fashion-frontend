import { create } from 'zustand';
import { supabase, getSupabaseSettings, updateSupabaseSettings } from '../lib/supabase';

export interface SiteSettings {
  storeName: string;
  logoUrl: string;
  aboutImageUrl?: string;
  tagline: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  currency: string;
  shippingInside: number;
  shippingOutside: number;
  enableBkash: boolean;
  enableCard: boolean;
  enableCOD: boolean;
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

interface SettingsStore {
  settings: SiteSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  subscribeRealtimeSettings: () => () => void;
}

// 🚀 প্রাথমিক সেটিংস অবজেক্ট (০% ডামি লোগো বা ডিফল্ট বিহীন)
const initialSettings: SiteSettings = {
  storeName: 'MO FASHION',
  logoUrl: '',
  aboutImageUrl: '',
  tagline: '',
  contactEmail: '',
  phoneNumber: '',
  address: '',
  currency: '৳',
  shippingInside: 60,
  shippingOutside: 150,
  enableBkash: true,
  enableCard: true,
  enableCOD: true,
  facebook: '',
  instagram: '',
  twitter: ''
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: (() => {
    const cached = localStorage.getItem('mo_fashion_settings');
    if (cached) {
      try {
        return { ...initialSettings, ...JSON.parse(cached) };
      } catch (e) {}
    }
    return initialSettings;
  })(),
  isLoading: false,

  // 🚀 ১. Supabase ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম সেটিংস লোড করা
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const liveData = await getSupabaseSettings();
      if (liveData && Object.keys(liveData).length > 0) {
        const merged = { ...initialSettings, ...liveData };
        set({ settings: merged, isLoading: false });
        localStorage.setItem('mo_fashion_settings', JSON.stringify(merged));
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn("Using cached settings:", error);
      set({ isLoading: false });
    }
  },

  // 🚀 ২. অ্যাডমিন প্যানেল থেকে সেভ চাপার সাথে সাথে Supabase ক্লাউডে লাইভ সেভ
  updateSettings: async (newSettings: Partial<SiteSettings>) => {
    const current = get().settings;
    const updated = { ...current, ...newSettings };

    try {
      // Supabase Realtime ক্লাউড সেভ
      const savedData = await updateSupabaseSettings(updated);
      const finalData = savedData ? { ...initialSettings, ...savedData } : updated;

      set({ settings: finalData });
      localStorage.setItem('mo_fashion_settings', JSON.stringify(finalData));

      // গ্লোবাল ইভেন্ট ডিসপ্যাচ
      window.dispatchEvent(new Event('settingsUpdated'));
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error("Failed to update Supabase settings:", error);
      throw error;
    }
  },

  // 🚀 ৩. বিশ্বব্যাপী সব ডিভাইসে রিয়েল-টাইম অটো-সিঙ্ক লিসেনার (Supabase WebSocket)
  subscribeRealtimeSettings: () => {
    const channel = supabase
      .channel('public:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            const merged = { ...initialSettings, ...payload.new };
            set({ settings: merged });
            localStorage.setItem('mo_fashion_settings', JSON.stringify(merged));
            window.dispatchEvent(new Event('settingsUpdated'));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}));
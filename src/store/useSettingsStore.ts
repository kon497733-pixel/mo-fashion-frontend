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

// 🚀 পারসিস্টেন্ট সেটিংস মার্জ করার সেফগার্ড ফাংশন (খালি ডাটা দিয়ে সেভ করা ডাটা কখনো মুছবে না)
const mergeSettingsSafely = (current: SiteSettings, incoming: Record<string, any>): SiteSettings => {
  if (!incoming || typeof incoming !== 'object') return current;

  const result: any = { ...current };

  Object.keys(incoming).forEach((key) => {
    const val = incoming[key];
    // ক্লাউড থেকে আসা মান যদি নাল বা খালি না হয়, কেবল তখনই আপডেট হবে
    if (val !== null && val !== undefined && val !== '') {
      result[key] = val;
    }
  });

  return result;
};

// 🚀 প্রাথমিক সেটিংস
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
        const parsed = JSON.parse(cached);
        return { ...initialSettings, ...parsed };
      } catch (e) {}
    }
    return initialSettings;
  })(),
  isLoading: false,

  // 🚀 ১. ক্লাউড ডাটাবেস থেকে সেটিংস লোড করা (সেভ করা ডাটা ১% ও মুছবে না)
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const current = get().settings;
      const liveData = await getSupabaseSettings();

      if (liveData && Object.keys(liveData).length > 0) {
        // সেভ করা ডাটা রক্ষা করে মার্জ করা
        const merged = mergeSettingsSafely(current, liveData);
        set({ settings: merged, isLoading: false });
        localStorage.setItem('mo_fashion_settings', JSON.stringify(merged));
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn("Using cached persistent settings:", error);
      set({ isLoading: false });
    }
  },

  // 🚀 ২. সেভ চাপামাত্রই ইনস্ট্যান্ট পারমানেন্ট সেভিং ও গ্লোবাল ব্রডকাস্ট
  updateSettings: async (newSettings: Partial<SiteSettings>) => {
    const current = get().settings;
    const updated = { ...current, ...newSettings };

    // ১. লোকালস্টেট ও লোকালস্টোরেজে তৎক্ষণাৎ স্থায়ী সেভ
    set({ settings: updated });
    localStorage.setItem('mo_fashion_settings', JSON.stringify(updated));

    // গ্লোবাল ইভেন্ট
    window.dispatchEvent(new Event('settingsUpdated'));
    window.dispatchEvent(new Event('storage'));

    // ২. সুপাবেস ক্লাউডে পারমানেন্ট সেভ
    try {
      const savedData = await updateSupabaseSettings(updated);
      if (savedData) {
        const finalMerged = mergeSettingsSafely(updated, savedData);
        set({ settings: finalMerged });
        localStorage.setItem('mo_fashion_settings', JSON.stringify(finalMerged));
      }
    } catch (error) {
      console.warn("Supabase background sync saved locally.");
    }
  },

  // 🚀 ৩. রিয়েল-টাইম অটো সিঙ্ক
  subscribeRealtimeSettings: () => {
    const channel = supabase
      .channel('public:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            const current = get().settings;
            const merged = mergeSettingsSafely(current, payload.new);
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
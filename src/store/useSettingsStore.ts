import { create } from 'zustand';
import { supabase, getSupabaseSettings, updateSupabaseSettings } from '../lib/supabase';

export interface SiteSettings {
  storeName: string;
  logoUrl: string;
  aboutImageUrl?: string;
  tagline: string;
  heroBadge?: string;
  heroTitle?: string;
  heroDescription?: string;
  heroCardTitle?: string;
  heroCardSubtitle?: string;
  heroCardEst?: string;
  offerBadge?: string;
  offerTitle?: string;
  offerDescription?: string;
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
  faqs?: Array<{ question: string; answer: string }>;
}

interface SettingsStore {
  settings: SiteSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  subscribeRealtimeSettings: () => () => void;
}

// 🚀 পারসিস্টেন্ট সেটিংস মার্জ করার সেফগার্ড ফাংশন
const mergeSettingsSafely = (current: SiteSettings, incoming: Record<string, any>): SiteSettings => {
  if (!incoming || typeof incoming !== 'object') return current;

  const result: any = { ...current };

  Object.keys(incoming).forEach((key) => {
    const val = incoming[key];
    if (val !== null && val !== undefined && val !== '') {
      result[key] = val;
    }
  });

  return result;
};

// 🚀 প্রাথমিক ৩ডি সেটিংস
const initialSettings: SiteSettings = {
  storeName: 'MO FASHION',
  logoUrl: '',
  aboutImageUrl: '',
  tagline: 'LUXURY COLLECTION',
  heroBadge: 'EXCLUSIVE LUXURY COLLECTION',
  heroTitle: 'ELEVATE YOUR SIGNATURE STYLE',
  heroDescription: 'Discover handcrafted luxury apparel and accessories designed to redefine modern elegance. Premium quality tailored for perfection.',
  heroCardTitle: '100% AUTHENTIC',
  heroCardSubtitle: 'PREMIUM FASHION GUARANTEED',
  heroCardEst: 'EST. 2026',
  offerBadge: 'LIMITED TIME OFFER',
  offerTitle: 'SPECIAL LUXURY DISCOUNT UP TO 30% OFF',
  offerDescription: 'Upgrade your wardrobe today with our exclusive premium collection. Fast nationwide delivery available.',
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
  twitter: '',
  faqs: []
};

// 🚀 ব্যাকগ্রাউন্ড রিয়েল-টাইম সকেট অটো-লিসেনার ফ্ল্যাগ
let isRealtimeSubscribed = false;

export const useSettingsStore = create<SettingsStore>((set, get) => {
  
  // 🚀 সুপাবেস রিয়েল-টাইম অটো সাবস্ক্রিপশন ফাংশন
  const initRealtimeListener = () => {
    if (isRealtimeSubscribed) return;
    isRealtimeSubscribed = true;

    supabase
      .channel('public:settings:global:live:v200')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            const current = get().settings;
            const merged = mergeSettingsSafely(current, payload.new);
            set({ settings: merged });
            localStorage.setItem('mo_fashion_settings', JSON.stringify(merged));
            
            // উইন্ডো রিয়েল-টাইম ব্রডকাস্ট ইভেন্ট
            window.dispatchEvent(new Event('settingsUpdated'));
            window.dispatchEvent(new Event('storage'));
          }
        }
      )
      .subscribe();
  };

  return {
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

    // 🚀 ১. ক্লাউড ডাটাবেস থেকে সেটিংস লোড ও অটো-লিসেনার অন করা
    fetchSettings: async () => {
      initRealtimeListener(); // রিয়েল-টাইম লিসেনার অটোমেটিক অন হবে
      set({ isLoading: true });
      
      try {
        const current = get().settings;
        const liveData = await getSupabaseSettings();

        if (liveData && Object.keys(liveData).length > 0) {
          const merged = mergeSettingsSafely(current, liveData);
          set({ settings: merged, isLoading: false });
          localStorage.setItem('mo_fashion_settings', JSON.stringify(merged));
          window.dispatchEvent(new Event('settingsUpdated'));
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        console.warn("Using cached persistent settings:", error);
        set({ isLoading: false });
      }
    },

    // 🚀 ২. সেভ চাপামাত্রই ইনস্ট্যান্ট পারমানেন্ট সেভিং ও গ্লোবাল রিয়েল-টাইম ব্রডকাস্ট
    updateSettings: async (newSettings: Partial<SiteSettings>) => {
      initRealtimeListener();
      const current = get().settings;
      const updated = { ...current, ...newSettings };

      // ১. লোকালস্টেট ও লোকালস্টোরেজে তৎক্ষণাৎ সেভ
      set({ settings: updated });
      localStorage.setItem('mo_fashion_settings', JSON.stringify(updated));

      // উইন্ডো রিয়েল-টাইম ব্রডকাস্ট
      window.dispatchEvent(new Event('settingsUpdated'));
      window.dispatchEvent(new Event('storage'));

      // ২. সুপাবেস ক্লাউডে সেভ (যাতে অল-ডিভাইসে ১ সেকেন্ডে পুশ হয়)
      try {
        const savedData = await updateSupabaseSettings(updated);
        if (savedData) {
          const finalMerged = mergeSettingsSafely(updated, savedData);
          set({ settings: finalMerged });
          localStorage.setItem('mo_fashion_settings', JSON.stringify(finalMerged));
          window.dispatchEvent(new Event('settingsUpdated'));
        }
      } catch (error) {
        console.warn("Supabase background sync saved locally:", error);
      }
    },

    // 🚀 ৩. ম্যানুয়াল রিয়েল-টাইম সাবস্ক্রিপশন (যদি কোনো কম্পোনেন্ট থেকে অন করা হয়)
    subscribeRealtimeSettings: () => {
      initRealtimeListener();
      return () => {};
    }
  };
});
import { create } from 'zustand';
import { getLiveSettings, apiRequest } from '../config/api';

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
}

// 🚀 প্রাথমিক স্টেট স্ট্রাকচার (০% ডামি লোগো বা ডিফল্ট বিহীন)
const initialSettings: SiteSettings = {
  storeName: 'MO FASHION',
  logoUrl: '',
  aboutImageUrl: '',
  tagline: 'Premium E-Commerce Experience',
  contactEmail: 'kon497733@gmail.com',
  phoneNumber: '+880 1707697445',
  address: 'CDA Agrabad, Chattogram, Bangladesh',
  currency: '৳',
  shippingInside: 60,
  shippingOutside: 150,
  enableBkash: true,
  enableCard: true,
  enableCOD: true,
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  twitter: 'https://twitter.com'
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

  // 🚀 ১. ক্লাউড MongoDB ডাটাবেস থেকে রিয়েল-টাইমে সেটিংস লোড করা
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const liveData = await getLiveSettings();
      if (liveData && Object.keys(liveData).length > 0) {
        const merged = { ...initialSettings, ...liveData };
        set({ settings: merged, isLoading: false });
        localStorage.setItem('mo_fashion_settings', JSON.stringify(merged));
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn("Using cached settings due to server connection:", error);
      set({ isLoading: false });
    }
  },

  // 🚀 ২. অ্যাডমিন প্যানেল থেকে সেভ করার সাথে সাথে ক্লাউড ডাটাবেসে সেভ ও লাইভ ব্রডকাস্ট
  updateSettings: async (newSettings: Partial<SiteSettings>) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    localStorage.setItem('mo_fashion_settings', JSON.stringify(updated));

    // সমস্ত ডিভাইসে লাইভ আপডেটের জন্য গ্লোবাল ইভেন্ট ডিসপ্যাচ
    window.dispatchEvent(new Event('settingsUpdated'));

    try {
      await apiRequest('/settings', {
        method: 'POST',
        body: JSON.stringify(updated)
      });
    } catch (error) {
      console.error("Failed to sync settings to MongoDB Cloud Server:", error);
    }
  }
}));
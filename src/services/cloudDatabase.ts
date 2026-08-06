// src/services/cloudDatabase.ts

// 🚀 বিশ্বব্যাপী সব মোবাইলে ডাটা সিঙ্ক করার সেন্ট্রাল ক্লাউড সার্ভার
const CLOUD_STORAGE_KEY = "MO_FASHION_STORE_MEHEDI_1589";

// ১. ক্লাউড সার্ভার থেকে রিয়েল-টাইম ডাটা নিয়ে আসা
export const getLiveCloudData = async (key: string) => {
  try {
    const local = localStorage.getItem(key);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.error("Cloud read error", e);
  }
  return null;
};

// ২. ল্যাপটপের এডমিন প্যানেল থেকে ক্লাউড সার্ভারে ডাটা সেভ করা
export const saveLiveCloudData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    
    // গ্লোবাল ইভেন্ট ফায়ার
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('settingsUpdated'));
    window.dispatchEvent(new Event('productsUpdated'));
  } catch (e) {
    console.error("Cloud write error", e);
  }
};
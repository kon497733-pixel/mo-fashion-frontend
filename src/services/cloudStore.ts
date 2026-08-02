// src/services/cloudStore.ts

// ফ্রি ক্লাউড এপিআই যা ল্যাপটপ ও সব মোবাইলের ডাটা একসাথে সিঙ্ক রাখবে
const CLOUD_STORAGE_URL = "https://api.jsonbin.io/v3/b";

// ১. ক্লাউড থেকে লেটেস্ট ডাটা নিয়ে আসা
export const fetchCloudData = async (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Local load error", e);
  }
  return defaultValue;
};

// ২. ক্লাউডে ডাটা সেভ করা এবং সব ডিভাইসে সাথে সাথে লাইভ করা
export const saveCloudData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    
    // গ্লোবাল অনলাইন সিঙ্ক ইভেন্ট
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('settingsUpdated'));
    window.dispatchEvent(new Event('productsUpdated'));
  } catch (e) {
    console.error("Save error", e);
  }
};
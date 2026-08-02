// 🚀 MO FASHION Centralized Dynamic API Client Service
// Single Source of Truth for Real-time Cloud MongoDB Database Sync across all devices.

// 🌐 ১. ডায়নামিক এপিআই বেজ ইউআরএল রেজলভার (মোবাইল, পিসি ও লাইভ হোস্টিংয়ের জন্য)
export const getApiBaseUrl = (): string => {
  // ১. mo-fashion/.env ফাইলে সেট করা VITE_API_URL চেক করা
  const envApiUrl = import.meta.env.VITE_API_URL;
  
  if (envApiUrl && !envApiUrl.includes('localhost')) {
    return envApiUrl;
  }

  // ২. লোকাল নেটওয়ার্কে মোবাইল বা অন্য ডিভাইস থেকে ঢুকলে ডাইনামিকালি আইপি রেজলভ করা
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//${hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

// 🚀 ২. সেন্ট্রালাইজড ফেচ রিকোয়েস্ট সার্ভিস (জিরো ব্রাউজার ক্যাশ / ১০০% লাইভ সিঙ্ক)
export const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[API Connection Error] Failed to fetch ${url}:`, error);
    throw error;
  }
};

// 📦 ৩. ক্লাউড ডাটাবেস লাইভ ফেচিং সার্ভিসেস (জিরো ডিফল্ট)

// অ্যাডমিন সেটিংস (লোগো, স্টোর নেম, ট্যাগলাইন, শিপিং চার্জ)
export const getLiveSettings = async () => {
  try {
    const data = await apiRequest('/settings');
    if (data && Object.keys(data).length > 0) {
      localStorage.setItem('mo_fashion_settings', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    const cached = localStorage.getItem('mo_fashion_settings');
    return cached ? JSON.parse(cached) : null;
  }
};

// লাইভ প্রোডাক্টস (MongoDB Atlas Live Collection)
export const getLiveProducts = async () => {
  try {
    const data = await apiRequest('/products');
    if (Array.isArray(data)) {
      localStorage.setItem('mo_fashion_products', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    const cached = localStorage.getItem('mo_fashion_products');
    return cached ? JSON.parse(cached) : [];
  }
};

// ক্যাটালগ ও ক্যাটাগরি
export const getLiveCategories = async () => {
  try {
    const data = await apiRequest('/categories');
    if (Array.isArray(data)) {
      localStorage.setItem('mo_fashion_categories', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    const cached = localStorage.getItem('mo_fashion_categories');
    return cached ? JSON.parse(cached) : [];
  }
};

// কুপন ডিসকাউন্ট
export const getLiveCoupons = async () => {
  try {
    const data = await apiRequest('/coupons');
    if (Array.isArray(data)) {
      localStorage.setItem('mo_fashion_coupons', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    const cached = localStorage.getItem('mo_fashion_coupons');
    return cached ? JSON.parse(cached) : [];
  }
};

// কাস্টমার অর্ডার্স
export const getLiveOrders = async () => {
  try {
    const data = await apiRequest('/orders');
    if (Array.isArray(data)) {
      localStorage.setItem('mo_fashion_orders', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    const cached = localStorage.getItem('mo_fashion_orders');
    return cached ? JSON.parse(cached) : [];
  }
};
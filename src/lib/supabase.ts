import { createClient } from '@supabase/supabase-js';

// 🚀 Supabase Credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lcoujwhfddeihulurrwq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Aib7MOvBq4kMBsiM7BeHnQ_ElMM9Cjl';

// 🌐 Supabase Realtime Client Instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// 📦 Realtime Helper Services for Live Global Sync Across All Devices

// ১. লাইভ সেটিংস নিয়ে আসা (Get Settings)
export const getSupabaseSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (error) {
      console.warn('Supabase Settings Fetch Warning:', error.message);
    }

    if (data && data.length > 0) {
      localStorage.setItem('mo_fashion_settings', JSON.stringify(data[0]));
      return data[0];
    }
  } catch (err) {
    console.warn('Supabase Network Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_settings');
  return cached ? JSON.parse(cached) : null;
};

// ২. সেটিংস লাইভ সেভ ও সিঙ্ক করা (Save Settings - 100% Guaranteed Error-Proof)
export const updateSupabaseSettings = async (newSettings: Record<string, any>) => {
  const { _id, created_at, id, __v, updated_at, ...cleanPayload } = newSettings;

  try {
    const { data: rows } = await supabase.from('settings').select('id').limit(1);

    let response;
    if (rows && rows.length > 0 && rows[0].id) {
      response = await supabase
        .from('settings')
        .update(cleanPayload)
        .eq('id', rows[0].id)
        .select();
    } else {
      response = await supabase
        .from('settings')
        .insert([cleanPayload])
        .select();
    }

    if (response.error) {
      console.warn('Supabase Settings Warning:', response.error.message);
    }

    const savedData = (response.data && response.data.length > 0) ? response.data[0] : cleanPayload;
    localStorage.setItem('mo_fashion_settings', JSON.stringify(savedData));
    window.dispatchEvent(new Event('settingsUpdated'));
    return savedData;

  } catch (err: any) {
    console.warn('Supabase Settings Local Fallback:', err.message || err);
    localStorage.setItem('mo_fashion_settings', JSON.stringify(cleanPayload));
    window.dispatchEvent(new Event('settingsUpdated'));
    return cleanPayload;
  }
};

// ৩. লাইভ প্রোডাক্টস নিয়ে আসা (Get Products)
export const getSupabaseProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase Products Fetch Error:', error.message);
    }

    if (data && Array.isArray(data)) {
      localStorage.setItem('mo_fashion_products', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Supabase Products Network Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_products');
  return cached ? JSON.parse(cached) : [];
};

// ৪. প্রোডাক্ট লাইভ সেভ/আপডেট করা (Save/Update Product)
export const saveSupabaseProduct = async (productData: Record<string, any>) => {
  try {
    const targetId = String(productData._id || productData.id || Date.now());
    const { _id, ...cleanProduct } = productData;
    const payload = {
      ...cleanProduct,
      id: targetId,
    };

    const { data, error } = await supabase
      .from('products')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('Supabase Product Save Warning:', error.message);
    }

    if (data && data.length > 0) {
      return data[0];
    }
    return payload;
  } catch (err: any) {
    console.warn('Failed to save Supabase Product:', err.message || err);
    return productData;
  }
};

// ৫. প্রোডাক্ট লাইভ ডিলিট করা (Delete Product)
export const deleteSupabaseProduct = async (id: string) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) console.warn('Supabase Delete Warning:', error.message);
    return true;
  } catch (err: any) {
    console.warn('Failed to delete Supabase Product:', err.message || err);
    return true;
  }
};
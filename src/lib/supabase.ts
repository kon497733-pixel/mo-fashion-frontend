import { createClient } from '@supabase/supabase-js';

// 🚀 Supabase Credentials (Environment Variables থেকে)
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

// ২. সেটিংস লাইভ সেভ ও সিঙ্ক করা (Save Settings - 100% Safe Clean Payload)
export const updateSupabaseSettings = async (newSettings: Record<string, any>) => {
  try {
    // পোস্টগ্রেস ডাটাবেস এরর এড়াতে অনাকাঙ্ক্ষিত ইন্টারনাল কী রিমুভ করা
    const { _id, created_at, id, __v, ...cleanPayload } = newSettings;

    // সেটিংসের বিদ্যমান রো চেক করা
    const { data: rows } = await supabase.from('settings').select('id').limit(1);

    let response;
    if (rows && rows.length > 0 && rows[0].id) {
      response = await supabase
        .from('settings')
        .update({ ...cleanPayload, updated_at: new Date().toISOString() })
        .eq('id', rows[0].id)
        .select();
    } else {
      response = await supabase
        .from('settings')
        .insert([{ ...cleanPayload, updated_at: new Date().toISOString() }])
        .select();
    }

    if (response.error) {
      console.error('Supabase Error Payload:', response.error);
      throw new Error(response.error.message || 'Failed to save settings to Supabase');
    }

    const savedData = (response.data && response.data.length > 0) ? response.data[0] : newSettings;
    localStorage.setItem('mo_fashion_settings', JSON.stringify(savedData));
    window.dispatchEvent(new Event('settingsUpdated'));
    return savedData;
  } catch (err: any) {
    console.error('Failed to update Supabase Settings:', err.message || err);
    throw err;
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

    if (error) throw error;

    if (data && data.length > 0) {
      return data[0];
    }
  } catch (err: any) {
    console.error('Failed to save Supabase Product:', err.message || err);
    throw err;
  }
};

// ৫. প্রোডাক্ট লাইভ ডিলিট করা (Delete Product)
export const deleteSupabaseProduct = async (id: string) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error('Failed to delete Supabase Product:', err.message || err);
    throw err;
  }
};
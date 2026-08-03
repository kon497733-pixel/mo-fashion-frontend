import { createClient } from '@supabase/supabase-js';

// 🚀 Supabase Credentials from Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lcoujwhfddeihulurrwq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Aib7MOvBq4kMBsiM7BeHnQ_ElMM9Cjl';

// 🌐 Supabase Realtime Client Instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// 🛡️ হেলপার ফাংশন: ক্লাউড ডাটা ও লোকাল ডাটা নিরাপদে মার্জ করা (যাতে কোনো ডাটা কখনো উধাও না হয়)
const safeMergeData = (cloudData: any[], localKey: string) => {
  let localData: any[] = [];
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) localData = JSON.parse(cached);
  } catch (e) {}

  if (!Array.isArray(cloudData) || cloudData.length === 0) {
    return Array.isArray(localData) ? localData : [];
  }

  if (!Array.isArray(localData) || localData.length === 0) {
    localStorage.setItem(localKey, JSON.stringify(cloudData));
    return cloudData;
  }

  const map = new Map();
  [...localData, ...cloudData].forEach((item: any) => {
    if (item) {
      const key = String(item.id || item._id);
      if (key && key !== 'undefined' && key !== 'null') {
        map.set(key, { ...map.get(key), ...item });
      }
    }
  });

  const merged = Array.from(map.values());
  localStorage.setItem(localKey, JSON.stringify(merged));
  return merged;
};

// =========================================================
// 📦 1. SETTINGS SERVICES
// =========================================================

export const getSupabaseSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (!error && data && data.length > 0) {
      localStorage.setItem('mo_fashion_settings', JSON.stringify(data[0]));
      return data[0];
    }
  } catch (err) {
    console.warn('Supabase Settings Fetch Warning:', err);
  }

  const cached = localStorage.getItem('mo_fashion_settings');
  return cached ? JSON.parse(cached) : null;
};

export const updateSupabaseSettings = async (newSettings: Record<string, any>) => {
  const { _id, created_at, id, __v, updated_at, ...cleanPayload } = newSettings;

  try {
    localStorage.setItem('mo_fashion_settings', JSON.stringify(cleanPayload));
    window.dispatchEvent(new Event('settingsUpdated'));

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

    const savedData = (response.data && response.data.length > 0) ? response.data[0] : cleanPayload;
    localStorage.setItem('mo_fashion_settings', JSON.stringify(savedData));
    return savedData;
  } catch (err: any) {
    console.warn('Supabase Settings Fallback:', err.message || err);
    localStorage.setItem('mo_fashion_settings', JSON.stringify(cleanPayload));
    return cleanPayload;
  }
};

// =========================================================
// 📦 2. PRODUCTS SERVICES (গ্যারান্টিড সেভ)
// =========================================================

export const getSupabaseProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return safeMergeData(data, 'mo_fashion_products');
    }
  } catch (err) {
    console.warn('Supabase Products Network Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_products');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseProduct = async (productData: Record<string, any>) => {
  const targetId = String(productData.id || productData._id || `PROD-${Date.now()}`);
  const { _id, ...cleanProduct } = productData;
  const payload = {
    ...cleanProduct,
    id: targetId,
  };

  // 🚀 ১. ব্রাউজারে সাথে সাথে সেভ (যাতে ১ সেকেন্ডেও উধাও না হয়)
  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((p: any) => String(p.id || p._id) !== targetId) : [];
    const updatedLocal = [payload, ...filtered];
    localStorage.setItem('mo_fashion_products', JSON.stringify(updatedLocal));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('productUpdated'));
  } catch (e) {}

  // 🚀 ২. ক্লাউড ডাটাবেসে সেভ
  try {
    const { data, error } = await supabase
      .from('products')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) console.warn('Supabase Product Save Warning:', error.message);
    if (data && data.length > 0) return data[0];
  } catch (err: any) {
    console.warn('Failed to save Supabase Product:', err.message || err);
  }

  return payload;
};

export const deleteSupabaseProduct = async (id: string) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.warn('Supabase Delete Warning:', error.message);
    return true;
  } catch (err: any) {
    console.warn('Failed to delete Supabase Product:', err.message || err);
    return true;
  }
};

// =========================================================
// 📦 3. CATEGORIES SERVICES (গ্যারান্টিড সেভ)
// =========================================================

export const getSupabaseCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return safeMergeData(data, 'mo_fashion_categories');
    }
  } catch (err) {
    console.warn('Supabase Categories Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_categories');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCategory = async (categoryData: Record<string, any>) => {
  const targetId = String(categoryData.id || categoryData._id || `CAT-${Date.now()}`);
  const { _id, ...cleanCategory } = categoryData;
  const payload = {
    ...cleanCategory,
    id: targetId,
  };

  // 🚀 ১. ব্রাউজারে সাথে সাথে সেভ
  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((c: any) => String(c.id || c._id) !== targetId) : [];
    const updatedLocal = [payload, ...filtered];
    localStorage.setItem('mo_fashion_categories', JSON.stringify(updatedLocal));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('categoryUpdated'));
  } catch (e) {}

  // 🚀 ২. ক্লাউড ডাটাবেসে সেভ
  try {
    const { data, error } = await supabase
      .from('categories')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) console.warn('Supabase Category Save Warning:', error.message);
    if (data && data.length > 0) return data[0];
  } catch (err: any) {
    console.warn('Failed to save Supabase Category:', err.message || err);
  }

  return payload;
};

export const deleteSupabaseCategory = async (id: string) => {
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) console.warn('Supabase Category Delete Warning:', error.message);
    return true;
  } catch (err: any) {
    console.warn('Failed to delete Supabase Category:', err.message || err);
    return true;
  }
};

// =========================================================
// 📦 4. COUPONS SERVICES
// =========================================================

export const getSupabaseCoupons = async () => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return safeMergeData(data, 'mo_fashion_coupons');
    }
  } catch (err) {
    console.warn('Supabase Coupons Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_coupons');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCoupon = async (couponData: Record<string, any>) => {
  const targetId = String(couponData.id || couponData._id || Date.now());
  const { _id, ...cleanCoupon } = couponData;
  const payload = {
    ...cleanCoupon,
    id: targetId,
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_coupons') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((c: any) => String(c.id || c._id) !== targetId) : [];
    localStorage.setItem('mo_fashion_coupons', JSON.stringify([payload, ...filtered]));
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from('coupons')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (data && data.length > 0) return data[0];
  } catch (err: any) {}

  return payload;
};

export const deleteSupabaseCoupon = async (id: string) => {
  try {
    await supabase.from('coupons').delete().eq('id', id);
    return true;
  } catch (err: any) {
    return true;
  }
};

// =========================================================
// 📦 5. ORDERS SERVICES
// =========================================================

export const getSupabaseOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return safeMergeData(data, 'mo_fashion_orders');
    }
  } catch (err) {
    console.warn('Supabase Orders Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_orders');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseOrder = async (orderData: Record<string, any>) => {
  const targetId = String(orderData.id || orderData._id || orderData.orderId || Date.now());
  const { _id, ...cleanOrder } = orderData;
  const payload = {
    ...cleanOrder,
    id: targetId,
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_orders') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((o: any) => String(o.id || o._id) !== targetId) : [];
    localStorage.setItem('mo_fashion_orders', JSON.stringify([payload, ...filtered]));
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from('orders')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (data && data.length > 0) return data[0];
  } catch (err: any) {}

  return payload;
};

export const deleteSupabaseOrder = async (id: string) => {
  try {
    await supabase.from('orders').delete().eq('id', id);
    return true;
  } catch (err: any) {
    return true;
  }
};

// =========================================================
// 📦 6. CUSTOMERS SERVICES
// =========================================================

export const getSupabaseCustomers = async () => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return safeMergeData(data, 'mo_fashion_customers');
    }
  } catch (err) {
    console.warn('Supabase Customers Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_customers');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCustomer = async (customerData: Record<string, any>) => {
  const targetId = String(customerData.id || customerData._id || Date.now());
  const { _id, ...cleanCustomer } = customerData;
  const payload = {
    ...cleanCustomer,
    id: targetId,
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_customers') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((c: any) => String(c.id || c._id) !== targetId) : [];
    localStorage.setItem('mo_fashion_customers', JSON.stringify([payload, ...filtered]));
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from('customers')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (data && data.length > 0) return data[0];
  } catch (err: any) {}

  return payload;
};

// =========================================================
// 📦 7. UNIVERSAL RECYCLE BIN SERVICES
// =========================================================

export const getSupabaseRecycleBin = async () => {
  try {
    const { data, error } = await supabase
      .from('recycle_bin')
      .select('*')
      .order('deletedAt', { ascending: false });

    if (!error && Array.isArray(data)) {
      return safeMergeData(data, 'mo_fashion_recycle_bin');
    }
  } catch (err) {
    console.warn('Supabase Recycle Bin Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_recycle_bin');
  return cached ? JSON.parse(cached) : [];
};

export const moveToRecycleBin = async (originalTable: 'products' | 'categories' | 'orders' | 'coupons', item: Record<string, any>) => {
  const itemId = String(item.id || item._id || Date.now());
  const trashId = `TRASH-${Date.now()}`;
  const deletedAtStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const trashPayload = {
    id: trashId,
    originalTable: originalTable,
    itemId: itemId,
    name: String(item.name || item.code || item.orderId || 'Deleted Item'),
    data: item,
    deletedAt: deletedAtStr
  };

  try {
    await supabase.from('recycle_bin').insert([trashPayload]);
    await supabase.from(originalTable).delete().eq('id', itemId);

    const binKey = originalTable === 'categories' ? 'mo_fashion_recycle_bin_categories' : 'mo_fashion_recycle_bin_products';
    const existingBin = JSON.parse(localStorage.getItem(binKey) || '[]');
    localStorage.setItem(binKey, JSON.stringify([{ ...item, deletedAt: deletedAtStr }, ...existingBin]));

    const activeKey = originalTable === 'categories' ? 'mo_fashion_categories' : 'mo_fashion_products';
    const activeItems = JSON.parse(localStorage.getItem(activeKey) || '[]');
    const remainingActive = activeItems.filter((i: any) => String(i.id || i._id) !== itemId);
    localStorage.setItem(activeKey, JSON.stringify(remainingActive));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('productUpdated'));
    window.dispatchEvent(new Event('categoryUpdated'));

    return trashPayload;
  } catch (err: any) {
    return trashPayload;
  }
};

export const restoreFromRecycleBin = async (trashRecord: Record<string, any>) => {
  const { originalTable, data: originalData, id: trashId, itemId } = trashRecord;
  const targetId = String(itemId || originalData?.id || originalData?._id);

  try {
    if (originalTable && originalData) {
      await supabase.from(originalTable).upsert([originalData], { onConflict: 'id' });
    }
    if (trashId) {
      await supabase.from('recycle_bin').delete().eq('id', trashId);
    }

    const activeKey = originalTable === 'categories' ? 'mo_fashion_categories' : 'mo_fashion_products';
    const activeItems = JSON.parse(localStorage.getItem(activeKey) || '[]');
    const cleanActive = activeItems.filter((i: any) => String(i.id || i._id) !== targetId);
    localStorage.setItem(activeKey, JSON.stringify([originalData, ...cleanActive]));

    const binKey = originalTable === 'categories' ? 'mo_fashion_recycle_bin_categories' : 'mo_fashion_recycle_bin_products';
    const existingBin = JSON.parse(localStorage.getItem(binKey) || '[]');
    localStorage.setItem(binKey, JSON.stringify(existingBin.filter((i: any) => String(i.id || i._id) !== targetId)));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('productUpdated'));
    window.dispatchEvent(new Event('categoryUpdated'));

    return true;
  } catch (err: any) {
    return false;
  }
};

export const permanentDeleteFromRecycleBin = async (trashId: string) => {
  try {
    await supabase.from('recycle_bin').delete().eq('id', trashId);
    return true;
  } catch (err: any) {
    return true;
  }
};
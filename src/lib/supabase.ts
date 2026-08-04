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

// 🛡️ ইউনিভার্সাল সেফ সেভ ও মার্জ ফাংশন
const mergeAndStore = (cloudData: any[], localKey: string) => {
  let localData: any[] = [];
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) localData = JSON.parse(cached);
  } catch (e) {}

  if (!Array.isArray(cloudData)) cloudData = [];
  if (!Array.isArray(localData)) localData = [];

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
  const targetId = 'STORE_SETTINGS';

  try {
    const payload = { id: targetId, ...cleanPayload };
    localStorage.setItem('mo_fashion_settings', JSON.stringify(payload));
    window.dispatchEvent(new Event('settingsUpdated'));

    const { data } = await supabase
      .from('settings')
      .upsert([payload], { onConflict: 'id' })
      .select();

    const savedData = (data && data.length > 0) ? data[0] : payload;
    localStorage.setItem('mo_fashion_settings', JSON.stringify(savedData));
    return savedData;
  } catch (err: any) {
    localStorage.setItem('mo_fashion_settings', JSON.stringify(cleanPayload));
    return cleanPayload;
  }
};

// =========================================================
// 📦 2. PRODUCTS SERVICES
// =========================================================

export const getSupabaseProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return mergeAndStore(data, 'mo_fashion_products');
    }
  } catch (err) {
    console.warn('Supabase Products Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_products');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseProduct = async (productData: Record<string, any>) => {
  const targetId = String(productData.id || productData._id || `PROD-${Date.now()}`);
  
  // 🚀 _id এবং imageUrl প্রপার্টি দুটি ক্লাউডে পাঠানোর আগে মুছে ফেলা হলো
  const { _id, imageUrl, updated_at, ...cleanProduct } = productData;
  const payload = {
    ...cleanProduct,
    id: targetId,
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((p: any) => String(p.id || p._id) !== targetId) : [];
    const localPayload = { ...productData, id: targetId, _id: targetId };
    localStorage.setItem('mo_fashion_products', JSON.stringify([localPayload, ...filtered]));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('productUpdated'));
  } catch (e) {}

  const { data, error } = await supabase
    .from('products')
    .upsert([payload], { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Supabase Product Save Error:', error.message);
    throw new Error(error.message);
  }

  if (data && data.length > 0) return data[0];
  return payload;
};

export const deleteSupabaseProduct = async (id: string) => {
  const targetId = String(id);
  try {
    await supabase.from('products').delete().eq('id', targetId);
    
    const existing = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
    const filtered = existing.filter((p: any) => String(p.id || p._id) !== targetId);
    localStorage.setItem('mo_fashion_products', JSON.stringify(filtered));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('productUpdated'));
    return true;
  } catch (err: any) {
    return true;
  }
};

// =========================================================
// 📦 3. CATEGORIES SERVICES
// =========================================================

export const getSupabaseCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return mergeAndStore(data, 'mo_fashion_categories');
    }
  } catch (err) {
    console.warn('Supabase Categories Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_categories');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCategory = async (categoryData: Record<string, any>) => {
  const targetId = String(categoryData.id || categoryData._id || `CAT-${Date.now()}`);
  
  const { _id, updated_at, ...cleanCategory } = categoryData;
  const payload = {
    ...cleanCategory,
    id: targetId,
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((c: any) => String(c.id || c._id) !== targetId) : [];
    const localPayload = { ...categoryData, id: targetId, _id: targetId };
    localStorage.setItem('mo_fashion_categories', JSON.stringify([localPayload, ...filtered]));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('categoryUpdated'));
  } catch (e) {}

  const { data, error } = await supabase
    .from('categories')
    .upsert([payload], { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Supabase Category Save Error:', error.message);
    throw new Error(error.message);
  }

  if (data && data.length > 0) return data[0];
  return payload;
};

export const deleteSupabaseCategory = async (id: string) => {
  const targetId = String(id);
  try {
    await supabase.from('categories').delete().eq('id', targetId);

    const existing = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
    const filtered = existing.filter((c: any) => String(c.id || c._id) !== targetId);
    localStorage.setItem('mo_fashion_categories', JSON.stringify(filtered));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('categoryUpdated'));
    return true;
  } catch (err: any) {
    return true;
  }
};

// =========================================================
// 📦 4. COUPONS SERVICES (Live All-Device Sync Fixed)
// =========================================================

export const getSupabaseCoupons = async () => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return mergeAndStore(data, 'mo_fashion_coupons');
    }
  } catch (err) {
    console.warn('Supabase Coupons Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_coupons');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCoupon = async (couponData: Record<string, any>) => {
  const targetId = String(couponData.id || couponData._id || `COUPON-${Date.now()}`);
  const { _id, updated_at, ...cleanCoupon } = couponData;
  const payload = {
    ...cleanCoupon,
    id: targetId,
    code: String(cleanCoupon.code).trim().toUpperCase()
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_coupons') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((c: any) => String(c.id || c._id) !== targetId) : [];
    localStorage.setItem('mo_fashion_coupons', JSON.stringify([{ ...payload, _id: targetId }, ...filtered]));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('couponUpdated'));
  } catch (e) {}

  const { data, error } = await supabase
    .from('coupons')
    .upsert([payload], { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Supabase Coupon Save Error:', error.message);
    throw new Error(error.message);
  }

  if (data && data.length > 0) return data[0];
  return payload;
};

export const deleteSupabaseCoupon = async (id: string) => {
  const targetId = String(id);
  try {
    await supabase.from('coupons').delete().eq('id', targetId);
    
    const existing = JSON.parse(localStorage.getItem('mo_fashion_coupons') || '[]');
    const filtered = existing.filter((c: any) => String(c.id || c._id) !== targetId);
    localStorage.setItem('mo_fashion_coupons', JSON.stringify(filtered));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('couponUpdated'));
    return true;
  } catch (err: any) {
    return true;
  }
};

// =========================================================
// 📦 5. ORDERS SERVICES (Live All-Device Order Placement Fixed)
// =========================================================

export const getSupabaseOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return mergeAndStore(data, 'mo_fashion_orders');
    }
  } catch (err) {
    console.warn('Supabase Orders Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_orders');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseOrder = async (orderData: Record<string, any>) => {
  const targetId = String(orderData.id || orderData._id || orderData.orderId || `ORD-${Date.now()}`);
  
  // 🚀 _id এবং updated_at মুছে ফেলা হলো যাতে Supabase Order Upsert কখনো রিজেক্ট না হয়
  const { _id, updated_at, ...cleanOrder } = orderData;
  const payload = {
    ...cleanOrder,
    id: targetId,
    orderId: String(cleanOrder.orderId || targetId)
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_orders') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((o: any) => String(o.id || o._id || o.orderId) !== targetId) : [];
    localStorage.setItem('mo_fashion_orders', JSON.stringify([{ ...payload, _id: targetId }, ...filtered]));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('orderUpdated'));
  } catch (e) {}

  const { data, error } = await supabase
    .from('orders')
    .upsert([payload], { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Supabase Order Save Error:', error.message);
    throw new Error(error.message);
  }

  if (data && data.length > 0) return data[0];
  return payload;
};

export const deleteSupabaseOrder = async (id: string) => {
  const targetId = String(id);
  try {
    await supabase.from('orders').delete().eq('id', targetId);

    const existing = JSON.parse(localStorage.getItem('mo_fashion_orders') || '[]');
    const filtered = existing.filter((o: any) => String(o.id || o._id || o.orderId) !== targetId);
    localStorage.setItem('mo_fashion_orders', JSON.stringify(filtered));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('orderUpdated'));
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
      return mergeAndStore(data, 'mo_fashion_customers');
    }
  } catch (err) {
    console.warn('Supabase Customers Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_customers');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCustomer = async (customerData: Record<string, any>) => {
  const targetId = String(customerData.id || customerData._id || `CUST-${Date.now()}`);
  const { _id, updated_at, ...cleanCustomer } = customerData;
  const payload = { ...cleanCustomer, id: targetId };

  try {
    const existing = JSON.parse(localStorage.getItem('mo_fashion_customers') || '[]');
    const filtered = Array.isArray(existing) ? existing.filter((c: any) => String(c.id || c._id) !== targetId) : [];
    localStorage.setItem('mo_fashion_customers', JSON.stringify([{ ...payload, _id: targetId }, ...filtered]));
  } catch (e) {}

  try {
    const { data } = await supabase
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
      return mergeAndStore(data, 'mo_fashion_recycle_bin');
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
    const cleanBin = existingBin.filter((i: any) => String(i.id || i._id) !== itemId);
    localStorage.setItem(binKey, JSON.stringify([{ ...item, trashId, deletedAt: deletedAtStr }, ...cleanBin]));

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
      const { _id, imageUrl, updated_at, trashId: tId, deletedAt, ...cleanData } = originalData;
      await supabase.from(originalTable).upsert([{ ...cleanData, id: targetId }], { onConflict: 'id' });
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

export const permanentDeleteFromRecycleBin = async (trashId: string, itemId?: string, originalTable?: string) => {
  try {
    if (trashId) {
      await supabase.from('recycle_bin').delete().eq('id', String(trashId));
    }

    if (originalTable && itemId) {
      await supabase.from(originalTable).delete().eq('id', String(itemId));
    }

    ['mo_fashion_recycle_bin', 'mo_fashion_recycle_bin_categories', 'mo_fashion_recycle_bin_products'].forEach(key => {
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = items.filter((i: any) => String(i.trashId || i.id || i._id) !== String(trashId) && String(i.id || i._id) !== String(itemId));
      localStorage.setItem(key, JSON.stringify(filtered));
    });

    if (originalTable) {
      const activeKey = originalTable === 'categories' ? 'mo_fashion_categories' : 'mo_fashion_products';
      const items = JSON.parse(localStorage.getItem(activeKey) || '[]');
      const filtered = items.filter((i: any) => String(i.id || i._id) !== String(itemId));
      localStorage.setItem(activeKey, JSON.stringify(filtered));
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('productUpdated'));
    window.dispatchEvent(new Event('categoryUpdated'));

    return true;
  } catch (err: any) {
    return true;
  }
};
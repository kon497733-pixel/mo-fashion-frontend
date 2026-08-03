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

// =========================================================
// 📦 1. SETTINGS SERVICES
// =========================================================

export const getSupabaseSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (error) console.warn('Supabase Settings Fetch Warning:', error.message);

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

export const updateSupabaseSettings = async (newSettings: Record<string, any>) => {
  const { _id, created_at, id, __v, updated_at, ...cleanPayload } = newSettings;

  try {
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

    if (response.error) console.warn('Supabase Settings Warning:', response.error.message);

    const savedData = (response.data && response.data.length > 0) ? response.data[0] : cleanPayload;
    localStorage.setItem('mo_fashion_settings', JSON.stringify(savedData));
    window.dispatchEvent(new Event('settingsUpdated'));
    return savedData;
  } catch (err: any) {
    console.warn('Supabase Settings Fallback:', err.message || err);
    localStorage.setItem('mo_fashion_settings', JSON.stringify(cleanPayload));
    window.dispatchEvent(new Event('settingsUpdated'));
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

    if (error) console.warn('Supabase Products Fetch Warning:', error.message);

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

export const saveSupabaseProduct = async (productData: Record<string, any>) => {
  try {
    const targetId = String(productData.id || productData._id || Date.now());
    const { _id, ...cleanProduct } = productData;
    const payload = {
      ...cleanProduct,
      id: targetId,
    };

    const { data, error } = await supabase
      .from('products')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) console.warn('Supabase Product Save Warning:', error.message);

    if (data && data.length > 0) return data[0];
    return payload;
  } catch (err: any) {
    console.warn('Failed to save Supabase Product:', err.message || err);
    return productData;
  }
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
// 📦 3. CATEGORIES SERVICES
// =========================================================

export const getSupabaseCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.warn('Supabase Categories Fetch Warning:', error.message);

    if (data && Array.isArray(data)) {
      localStorage.setItem('mo_fashion_categories', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Supabase Categories Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_categories');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCategory = async (categoryData: Record<string, any>) => {
  try {
    const targetId = String(categoryData.id || categoryData._id || Date.now());
    const { _id, ...cleanCategory } = categoryData;
    const payload = {
      ...cleanCategory,
      id: targetId,
    };

    const { data, error } = await supabase
      .from('categories')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) console.warn('Supabase Category Save Warning:', error.message);

    if (data && data.length > 0) return data[0];
    return payload;
  } catch (err: any) {
    console.warn('Failed to save Supabase Category:', err.message || err);
    return categoryData;
  }
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

    if (error) console.warn('Supabase Coupons Fetch Warning:', error.message);

    if (data && Array.isArray(data)) {
      localStorage.setItem('mo_fashion_coupons', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Supabase Coupons Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_coupons');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCoupon = async (couponData: Record<string, any>) => {
  try {
    const targetId = String(couponData.id || couponData._id || Date.now());
    const { _id, ...cleanCoupon } = couponData;
    const payload = {
      ...cleanCoupon,
      id: targetId,
    };

    const { data, error } = await supabase
      .from('coupons')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) console.warn('Supabase Coupon Save Warning:', error.message);

    if (data && data.length > 0) return data[0];
    return payload;
  } catch (err: any) {
    console.warn('Failed to save Supabase Coupon:', err.message || err);
    return couponData;
  }
};

export const deleteSupabaseCoupon = async (id: string) => {
  try {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) console.warn('Supabase Coupon Delete Warning:', error.message);
    return true;
  } catch (err: any) {
    console.warn('Failed to delete Supabase Coupon:', err.message || err);
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

    if (error) console.warn('Supabase Orders Fetch Warning:', error.message);

    if (data && Array.isArray(data)) {
      localStorage.setItem('mo_fashion_orders', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Supabase Orders Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_orders');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseOrder = async (orderData: Record<string, any>) => {
  try {
    const targetId = String(orderData.id || orderData._id || orderData.orderId || Date.now());
    const { _id, ...cleanOrder } = orderData;
    const payload = {
      ...cleanOrder,
      id: targetId,
    };

    const { data, error } = await supabase
      .from('orders')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) console.warn('Supabase Order Save Warning:', error.message);

    if (data && data.length > 0) return data[0];
    return payload;
  } catch (err: any) {
    console.warn('Failed to save Supabase Order:', err.message || err);
    return orderData;
  }
};

export const deleteSupabaseOrder = async (id: string) => {
  try {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) console.warn('Supabase Order Delete Warning:', error.message);
    return true;
  } catch (err: any) {
    console.warn('Failed to delete Supabase Order:', err.message || err);
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

    if (error) console.warn('Supabase Customers Fetch Warning:', error.message);

    if (data && Array.isArray(data)) {
      localStorage.setItem('mo_fashion_customers', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Supabase Customers Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_customers');
  return cached ? JSON.parse(cached) : [];
};

export const saveSupabaseCustomer = async (customerData: Record<string, any>) => {
  try {
    const targetId = String(customerData.id || customerData._id || Date.now());
    const { _id, ...cleanCustomer } = customerData;
    const payload = {
      ...cleanCustomer,
      id: targetId,
    };

    const { data, error } = await supabase
      .from('customers')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) console.warn('Supabase Customer Save Warning:', error.message);

    if (data && data.length > 0) return data[0];
    return payload;
  } catch (err: any) {
    console.warn('Failed to save Supabase Customer:', err.message || err);
    return customerData;
  }
};

// =========================================================
// 📦 7. RECYCLE BIN SERVICES (Soft Delete & 1-Click Restoration)
// =========================================================

export const getSupabaseRecycleBin = async () => {
  try {
    const { data, error } = await supabase
      .from('recycle_bin')
      .select('*')
      .order('deletedAt', { ascending: false });

    if (error) console.warn('Supabase Recycle Bin Fetch Warning:', error.message);

    if (data && Array.isArray(data)) {
      localStorage.setItem('mo_fashion_recycle_bin', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Supabase Recycle Bin Error:', err);
  }

  const cached = localStorage.getItem('mo_fashion_recycle_bin');
  return cached ? JSON.parse(cached) : [];
};

// 🗑️ Soft Delete: Moves item to recycle_bin and removes from original table
export const moveToRecycleBin = async (originalTable: string, item: Record<string, any>) => {
  const itemId = String(item.id || item._id || Date.now());
  const trashId = `TRASH-${Date.now()}`;

  const trashPayload = {
    id: trashId,
    originalTable: originalTable,
    itemId: itemId,
    name: String(item.name || item.code || item.orderId || 'Deleted Item'),
    data: item,
    deletedAt: new Date().toISOString()
  };

  try {
    // 1. Save to recycle_bin
    await supabase.from('recycle_bin').insert([trashPayload]);

    // 2. Remove from original table
    await supabase.from(originalTable).delete().eq('id', itemId);

    return trashPayload;
  } catch (err: any) {
    console.warn(`Failed soft delete to recycle bin for ${originalTable}:`, err.message || err);
    return trashPayload;
  }
};

// ♻️ Restore: Moves item back to original table and deletes from recycle_bin
export const restoreFromRecycleBin = async (trashRecord: Record<string, any>) => {
  const { originalTable, data: originalData, id: trashId } = trashRecord;

  try {
    // 1. Restore to original table
    await supabase.from(originalTable).upsert([originalData], { onConflict: 'id' });

    // 2. Remove from recycle_bin
    await supabase.from('recycle_bin').delete().eq('id', trashId);

    return true;
  } catch (err: any) {
    console.warn(`Failed restore from recycle bin for ${originalTable}:`, err.message || err);
    return false;
  }
};

// ❌ Permanent Delete: Deletes item permanently from recycle_bin
export const permanentDeleteFromRecycleBin = async (trashId: string) => {
  try {
    await supabase.from('recycle_bin').delete().eq('id', trashId);
    return true;
  } catch (err: any) {
    console.warn("Failed permanent delete from recycle bin:", err.message || err);
    return true;
  }
};
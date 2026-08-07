import { useState, useEffect } from 'react';
import { 
  Trash2, RefreshCcw, ArchiveX, Layers, Package, 
  AlertTriangle, Image as ImageIcon, RefreshCw,
  ShoppingCart, User, Ticket
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { 
  supabase, 
  getSupabaseRecycleBin, 
  permanentDeleteFromRecycleBin,
  saveSupabaseProduct,
  saveSupabaseCategory,
  saveSupabaseOrder,
  saveSupabaseCustomer,
  saveSupabaseCoupon,
  getSupabaseCategories
} from '../../lib/supabase';

export default function RecycleBin() {
  const [deletedCategories, setDeletedCategories] = useState<any[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]); 
  const [deletedOrders, setDeletedOrders] = useState<any[]>([]);
  const [deletedCustomers, setDeletedCustomers] = useState<any[]>([]);
  const [deletedCoupons, setDeletedCoupons] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'orders' | 'customers' | 'coupons'>('categories');
  const [loading, setLoading] = useState(true);

  // 🚀 ১. ক্লাউড ডাটাবেস ও লোকাল ব্যাকআপ থেকে ৫টি মডিউলের রিসাইকেল বিন ডাটা ফেচ
  const fetchTrashData = async () => {
    setLoading(true);

    let localCat = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_categories') || '[]');
    let localProd = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_products') || '[]');
    let localOrd = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_orders') || '[]');
    let localCust = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_customers') || '[]');
    let localCoup = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_coupons') || '[]');

    try {
      const cloudTrash = await getSupabaseRecycleBin();

      if (Array.isArray(cloudTrash) && cloudTrash.length > 0) {
        const cloudCatItems = cloudTrash
          .filter((t: any) => t.originalTable === 'categories')
          .map((t: any) => ({ ...t.data, id: t.itemId || t.data?.id, _id: t.itemId || t.data?._id, trashId: t.id, deletedAt: t.deletedAt }));

        const cloudProdItems = cloudTrash
          .filter((t: any) => t.originalTable === 'products')
          .map((t: any) => ({ ...t.data, id: t.itemId || t.data?.id, _id: t.itemId || t.data?._id, trashId: t.id, deletedAt: t.deletedAt }));

        const cloudOrdItems = cloudTrash
          .filter((t: any) => t.originalTable === 'orders')
          .map((t: any) => ({ ...t.data, id: t.itemId || t.data?.id, _id: t.itemId || t.data?._id, trashId: t.id, deletedAt: t.deletedAt }));

        const cloudCustItems = cloudTrash
          .filter((t: any) => t.originalTable === 'customers')
          .map((t: any) => ({ ...t.data, id: t.itemId || t.data?.id, _id: t.itemId || t.data?._id, trashId: t.id, deletedAt: t.deletedAt }));

        const cloudCoupItems = cloudTrash
          .filter((t: any) => t.originalTable === 'coupons')
          .map((t: any) => ({ ...t.data, id: t.itemId || t.data?.id, _id: t.itemId || t.data?._id, trashId: t.id, deletedAt: t.deletedAt }));

        const createMap = (local: any[], cloud: any[]) => {
          const map = new Map();
          [...local, ...cloud].forEach((item: any) => {
            const key = String(item.id || item._id);
            if (key && key !== 'undefined') map.set(key, item);
          });
          return Array.from(map.values());
        };

        const finalCategories = createMap(localCat, cloudCatItems);
        const finalProducts = createMap(localProd, cloudProdItems);
        const finalOrders = createMap(localOrd, cloudOrdItems);
        const finalCustomers = createMap(localCust, cloudCustItems);
        const finalCoupons = createMap(localCoup, cloudCoupItems);

        setDeletedCategories(finalCategories);
        setDeletedProducts(finalProducts);
        setDeletedOrders(finalOrders);
        setDeletedCustomers(finalCustomers);
        setDeletedCoupons(finalCoupons);

        localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify(finalCategories));
        localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify(finalProducts));
        localStorage.setItem('mo_fashion_recycle_bin_orders', JSON.stringify(finalOrders));
        localStorage.setItem('mo_fashion_recycle_bin_customers', JSON.stringify(finalCustomers));
        localStorage.setItem('mo_fashion_recycle_bin_coupons', JSON.stringify(finalCoupons));
      } else {
        setDeletedCategories(localCat);
        setDeletedProducts(localProd);
        setDeletedOrders(localOrd);
        setDeletedCustomers(localCust);
        setDeletedCoupons(localCoup);
      }
    } catch (e) {
      setDeletedCategories(localCat);
      setDeletedProducts(localProd);
      setDeletedOrders(localOrd);
      setDeletedCustomers(localCust);
      setDeletedCoupons(localCoup);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashData();

    const channel = supabase
      .channel('public:recycle_bin:management:v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recycle_bin' }, () => {
        fetchTrashData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🚀 1. CATEGORY 1-CLICK RESTORE & DELETE
  const handleRestoreCategory = async (category: any) => {
    const catId = String(category.id || category._id);
    const catName = category.name || 'Category';

    const updatedBin = deletedCategories.filter(c => String(c.id || c._id) !== catId);
    setDeletedCategories(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify(updatedBin));

    const activeCategories = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
    const { deletedAt, trashId, _id, ...restoredCategory } = category;
    const cleanCategory = { ...restoredCategory, id: catId, _id: catId };

    const cleanActive = activeCategories.filter((c: any) => String(c.id || c._id) !== catId);
    const newActiveList = [cleanCategory, ...cleanActive];
    localStorage.setItem('mo_fashion_categories', JSON.stringify(newActiveList));

    try {
      await saveSupabaseCategory(cleanCategory);
      if (trashId) await permanentDeleteFromRecycleBin(trashId, catId, 'categories');

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('categoryUpdated'));

      toast.success(`Category "${catName}" restored LIVE to Cloud & Showroom! 🎉`);
    } catch (e) {
      toast.success(`Category "${catName}" restored successfully! 🎉`);
    }
  };

  const handlePermanentDeleteCategory = async (category: any) => {
    const catId = String(category.id || category._id);
    const catName = category.name || 'Category';

    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete category "${catName}"? This action cannot be undone!`)) {
      const updatedBin = deletedCategories.filter(c => String(c.id || c._id) !== catId);
      setDeletedCategories(updatedBin);
      localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify(updatedBin));

      await permanentDeleteFromRecycleBin(category.trashId || catId, catId, 'categories');

      toast.success(`Category "${catName}" permanently deleted from database.`);
    }
  };

  // 🚀 2. PRODUCT 1-CLICK RESTORE & DELETE
  const handleRestoreProduct = async (product: any) => {
    const pId = String(product.id || product._id);
    const pName = product.name || 'Product';

    const updatedBin = deletedProducts.filter(p => String(p.id || p._id) !== pId);
    setDeletedProducts(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify(updatedBin));

    const activeProducts = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
    const { deletedAt, trashId, _id, ...restoredProduct } = product;
    const cleanProduct = { ...restoredProduct, id: pId, _id: pId };

    const cleanActive = activeProducts.filter((p: any) => String(p.id || p._id) !== pId);
    const newActiveList = [cleanProduct, ...cleanActive];
    localStorage.setItem('mo_fashion_products', JSON.stringify(newActiveList));

    try {
      const activeCats = await getSupabaseCategories();
      if (Array.isArray(activeCats) && activeCats.length > 0) {
        const updatedCats = activeCats.map((cat: any) => {
          const count = newActiveList.filter((p: any) => 
            p && p.category && cat.name && 
            String(p.category).trim().toLowerCase() === String(cat.name).trim().toLowerCase()
          ).length;
          return { ...cat, count };
        });
        localStorage.setItem('mo_fashion_categories', JSON.stringify(updatedCats));
        for (const c of updatedCats) {
          await saveSupabaseCategory(c).catch(() => null);
        }
      }
    } catch (e) {}

    try {
      await saveSupabaseProduct(cleanProduct);
      if (trashId) await permanentDeleteFromRecycleBin(trashId, pId, 'products');

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('productUpdated'));
      window.dispatchEvent(new Event('categoryUpdated'));

      toast.success(`Product "${pName}" restored LIVE to Cloud & Showroom! 🎉`);
    } catch (error) {
      toast.success(`Product "${pName}" restored successfully! 🎉`);
    }
  };

  const handlePermanentDeleteProduct = async (product: any) => {
    const pId = String(product.id || product._id);
    const pName = product.name || 'Product';

    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete product "${pName}"? This action cannot be undone!`)) {
      const updatedBin = deletedProducts.filter(p => String(p.id || p._id) !== pId);
      setDeletedProducts(updatedBin);
      localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify(updatedBin));

      await permanentDeleteFromRecycleBin(product.trashId || pId, pId, 'products');

      toast.success(`Product "${pName}" permanently deleted from database.`);
    }
  };

  // 🚀 3. ORDER 1-CLICK RESTORE & DELETE
  const handleRestoreOrder = async (order: any) => {
    const oId = String(order.id || order._id || order.orderId);

    const updatedBin = deletedOrders.filter(o => String(o.id || o._id || o.orderId) !== oId);
    setDeletedOrders(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_orders', JSON.stringify(updatedBin));

    const activeOrders = JSON.parse(localStorage.getItem('mo_fashion_orders') || '[]');
    const { deletedAt, trashId, _id, ...restoredOrder } = order;
    const cleanOrder = { ...restoredOrder, id: oId, _id: oId, orderId: oId };

    const cleanActive = activeOrders.filter((o: any) => String(o.id || o._id || o.orderId) !== oId);
    const newActiveList = [cleanOrder, ...cleanActive];
    localStorage.setItem('mo_fashion_orders', JSON.stringify(newActiveList));

    try {
      await saveSupabaseOrder(cleanOrder);
      if (trashId) await permanentDeleteFromRecycleBin(trashId, oId, 'orders');

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('orderUpdated'));

      toast.success(`Order #${oId.slice(-6)} restored LIVE! 🎉`);
    } catch (e) {
      toast.success(`Order #${oId.slice(-6)} restored successfully! 🎉`);
    }
  };

  const handlePermanentDeleteOrder = async (order: any) => {
    const oId = String(order.id || order._id || order.orderId);

    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete Order #${oId.slice(-6)}? This action cannot be undone!`)) {
      const updatedBin = deletedOrders.filter(o => String(o.id || o._id || o.orderId) !== oId);
      setDeletedOrders(updatedBin);
      localStorage.setItem('mo_fashion_recycle_bin_orders', JSON.stringify(updatedBin));

      await permanentDeleteFromRecycleBin(order.trashId || oId, oId, 'orders');

      toast.success(`Order #${oId.slice(-6)} permanently deleted from database.`);
    }
  };

  // 🚀 4. CUSTOMER 1-CLICK RESTORE & DELETE
  const handleRestoreCustomer = async (customer: any) => {
    const cId = String(customer.id || customer._id);
    const cName = customer.name || 'Customer';

    const updatedBin = deletedCustomers.filter(c => String(c.id || c._id) !== cId);
    setDeletedCustomers(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_customers', JSON.stringify(updatedBin));

    const activeCustomers = JSON.parse(localStorage.getItem('mo_fashion_customers') || '[]');
    const { deletedAt, trashId, _id, ...restoredCustomer } = customer;
    const cleanCustomer = { ...restoredCustomer, id: cId, _id: cId };

    const cleanActive = activeCustomers.filter((c: any) => String(c.id || c._id) !== cId);
    const newActiveList = [cleanCustomer, ...cleanActive];
    localStorage.setItem('mo_fashion_customers', JSON.stringify(newActiveList));

    try {
      await saveSupabaseCustomer(cleanCustomer);
      if (trashId) await permanentDeleteFromRecycleBin(trashId, cId, 'customers');

      window.dispatchEvent(new Event('storage'));

      toast.success(`Customer "${cName}" restored LIVE! 🎉`);
    } catch (e) {
      toast.success(`Customer "${cName}" restored successfully! 🎉`);
    }
  };

  const handlePermanentDeleteCustomer = async (customer: any) => {
    const cId = String(customer.id || customer._id);
    const cName = customer.name || 'Customer';

    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete customer "${cName}"? This action cannot be undone!`)) {
      const updatedBin = deletedCustomers.filter(c => String(c.id || c._id) !== cId);
      setDeletedCustomers(updatedBin);
      localStorage.setItem('mo_fashion_recycle_bin_customers', JSON.stringify(updatedBin));

      await permanentDeleteFromRecycleBin(customer.trashId || cId, cId, 'customers');

      toast.success(`Customer "${cName}" permanently deleted from database.`);
    }
  };

  // 🚀 5. COUPON 1-CLICK RESTORE & DELETE
  const handleRestoreCoupon = async (coupon: any) => {
    const cpId = String(coupon.id || coupon._id);
    const cpCode = coupon.code || 'Coupon';

    const updatedBin = deletedCoupons.filter(c => String(c.id || c._id) !== cpId);
    setDeletedCoupons(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_coupons', JSON.stringify(updatedBin));

    const activeCoupons = JSON.parse(localStorage.getItem('mo_fashion_coupons') || '[]');
    const { deletedAt, trashId, _id, ...restoredCoupon } = coupon;
    const cleanCoupon = { ...restoredCoupon, id: cpId, _id: cpId };

    const cleanActive = activeCoupons.filter((c: any) => String(c.id || c._id) !== cpId);
    const newActiveList = [cleanCoupon, ...cleanActive];
    localStorage.setItem('mo_fashion_coupons', JSON.stringify(newActiveList));

    try {
      await saveSupabaseCoupon(cleanCoupon);
      if (trashId) await permanentDeleteFromRecycleBin(trashId, cpId, 'coupons');

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('couponUpdated'));

      toast.success(`Coupon "${cpCode}" restored LIVE! 🎉`);
    } catch (e) {
      toast.success(`Coupon "${cpCode}" restored successfully! 🎉`);
    }
  };

  const handlePermanentDeleteCoupon = async (coupon: any) => {
    const cpId = String(coupon.id || coupon._id);
    const cpCode = coupon.code || 'Coupon';

    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete coupon "${cpCode}"? This action cannot be undone!`)) {
      const updatedBin = deletedCoupons.filter(c => String(c.id || c._id) !== cpId);
      setDeletedCoupons(updatedBin);
      localStorage.setItem('mo_fashion_recycle_bin_coupons', JSON.stringify(updatedBin));

      await permanentDeleteFromRecycleBin(coupon.trashId || cpId, cpId, 'coupons');

      toast.success(`Coupon "${cpCode}" permanently deleted from database.`);
    }
  };

  // 🚀 EMPTY BIN LOGIC
  const handleEmptyBin = async () => {
    if (window.confirm(`Are you sure you want to permanently delete ALL items in the ${activeTab} recycle bin?`)) {
      if (activeTab === 'categories') {
        for (const item of deletedCategories) {
          await permanentDeleteFromRecycleBin(item.trashId || item.id, String(item.id || item._id), 'categories');
        }
        setDeletedCategories([]);
        localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify([]));
      } else if (activeTab === 'products') {
        for (const item of deletedProducts) {
          await permanentDeleteFromRecycleBin(item.trashId || item.id, String(item.id || item._id), 'products');
        }
        setDeletedProducts([]);
        localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify([]));
      } else if (activeTab === 'orders') {
        for (const item of deletedOrders) {
          await permanentDeleteFromRecycleBin(item.trashId || item.id, String(item.id || item._id || item.orderId), 'orders');
        }
        setDeletedOrders([]);
        localStorage.setItem('mo_fashion_recycle_bin_orders', JSON.stringify([]));
      } else if (activeTab === 'customers') {
        for (const item of deletedCustomers) {
          await permanentDeleteFromRecycleBin(item.trashId || item.id, String(item.id || item._id), 'customers');
        }
        setDeletedCustomers([]);
        localStorage.setItem('mo_fashion_recycle_bin_customers', JSON.stringify([]));
      } else if (activeTab === 'coupons') {
        for (const item of deletedCoupons) {
          await permanentDeleteFromRecycleBin(item.trashId || item.id, String(item.id || item._id), 'coupons');
        }
        setDeletedCoupons([]);
        localStorage.setItem('mo_fashion_recycle_bin_coupons', JSON.stringify([]));
      }

      toast.success(`${activeTab.toUpperCase()} recycle bin emptied permanently!`);
    }
  };

  const currentTabCount = 
    activeTab === 'categories' ? deletedCategories.length :
    activeTab === 'products' ? deletedProducts.length :
    activeTab === 'orders' ? deletedOrders.length :
    activeTab === 'customers' ? deletedCustomers.length :
    deletedCoupons.length;

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet>
        <title>Admin - Recycle Bin | MO FASHION</title>
      </Helmet>

      {/* 🌟 3D GLASSMORPHIC HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-3xl border border-[#D4AF37]/30 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/50 glass-3d-panel">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center gold-text-glow">
              <ArchiveX className="mr-3 text-[#D4AF37] animate-bounce" size={28} />
              Recycle Bin
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30 flex items-center">
              Soft Delete Protection
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 font-light">Restore deleted items or permanently remove them from Cloud DB.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchTrashData}
            className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 shadow-md"
            title="Refresh Recycle Bin"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={handleEmptyBin}
            disabled={currentTabCount === 0}
            className="bg-red-500/10 text-red-500 border border-red-500/30 px-5 py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-red-500/10 text-xs uppercase tracking-wider"
          >
            <Trash2 size={18} />
            <span>Empty Bin</span>
          </button>
        </div>
      </div>

      {/* 🏷️ Animated Navigation Tabs (5 Modules) */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 border-b border-gray-800 pb-2">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-3.5 font-bold tracking-wide text-xs uppercase transition-all duration-200 flex items-center relative ${
            activeTab === 'categories' ? 'text-[#D4AF37] gold-text-glow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Layers size={16} className="mr-1.5" />
          <span>Categories ({deletedCategories.length})</span>
          {activeTab === 'categories' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] animate-in fade-in duration-300"></div>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-3.5 font-bold tracking-wide text-xs uppercase transition-all duration-200 flex items-center relative ${
            activeTab === 'products' ? 'text-[#D4AF37] gold-text-glow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Package size={16} className="mr-1.5" />
          <span>Products ({deletedProducts.length})</span>
          {activeTab === 'products' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] animate-in fade-in duration-300"></div>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-3.5 font-bold tracking-wide text-xs uppercase transition-all duration-200 flex items-center relative ${
            activeTab === 'orders' ? 'text-[#D4AF37] gold-text-glow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <ShoppingCart size={16} className="mr-1.5" />
          <span>Orders ({deletedOrders.length})</span>
          {activeTab === 'orders' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] animate-in fade-in duration-300"></div>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('customers')}
          className={`pb-3 px-3.5 font-bold tracking-wide text-xs uppercase transition-all duration-200 flex items-center relative ${
            activeTab === 'customers' ? 'text-[#D4AF37] gold-text-glow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <User size={16} className="mr-1.5" />
          <span>Customers ({deletedCustomers.length})</span>
          {activeTab === 'customers' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] animate-in fade-in duration-300"></div>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('coupons')}
          className={`pb-3 px-3.5 font-bold tracking-wide text-xs uppercase transition-all duration-200 flex items-center relative ${
            activeTab === 'coupons' ? 'text-[#D4AF37] gold-text-glow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Ticket size={16} className="mr-1.5" />
          <span>Coupons ({deletedCoupons.length})</span>
          {activeTab === 'coupons' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] animate-in fade-in duration-300"></div>
          )}
        </button>
      </div>

      {/* ⚠️ 3D Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-start space-x-3 mb-6 shadow-md transition-all glass-3d-panel">
        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5 animate-pulse" size={20} />
        <p className="text-xs sm:text-sm text-yellow-500/90 leading-relaxed font-light">
          Items in the recycle bin will remain here until you restore them or permanently delete them. Permanent deletion cannot be reversed!
        </p>
      </div>

      {/* 📦 1. Categories Content */}
      {activeTab === 'categories' && (
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300 glass-3d-panel">
          <div className="overflow-x-auto custom-scrollbar">
            {loading && deletedCategories.length === 0 ? (
              <div className="text-center py-16 text-[#D4AF37] animate-pulse flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
                <p className="font-medium">Loading Recycle Bin...</p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Category Info</th>
                    <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Deleted At</th>
                    <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {deletedCategories.map((category) => (
                    <tr key={category.id || category._id} className="hover:bg-[#111111] transition-all duration-200 group opacity-90 hover:opacity-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <Layers size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-white line-through decoration-gray-500 group-hover:text-[#D4AF37] transition-colors">{category.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px] font-light">{category.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800 font-medium">
                          {category.deletedAt || 'Recent'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleRestoreCategory(category)}
                            className="flex items-center space-x-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all duration-200 rounded-xl font-bold text-xs active:scale-95 shadow-sm"
                            title="Restore Category"
                          >
                            <RefreshCcw size={14} />
                            <span>1-Click Restore</span>
                          </button>
                          
                          <button 
                            onClick={() => handlePermanentDeleteCategory(category)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-red-500/50 active:scale-95"
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {deletedCategories.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <ArchiveX size={48} className="text-gray-600 opacity-40 animate-pulse" />
                          <p className="text-base font-semibold text-gray-400">Recycle Bin is empty.</p>
                          <p className="text-xs text-gray-600">No deleted categories found in trash.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 📦 2. Products Content */}
      {activeTab === 'products' && (
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300 glass-3d-panel">
          <div className="overflow-x-auto custom-scrollbar">
            {loading && deletedProducts.length === 0 ? (
              <div className="text-center py-16 text-[#D4AF37] animate-pulse flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
                <p className="font-medium">Loading Recycle Bin...</p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Product Info</th>
                    <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Category & Price</th>
                    <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Deleted At</th>
                    <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {deletedProducts.map((product) => (
                    <tr key={product.id || product._id} className="hover:bg-[#111111] transition-all duration-200 group opacity-90 hover:opacity-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {product.images && product.images[0] && !product.images[0].includes('via.placeholder') ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" />
                            ) : (
                              <ImageIcon size={20} className="text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white line-through decoration-gray-500 truncate max-w-[200px] group-hover:text-[#D4AF37] transition-colors">{product.name}</p>
                            <p className="text-xs text-gray-500 font-light">ID: ...{String(product.id || product._id).slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-300 text-xs font-light">{product.category}</p>
                        <p className="text-[#D4AF37] font-bold text-sm gold-text-glow">৳{Number(product.price || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800 font-medium">
                          {product.deletedAt || 'Recent'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleRestoreProduct(product)}
                            className="flex items-center space-x-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all duration-200 rounded-xl font-bold text-xs active:scale-95 shadow-sm"
                            title="Restore Product"
                          >
                            <RefreshCcw size={14} />
                            <span>1-Click Restore</span>
                          </button>
                          
                          <button 
                            onClick={() => handlePermanentDeleteProduct(product)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-red-500/50 active:scale-95"
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {deletedProducts.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <ArchiveX size={48} className="text-gray-600 opacity-40 animate-pulse" />
                          <p className="text-base font-semibold text-gray-400">Recycle Bin is empty.</p>
                          <p className="text-xs text-gray-600">No deleted products found in trash.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 📦 3. Orders Content */}
      {activeTab === 'orders' && (
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300 glass-3d-panel">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Order ID & Customer</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Amount</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Deleted At</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {deletedOrders.map((order) => {
                  const oId = String(order.id || order._id || order.orderId || '');
                  const custName = order.customer || order.customerInfo?.firstName || 'Customer';
                  const total = order.total || order.orderSummary?.total || 0;

                  return (
                    <tr key={oId} className="hover:bg-[#111111] transition-all duration-200 group opacity-90 hover:opacity-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <ShoppingCart size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-[#D4AF37] line-through uppercase text-xs font-mono">#ORD-{oId.slice(-6)}</p>
                            <p className="text-xs text-gray-300 font-medium">{custName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#D4AF37] text-sm gold-text-glow">
                        ৳{Number(total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800 font-medium">
                          {order.deletedAt || 'Recent'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleRestoreOrder(order)}
                            className="flex items-center space-x-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all duration-200 rounded-xl font-bold text-xs active:scale-95 shadow-sm"
                            title="Restore Order"
                          >
                            <RefreshCcw size={14} />
                            <span>1-Click Restore</span>
                          </button>
                          
                          <button 
                            onClick={() => handlePermanentDeleteOrder(order)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-red-500/50 active:scale-95"
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {deletedOrders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <ArchiveX size={48} className="text-gray-600 opacity-40 animate-pulse" />
                        <p className="text-base font-semibold text-gray-400">Recycle Bin is empty.</p>
                        <p className="text-xs text-gray-600">No deleted orders found in trash.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📦 4. Customers Content */}
      {activeTab === 'customers' && (
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300 glass-3d-panel">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Customer Name</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Contact Info</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Deleted At</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {deletedCustomers.map((cust) => (
                  <tr key={cust.id || cust._id} className="hover:bg-[#111111] transition-all duration-200 group opacity-90 hover:opacity-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold group-hover:scale-110 transition-transform duration-300 shadow-sm">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-white line-through decoration-gray-500 group-hover:text-[#D4AF37] transition-colors">{cust.name}</p>
                          <p className="text-xs text-gray-500 font-light">Status: {cust.status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-300">
                      <p>{cust.email || 'N/A'}</p>
                      <p className="text-gray-500">{cust.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800 font-medium">
                        {cust.deletedAt || 'Recent'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleRestoreCustomer(cust)}
                          className="flex items-center space-x-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all duration-200 rounded-xl font-bold text-xs active:scale-95 shadow-sm"
                          title="Restore Customer"
                        >
                          <RefreshCcw size={14} />
                          <span>1-Click Restore</span>
                        </button>
                        
                        <button 
                          onClick={() => handlePermanentDeleteCustomer(cust)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-red-500/50 active:scale-95"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {deletedCustomers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <ArchiveX size={48} className="text-gray-600 opacity-40 animate-pulse" />
                        <p className="text-base font-semibold text-gray-400">Recycle Bin is empty.</p>
                        <p className="text-xs text-gray-600">No deleted customers found in trash.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📦 5. Coupons Content */}
      {activeTab === 'coupons' && (
        <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300 glass-3d-panel">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Coupon Code</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Discount Value</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Deleted At</th>
                  <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {deletedCoupons.map((coupon) => (
                  <tr key={coupon.id || coupon._id} className="hover:bg-[#111111] transition-all duration-200 group opacity-90 hover:opacity-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                          <Ticket size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-[#D4AF37] line-through uppercase tracking-widest text-sm gold-text-glow">{coupon.code}</p>
                          <p className="text-xs text-gray-500 font-light">Limit: {coupon.usageLimit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white text-sm">
                      {coupon.type === 'percentage' ? `${coupon.discountValue}% OFF` : `৳${coupon.discountValue} OFF`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800 font-medium">
                        {coupon.deletedAt || 'Recent'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleRestoreCoupon(coupon)}
                          className="flex items-center space-x-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all duration-200 rounded-xl font-bold text-xs active:scale-95 shadow-sm"
                          title="Restore Coupon"
                        >
                          <RefreshCcw size={14} />
                          <span>1-Click Restore</span>
                        </button>
                        
                        <button 
                          onClick={() => handlePermanentDeleteCoupon(coupon)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-red-500/50 active:scale-95"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {deletedCoupons.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <ArchiveX size={48} className="text-gray-600 opacity-40 animate-pulse" />
                        <p className="text-base font-semibold text-gray-400">Recycle Bin is empty.</p>
                        <p className="text-xs text-gray-600">No deleted coupons found in trash.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
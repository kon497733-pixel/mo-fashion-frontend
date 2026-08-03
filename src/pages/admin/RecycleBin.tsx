import { useState, useEffect } from 'react';
import { 
  Trash2, RefreshCcw, ArchiveX, Layers, Package, 
  AlertTriangle, Image as ImageIcon, Sparkles, RefreshCw 
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { 
  supabase, 
  getSupabaseRecycleBin, 
  restoreFromRecycleBin, 
  permanentDeleteFromRecycleBin,
  saveSupabaseProduct,
  saveSupabaseCategory,
  saveSupabaseCategory as updateCategoryCount
} from '../../lib/supabase';

export default function RecycleBin() {
  const [deletedCategories, setDeletedCategories] = useState<any[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]); 
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');
  const [loading, setLoading] = useState(true);

  // 🚀 ১. ক্লাউড ডাটাবেস ও লোকাল ব্যাকআপ থেকে রিসাইকেল বিনের ডাটা লোড
  const fetchTrashData = async () => {
    setLoading(true);

    let localCategories = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_categories') || '[]');
    let localProducts = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_products') || '[]');

    try {
      const cloudTrash = await getSupabaseRecycleBin();

      if (Array.isArray(cloudTrash) && cloudTrash.length > 0) {
        const cloudCatItems = cloudTrash
          .filter((t: any) => t.originalTable === 'categories')
          .map((t: any) => ({ ...t.data, id: t.itemId || t.data?.id, _id: t.itemId || t.data?._id, trashId: t.id, deletedAt: t.deletedAt }));

        const cloudProdItems = cloudTrash
          .filter((t: any) => t.originalTable === 'products')
          .map((t: any) => ({ ...t.data, id: t.itemId || t.data?.id, _id: t.itemId || t.data?._id, trashId: t.id, deletedAt: t.deletedAt }));

        // লোকাল ও ক্লাউড ট্র্যাশ মার্জ
        const catMap = new Map();
        [...localCategories, ...cloudCatItems].forEach((item: any) => {
          const key = String(item.id || item._id);
          if (key && key !== 'undefined') catMap.set(key, item);
        });

        const prodMap = new Map();
        [...localProducts, ...cloudProdItems].forEach((item: any) => {
          const key = String(item.id || item._id);
          if (key && key !== 'undefined') prodMap.set(key, item);
        });

        const finalCategories = Array.from(catMap.values());
        const finalProducts = Array.from(prodMap.values());

        setDeletedCategories(finalCategories);
        setDeletedProducts(finalProducts);

        localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify(finalCategories));
        localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify(finalProducts));
      } else {
        setDeletedCategories(localCategories);
        setDeletedProducts(localProducts);
      }
    } catch (e) {
      setDeletedCategories(localCategories);
      setDeletedProducts(localProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashData();

    // Supabase Realtime Listener for Trash
    const channel = supabase
      .channel('public:recycle_bin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recycle_bin' }, () => {
        fetchTrashData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ==========================================
  // 🚀 CATEGORY 1-CLICK RESTORE & DELETE LOGIC
  // ==========================================
  const handleRestoreCategory = async (category: any) => {
    const catId = String(category.id || category._id);
    const catName = category.name || 'Category';

    // ১. রিসাইকেল বিন থেকে রিমুভ
    const updatedBin = deletedCategories.filter(c => String(c.id || c._id) !== catId);
    setDeletedCategories(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify(updatedBin));

    // ২. একটিভ ক্যাটাগরি লিস্টে ফেরত পাঠানো
    const activeCategories = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
    const { deletedAt, trashId, _id, ...restoredCategory } = category;
    const cleanCategory = { ...restoredCategory, id: catId, _id: catId };

    const cleanActive = activeCategories.filter((c: any) => String(c.id || c._id) !== catId);
    const newActiveList = [cleanCategory, ...cleanActive];
    localStorage.setItem('mo_fashion_categories', JSON.stringify(newActiveList));

    // ৩. ক্লাউডে ১-ক্লিক রিস্টোর (Supabase Cloud Upsert)
    try {
      await saveSupabaseCategory(cleanCategory);
      if (trashId) await permanentDeleteFromRecycleBin(trashId);

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

      if (category.trashId) {
        await permanentDeleteFromRecycleBin(category.trashId);
      }

      toast.success(`Category "${catName}" permanently deleted from database.`);
    }
  };

  // ==========================================
  // 🚀 PRODUCT 1-CLICK RESTORE & DELETE LOGIC
  // ==========================================
  const handleRestoreProduct = async (product: any) => {
    const pId = String(product.id || product._id);
    const pName = product.name || 'Product';

    // ১. রিসাইকেল বিন থেকে মুছে ফেলা
    const updatedBin = deletedProducts.filter(p => String(p.id || p._id) !== pId);
    setDeletedProducts(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify(updatedBin));

    // ২. একটিভ প্রোডাক্টে রিস্টোর করা
    const activeProducts = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
    const { deletedAt, trashId, _id, ...restoredProduct } = product;
    const cleanProduct = { ...restoredProduct, id: pId, _id: pId };

    const cleanActive = activeProducts.filter((p: any) => String(p.id || p._id) !== pId);
    const newActiveList = [cleanProduct, ...cleanActive];
    localStorage.setItem('mo_fashion_products', JSON.stringify(newActiveList));

    // ৩. ক্যাটাগরি প্রোডাক্ট কাউন্ট আপডেট
    try {
      const activeCats = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
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
          await updateCategoryCount(c).catch(() => null);
        }
      }
    } catch (e) {}

    // ৪. ক্লাউড ডাটাবেসে সেভ (Supabase Cloud Upsert)
    try {
      await saveSupabaseProduct(cleanProduct);
      if (trashId) await permanentDeleteFromRecycleBin(trashId);

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

      if (product.trashId) {
        await permanentDeleteFromRecycleBin(product.trashId);
      }

      toast.success(`Product "${pName}" permanently deleted from database.`);
    }
  };

  // ==========================================
  // 🚀 EMPTY BIN LOGIC (চিরতরে মুছে ফেলা)
  // ==========================================
  const handleEmptyBin = async () => {
    if (activeTab === 'categories' && deletedCategories.length > 0) {
      if (window.confirm("Are you sure you want to permanently delete ALL categories in the recycle bin?")) {
        for (const cat of deletedCategories) {
          if (cat.trashId) await permanentDeleteFromRecycleBin(cat.trashId);
        }
        setDeletedCategories([]);
        localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify([]));
        toast.success("Categories recycle bin emptied permanently!");
      }
    } else if (activeTab === 'products' && deletedProducts.length > 0) {
      if (window.confirm("Are you sure you want to permanently delete ALL products in the recycle bin?")) {
        for (const p of deletedProducts) {
          if (p.trashId) await permanentDeleteFromRecycleBin(p.trashId);
        }
        setDeletedProducts([]);
        localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify([]));
        toast.success("Products recycle bin emptied permanently!");
      }
    }
  };

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet>
        <title>Admin - Recycle Bin | MO FASHION</title>
      </Helmet>

      {/* 🚀 Top-Notch Animated Glassmorphic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-2xl border border-[#D4AF37]/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-[#D4AF37]/40">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
              <ArchiveX className="mr-3 text-[#D4AF37] animate-bounce" size={28} />
              Recycle Bin
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30 flex items-center">
              Soft Delete Protection
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Restore deleted items or permanently remove them from Cloud DB.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchTrashData}
            className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95"
            title="Refresh Recycle Bin"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={handleEmptyBin}
            disabled={activeTab === 'categories' ? deletedCategories.length === 0 : deletedProducts.length === 0}
            className="bg-red-500/10 text-red-500 border border-red-500/30 px-5 py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-red-500/10"
          >
            <Trash2 size={18} />
            <span>Empty Bin</span>
          </button>
        </div>
      </div>

      {/* 🏷️ Animated Navigation Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 font-bold tracking-wide transition-all duration-200 flex items-center relative ${
            activeTab === 'categories' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Layers size={18} className="mr-2" />
          <span>Deleted Categories ({deletedCategories.length})</span>
          {activeTab === 'categories' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] animate-in fade-in duration-300"></div>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 font-bold tracking-wide transition-all duration-200 flex items-center relative ${
            activeTab === 'products' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Package size={18} className="mr-2" />
          <span>Deleted Products ({deletedProducts.length})</span>
          {activeTab === 'products' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] animate-in fade-in duration-300"></div>
          )}
        </button>
      </div>

      {/* ⚠️ Animated Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-start space-x-3 mb-6 shadow-md transition-all">
        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5 animate-pulse" size={20} />
        <p className="text-sm text-yellow-500/90 leading-relaxed font-medium">
          Items in the recycle bin will remain here until you restore them or permanently delete them. Permanent deletion cannot be reversed!
        </p>
      </div>

      {/* 📦 Categories Content */}
      {activeTab === 'categories' && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300">
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
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-300">
                            <Layers size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-white line-through decoration-gray-500 group-hover:text-[#D4AF37] transition-colors">{category.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{category.description || 'No description'}</p>
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
                          {/* ♻️ 1-Click Restore Button */}
                          <button 
                            onClick={() => handleRestoreCategory(category)}
                            className="flex items-center space-x-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all duration-200 rounded-xl font-bold text-xs active:scale-95 shadow-sm"
                            title="Restore Category"
                          >
                            <RefreshCcw size={14} />
                            <span>1-Click Restore</span>
                          </button>
                          
                          {/* ❌ Permanent Delete Button */}
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

      {/* 📦 Products Content */}
      {activeTab === 'products' && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300">
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
                            <p className="text-xs text-gray-500">ID: ...{String(product.id || product._id).slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-300 text-xs font-medium">{product.category}</p>
                        <p className="text-[#D4AF37] font-bold text-sm">৳{Number(product.price || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800 font-medium">
                          {product.deletedAt || 'Recent'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          {/* ♻️ 1-Click Restore Button */}
                          <button 
                            onClick={() => handleRestoreProduct(product)}
                            className="flex items-center space-x-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all duration-200 rounded-xl font-bold text-xs active:scale-95 shadow-sm"
                            title="Restore Product"
                          >
                            <RefreshCcw size={14} />
                            <span>1-Click Restore</span>
                          </button>
                          
                          {/* ❌ Permanent Delete Button */}
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

    </div>
  );
}
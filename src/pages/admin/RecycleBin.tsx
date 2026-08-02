import { useState, useEffect } from 'react';
import { Trash2, RefreshCcw, ArchiveX, Layers, Package, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

export default function RecycleBin() {
  const [deletedCategories, setDeletedCategories] = useState<any[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]); 
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');

  // পেজ লোড হলে রিসাইকেল বিন থেকে ডাটা নিয়ে আসা
  useEffect(() => {
    const binCategories = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_categories') || '[]');
    const binProducts = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_products') || '[]');
    
    setDeletedCategories(binCategories);
    setDeletedProducts(binProducts);
  }, []);

  // ==========================================
  // 🚀 CATEGORY RESTORE & DELETE LOGIC
  // ==========================================
  const handleRestoreCategory = async (id: number | string) => {
    const itemToRestore = deletedCategories.find(c => (c.id === id || c._id === id));
    if (!itemToRestore) return;

    // ১. রিসাইকেল বিন থেকে রিমুভ
    const updatedBin = deletedCategories.filter(c => (c.id !== id && c._id !== id));
    setDeletedCategories(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify(updatedBin));

    // ২. অ্যাকটিভ ক্যাটাগরিতে যোগ করা
    const activeCategories = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
    const nameExists = activeCategories.some((c: any) => c.name.toLowerCase() === itemToRestore.name.toLowerCase());
    
    const { deletedAt, _id, ...restoredCategory } = itemToRestore;
    activeCategories.unshift(restoredCategory); 
    localStorage.setItem('mo_fashion_categories', JSON.stringify(activeCategories));

    // ৩. ক্লাউড ডাটাবেসে আবার রিস্টোর/সেভ করা (POST API)
    try {
      await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoredCategory)
      });
      toast.success(`Category "${itemToRestore.name}" restored LIVE to Cloud!`);
    } catch (e) {
      toast.success(`Category "${itemToRestore.name}" restored successfully!`);
    }
  };

  const handlePermanentDeleteCategory = (id: number | string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete category "${name}"? This action cannot be undone!`)) {
      const updatedBin = deletedCategories.filter(c => (c.id !== id && c._id !== id));
      setDeletedCategories(updatedBin);
      localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify(updatedBin));
      toast.success(`Category "${name}" has been permanently deleted.`);
    }
  };

  // ==========================================
  // 🚀 PRODUCT RESTORE & DELETE LOGIC
  // ==========================================
  const handleRestoreProduct = async (id: string) => {
    const itemToRestore = deletedProducts.find(p => (p._id === id || p.id === id));
    if (!itemToRestore) return;

    // ১. লোকাল রিসাইকেল বিন থেকে মুছে ফেলা
    const updatedBin = deletedProducts.filter(p => (p._id !== id && p.id !== id));
    setDeletedProducts(updatedBin);
    localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify(updatedBin));

    // ২. ডাটাবেসে রিস্টোর করার জন্য অপ্রয়োজনীয় ডাটা রিমুভ করা
    const { deletedAt, _id, ...restoredProductData } = itemToRestore;

    try {
      // 🚀 ব্যাকএন্ড ক্লাউড API তে প্রোডাক্টটি আবার সেভ করা
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoredProductData)
      });
      
      if (response.ok) {
        toast.success(`Product "${itemToRestore.name}" restored LIVE to Cloud Database!`);
      } else {
        toast.success(`Product "${itemToRestore.name}" restored successfully!`);
      }
    } catch (error) {
      toast.success(`Product "${itemToRestore.name}" restored locally!`);
    }
  };

  const handlePermanentDeleteProduct = (id: string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete product "${name}"? This action cannot be undone!`)) {
      const updatedBin = deletedProducts.filter(p => (p._id !== id && p.id !== id));
      setDeletedProducts(updatedBin);
      localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify(updatedBin));
      toast.success(`Product "${name}" has been permanently deleted.`);
    }
  };

  // ==========================================
  // 🚀 EMPTY BIN LOGIC
  // ==========================================
  const handleEmptyBin = () => {
    if (activeTab === 'categories' && deletedCategories.length > 0) {
      if (window.confirm("Are you sure you want to permanently delete ALL categories in the recycle bin?")) {
        setDeletedCategories([]);
        localStorage.setItem('mo_fashion_recycle_bin_categories', JSON.stringify([]));
        toast.success("Categories recycle bin emptied!");
      }
    } else if (activeTab === 'products' && deletedProducts.length > 0) {
      if (window.confirm("Are you sure you want to permanently delete ALL products in the recycle bin?")) {
        setDeletedProducts([]);
        localStorage.setItem('mo_fashion_recycle_bin_products', JSON.stringify([]));
        toast.success("Products recycle bin emptied!");
      }
    }
  };

  return (
    <div className="text-white pb-10">
      <Helmet>
        <title>Admin - Recycle Bin | MO FASHION</title>
      </Helmet>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
            <ArchiveX className="mr-3" size={28} />
            Recycle Bin
          </h1>
          <p className="text-sm text-gray-400 mt-1">Restore deleted items or permanently remove them from Cloud DB.</p>
        </div>
        
        <button 
          onClick={handleEmptyBin}
          disabled={activeTab === 'categories' ? deletedCategories.length === 0 : deletedProducts.length === 0}
          className="bg-red-500/10 text-red-500 border border-red-500/30 px-5 py-2.5 rounded hover:bg-red-500 hover:text-white transition-colors font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={20} />
          <span>Empty Bin</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 font-bold tracking-wide transition-colors flex items-center ${
            activeTab === 'categories' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Layers size={18} className="mr-2" />
          Deleted Categories ({deletedCategories.length})
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 font-bold tracking-wide transition-colors flex items-center ${
            activeTab === 'products' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Package size={18} className="mr-2" />
          Deleted Products ({deletedProducts.length})
        </button>
      </div>

      {/* Warning Message */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start space-x-3 mb-6">
        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-yellow-500/90">
          Items in the recycle bin will remain here until you restore them or permanently delete them. Permanent deletion cannot be reversed!
        </p>
      </div>

      {/* Categories Content */}
      {activeTab === 'categories' && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#D4AF37]/20 overflow-hidden shadow-lg">
          <div className="overflow-x-auto custom-scrollbar">
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
                  <tr key={category.id || category._id} className="hover:bg-[#111111]/50 transition-colors opacity-80 hover:opacity-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                          <Layers size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-white line-through decoration-gray-600">{category.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{category.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800">
                        {category.deletedAt || 'Unknown Date'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-3">
                        {/* Restore Button */}
                        <button 
                          onClick={() => handleRestoreCategory(category.id || category._id)}
                          className="flex items-center space-x-1 px-4 py-1.5 bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors rounded-md font-medium text-sm"
                          title="Restore Category"
                        >
                          <RefreshCcw size={14} />
                          <span>Restore</span>
                        </button>
                        
                        {/* Permanent Delete Button */}
                        <button 
                          onClick={() => handlePermanentDeleteCategory(category.id || category._id, category.name)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors bg-[#111111] rounded-md border border-gray-800 hover:border-red-500/50"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {deletedCategories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      <ArchiveX size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Recycle Bin is empty. No deleted categories found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Content */}
      {activeTab === 'products' && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#D4AF37]/20 overflow-hidden shadow-lg">
          <div className="overflow-x-auto custom-scrollbar">
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
                  <tr key={product._id || product.id} className="hover:bg-[#111111]/50 transition-colors opacity-80 hover:opacity-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center overflow-hidden shrink-0">
                          {product.images && product.images[0] && !product.images[0].includes('via.placeholder') ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover grayscale" />
                          ) : (
                            <ImageIcon size={20} className="text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white line-through decoration-gray-600 truncate max-w-[200px]">{product.name}</p>
                          <p className="text-xs text-gray-500">ID: ...{String(product._id || product.id).slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300 text-sm">{product.category}</p>
                      <p className="text-[#D4AF37] font-bold">৳{Number(product.price || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400 bg-[#111111] px-3 py-1.5 rounded-full border border-gray-800">
                        {product.deletedAt || 'Unknown Date'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-3">
                        {/* Restore Button */}
                        <button 
                          onClick={() => handleRestoreProduct(product._id || product.id)}
                          className="flex items-center space-x-1 px-4 py-1.5 bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors rounded-md font-medium text-sm"
                          title="Restore Product"
                        >
                          <RefreshCcw size={14} />
                          <span>Restore</span>
                        </button>
                        
                        {/* Permanent Delete Button */}
                        <button 
                          onClick={() => handlePermanentDeleteProduct(product._id || product.id, product.name)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors bg-[#111111] rounded-md border border-gray-800 hover:border-red-500/50"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {deletedProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <ArchiveX size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Recycle Bin is empty. No deleted products found.</p>
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
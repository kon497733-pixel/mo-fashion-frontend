import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Package, 
  Image as ImageIcon, Percent, Upload, Box, ListPlus, Sparkles, RefreshCw
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { notifyProductChange } from '../../services/emailService'; 
import { 
  supabase, 
  getSupabaseProducts, 
  saveSupabaseProduct, 
  deleteSupabaseProduct,
  moveToRecycleBin,
  saveSupabaseCategory,
  getSupabaseCategories
} from '../../lib/supabase';

export default function Products() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadIndex, setUploadIndex] = useState<number | null>(null);

  // 🚀 ১. পুরনো স্যাম্পল/ডামি প্রোডাক্ট অটোমেটিক মুছে ফেলার ফিল্টার
  const sanitizeProducts = (productList: any[]) => {
    if (!Array.isArray(productList)) return [];
    return productList.filter((p: any) => {
      if (!p || !p.name) return false;
      const nameLower = String(p.name).toLowerCase();
      const isOldDummy = nameLower.includes('premium gold t-shirt') || 
                          nameLower.includes('black signature hoodie') || 
                          nameLower.includes('classic denim jacket') || 
                          nameLower.includes('luxury golden watch') ||
                          nameLower.includes('premium signature t-shirt') ||
                          nameLower.includes('dummy sample');
      return !isOldDummy;
    });
  };

  const [products, setProducts] = useState<any[]>(() => {
    const saved = localStorage.getItem('mo_fashion_products');
    if (saved) {
      try {
        return sanitizeProducts(JSON.parse(saved));
      } catch (e) {
        return [];
      }
    }
    return []; 
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  // 🚀 ফর্মে variants এর জন্য স্টেট
  const [formData, setFormData] = useState({
    _id: '', id: '', name: '', description: '', category: '',
    price: '', discount: '0', stock: '', status: 'Active', images: [''],
    variants: [] as { name: string, options: string }[]
  });

  // 🚀 ক্যাটাগরির প্রোডাক্ট সংখ্যা (Count) ক্লাউড ডাটাবেস ও লোকালস্টোরেজে রিয়েল-টাইম আপডেট করার ফাংশন
  const updateCategoryProductCounts = async (currentProductsList: any[]) => {
    try {
      const activeCategories = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
      if (Array.isArray(activeCategories) && activeCategories.length > 0) {
        const updatedCategories = activeCategories.map((cat: any) => {
          const count = currentProductsList.filter((p: any) => 
            p && p.category && cat.name && 
            (String(p.category).trim().toLowerCase() === String(cat.name).trim().toLowerCase() ||
             String(p.category).trim().toLowerCase().includes(String(cat.name).trim().toLowerCase()))
          ).length;
          return { ...cat, count };
        });

        localStorage.setItem('mo_fashion_categories', JSON.stringify(updatedCategories));

        for (const cat of updatedCategories) {
          await saveSupabaseCategory(cat).catch(() => null);
        }

        window.dispatchEvent(new Event('categoryUpdated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.warn("Failed to update category product count:", err);
    }
  };

  // 🚀 ২. ক্যাটাগরি ও প্রোডাক্ট লাইভ ডাটা ফেচিং
  const loadCategoriesList = async () => {
    try {
      const cloudCats = await getSupabaseCategories();
      if (Array.isArray(cloudCats) && cloudCats.length > 0) {
        setCategories(cloudCats);
        localStorage.setItem('mo_fashion_categories', JSON.stringify(cloudCats));
      } else {
        const savedCats = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
        if (savedCats.length > 0) setCategories(savedCats);
      }
    } catch (e) {
      const savedCats = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
      if (savedCats.length > 0) setCategories(savedCats);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);

    let localList: any[] = [];
    const savedLocal = localStorage.getItem('mo_fashion_products');
    if (savedLocal) {
      try {
        localList = sanitizeProducts(JSON.parse(savedLocal));
      } catch (e) {}
    }

    try {
      const cloudData = await getSupabaseProducts();
      
      if (Array.isArray(cloudData)) {
        const cleanCloud = sanitizeProducts(cloudData);

        const mergedMap = new Map();
        [...localList, ...cleanCloud].forEach((item: any) => {
          const key = String(item.id || item._id);
          if (key && key !== 'undefined' && key !== 'null') {
            mergedMap.set(key, { ...mergedMap.get(key), ...item });
          }
        });

        const finalMergedList = Array.from(mergedMap.values());
        setProducts(finalMergedList);
        localStorage.setItem('mo_fashion_products', JSON.stringify(finalMergedList));
        updateCategoryProductCounts(finalMergedList);
      } else {
        setProducts(localList);
        updateCategoryProductCounts(localList);
      }
    } catch (error) {
      setProducts(localList);
      updateCategoryProductCounts(localList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoriesList();
    fetchProducts();

    const channel = supabase
      .channel('public:products:management:5g')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadCategoriesList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    const newId = `PROD-${Date.now()}`;
    const defaultCatName = categories.length > 0 ? categories[0].name : 'Shirt';

    setFormData({ 
      _id: newId, id: newId, name: '', description: '', 
      category: defaultCatName, 
      price: '', discount: '0', stock: '10', status: 'Active', images: [''],
      variants: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    setModalMode('edit');
    const targetId = String(product._id || product.id);
    
    let loadedVariants = product.variants ? product.variants.map((v: any) => ({ 
      name: v.name, 
      options: Array.isArray(v.options) ? v.options.join(', ') : v.options 
    })) : [];
    
    if (loadedVariants.length === 0) {
      if (product.colors && product.colors.length > 0) loadedVariants.push({ name: 'Color', options: Array.isArray(product.colors) ? product.colors.join(', ') : product.colors });
      if (product.sizes && product.sizes.length > 0) loadedVariants.push({ name: 'Size', options: Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes });
    }

    setFormData({
      _id: targetId,
      id: targetId,
      name: product.name || '',
      description: product.description || '', 
      category: product.category || (categories.length > 0 ? categories[0].name : 'Shirt'),
      price: product.price ? product.price.toString() : '',
      discount: (product.discount !== undefined && product.discount !== null) ? product.discount.toString() : '0',
      stock: product.stock !== undefined ? product.stock.toString() : '0',
      status: product.status || 'Active',
      images: product.images && product.images.length > 0 ? [...product.images] : (product.imageUrl ? [product.imageUrl] : ['']),
      variants: loadedVariants
    });
    setIsModalOpen(true);
  };

  // 🚀 হাই-কমপ্রেশন ইমেজ আপলোড
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadIndex !== null) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          const updatedImages = [...formData.images];
          updatedImages[uploadIndex] = compressedBase64;
          setFormData({ ...formData, images: updatedImages });
          toast.success('Image compressed & uploaded successfully!');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const updatedImages = [...formData.images];
    updatedImages[index] = value;
    setFormData({ ...formData, images: updatedImages });
  };
  const addImageField = () => setFormData({ ...formData, images: [...formData.images, ''] });
  const removeImageField = (index: number) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: updatedImages });
  };

  // 🚀 ডাইনামিক ভ্যারিয়েন্ট হ্যান্ডলার
  const addVariantField = () => {
    setFormData({ ...formData, variants: [...formData.variants, { name: '', options: '' }] });
  };
  const removeVariantField = (index: number) => {
    const updatedVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: updatedVariants });
  };
  const handleVariantChange = (index: number, field: 'name' | 'options', value: string) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index][field] = value;
    setFormData({ ...formData, variants: updatedVariants });
  };

  // 🗑️ ডিলিট প্রোডাক্ট
  const handleDelete = async (product: any) => {
    const pId = String(product._id || product.id);
    const pName = product.name || 'Product';

    if (window.confirm(`Are you sure you want to delete "${pName}"?`)) {
      const remaining = products.filter(p => String(p._id || p.id) !== pId);
      setProducts(remaining);
      
      try {
        localStorage.setItem('mo_fashion_products', JSON.stringify(remaining));
      } catch (e) {}

      updateCategoryProductCounts(remaining);

      try {
        await moveToRecycleBin('products', product);
        await deleteSupabaseProduct(pId);
        try { await notifyProductChange('Deleted', pName); } catch(e){}
        
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('productUpdated'));

        toast.success(`"${pName}" moved to Recycle Bin & removed from live store! 🗑️`);
      } catch (e) {
        toast.success("Product removed locally.");
      }
    }
  };

  // 🚀 ৪. সেভ প্রোডাক্ট লজিক
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.price) {
      toast.error("Please enter product name and price!");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving product LIVE to Database...");

    try {
      const validImages = formData.images.filter(url => url && url.trim() !== '');
      const origPrice = Number(formData.price) || 0;
      const discPercent = Number(formData.discount) || 0;

      const formattedVariants = formData.variants
        .filter(v => v.name.trim() !== '' && v.options.trim() !== '')
        .map(v => ({
          name: v.name.trim(),
          options: v.options.split(',').map(opt => opt.trim()).filter(Boolean)
        }));

      const colorVar = formattedVariants.find(v => v.name.toLowerCase() === 'color' || v.name.toLowerCase() === 'colors');
      const sizeVar = formattedVariants.find(v => v.name.toLowerCase() === 'size' || v.name.toLowerCase() === 'sizes');

      const targetId = String(formData._id || formData.id || `PROD-${Date.now()}`);
      const selectedCategoryName = formData.category || (categories.length > 0 ? categories[0].name : 'Shirt');

      const productPayload = {
        id: targetId,
        _id: targetId,
        name: formData.name.trim(),
        description: formData.description?.trim() || 'Premium quality fashion product.',
        price: origPrice,
        discount: discPercent,
        stock: Number(formData.stock) || 0,
        status: Number(formData.stock) <= 0 ? 'Out of Stock' : (formData.status || 'Active'),
        category: selectedCategoryName.trim(),
        images: validImages.length > 0 ? validImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
        imageUrl: validImages.length > 0 ? validImages[0] : '',
        variants: formattedVariants,
        colors: colorVar ? colorVar.options : [], 
        sizes: sizeVar ? sizeVar.options : []     
      };

      setProducts(prevProducts => {
        const filtered = prevProducts.filter(p => String(p.id || p._id) !== targetId);
        return [productPayload, ...filtered];
      });

      try {
        const currentList = sanitizeProducts(JSON.parse(localStorage.getItem('mo_fashion_products') || '[]'));
        const filtered = currentList.filter((p: any) => String(p.id || p._id) !== targetId);
        localStorage.setItem('mo_fashion_products', JSON.stringify([productPayload, ...filtered]));
      } catch (storageErr) {
        console.warn("LocalStorage Quota full, proceeding with cloud save.");
      }

      setIsModalOpen(false);

      await saveSupabaseProduct(productPayload);

      toast.success(`Product "${productPayload.name}" saved LIVE in "${selectedCategoryName}"! 🎉`, { id: toastId });
      try { await notifyProductChange(modalMode === 'add' ? 'Added' : 'Updated', productPayload.name); } catch(e){}

      updateCategoryProductCounts([productPayload, ...products]);

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('productUpdated'));

      fetchProducts();

    } catch (err: any) {
      console.error("Save Exec Error:", err);
      toast.error(`Notice: ${err.message || 'Saved locally'}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter((p: any) => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) && 
    (categoryFilter === '' || p.category === categoryFilter)
  );

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet><title>Admin - Products Management | MO FASHION</title></Helmet>
      
      {/* 🌟 3D GLASSMORPHIC HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-3xl border border-[#D4AF37]/30 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/50 glass-3d-panel">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] uppercase flex items-center tracking-wide gold-text-glow">
              <Package className="mr-3 text-[#D4AF37] animate-bounce" size={28} /> Products Management
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30 flex items-center animate-pulse shadow-sm">
              <Box size={14} className="mr-1.5" /> Total: {products.length} Items
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 font-light">Manage live database inventory, discounts, dynamic variants, and multi-device stock</p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchProducts}
            className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 shadow-md"
            title="Refresh Database"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={handleOpenAdd} 
            className="bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#aa8c2c] text-black px-6 py-2.5 rounded-xl hover:scale-105 font-bold flex items-center space-x-2 shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 active:scale-95 text-xs uppercase tracking-wider"
          >
            <Plus size={20} /> <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 🔎 3D SEARCH & FILTERS */}
      <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#D4AF37]/20 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg transition-all duration-300 glass-3d-panel">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search products by name..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-[#111111] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-all duration-200 text-sm shadow-inner" 
          />
          <Search className="absolute left-3.5 top-3 text-gray-500" size={18} />
        </div>

        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)} 
          className="w-full md:w-64 bg-[#111111] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer transition-colors text-xs font-bold text-[#D4AF37]"
        >
          <option value="" className="bg-[#111111] text-white">All Categories</option>
          {categories.map((cat: any, i: number) => (
            <option key={i} value={cat.name} className="bg-[#111111] text-white">{cat.name}</option>
          ))}
        </select>
      </div>

      {/* 📦 3D ANIMATED PRODUCTS TABLE */}
      <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300 glass-3d-panel">
        <div className="overflow-x-auto custom-scrollbar">
          {loading && products.length === 0 ? (
             <div className="text-center py-20 text-[#D4AF37] animate-pulse flex flex-col items-center justify-center space-y-3">
               <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
               <p className="font-medium">Connecting & Syncing with Supabase Cloud Database...</p>
             </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#111111] border-b border-[#D4AF37]/20 text-xs uppercase font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price & Selling Price</th>
                  <th className="px-6 py-4">Variants</th>
                  <th className="px-6 py-4">Stock Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredProducts.map((p: any) => {
                  const origPrice = Number(p.price) || 0;
                  const discPercent = Number(p.discount) || 0;
                  const sellingPrice = discPercent > 0 ? origPrice - (origPrice * discPercent / 100) : origPrice;
                  const stockVal = Number(p.stock) || 0;

                  let statusColor = 'text-green-400 bg-green-500/10 border-green-500/20';
                  let displayStatus = p.status || 'Active';
                  
                  if (stockVal <= 0 || displayStatus === 'Out of Stock') {
                    statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                    displayStatus = 'Out of Stock';
                  } else if (stockVal <= 5 || displayStatus === 'Low Stock') {
                    statusColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                    displayStatus = 'Low Stock';
                  }

                  const displayImage = p.images && p.images.length > 0 ? p.images[0] : (p.imageUrl || '');
                  const variantCount = p.variants ? p.variants.length : ((p.colors?.length > 0 ? 1 : 0) + (p.sizes?.length > 0 ? 1 : 0));

                  return (
                    <tr key={p._id || p.id || Math.random()} className="hover:bg-[#111111] transition-all duration-200 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-[#111111] border border-[#D4AF37]/30 rounded-xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-md">
                            {displayImage && !displayImage.includes('via.placeholder') ? (
                              <img src={displayImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-[#D4AF37]/50" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white max-w-[180px] truncate block group-hover:text-[#D4AF37] transition-colors" title={p.name}>
                              {p.name}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {p.images?.length || 1} {(p.images?.length || 1) === 1 ? 'Image' : 'Images'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-400 font-light">{p.category}</td>
                      
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#D4AF37] text-base gold-text-glow">
                          ৳{sellingPrice.toFixed(2)}
                        </div>
                        {discPercent > 0 ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500 line-through">
                              ৳{origPrice.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-red-400 font-extrabold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                              -{discPercent}% OFF
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500 block">Regular Price</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-400">
                          <span className="bg-gray-800/80 text-gray-200 px-2.5 py-1 rounded-md border border-gray-700 font-bold">
                            {variantCount} Option(s)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`font-medium text-sm ${stockVal > 10 ? 'text-white' : stockVal > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {stockVal} in stock
                          </span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border w-max ${statusColor}`}>
                            {displayStatus}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleOpenEdit(p)} 
                            className="p-2.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 bg-[#111111] border border-gray-800 rounded-xl transition-all duration-200 active:scale-95"
                            title="Edit Product"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p)} 
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 bg-[#111111] border border-gray-800 rounded-xl transition-all duration-200 active:scale-95"
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package size={36} className="text-gray-600" />
                        <p className="text-base font-semibold text-gray-400">No products found!</p>
                        <p className="text-xs text-gray-600">Click "Add New Product" to start building your luxury catalog.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 🪟 3D Animated Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 glass-3d-panel">
            
            <div className="flex justify-between items-center p-6 border-b border-[#D4AF37]/20 bg-[#111111]">
              <h2 className="text-xl font-serif font-bold text-[#D4AF37] uppercase flex items-center tracking-wider gold-text-glow">
                <Sparkles className="mr-2 text-[#D4AF37]" size={22} />
                {modalMode === 'add' ? 'ADD NEW PRODUCT' : 'EDIT PRODUCT'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar p-6 space-y-5">
              
              <div>
                <label className="block text-gray-300 text-xs font-bold uppercase mb-2">Product Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                  placeholder="e.g. Premium Signature Gold Watch"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-bold uppercase mb-2">Product Description</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors resize-none text-sm font-light"
                  placeholder="Enter detailed product description..."
                ></textarea>
              </div>

              {/* 🚀 Dynamic Options/Variants Section */}
              <div className="bg-[#111111] border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <h3 className="text-[#D4AF37] font-bold text-xs uppercase tracking-wider flex items-center gold-text-glow">
                    <ListPlus size={18} className="mr-2" /> Custom Options (Colors, Sizes, Materials, etc.)
                  </h3>
                  <button 
                    type="button" 
                    onClick={addVariantField}
                    className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-lg border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black font-bold transition-all duration-200 uppercase tracking-wider"
                  >
                    + Add New Option Box
                  </button>
                </div>
                
                {formData.variants.length === 0 ? (
                  <p className="text-gray-500 text-xs italic text-center py-2 font-light">No custom options added. Leave empty if this product has no variants.</p>
                ) : (
                  formData.variants.map((variant, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-gray-700 relative group">
                      <div className="w-full sm:w-1/3">
                        <label className="block text-gray-400 text-[10px] mb-1 uppercase font-bold">Option Name</label>
                        <input 
                          type="text" 
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none text-xs"
                          placeholder="e.g. Color or Size"
                        />
                      </div>
                      <div className="w-full sm:w-2/3">
                        <label className="block text-gray-400 text-[10px] mb-1 uppercase font-bold">Options (Comma separated)</label>
                        <input 
                          type="text" 
                          value={variant.options}
                          onChange={(e) => handleVariantChange(index, 'options', e.target.value)}
                          className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none text-xs"
                          placeholder="e.g. Red, Blue, Gold"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeVariantField(index)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-red-500 bg-[#111111] p-1.5 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Option Box"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-gray-300 text-xs font-bold mb-2 uppercase">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-[#111111] border border-[#D4AF37]/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer text-xs font-bold text-[#D4AF37]"
                  >
                    {categories.map((cat: any) => (
                      <option key={cat.id || cat.name} value={cat.name} className="bg-[#111111] text-white">{cat.name}</option>
                    ))}
                    {categories.length === 0 && <option value="Shirt">Shirt</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-xs font-bold mb-2 uppercase">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer text-xs font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Price, Discount & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-gray-300 text-xs font-bold mb-2 uppercase">Price (৳) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-xs font-bold mb-2 uppercase flex items-center">
                    Discount (%) <Percent size={14} className="ml-1 text-gray-500" />
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="99"
                    value={formData.discount}
                    onChange={(e) => setFormData({...formData, discount: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                    placeholder="e.g. 20"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs font-bold mb-2 uppercase">Stock Quantity *</label>
                  <input 
                    type="number" 
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Multiple Images Gallery */}
              <div className="space-y-3">
                <label className="block text-gray-300 text-xs font-bold uppercase mb-2">Product Images (URLs or Upload)</label>
                
                {formData.images.map((imgUrl, index) => (
                  <div key={index} className="flex items-center gap-2 bg-[#111111] p-2 rounded-xl border border-gray-800">
                    <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-gray-600" />}
                    </div>
                    <input 
                      type="text" 
                      value={imgUrl}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      className="w-full bg-transparent border-b border-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                      placeholder="Paste image URL here..."
                    />
                    <button 
                      type="button" 
                      onClick={() => { setUploadIndex(index); fileInputRef.current?.click(); }} 
                      className="p-2 bg-gray-800 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black rounded-lg transition-colors shrink-0" 
                      title="Upload from device"
                    >
                      <Upload size={14} />
                    </button>
                    {formData.images.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeImageField(index)}
                        className="text-red-500 hover:text-red-400 p-1 shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

                <button 
                  type="button"
                  onClick={addImageField}
                  className="flex items-center space-x-2 text-xs text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-4 py-2 rounded-xl border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all duration-200 uppercase tracking-wider"
                >
                  <Plus size={14} />
                  <span>Add New Image Field</span>
                </button>
              </div>

              <div className="pt-6 border-t border-gray-800 flex justify-end space-x-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors font-medium text-xs uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#D4AF37] text-black px-8 py-2.5 rounded-xl hover:bg-white transition-all duration-300 font-extrabold shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 text-xs uppercase tracking-wider active:scale-95"
                >
                  {isSaving ? 'Saving to Cloud...' : (modalMode === 'add' ? 'Save Product & Push Live' : 'Update Product')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      
    </div>
  );
}
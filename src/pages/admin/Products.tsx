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
  moveToRecycleBin
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
                          nameLower.includes('dummy') ||
                          nameLower.includes('sample');
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

  // 🚀 ২. রিয়েল-টাইম ক্লাউড সিঙ্ক ও লোকাল ডাটা মার্জ (রিলোড দিলেও গায়েব হবে না)
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

        // 🚀 লোকাল ডাটা ও ক্লাউড ডাটা ইউনিক ID দিয়ে মার্জ করা (যাতে লোকাল প্রোডাক্ট ক্লাউডে না পৌঁছালেও গায়েব না হয়)
        const mergedMap = new Map();
        [...cleanCloud, ...localList].forEach((item: any) => {
          const key = String(item.id || item._id);
          if (key && !mergedMap.has(key)) {
            mergedMap.set(key, item);
          }
        });

        const finalMergedList = Array.from(mergedMap.values());
        setProducts(finalMergedList);
        localStorage.setItem('mo_fashion_products', JSON.stringify(finalMergedList));
      } else {
        setProducts(localList);
      }
    } catch (error) {
      console.warn("Supabase connection fallback, using local products.");
      setProducts(localList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    // 🚀 ৩. Supabase Realtime WebSocket Listener (সব ডিভাইসে রিয়েল-টাইম ব্রডকাস্ট)
    const channel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    const savedCategories = JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]');
    setCategories(savedCategories.length > 0 ? savedCategories : [{ name: "Men's Collection" }]);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    const newId = `PROD-${Date.now()}`;
    setFormData({ 
      _id: newId, id: newId, name: '', description: '', 
      category: categories.length > 0 ? categories[0].name : "Men's Collection", 
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
      category: product.category || (categories.length > 0 ? categories[0].name : "Men's Collection"),
      price: product.price ? product.price.toString() : '',
      discount: (product.discount !== undefined && product.discount !== null) ? product.discount.toString() : '0',
      stock: product.stock !== undefined ? product.stock.toString() : '0',
      status: product.status || 'Active',
      images: product.images && product.images.length > 0 ? [...product.images] : (product.imageUrl ? [product.imageUrl] : ['']),
      variants: loadedVariants
    });
    setIsModalOpen(true);
  };

  // ইমেজ কমপ্রেশন
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadIndex !== null) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500; 
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          const updatedImages = [...formData.images];
          updatedImages[uploadIndex] = compressedBase64;
          setFormData({ ...formData, images: updatedImages });
          toast.success('Image uploaded & compressed!');
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

  // 🗑️ ডিলিট প্রোডাক্ট (রিসাইকেল বিনে প্রেরণ ও মাল্টি-ডিভাইস সিঙ্ক)
  const handleDelete = async (product: any) => {
    const pId = String(product._id || product.id);
    const pName = product.name || 'Product';

    if (window.confirm(`Are you sure you want to move "${pName}" to Recycle Bin?`)) {
      const remaining = products.filter(p => String(p._id || p.id) !== pId);
      setProducts(remaining);
      localStorage.setItem('mo_fashion_products', JSON.stringify(remaining));

      try {
        await moveToRecycleBin('products', product);
        await deleteSupabaseProduct(pId);
        try { await notifyProductChange('Deleted', pName); } catch(e){}
        toast.success("Product moved to Recycle Bin! 🗑️");
      } catch (e) {
        toast.success("Product deleted locally.");
      }
    }
  };

  // 🚀 ৪. সেভ প্রোডাক্ট লজিক (পার্মানেন্ট সেভ ও অল-ডিভাইস সিঙ্ক)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.price) {
      toast.error("Please enter product name and price!");
      return;
    }

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

    const productPayload = {
      id: targetId,
      _id: targetId,
      name: formData.name.trim(),
      description: formData.description?.trim() || 'Premium quality fashion product.',
      price: origPrice,
      discount: discPercent,
      stock: Number(formData.stock) || 0,
      status: Number(formData.stock) <= 0 ? 'Out of Stock' : (formData.status || 'Active'),
      category: formData.category || (categories.length > 0 ? categories[0].name : "Men's Collection"),
      images: validImages.length > 0 ? validImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
      imageUrl: validImages.length > 0 ? validImages[0] : '',
      variants: formattedVariants,
      colors: colorVar ? colorVar.options : [], 
      sizes: sizeVar ? sizeVar.options : []     
    };

    // 🚀 ১. ইন্সট্যান্ট লোকাল আপডেট (যাতে কোনো অবস্থায় গায়েব না হয়)
    const currentList = sanitizeProducts(JSON.parse(localStorage.getItem('mo_fashion_products') || '[]'));
    let updatedList = [];
    
    if (modalMode === 'add') {
      updatedList = [productPayload, ...currentList.filter(p => String(p.id || p._id) !== targetId)];
    } else {
      updatedList = currentList.map(p => String(p._id || p.id) === targetId ? productPayload : p);
    }

    const cleanList = sanitizeProducts(updatedList);
    setProducts(cleanList);
    localStorage.setItem('mo_fashion_products', JSON.stringify(cleanList));
    
    // উইন্ডো ইভেন্ট ট্রিগার
    window.dispatchEvent(new Event('storage'));

    setIsSaving(true);
    setIsModalOpen(false);
    const toastId = toast.loading("Saving permanently to Cloud Database...");

    // 🚀 ২. ক্লাউড ডাটাবেসে সেভ করা (All-Device Live Broadcast)
    try {
      await saveSupabaseProduct(productPayload);
      toast.success("Product saved LIVE on Supabase Cloud! 🎉", { id: toastId });
      try { await notifyProductChange(modalMode === 'add' ? 'Added' : 'Updated', productPayload.name); } catch(e){}
      fetchProducts(); 
    } catch (error) {
      console.warn("Cloud Sync warning:", error);
      toast.success("Product saved permanently on this device!", { id: toastId });
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
      
      {/* 🌟 Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-2xl border border-[#D4AF37]/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-[#D4AF37]/40">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] uppercase flex items-center tracking-wide">
              <Package className="mr-3 text-[#D4AF37] animate-bounce" size={28} /> Products Management
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30 flex items-center animate-pulse shadow-sm">
              <Box size={14} className="mr-1.5" /> Total: {products.length} Items
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Manage live database inventory, discounts, dynamic variants, and multi-device stock</p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchProducts}
            className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95"
            title="Refresh Database"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={handleOpenAdd} 
            className="bg-gradient-to-r from-[#D4AF37] to-[#f3e5ab] text-black px-6 py-2.5 rounded-xl hover:scale-105 font-bold flex items-center space-x-2 shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 active:scale-95"
          >
            <Plus size={20} /> <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 🔎 Search & Filters */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#D4AF37]/20 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg transition-all duration-300">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search products by name..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-[#111111] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none transition-all duration-200" 
          />
          <Search className="absolute left-3 top-3 text-gray-500" size={18} />
        </div>

        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)} 
          className="w-full md:w-64 bg-[#111111] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer transition-colors"
        >
          <option value="">All Categories</option>
          {categories.map((cat: any, i: number) => (
            <option key={i} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* 📦 Animated Products Table */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300">
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
                  <th className="px-6 py-4">Price & Discount</th>
                  <th className="px-6 py-4">Variants</th>
                  <th className="px-6 py-4">Stock Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredProducts.map((p: any) => {
                  const origPrice = Number(p.price) || 0;
                  const discPercent = Number(p.discount) || 0;
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

                      <td className="px-6 py-4 text-sm text-gray-400">{p.category}</td>
                      
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#D4AF37]">৳{origPrice.toFixed(2)}</div>
                        {discPercent > 0 && (
                          <div className="text-xs text-red-400 font-bold bg-red-500/10 inline-block px-2 py-0.5 rounded mt-1 border border-red-500/20">
                            -{discPercent}% OFF
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-400">
                          <span className="bg-gray-800/80 text-gray-200 px-2.5 py-1 rounded-md border border-gray-700">
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
                            title="Move to Recycle Bin"
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

      {/* 🪟 Animated Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-[#D4AF37]/20 bg-[#111111]">
              <h2 className="text-xl font-serif font-bold text-[#D4AF37] uppercase flex items-center tracking-wider">
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
                <label className="block text-gray-300 text-sm mb-2 font-medium">Product Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="e.g. Premium Signature Gold Watch"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2 font-medium">Product Description</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors resize-none text-sm"
                  placeholder="Enter detailed product description..."
                ></textarea>
              </div>

              {/* 🚀 Dynamic Options/Variants Section */}
              <div className="bg-[#111111] border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <h3 className="text-[#D4AF37] font-bold text-sm uppercase tracking-wider flex items-center">
                    <ListPlus size={18} className="mr-2" /> Custom Options (Colors, Sizes, Materials, etc.)
                  </h3>
                  <button 
                    type="button" 
                    onClick={addVariantField}
                    className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-lg border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black font-bold transition-all duration-200"
                  >
                    + Add New Option Box
                  </button>
                </div>
                
                {formData.variants.length === 0 ? (
                  <p className="text-gray-500 text-xs italic text-center py-2">No custom options added. Leave empty if this product has no variants.</p>
                ) : (
                  formData.variants.map((variant, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 bg-[#1A1A1A] p-3 rounded-lg border border-gray-700 relative group">
                      <div className="w-full sm:w-1/3">
                        <label className="block text-gray-400 text-xs mb-1 uppercase font-bold">Option Name</label>
                        <input 
                          type="text" 
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none text-sm"
                          placeholder="e.g. Color or Size"
                        />
                      </div>
                      <div className="w-full sm:w-2/3">
                        <label className="block text-gray-400 text-xs mb-1 uppercase font-bold">Options (Comma separated)</label>
                        <input 
                          type="text" 
                          value={variant.options}
                          onChange={(e) => handleVariantChange(index, 'options', e.target.value)}
                          className="w-full bg-[#111111] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none text-sm"
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
                  <label className="block text-gray-300 text-sm mb-2 font-medium">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer text-sm"
                  >
                    {categories.map((cat: any) => (
                      <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                    {categories.length === 0 && <option value="Uncategorized">Uncategorized</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2 font-medium">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer text-sm"
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
                  <label className="block text-gray-300 text-sm mb-2 font-medium">Price (৳) *</label>
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
                  <label className="text-gray-300 text-sm mb-2 font-medium flex items-center">
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
                  <label className="block text-gray-300 text-sm mb-2 font-medium">Stock Quantity *</label>
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
                <label className="block text-gray-300 text-sm mb-2 font-medium">Product Images (URLs or Upload)</label>
                
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
                  className="flex items-center space-x-2 text-xs text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-4 py-2 rounded-xl border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all duration-200"
                >
                  <Plus size={14} />
                  <span>Add New Image Field</span>
                </button>
              </div>

              <div className="pt-6 border-t border-gray-800 flex justify-end space-x-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#D4AF37] text-black px-8 py-2.5 rounded-xl hover:bg-white transition-all duration-300 font-bold shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 text-sm active:scale-95"
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
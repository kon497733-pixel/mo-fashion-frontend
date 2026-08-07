import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit, Trash2, X, Image as ImageIcon, Folder, Upload, Eye, 
  Package, CheckCircle, XCircle, Tag, RefreshCw
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { 
  supabase, 
  getSupabaseCategories, 
  saveSupabaseCategory, 
  deleteSupabaseCategory, 
  moveToRecycleBin,
  getSupabaseProducts,
  getSupabaseSettings 
} from '../../lib/supabase';

// 🚀 ৩ সেকেন্ড পর পর স্বয়ংক্রিয় ছবি স্লাইড হওয়ার ৩ডি কম্পোনেন্ট
function CategoryImageSlider({ images, name }: { images: string[]; name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!Array.isArray(images) || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  const validImages = Array.isArray(images) ? images.filter(img => img && typeof img === 'string' && img.trim() !== '' && !img.includes('No+Image')) : [];

  if (validImages.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-[#111111]">
        <Folder size={36} className="opacity-30 mb-1" />
        <span className="text-[10px] uppercase font-bold text-gray-500">No Image</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#111111]">
      {validImages.map((img, idx) => (
        <img
          key={idx}
          src={img}
          alt={`${name} slide ${idx + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
            idx === currentIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100 pointer-events-none'
          }`}
        />
      ))}

      {validImages.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md border border-white/10">
          {validImages.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'bg-[#D4AF37] w-3.5 shadow-[0_0_8px_#D4AF37]' : 'bg-white/40 w-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryManagement() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadIndex, setUploadIndex] = useState<number | null>(null);

  // 🚀 ১. পুরনো স্যাম্পল/ডামি ক্যাটাগরি ফিল্টার করার ফাংশন
  const sanitizeCategories = (catList: any[]) => {
    if (!Array.isArray(catList)) return [];
    return catList.filter((cat: any) => {
      if (!cat || !cat.name) return false;
      const nameLower = String(cat.name).toLowerCase().trim();
      const isOldDummy = nameLower.includes('luxury golden watch') || 
                         nameLower.includes('premium gold t-shirt') || 
                         nameLower.includes('black signature hoodie') || 
                         nameLower.includes('classic denim jacket') || 
                         nameLower.includes('sample category') || 
                         nameLower.includes('dummy');
      return !isOldDummy;
    });
  };

  const [categories, setCategories] = useState<any[]>(() => {
    const saved = localStorage.getItem('mo_fashion_categories');
    if (saved) {
      try { return sanitizeCategories(JSON.parse(saved)); } catch (e) { return []; }
    }
    return [];
  });

  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ storeName: 'MO FASHION', logoUrl: '' });
  const [loading, setLoading] = useState(true);

  // মোডাল স্টেটস
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  // ক্যাটাগরির প্রোডাক্ট দেখার মোডাল স্টেট
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCategoryForView, setSelectedCategoryForView] = useState<any>(null);

  const [formData, setFormData] = useState({
    _id: '',
    id: '',
    name: '',
    description: '',
    images: ['']
  });

  // 🚀 ২. Supabase ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম ক্যাটাগরি ও প্রোডাক্ট ফেচ করা (All-Device Sync)
  const fetchCategoriesAndProducts = async () => {
    setLoading(true);

    let localCategories: any[] = [];
    const savedLocalCat = localStorage.getItem('mo_fashion_categories');
    if (savedLocalCat) {
      try { localCategories = sanitizeCategories(JSON.parse(savedLocalCat)); } catch (e) {}
    }

    try {
      const [cloudCat, cloudProds, cloudSet] = await Promise.all([
        getSupabaseCategories(),
        getSupabaseProducts(),
        getSupabaseSettings().catch(() => null)
      ]);

      if (cloudSet) setSettings(cloudSet);

      if (Array.isArray(cloudCat)) {
        const cleanCloudCat = sanitizeCategories(cloudCat);

        const mergedMap = new Map();
        [...localCategories, ...cleanCloudCat].forEach((item: any) => {
          const key = String(item.id || item._id);
          if (key && key !== 'undefined' && key !== 'null') {
            mergedMap.set(key, { ...mergedMap.get(key), ...item });
          }
        });

        const finalCategories = Array.from(mergedMap.values());
        setCategories(finalCategories);
        localStorage.setItem('mo_fashion_categories', JSON.stringify(finalCategories));
      } else {
        setCategories(localCategories);
      }

      if (Array.isArray(cloudProds)) {
        setProducts(cloudProds);
        localStorage.setItem('mo_fashion_products', JSON.stringify(cloudProds));
      }
    } catch (e) {
      console.warn("Supabase connection fallback, using local categories.");
      setCategories(localCategories);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesAndProducts();

    const channel = supabase
      .channel('public:categories:management:live:v70')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => fetchCategoriesAndProducts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchCategoriesAndProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🚀 ৩. UNIVERSAL BASE64 IMAGE ENCODING (পিসির ফাইল থেকে ইউনিভার্সাল ওয়েব ইমেজে রূপান্তর)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadIndex !== null) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB!");
        return;
      }

      const toastId = toast.loading("Converting & compressing image for all-device compatibility...");
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; 
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          
          const universalImageDataUrl = canvas.toDataURL('image/jpeg', 0.85); 
          const updatedImages = [...formData.images];
          updatedImages[uploadIndex] = universalImageDataUrl;
          
          setFormData({ ...formData, images: updatedImages });
          toast.success('Universal photo compressed & attached! 🎉', { id: toastId });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    const newId = `CAT-${Date.now()}`;
    setFormData({ _id: newId, id: newId, name: '', description: '', images: [''] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: any) => {
    setModalMode('edit');
    const targetId = String(category._id || category.id);
    setFormData({
      _id: targetId,
      id: targetId,
      name: category.name || '',
      description: category.description || '',
      images: category.images && category.images.length > 0 ? [...category.images] : (category.image ? [category.image] : [''])
    });
    setIsModalOpen(true);
  };

  // 🗑️ ৪. ক্যাটাগরি ডিলিট (রিসাইকেল বিনে প্রেরণ ও অল-ডিভাইস সিঙ্ক)
  const handleDelete = async (category: any) => {
    const catId = String(category._id || category.id);
    const catName = category.name || 'Category';

    if (window.confirm(`Are you sure you want to move category "${catName}" to Recycle Bin?`)) {
      const remaining = categories.filter(c => String(c._id || c.id) !== catId);
      setCategories(remaining);
      localStorage.setItem('mo_fashion_categories', JSON.stringify(remaining));

      try {
        await moveToRecycleBin('categories', category);
        await deleteSupabaseCategory(catId);

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('categoryUpdated'));

        toast.success(`Category "${catName}" moved to Recycle Bin! 🗑️`);
      } catch (e) {
        toast.success("Category deleted locally.");
      }
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

  // 🚀 ৫. সেভ ক্যাটাগরি লজিক (Supabase Cloud-এ পার্মানেন্ট সেভ ও অল-ডিভাইস সিঙ্ক)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required!");
      return;
    }

    const validImages = formData.images.filter(img => img && img.trim() !== '');
    const targetId = String(formData._id || formData.id || `CAT-${Date.now()}`);

    const catPayload = {
      id: targetId,
      _id: targetId,
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      images: validImages.length > 0 ? validImages : ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop'],
      image: validImages[0] || ''
    };

    const currentLocal = sanitizeCategories(JSON.parse(localStorage.getItem('mo_fashion_categories') || '[]'));
    let updatedList = [];
    
    if (modalMode === 'add') {
      updatedList = [catPayload, ...currentLocal.filter(c => String(c.id || c._id) !== targetId)];
    } else {
      updatedList = currentLocal.map(c => String(c._id || c.id) === targetId ? catPayload : c);
    }

    const cleanList = sanitizeCategories(updatedList);
    setCategories(cleanList);
    localStorage.setItem('mo_fashion_categories', JSON.stringify(cleanList));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('categoryUpdated'));

    setIsModalOpen(false);
    const toastId = toast.loading("Saving category LIVE to Supabase Cloud Database...");

    try {
      await saveSupabaseCategory(catPayload);
      toast.success(`Category saved LIVE on Cloud Database! 🎉`, { id: toastId });
      fetchCategoriesAndProducts(); 
    } catch (e: any) {
      toast.success("Category saved permanently on this device!", { id: toastId });
    }
  };

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet><title>Admin - Categories | {settings?.storeName || 'MO FASHION'}</title></Helmet>
      
      {/* 🚀 3D GLASSMORPHIC HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-3xl border border-[#D4AF37]/30 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/50 glass-3d-panel">
        <div>
          <div className="flex items-center space-x-3">
            {storeLogoImage ? (
              <img src={storeLogoImage} alt="" className="w-8 h-8 object-cover rounded-full border border-[#D4AF37]/40" />
            ) : (
              <Folder className="mr-1 text-[#D4AF37]" size={28} />
            )}
            <h1 className="text-2xl font-serif font-bold text-[#D4AF37] uppercase flex items-center tracking-wide gold-text-glow">
              Category Management
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30 flex items-center">
              Total: {categories.length} Categories
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 font-light">Manage live categories and auto-sliding slideshow images (All-Device Sync)</p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchCategoriesAndProducts}
            className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 shadow-md"
            title="Refresh Categories"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={handleOpenAdd} 
            className="bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#aa8c2c] text-black px-5 py-2.5 rounded-xl hover:scale-105 font-bold flex items-center space-x-2 shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 active:scale-95 text-xs uppercase tracking-wider"
          >
            <Plus size={20} /> <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* 📦 3D Categories Grid */}
      <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 p-6 shadow-2xl transition-all duration-300 glass-3d-panel">
        {loading && categories.length === 0 ? (
          <div className="text-center text-[#D4AF37] animate-pulse py-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
            <p className="font-medium">Loading Cloud Categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-gray-500 py-16 flex flex-col items-center justify-center space-y-3">
            <Folder size={48} className="text-gray-600 opacity-40" />
            <p className="text-base font-semibold">No categories found in Database.</p>
            <p className="text-xs text-gray-600">Please click "Add Category" to create your first item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 [perspective:1200px]">
            {categories.map((cat: any) => {
              const catProducts = products.filter(p => 
                String(p.category || '').trim().toLowerCase() === String(cat.name || '').trim().toLowerCase()
              );

              const catImagesList = Array.isArray(cat.images) && cat.images.length > 0 
                ? cat.images 
                : (cat.image ? [cat.image] : []);

              return (
                <div 
                  key={cat._id || cat.id} 
                  className="group bg-[#111111] p-4 rounded-2xl border border-gray-800 hover:border-[#D4AF37]/50 space-y-3 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden glass-3d-card"
                >
                  <div className="space-y-3">
                    
                    {/* 🚀 AUTOMATIC SLIDESHOW CONTAINER */}
                    <div className="h-44 bg-[#1A1A1A] rounded-xl overflow-hidden relative border border-gray-800/80">
                      <CategoryImageSlider images={catImagesList} name={cat.name} />
                      
                      {catImagesList.length > 1 && (
                        <span className="absolute top-3 right-3 bg-black/80 text-[#D4AF37] text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-[#D4AF37]/30 shadow-md">
                          {catImagesList.length} Slideshow Images
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-lg text-white group-hover:text-[#D4AF37] transition-colors">{cat.name}</h3>
                      <span className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded-full font-bold border border-[#D4AF37]/20">
                        {catProducts.length} {catProducts.length === 1 ? 'Product' : 'Products'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 font-light">{cat.description || 'No description provided'}</p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-800/80 mt-2">
                    <button 
                      onClick={() => { setSelectedCategoryForView(cat); setIsViewModalOpen(true); }} 
                      className="p-2.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 bg-[#1A1A1A] border border-gray-800 rounded-xl transition-all duration-200 active:scale-95"
                      title="View Products in Category"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(cat)} 
                      className="p-2.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 bg-[#1A1A1A] border border-gray-800 rounded-xl transition-all duration-200 active:scale-95"
                      title="Edit Category"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat)} 
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 bg-[#1A1A1A] border border-gray-800 rounded-xl transition-all duration-200 active:scale-95"
                      title="Move to Recycle Bin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 3D GLASSMORPHIC CATEGORY PRODUCT VIEW MODAL */}
      {isViewModalOpen && selectedCategoryForView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-3xl w-full max-w-3xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 glass-3d-panel">
            
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#D4AF37] uppercase flex items-center gold-text-glow">
                  <Package className="mr-2 text-[#D4AF37]" size={22} />
                  Products in "{selectedCategoryForView.name}"
                </h2>
                <p className="text-xs text-gray-400 mt-1 font-light">
                  Total Items: {products.filter(p => String(p.category || '').trim().toLowerCase() === String(selectedCategoryForView.name || '').trim().toLowerCase()).length}
                </p>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar max-h-[60vh] space-y-3 pr-1">
              {products.filter(p => String(p.category || '').trim().toLowerCase() === String(selectedCategoryForView.name || '').trim().toLowerCase()).length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <Package size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold text-gray-400">No products added to this category yet (0 Products).</p>
                  <p className="text-xs text-gray-600 mt-1">Add products from Products Management to assign items here.</p>
                </div>
              ) : (
                products
                  .filter(p => String(p.category || '').trim().toLowerCase() === String(selectedCategoryForView.name || '').trim().toLowerCase())
                  .map((p: any, idx: number) => {
                    const stockVal = Number(p.stock) || 0;
                    const soldVal = Number(p.sold) || 0;
                    const origPrice = Number(p.price) || 0;
                    const discPercent = Number(p.discount) || 0;
                    const sellingPrice = discPercent > 0 ? origPrice - (origPrice * discPercent / 100) : origPrice;
                    const isOutOfStock = stockVal <= 0 || p.status === 'Out of Stock';

                    return (
                      <div key={p._id || idx} className="bg-[#111111] p-4 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl overflow-hidden border border-gray-700 shrink-0 flex items-center justify-center">
                            {p.images && p.images[0] && !p.images[0].includes('No+Image') ? (
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-white text-sm line-clamp-1">{p.name}</h4>
                              {discPercent > 0 && (
                                <span className="text-[10px] font-extrabold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded flex items-center shrink-0">
                                  <Tag size={10} className="mr-1" />
                                  -{discPercent}% OFF
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-[#D4AF37] font-bold">
                                Price: ৳{sellingPrice.toFixed(2)}
                              </span>
                              {discPercent > 0 && (
                                <span className="text-[11px] text-gray-500 line-through">
                                  ৳{origPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
                          <div className="bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-gray-800 text-gray-300 font-medium">
                            Sold: <span className="text-[#D4AF37] font-bold">{soldVal}</span>
                          </div>

                          <div className="bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-gray-800">
                            {isOutOfStock ? (
                              <span className="text-red-400 font-bold flex items-center"><XCircle size={12} className="mr-1"/> Out of Stock</span>
                            ) : (
                              <span className="text-green-400 font-bold flex items-center">
                                <CheckCircle size={12} className="mr-1"/> {stockVal} Remaining
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-800">
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🪟 3D ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 glass-3d-panel">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h2 className="text-xl font-bold text-[#D4AF37] uppercase flex items-center gold-text-glow">
                {modalMode === 'add' ? 'ADD CATEGORY' : 'EDIT CATEGORY'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Category Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Men's Collection" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-[#111111] border border-gray-700 p-3 rounded-xl text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Description</label>
                <textarea 
                  rows={3} 
                  placeholder="Description..." 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-[#111111] border border-gray-700 p-3 rounded-xl text-white resize-none focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" 
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs text-[#D4AF37] font-bold">Category Slideshow Images (Desktop Photo or Web URLs)</label>
                {formData.images.map((img, i) => (
                  <div key={i} className="flex gap-2 items-center bg-[#111111] p-2 rounded-xl border border-gray-800">
                    <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? <img src={img} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-gray-600" />}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Paste image URL..." 
                      value={img} 
                      onChange={(e) => handleImageChange(i, e.target.value)} 
                      className="flex-1 bg-transparent border-b border-gray-800 p-1 text-xs text-white focus:border-[#D4AF37] focus:outline-none transition-colors" 
                    />
                    
                    <button 
                      type="button" 
                      onClick={() => { setUploadIndex(i); fileInputRef.current?.click(); }} 
                      className="p-2 bg-gray-800 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black rounded-lg transition-colors shrink-0 font-bold flex items-center space-x-1" 
                      title="Upload photo from PC"
                    >
                      <Upload size={14} />
                    </button>

                    {formData.images.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeImageField(i)} 
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
                  className="text-[#D4AF37] text-xs font-bold bg-[#D4AF37]/10 px-3.5 py-2 rounded-xl border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black transition-all duration-200"
                >
                  + Add Another Image
                </button>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 border border-gray-700 rounded-xl text-gray-300 font-medium text-sm hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[#D4AF37] text-black px-6 py-2.5 rounded-xl font-bold hover:bg-white transition-all shadow-lg shadow-[#D4AF37]/20 text-sm active:scale-95"
                >
                  Save Category to Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid, ArrowRight, ShoppingBag, Folder, Search 
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

import { 
  getSupabaseCategories, 
  getSupabaseProducts, 
  getSupabaseSettings 
} from '../../lib/supabase';

// 🚀 এডমিন থেকে আপলোড করা একাধিক ক্যাটাগরি ছবির অটো-স্লাইডশো কম্পোনেন্ট
function CategoryCardImageSlider({ images, name }: { images: string[]; name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!Array.isArray(images) || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000); // 3 Seconds Smooth Transition
    return () => clearInterval(interval);
  }, [images]);

  const validImages = Array.isArray(images) 
    ? images.filter(img => img && typeof img === 'string' && img.trim() !== '' && !img.includes('No+Image')) 
    : [];

  if (validImages.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] via-[#111111] to-[#1A1A1A] flex items-center justify-center">
        <ShoppingBag size={32} className="text-[#D4AF37]/30" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {validImages.map((img, idx) => (
        <img
          key={idx}
          src={img}
          alt={`${name} slide ${idx + 1}`}
          className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 ease-out ${
            idx === currentIndex ? 'opacity-75 scale-105' : 'opacity-0 scale-100 pointer-events-none'
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

export default function CategoriesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    currency: '৳',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategoriesData = async () => {
      setLoading(true);

      const cachedCats = localStorage.getItem('mo_fashion_categories');
      if (cachedCats) { try { setCategories(JSON.parse(cachedCats)); } catch (e) {} }

      const cachedProds = localStorage.getItem('mo_fashion_products');
      if (cachedProds) { try { setProducts(JSON.parse(cachedProds)); } catch (e) {} }

      const cachedSet = localStorage.getItem('mo_fashion_settings');
      if (cachedSet) { try { setSettings(JSON.parse(cachedSet)); } catch (e) {} }

      try {
        const [cloudCats, cloudProds, cloudSet] = await Promise.all([
          getSupabaseCategories().catch(() => []),
          getSupabaseProducts().catch(() => []),
          getSupabaseSettings().catch(() => null)
        ]);

        if (Array.isArray(cloudCats) && cloudCats.length > 0) setCategories(cloudCats);
        if (Array.isArray(cloudProds) && cloudProds.length > 0) setProducts(cloudProds);
        if (cloudSet) setSettings((prev: any) => ({ ...prev, ...cloudSet }));
      } catch (e) {
        console.warn('Backend API fallback engaged.');
      } finally {
        setLoading(false);
      }
    };

    loadCategoriesData();

    const handleStorageUpdate = () => loadCategoriesData();
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('categoryUpdated', handleStorageUpdate);
    window.addEventListener('productUpdated', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('categoryUpdated', handleStorageUpdate);
      window.removeEventListener('productUpdated', handleStorageUpdate);
    };
  }, []);

  // 🚀 CLEAN & DUPLICATE-FREE REAL CATEGORIES COMPILER
  const cleanRealCategories = () => {
    const map = new Map<string, any>();

    // 1. Process DB Categories (Extract multiple images array)
    categories.forEach((cat: any) => {
      const name = String(cat.name || cat.title || '').trim();
      if (name && name !== 'undefined' && name !== 'null') {
        const key = name.toLowerCase();
        if (!map.has(key)) {
          const imgList = Array.isArray(cat.images) && cat.images.length > 0 
            ? cat.images 
            : (cat.image ? [cat.image] : (cat.imageUrl ? [cat.imageUrl] : []));
            
          map.set(key, {
            id: String(cat.id || cat._id || `CAT-${Date.now()}`),
            name: name,
            images: imgList,
            description: cat.description || 'Exclusive luxury fashion category'
          });
        }
      }
    });

    // 2. Process Categories derived from Products
    products.forEach((prod: any) => {
      const catName = String(prod.category || '').trim();
      if (catName && catName !== 'undefined' && catName !== 'null') {
        const key = catName.toLowerCase();
        let prodImg = '';
        if (prod.images && prod.images[0]) prodImg = prod.images[0];
        else if (prod.imageUrl) prodImg = prod.imageUrl;
        else if (prod.image) prodImg = prod.image;

        if (!map.has(key)) {
          map.set(key, {
            id: `PROD-CAT-${key}`,
            name: catName,
            images: prodImg ? [prodImg] : [],
            description: 'Curated luxury products'
          });
        }
      }
    });

    return Array.from(map.values());
  };

  const realCategories = cleanRealCategories();

  // Filter Categories by Search Query
  const filteredCategories = realCategories.filter(cat => 
    String(cat.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Helper to count real items per category
  const getProductCountForCategory = (catName: string) => {
    return products.filter(p => String(p.category || '').toLowerCase() === catName.toLowerCase()).length;
  };

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';

  return (
    <main className="min-h-screen pt-24 pb-16 text-white bg-[#111111] transition-all duration-300">
      <Helmet>
        <title>Categories | {storeBrandTitle}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 border-b border-[#D4AF37]/20 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-[#1A1A1A] border border-[#D4AF37]/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#D4AF37] uppercase mb-3">
              {storeLogoImage ? (
                <img src={storeLogoImage} alt="" className="w-4 h-4 object-cover rounded-full" />
              ) : null}
              <span>LUXURY SELECTIONS</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#D4AF37] uppercase tracking-wider flex items-center">
              <Grid className="mr-3 text-[#D4AF37]" size={36} />
              CATEGORIES
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Browse through {filteredCategories.length} authentic luxury collections
            </p>
          </div>

          {/* 🚀 CATEGORY SEARCH BAR */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search category name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-gray-800 focus:border-[#D4AF37] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
            />
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
          </div>
        </div>

        {/* 🚀 2 COLUMNS ON MOBILE GRID (`grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) */}
        {filteredCategories.length === 0 && !loading ? (
          <div className="text-center py-20 bg-[#1A1A1A]/60 rounded-3xl border border-gray-800 p-8 max-w-xl mx-auto">
            <Folder size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
            <h3 className="text-lg font-serif font-bold text-white mb-2">No categories matched your search!</h3>
            <p className="text-xs text-gray-400">Try searching for a different category keyword.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredCategories.map((cat: any) => {
              const count = getProductCountForCategory(cat.name);

              return (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}
                  className="group relative h-48 sm:h-64 rounded-2xl bg-[#1A1A1A] border border-gray-800 hover:border-[#D4AF37]/80 overflow-hidden cursor-pointer shadow-xl transition-all duration-500 hover:-translate-y-2 [perspective:1000px] [transform-style:preserve-3d]"
                >
                  {/* Category Image / Auto Slider */}
                  <CategoryCardImageSlider images={cat.images} name={cat.name} />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 sm:p-6 flex flex-col justify-end z-10">
                    
                    {/* Item Count Badge */}
                    <div className="mb-2">
                      <span className="bg-[#111111]/90 text-[#D4AF37] border border-[#D4AF37]/40 text-[9px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-md">
                        {count} {count === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>

                    {/* Category Title */}
                    <h3 className="font-serif font-bold text-sm sm:text-lg text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1 uppercase">
                      {cat.name}
                    </h3>

                    <span className="text-[10px] sm:text-xs text-gray-400 flex items-center mt-1 font-semibold group-hover:text-white transition-colors">
                      Explore Collection 
                      <ArrowRight size={12} className="ml-1 group-hover:translate-x-1.5 transition-transform text-[#D4AF37]" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid, Sparkles, ArrowRight, ShoppingBag, Folder
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

import { 
  getSupabaseCategories, 
  getSupabaseProducts, 
  getSupabaseSettings 
} from '../../lib/supabase';

export default function CategoriesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    currency: '৳'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategoriesData = async () => {
      setLoading(true);

      // Cached load
      const cachedCats = localStorage.getItem('mo_fashion_categories');
      if (cachedCats) {
        try { setCategories(JSON.parse(cachedCats)); } catch (e) {}
      }
      const cachedProds = localStorage.getItem('mo_fashion_products');
      if (cachedProds) {
        try { setProducts(JSON.parse(cachedProds)); } catch (e) {}
      }
      const cachedSet = localStorage.getItem('mo_fashion_settings');
      if (cachedSet) {
        try { setSettings(JSON.parse(cachedSet)); } catch (e) {}
      }

      // Live fetch
      try {
        const [cloudCats, cloudProds, cloudSet] = await Promise.all([
          getSupabaseCategories().catch(() => []),
          getSupabaseProducts().catch(() => []),
          getSupabaseSettings().catch(() => null)
        ]);

        if (Array.isArray(cloudCats) && cloudCats.length > 0) {
          setCategories(cloudCats);
        }
        if (Array.isArray(cloudProds) && cloudProds.length > 0) {
          setProducts(cloudProds);
        }
        if (cloudSet) {
          setSettings(cloudSet);
        }
      } catch (e) {
        console.warn('Backend API fallback.');
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

    // 1. Process DB Categories
    categories.forEach((cat: any) => {
      const name = String(cat.name || cat.title || '').trim();
      if (name && name !== 'undefined' && name !== 'null') {
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: String(cat.id || cat._id || `CAT-${Date.now()}`),
            name: name,
            image: cat.image || cat.imageUrl || '',
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
            image: prodImg,
            description: 'Curated luxury products'
          });
        } else {
          const existing = map.get(key);
          if (!existing.image && prodImg) {
            map.set(key, { ...existing, image: prodImg });
          }
        }
      }
    });

    return Array.from(map.values());
  };

  const realCategories = cleanRealCategories();

  // Helper to count real items per category
  const getProductCountForCategory = (catName: string) => {
    return products.filter(p => String(p.category || '').toLowerCase() === catName.toLowerCase()).length;
  };

  return (
    <main className="min-h-screen pt-24 pb-16 text-white bg-[#111111] transition-all duration-300">
      <Helmet>
        <title>Categories | {settings?.storeName || 'MO FASHION'}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-[#D4AF37]/20 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-[#1A1A1A] border border-[#D4AF37]/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#D4AF37] uppercase mb-3">
              <Sparkles size={14} className="animate-pulse" />
              <span>LUXURY SELECTIONS</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#D4AF37] uppercase tracking-wider flex items-center">
              <Grid className="mr-3 text-[#D4AF37]" size={36} />
              CATEGORIES
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Browse through {realCategories.length} authentic luxury collections
            </p>
          </div>
        </div>

        {/* 🚀 2 COLUMNS ON MOBILE GRID (`grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) */}
        {realCategories.length === 0 && !loading ? (
          <div className="text-center py-20 bg-[#1A1A1A]/60 rounded-3xl border border-gray-800 p-8 max-w-xl mx-auto">
            <Folder size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
            <h3 className="text-lg font-serif font-bold text-white mb-2">No categories found!</h3>
            <p className="text-xs text-gray-400">Admin can add categories from the Admin Panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {realCategories.map((cat: any) => {
              const count = getProductCountForCategory(cat.name);

              return (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}
                  className="group relative h-48 sm:h-64 rounded-2xl bg-[#1A1A1A] border border-gray-800 hover:border-[#D4AF37]/80 overflow-hidden cursor-pointer shadow-xl transition-all duration-500 hover:-translate-y-2 [perspective:1000px] [transform-style:preserve-3d]"
                >
                  {/* Background Category Image */}
                  {cat.image ? (
                    <img 
                      src={cat.image} 
                      alt={cat.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-85" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] via-[#111111] to-[#1A1A1A] flex items-center justify-center">
                      <ShoppingBag size={32} className="text-[#D4AF37]/30" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 sm:p-6 flex flex-col justify-end">
                    
                    {/* Item Count Badge */}
                    <div className="mb-2">
                      <span className="bg-[#111111]/80 text-[#D4AF37] border border-[#D4AF37]/40 text-[9px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                        {count} {count === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>

                    {/* Category Title */}
                    <h3 className="font-serif font-bold text-sm sm:text-lg text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
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
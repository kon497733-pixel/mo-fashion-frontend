import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, ShoppingBag, Search, Sparkles } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { 
  supabase, 
  getSupabaseCategories, 
  getSupabaseProducts 
} from '../../lib/supabase';

export default function CategoriesPage() {
  const { settings } = useSettingsStore();
  const safeSettings = settings as any;

  // 🚀 ১. পুরনো স্যাম্পল/ডামি ক্যাটাগরি ফিল্টার করার স্মাট ফাংশন
  const sanitizeCategories = (catList: any[]) => {
    if (!Array.isArray(catList)) return [];
    return catList.filter((cat: any) => {
      if (!cat || !cat.name) return false;
      const nameLower = String(cat.name).toLowerCase().trim();
      const isOldDummy = nameLower.includes('sample category') || 
                         nameLower.includes('dummy category');
      return !isOldDummy;
    });
  };

  // 🚀 ২. ইনস্ট্যান্ট ০-মিলিমিটার ক্যাস লোডিং (ক্লিক করার সাথে সাথে লোড হয়ে যাবে)
  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const cachedCat = localStorage.getItem('mo_fashion_categories');
      const cachedProd = localStorage.getItem('mo_fashion_products');
      if (cachedCat) {
        const parsedCat = sanitizeCategories(JSON.parse(cachedCat));
        const parsedProd = cachedProd ? JSON.parse(cachedProd) : [];
        return parsedCat.map((cat: any) => {
          const count = Array.isArray(parsedProd) 
            ? parsedProd.filter((p: any) => {
                if (!p || !p.category || !cat.name) return false;
                return String(p.category).trim().toLowerCase() === String(cat.name).trim().toLowerCase();
              }).length 
            : 0;
          
          let imagesArray: string[] = [];
          if (Array.isArray(cat.images) && cat.images.length > 0) {
            imagesArray = cat.images.filter((url: string) => url && url.trim() !== '');
          }

          return { ...cat, count, imagesArray };
        });
      }
    } catch (e) {}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<boolean>(() => {
    return !localStorage.getItem('mo_fashion_categories');
  });

  // 🚀 ছবিগুলো অটোমেটিক স্লাইড হওয়ার টাইমার (২.৫ সেকেন্ড পর পর)
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((prev) => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // 🚀 ৩. Supabase ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম ক্যাটাগরি ও প্রোডাক্ট ফেচিং
  const fetchLiveCategoriesAndProducts = async (isSilent = false) => {
    try {
      if (!isSilent && categories.length === 0) setLoading(true);

      const [fetchedCategories, fetchedProducts] = await Promise.all([
        getSupabaseCategories().catch(() => []),
        getSupabaseProducts().catch(() => [])
      ]);

      if (Array.isArray(fetchedCategories)) {
        const cleanCategories = sanitizeCategories(fetchedCategories);
        const cleanProducts = Array.isArray(fetchedProducts) ? fetchedProducts : [];

        const enrichedCategories = cleanCategories.map((cat: any) => {
          // Smart Case-Insensitive Matching
          const count = cleanProducts.filter((p: any) => {
            if (!p || !p.category || !cat.name) return false;
            return String(p.category).trim().toLowerCase() === String(cat.name).trim().toLowerCase();
          }).length;
          
          let imagesArray: string[] = [];
          if (Array.isArray(cat.images) && cat.images.length > 0) {
            imagesArray = cat.images.filter((url: string) => url && url.trim() !== '');
          }

          return {
            ...cat,
            count,
            imagesArray
          };
        });

        setCategories(enrichedCategories);
        localStorage.setItem('mo_fashion_categories', JSON.stringify(cleanCategories));
        localStorage.setItem('mo_fashion_products', JSON.stringify(cleanProducts));
      }
    } catch (error) {
      console.error("Error fetching live collections:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveCategoriesAndProducts();

    // 🚀 ৪. Supabase WebSocket Realtime Listener (সব ডিভাইসে রিয়েল-টাইম ব্রডকাস্ট)
    const catChannel = supabase
      .channel('public:categories:page:5g')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchLiveCategoriesAndProducts(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchLiveCategoriesAndProducts(true);
      })
      .subscribe();

    const handleStorageChange = () => fetchLiveCategoriesAndProducts(true);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('categoryUpdated', handleStorageChange);

    return () => {
      supabase.removeChannel(catChannel);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('categoryUpdated', handleStorageChange);
    };
  }, []);

  const filteredCategories = categories.filter(cat => 
    (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen py-12 bg-[#111111] text-white border-t border-[#D4AF37]/10 transition-all duration-300">
      <Helmet>
        <title>Collections | {safeSettings?.storeName || 'MO FASHION'}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Page Header */}
        <div className="text-center mb-10 mt-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#D4AF37] mb-4 tracking-wider uppercase flex items-center justify-center">
            <Layers className="mr-4 text-[#D4AF37] animate-pulse" size={40} />
            Our Collections
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Browse through our wide range of premium fashion collections curated specially for you.
          </p>
        </div>

        {/* Category Search Bar */}
        {categories.length > 0 && (
          <div className="max-w-xl mx-auto mb-16 relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Search collections..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-14 pr-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all duration-300 shadow-xl text-sm sm:text-base"
            />
          </div>
        )}

        {loading && categories.length === 0 ? (
          <div className="text-center py-20 text-[#D4AF37] animate-pulse font-medium text-xl font-serif flex flex-col items-center justify-center space-y-3">
            <Sparkles size={36} className="animate-spin text-[#D4AF37]" />
            <span>Syncing live collections from database...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-16 bg-[#1A1A1A] rounded-3xl border border-dashed border-gray-800 max-w-2xl mx-auto shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <ShoppingBag size={64} className="mx-auto text-gray-600 mb-6 opacity-40 animate-bounce" />
            <h2 className="text-2xl font-serif font-bold text-white mb-3">No Collections Found</h2>
            <p className="text-gray-400 mb-8 text-sm">
              {searchQuery 
                ? `We couldn't find any collection matching "${searchQuery}".` 
                : "There are currently no collections available. Please create them from the Admin Panel."}
            </p>
            <Link to="/" className="inline-block bg-[#D4AF37] text-black px-8 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-all duration-300 active:scale-95 shadow-lg shadow-[#D4AF37]/20 text-xs">
              Return to Home
            </Link>
          </div>
        ) : (
          /* Categories Grid with Top-Notch Animations */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
            {filteredCategories.map((category, index) => (
              <Link to={`/category/${encodeURIComponent(category.name)}`} key={category._id || index} className="group">
                <div className="relative h-[400px] rounded-3xl overflow-hidden border border-[#D4AF37]/20 group-hover:border-[#D4AF37] transition-all duration-500 shadow-xl group-hover:shadow-[0_10px_30px_rgba(212,175,55,0.2)] bg-[#151515] group-hover:-translate-y-1.5">
                  
                  {/* Background Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 group-hover:via-black/30 transition-all duration-500 z-10"></div>
                  
                  {/* 🚀 Multiple Images Slideshow */}
                  {category.imagesArray && category.imagesArray.length > 0 ? (
                    category.imagesArray.map((img: string, idx: number) => (
                      <img 
                        key={idx}
                        src={img} 
                        alt={category.name} 
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                          idx === (imageIndex % category.imagesArray.length) ? 'opacity-100 group-hover:scale-110 transition-transform duration-700' : 'opacity-0'
                        }`}
                      />
                    ))
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 uppercase tracking-widest text-xs font-bold">
                      No Custom Image Uploaded
                    </div>
                  )}
                  
                  {/* Category Content */}
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6">
                    <h2 className="text-3xl font-bold text-white mb-3 font-serif drop-shadow-xl group-hover:text-[#D4AF37] transition-colors duration-300">
                      {category.name}
                    </h2>
                    
                    {/* Items Counter Badge */}
                    <span className="inline-block px-5 py-1.5 bg-black/80 backdrop-blur-md border border-[#D4AF37]/50 rounded-full text-[#D4AF37] text-xs font-bold tracking-wider mb-6 group-hover:bg-[#D4AF37] group-hover:text-black transition-all duration-300 shadow-md">
                      {category.count} {category.count === 1 ? 'Item' : 'Items'}
                    </span>
                    
                    <span className="flex items-center text-white opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 font-bold uppercase tracking-widest text-xs border-b border-white pb-1">
                      Explore Collection <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}
        
      </div>
    </main>
  );
}
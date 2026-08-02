import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, ShoppingBag, Search } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getLiveCategories, getLiveProducts } from '../../config/api';

export default function CategoriesPage() {
  const { settings } = useSettingsStore();
  const safeSettings = settings as any;
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 🚀 ছবিগুলো অটোমেটিক স্লাইড হওয়ার টাইমার
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((prev) => prev + 1);
    }, 2500); // ২.৫ সেকেন্ড পর পর স্লাইড হবে
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchLiveCategoriesAndProducts = async () => {
      try {
        setLoading(true);

        // ১. সেন্ট্রাল এপিআই দিয়ে ডাটাবেস থেকে রিয়েল-টাইম ক্যাটাগরি ও প্রোডাক্ট ফেচ
        const [fetchedCategories, fetchedProducts] = await Promise.all([
          getLiveCategories().catch(() => []),
          getLiveProducts().catch(() => [])
        ]);

        if (Array.isArray(fetchedCategories)) {
          const enrichedCategories = fetchedCategories.map((cat: any) => {
            // 🚀 Smart Case-Insensitive Matching: অক্ষরের ছোট-বড় হাত বা স্পেসের অমিল থাকলেও সঠিক সংখ্যা গুনে বের করবে
            const count = Array.isArray(fetchedProducts) 
              ? fetchedProducts.filter((p: any) => {
                  if (!p || !p.category || !cat.name) return false;
                  return String(p.category).trim().toLowerCase() === String(cat.name).trim().toLowerCase();
                }).length 
              : 0;
            
            // 🚀 স্লাইডশোর জন্য সব ভ্যালিড ইমেজ বের করা
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
        }
      } catch (error) {
        console.error("Error fetching live collections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveCategoriesAndProducts();
  }, []);

  const filteredCategories = categories.filter(cat => 
    (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen py-12 bg-[#111111] text-white border-t border-[#D4AF37]/10">
      <Helmet>
        <title>Collections | {safeSettings?.storeName || 'MO FASHION'}</title>
      </Helmet>

      <div className="container mx-auto px-4">
        
        {/* Page Header */}
        <div className="text-center mb-10 mt-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#D4AF37] mb-4 tracking-wider uppercase flex items-center justify-center">
            <Layers className="mr-4" size={40} />
            Our Collections
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
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
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-14 pr-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-colors shadow-lg"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[#D4AF37] animate-pulse font-medium text-xl font-serif">Syncing live collections from database...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1A1A] rounded-2xl border border-dashed border-gray-800 max-w-2xl mx-auto shadow-2xl">
            <ShoppingBag size={64} className="mx-auto text-gray-600 mb-6 opacity-50" />
            <h2 className="text-2xl font-serif font-bold text-white mb-4">No Collections Found</h2>
            <p className="text-gray-400 mb-8">
              {searchQuery 
                ? `We couldn't find any collection matching "${searchQuery}".` 
                : "There are currently no collections available. Please create them from the Admin Panel."}
            </p>
            <Link to="/" className="inline-block bg-[#D4AF37] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-white transition-colors">
              Return to Home
            </Link>
          </div>
        ) : (
          /* Categories Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
            {filteredCategories.map((category, index) => (
              <Link to={`/category/${encodeURIComponent(category.name)}`} key={category._id || index} className="group">
                <div className="relative h-[400px] rounded-2xl overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-colors duration-500 shadow-lg bg-[#151515]">
                  
                  {/* Background Overlay */}
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-500 z-10"></div>
                  
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
                    <h2 className="text-3xl font-bold text-white mb-3 font-serif drop-shadow-xl group-hover:text-[#D4AF37] transition-colors">
                      {category.name}
                    </h2>
                    
                    {/* Items Counter Badge */}
                    <span className="inline-block px-5 py-1.5 bg-black/80 backdrop-blur-md border border-[#D4AF37]/50 rounded-full text-[#D4AF37] text-sm font-bold tracking-wider mb-6 group-hover:bg-[#D4AF37] group-hover:text-black transition-colors">
                      {category.count} {category.count === 1 ? 'Item' : 'Items'}
                    </span>
                    
                    <span className="flex items-center text-white opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 font-bold uppercase tracking-widest text-xs border-b border-white pb-1">
                      Explore Collection <ArrowRight size={16} className="ml-2" />
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
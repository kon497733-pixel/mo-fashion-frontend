import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ShoppingBag, Image as ImageIcon, Search, Tag, RefreshCw, Sparkles, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/useCartStore';
import { supabase, getSupabaseProducts, getSupabaseSettings } from '../../lib/supabase';

export default function Home() {
  const addToCart = useCartStore((state) => state.addToCart);

  // 🚀 ১. ইনস্ট্যান্ট সুপার-ফাস্ট ক্যাস লোডিং (০ মিলি-সেকেন্ডে স্ক্রিনে প্রোডাক্ট লোড হয়ে যাবে)
  const [allProducts, setAllProducts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('mo_fashion_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [displayProducts, setDisplayProducts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('mo_fashion_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    return !localStorage.getItem('mo_fashion_products');
  });

  const [searchQuery, setSearchQuery] = useState('');

  // 🚀 লাইভ ক্লাউড সেটিংস স্টেট (ক্যাস ব্যাকআপ সহ)
  const [siteSettings, setSiteSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('mo_fashion_settings');
      return saved ? JSON.parse(saved) : {
        storeName: 'MO FASHION',
        tagline: 'Premium E-Commerce Experience',
        currency: '৳'
      };
    } catch (e) {
      return {
        storeName: 'MO FASHION',
        tagline: 'Premium E-Commerce Experience',
        currency: '৳'
      };
    }
  });

  // 🚀 ছবিগুলো প্রতি ২ সেকেন্ডে অটো-স্লাইড হওয়ার জন্য স্টেট
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 মাউস স্ক্রল রিভিল অ্যানিমেশন লজিক (Scroll Trigger Effect)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-12');
          }
        });
      },
      { threshold: 0.08 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [displayProducts, loading]);

  // 🚀 ২. সরাসরি Supabase ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম প্রোডাক্ট ও সেটিংস সিঙ্ক করা
  const fetchLiveHomeData = async (isSilent = false) => {
    try {
      if (!isSilent && allProducts.length === 0) setLoading(true);

      const [data, settingsData] = await Promise.all([
        getSupabaseProducts(),
        getSupabaseSettings()
      ]);

      if (Array.isArray(data) && data.length > 0) {
        setAllProducts(data);
        if (searchQuery.trim() === '') setDisplayProducts(data);
        localStorage.setItem('mo_fashion_products', JSON.stringify(data));
      }

      if (settingsData && Object.keys(settingsData).length > 0) {
        setSiteSettings(settingsData);
        localStorage.setItem('mo_fashion_settings', JSON.stringify(settingsData));
      }
    } catch (error) {
      console.warn("Supabase API offline, using cached home data.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveHomeData();

    // 🚀 Supabase Realtime WebSocket Listeners for Instant Cross-Device Sync (এডমিন থেকে সাথে সাথে সিঙ্ক হবে)
    const productsChannel = supabase
      .channel('public:products:home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchLiveHomeData(true);
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel('public:settings:home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        () => {
          fetchLiveHomeData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // সার্চ ফিল্টার লজিক
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setDisplayProducts(allProducts);
    } else {
      const filtered = allProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setDisplayProducts(filtered);
    }
  }, [searchQuery, allProducts]);

  // 🚀 ডাইনামিক Add to Cart
  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const origPrice = Number(product.price) || 0;
    const discPercent = Number(product.discount) || 0;
    const sellingPrice = discPercent > 0 ? origPrice - (origPrice * discPercent / 100) : origPrice;

    let productImage = 'No Image';
    if (product.images && product.images.length > 0 && !product.images[0].includes('No+Image')) {
      productImage = product.images[0];
    } else if (product.imageUrl) {
      productImage = product.imageUrl;
    }

    const cartItem = {
      id: String(product._id || product.id),
      name: String(product.name || 'Unnamed Product'),
      price: Number(sellingPrice.toFixed(2)),
      quantity: 1,
      size: 'M',
      color: 'Black',
      image: productImage,
      stock: Number(product.stock) || 0
    };

    addToCart(cartItem as any);
    toast.success(`${product.name} added to cart! 🛒`);
  };

  return (
    <main className="min-h-screen bg-[#111111] pb-12 text-white transition-all duration-300">
      <Helmet>
        <title>{siteSettings?.storeName || 'MO FASHION'} | Home</title>
      </Helmet>

      {/* 🚀 Hero Section with Glassmorphic Animations */}
      <section className="bg-gradient-to-b from-[#1A1A1A] via-[#151515] to-[#111111] py-20 text-center border-b border-[#D4AF37]/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0,transparent_70%)] pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10 max-w-5xl reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 ease-out">
          <span className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-4 py-1.5 rounded-full border border-[#D4AF37]/30 mb-6 backdrop-blur-md shadow-lg">
            <Sparkles size={14} className="animate-spin-slow text-[#D4AF37]" />
            <span>Exclusive Luxury Fashion</span>
          </span>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 uppercase tracking-widest leading-tight drop-shadow-2xl">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#D4AF37]">{siteSettings?.storeName || 'MO FASHION'}</span>
          </h1>

          <p className="text-gray-400 mb-10 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed">
            {siteSettings?.tagline || 'Premium E-Commerce Experience'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/categories">
              <button className="bg-gradient-to-r from-[#D4AF37] to-[#f3e5ab] text-black px-10 py-4 rounded-xl hover:scale-105 font-bold uppercase tracking-wider shadow-xl shadow-[#D4AF37]/20 transition-all duration-300 active:scale-95 text-sm">
                Shop Collection
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 🔎 Search Bar */}
      <section className="pt-16 container mx-auto px-4 max-w-6xl">
        <div className="max-w-2xl mx-auto mb-10 relative group reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 ease-out">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search premium products or categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-14 pr-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all duration-300 shadow-2xl text-sm sm:text-base"
          />
        </div>
      </section>

      {/* 📦 New Arrivals Section with Mouse Scroll Reveal Animations */}
      <section className="py-10 container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 ease-out">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#D4AF37] tracking-wider mb-2 uppercase flex items-center justify-center">
            NEW ARRIVALS
          </h2>
          
          {!loading && displayProducts.length > 0 && (
            <p className="text-xs text-gray-400 font-medium tracking-widest uppercase mt-2">
              Showing <span className="text-[#D4AF37] font-bold">{displayProducts.length}</span> {displayProducts.length === 1 ? 'Product' : 'Products'} Available
            </p>
          )}

          <div className="w-24 h-1 bg-[#D4AF37] mx-auto opacity-60 rounded-full mt-4 shadow-[0_0_10px_#D4AF37]"></div>
        </div>

        {loading && displayProducts.length === 0 ? (
          <div className="text-center text-[#D4AF37] font-medium animate-pulse py-20 text-xl flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={32} className="animate-spin text-[#D4AF37]" />
            <span>Connecting & Syncing with Cloud Database...</span>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-24 bg-[#1A1A1A] rounded-3xl border border-dashed border-gray-800 max-w-3xl mx-auto shadow-2xl p-8 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700">
            <ShoppingBag size={64} className="mx-auto text-gray-700 mb-6 opacity-40 animate-bounce" />
            <h2 className="text-2xl font-serif font-bold text-white mb-2">No Products Available</h2>
            <p className="text-gray-500 text-sm">
              {searchQuery ? `No product matches your search "${searchQuery}".` : "Products will appear here once added in the Admin Panel."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayProducts.map((product) => {
              const origPrice = Number(product.price) || 0;
              const discPercent = Number(product.discount) || 0;
              const sellingPrice = discPercent > 0 ? origPrice - (origPrice * discPercent / 100) : origPrice;
              const stockVal = Number(product.stock) || 0;
              const soldVal = Number(product.sold) || 0;
              
              const productImages = (product.images && product.images.length > 0 && !product.images[0].includes('No+Image')) 
                ? product.images 
                : (product.imageUrl ? [product.imageUrl] : []);

              return (
                <div 
                  key={product._id || product.id} 
                  className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 ease-out group bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-3xl p-4 text-center hover:border-[#D4AF37] hover:shadow-[0_10px_30px_rgba(212,175,55,0.25)] hover:-translate-y-2 flex flex-col relative overflow-hidden"
                >
                  
                  {/* Product Image Box with 2-Sec Auto-Slider */}
                  <Link to={`/product/${product._id || product.id}`} className="block relative overflow-hidden rounded-2xl mb-4 bg-[#111111] aspect-[4/5]">
                    {productImages.length > 0 ? (
                      productImages.map((img: string, idx: number) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt={product.name} 
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                            idx === (imageIndex % productImages.length) ? 'opacity-100 group-hover:scale-110 transition-transform duration-700' : 'opacity-0'
                          }`} 
                        />
                      ))
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <ImageIcon size={40} className="mb-2 opacity-30 text-gray-400" />
                        <span className="text-xs uppercase tracking-widest text-gray-500">No Image</span>
                      </div>
                    )}

                    {/* Discount Badge */}
                    {discPercent > 0 && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-600 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-lg z-10 flex items-center">
                        <Tag size={12} className="mr-1" />
                        -{discPercent}% OFF
                      </div>
                    )}

                    {/* Dynamic Stylish Top-Right Stock Badge */}
                    {stockVal <= 0 || product.status === 'Out of Stock' ? (
                      <span className="absolute top-3 right-3 bg-rose-950/90 text-rose-400 border border-rose-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md z-10 uppercase tracking-wider shadow-lg">
                        SOLD OUT
                      </span>
                    ) : stockVal <= 10 ? (
                      <span className="absolute top-3 right-3 bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md z-10 uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        LOW STOCK
                      </span>
                    ) : (
                      <span className="absolute top-3 right-3 bg-emerald-950/90 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md z-10 uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        IN STOCK
                      </span>
                    )}
                  </Link>
                  
                  {/* Product Title */}
                  <Link to={`/product/${product._id || product.id}`}>
                    <h3 className="font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors line-clamp-2 px-2 uppercase tracking-tight text-sm">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Rating & Real Sold Count */}
                  <div className="flex items-center justify-center space-x-2 text-xs mb-2">
                    <span className="text-[#D4AF37] font-bold">★ {Number(product.rating || 5).toFixed(1)}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-300 font-medium">{soldVal} Sold</span>
                  </div>

                  {/* Highlighted Remaining Stock Box */}
                  <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-3 py-1.5 mb-3 mx-auto w-max shadow-inner">
                    <p className="text-[11px] text-gray-300 font-medium">
                      {stockVal > 0 ? (
                        <>
                          <span className="text-[#D4AF37] font-black text-sm mr-1">{stockVal}</span> 
                          items remaining in stock
                        </>
                      ) : (
                        <span className="text-red-400 font-bold">Currently unavailable</span>
                      )}
                    </p>
                  </div>
                  
                  {/* Price Section */}
                  <div className="mb-5 flex items-center justify-center space-x-2 mt-auto">
                    <span className="text-[#D4AF37] font-bold text-xl">{siteSettings?.currency || '৳'} {sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {discPercent > 0 && (
                      <span className="text-gray-500 line-through text-xs">{siteSettings?.currency || '৳'} {origPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                  </div>
                  
                  <button 
                    onClick={(e) => handleAddToCart(product, e)}
                    disabled={stockVal <= 0 || product.status === 'Out of Stock'}
                    className={`w-full flex items-center justify-center space-x-2 border py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 active:scale-95 ${
                      stockVal <= 0 || product.status === 'Out of Stock'
                      ? 'bg-[#111111] text-gray-500 border-gray-800 cursor-not-allowed' 
                      : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black shadow-lg shadow-[#D4AF37]/10'
                    }`}
                  >
                    <ShoppingBag size={16} />
                    <span>{stockVal <= 0 || product.status === 'Out of Stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
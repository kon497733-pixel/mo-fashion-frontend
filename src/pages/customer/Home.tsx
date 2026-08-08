import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, Filter, PhoneCall, Mail, MapPin, 
  History, Trash2, X, Sparkles, Folder, Package, ArrowRight,
  ShieldCheck, Truck, RotateCcw, Award, Star, Eye, ChevronLeft, ChevronRight, RefreshCw, Check
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import Hero from '../../components/home/Hero';
import Categories from '../../components/home/Categories';
import FeaturedProducts from '../../components/home/FeaturedProducts';
import Offer3DCanvas from '../../components/home/Offer3DCanvas';
import { useCartStore } from '../../store/useCartStore';

import { 
  getSupabaseProducts, 
  getSupabaseCategories, 
  getSupabaseSettings,
  getSupabaseReviews 
} from '../../lib/supabase';

// 🚀 প্রোডাক্ট কার্ডের ভেতরের ৩ডি গ্যালারি অটো স্লাইডার Component
function ProductCardImageSlider({ images, name }: { images: string[]; name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!Array.isArray(images) || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [images]);

  const validImages = Array.isArray(images) ? images.filter(img => img && img.trim() !== '' && !img.includes('No+Image')) : [];

  if (validImages.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 uppercase font-bold bg-[#111111]">
        No Image
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
          className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 ease-out [transform:translateZ(35px)] ${
            idx === currentIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100 pointer-events-none'
          }`}
        />
      ))}

      {validImages.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-20 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
          {validImages.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'bg-[#D4AF37] w-3 shadow-[0_0_8px_#D4AF37]' : 'bg-white/40 w-1'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const searchRef = useRef<HTMLDivElement>(null);
  const productSliderRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    tagline: 'LUXURY COLLECTION',
    currency: '৳',
    logoUrl: '',
    heroBadge: 'EXCLUSIVE LUXURY COLLECTION',
    heroTitle: 'ELEVATE YOUR SIGNATURE STYLE',
    heroDescription: 'Discover handcrafted luxury apparel and accessories designed to redefine modern elegance. Premium quality tailored for perfection.',
    heroCardTitle: '100% AUTHENTIC',
    heroCardSubtitle: 'PREMIUM FASHION GUARANTEED',
    heroCardEst: 'EST. 2026',
    offerBadge: 'LIMITED TIME OFFER',
    offerTitle: 'SPECIAL LUXURY DISCOUNT UP TO 30% OFF',
    offerDescription: 'Upgrade your wardrobe today with our exclusive premium collection. Fast nationwide delivery available.'
  });

  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');

  // 🚀 SUPER AESTHETIC SEARCH BAR STATES (VIDEO MATCHING)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 🚀 কাস্টমার লগইন স্ট্যাটাস
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser') || localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ইউজারের নিজস্ব সার্চ হিস্ট্রি লোড
  useEffect(() => {
    if (currentUser) {
      const userEmail = currentUser.email || currentUser.uid || currentUser.id;
      const historyKey = `mo_fashion_search_history_${userEmail}`;
      const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
      setSearchHistory(saved);
    } else {
      setSearchHistory([]);
    }
  }, [currentUser]);

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);

      const cachedProducts = localStorage.getItem('mo_fashion_products');
      if (cachedProducts) { try { setProducts(JSON.parse(cachedProducts)); } catch (e) {} }

      const cachedCategories = localStorage.getItem('mo_fashion_categories');
      if (cachedCategories) { try { setCategories(JSON.parse(cachedCategories)); } catch (e) {} }

      const cachedSettings = localStorage.getItem('mo_fashion_settings');
      if (cachedSettings) { try { setSettings(JSON.parse(cachedSettings)); } catch (e) {} }

      const cachedReviews = localStorage.getItem('mo_fashion_reviews');
      if (cachedReviews) { try { setReviews(JSON.parse(cachedReviews)); } catch (e) {} }

      try {
        const [cloudProds, cloudCats, cloudSet, cloudRevs] = await Promise.all([
          getSupabaseProducts().catch(() => []),
          getSupabaseCategories().catch(() => []),
          getSupabaseSettings().catch(() => null),
          getSupabaseReviews().catch(() => [])
        ]);

        if (Array.isArray(cloudProds) && cloudProds.length > 0) setProducts(cloudProds);
        if (Array.isArray(cloudCats) && cloudCats.length > 0) setCategories(cloudCats);
        if (cloudSet) setSettings((prev: any) => ({ ...prev, ...cloudSet }));
        if (Array.isArray(cloudRevs) && cloudRevs.length > 0) setReviews(cloudRevs);
      } catch (err) {
        console.warn('Cloud fetch fallback engaged.');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();

    const handleStorageUpdate = () => loadHomeData();
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('productUpdated', handleStorageUpdate);
    window.addEventListener('categoryUpdated', handleStorageUpdate);
    window.addEventListener('settingsUpdated', handleStorageUpdate);
    window.addEventListener('reviewUpdated', handleStorageUpdate);

    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('productUpdated', handleStorageUpdate);
      window.removeEventListener('categoryUpdated', handleStorageUpdate);
      window.removeEventListener('settingsUpdated', handleStorageUpdate);
      window.removeEventListener('reviewUpdated', handleStorageUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 🚀 লাইভ সার্চ রেজাল্ট জেনারেটর
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matchedCats = categories
      .filter(c => String(c.name || '').toLowerCase().includes(q))
      .map(c => ({
        type: 'Category',
        id: String(c.id || c._id),
        name: c.name,
        image: c.image || c.imageUrl || '',
        url: `/products?category=${encodeURIComponent(c.name)}`
      }));

    const matchedProds = products
      .filter(p => String(p.name || '').toLowerCase().includes(q) || String(p.category || '').toLowerCase().includes(q))
      .map(p => ({
        type: 'Product',
        id: String(p.id || p._id),
        name: p.name,
        price: p.price,
        category: p.category,
        image: p.images?.[0] || p.imageUrl || p.image || '',
        url: `/product/${p.id || p._id}`
      }));

    return [...matchedCats, ...matchedProds].slice(0, 6);
  })();

  // 🚀 ভিডিওর স্টাইল অনুযায়ী ডাইনামিক স্ট্যাটাস মেসেজ
  const searchStatusLabel = (() => {
    if (!isSearchExpanded) return 'ready';
    if (!searchQuery) return 'type to search...';
    if (searchResults.length === 0) return 'no results 😞';
    if (searchResults.length === 1) return 'Found it! 🎉';
    if (searchResults.length <= 3) return `is it one of these ${searchResults.length}?`;
    return 'searching...';
  })();

  const handleSelectSearchResult = (url: string, term: string) => {
    if (currentUser && term.trim()) {
      const userEmail = currentUser.email || currentUser.uid || currentUser.id;
      const historyKey = `mo_fashion_search_history_${userEmail}`;
      const filtered = searchHistory.filter(item => item.toLowerCase() !== term.trim().toLowerCase());
      const updatedHistory = [term.trim(), ...filtered].slice(0, 6);

      setSearchHistory(updatedHistory);
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    }

    navigate(url);
    scrollToTop();
    setSearchQuery('');
    setIsSearchExpanded(false);
  };

  const handleClearHistoryItem = (e: React.MouseEvent, itemToDelete: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    const userEmail = currentUser.email || currentUser.uid || currentUser.id;
    const historyKey = `mo_fashion_search_history_${userEmail}`;
    const updated = searchHistory.filter(item => item !== itemToDelete);

    setSearchHistory(updated);
    localStorage.setItem(historyKey, JSON.stringify(updated));
    toast.success("Search history item removed!");
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (productSliderRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      productSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleQuickAddToCart = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    
    let prodImage = '';
    if (product.images && product.images[0]) prodImage = product.images[0];
    else if (product.imageUrl) prodImage = product.imageUrl;
    else if (product.image) prodImage = product.image;

    const origPrice = Number(product.price) || 0;
    const discountPercent = Number(product.discount) || 0;
    const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;

    const cartPayload = {
      id: String(product.id || product._id),
      name: product.name,
      price: finalPrice,
      originalPrice: origPrice,
      discount: discountPercent,
      image: prodImage,
      quantity: 1,
      size: Array.isArray(product.sizes) && product.sizes[0] ? product.sizes[0] : '',
      color: Array.isArray(product.colors) && product.colors[0] ? product.colors[0] : ''
    };

    if (typeof (cartStore as any).addToCart === 'function') {
      (cartStore as any).addToCart(cartPayload);
    } else {
      useCartStore.setState((state: any) => ({ items: [...state.items, cartPayload] }));
    }

    toast.success(`${product.name} added to cart! 🛒`);
  };

  const getProductRatingStats = (productId: string) => {
    const prodReviews = reviews.filter(r => String(r.productId || r.product_id) === String(productId));
    if (prodReviews.length === 0) return { rating: '0.0', count: 0 };
    
    const sum = prodReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / prodReviews.length).toFixed(1);
    return { rating: avg, count: prodReviews.length };
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === 'All' || String(p.category || '').toLowerCase() === activeCategory.toLowerCase();
    const searchQ = sectionSearchQuery.trim().toLowerCase();
    const matchesSearch = !searchQ || 
      String(p.name || '').toLowerCase().includes(searchQ) || 
      String(p.category || '').toLowerCase().includes(searchQ);

    return matchesCat && matchesSearch;
  });

  const availableCategoryList = categories.length > 0 
    ? categories 
    : Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(catName => ({
        id: catName,
        name: catName
      }));

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';

  return (
    <div className="min-h-screen text-white bg-[#111111] overflow-x-hidden pt-16 transition-all duration-300">
      <Helmet>
        <title>{storeBrandTitle} | Premium Luxury Store</title>
      </Helmet>

      {/* 🚀 1. SUPER AESTHETIC EXPANDING SEARCH BAR WITH GLOWING CONIC RING (VIDEO MATCHING) */}
      <div className="container mx-auto px-4 max-w-7xl pt-4">
        <div ref={searchRef} className="relative flex flex-col items-center justify-center z-40">
          
          {/* Animated Aesthetic Capsule Container */}
          <div className={`relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center p-1 rounded-full shadow-2xl backdrop-blur-2xl ${
            isSearchExpanded 
              ? 'w-full max-w-2xl bg-[#111111]/90 shadow-[0_0_35px_rgba(212,175,55,0.4)] border border-[#D4AF37]' 
              : 'w-14 h-14 bg-[#1A1A1A] border border-[#D4AF37]/50 hover:border-[#D4AF37] hover:scale-110 cursor-pointer justify-center'
          }`}>

            {/* Glowing Conic Gradient Ring Border Animation */}
            {isSearchExpanded && (
              <div className="absolute -inset-[2px] bg-gradient-to-r from-[#D4AF37] via-[#fff5c0] to-[#aa8c2c] rounded-full blur-sm opacity-60 animate-pulse pointer-events-none" />
            )}

            {!isSearchExpanded ? (
              <button 
                onClick={() => setIsSearchExpanded(true)}
                className="w-full h-full flex items-center justify-center text-[#D4AF37]"
                title="Open Aesthetic Search"
              >
                <Search size={22} className="animate-bounce" />
              </button>
            ) : (
              <div className="relative z-10 flex items-center w-full px-3 py-1">
                <Search size={18} className="text-[#D4AF37] mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search products, apparel, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleSelectSearchResult(`/products?search=${encodeURIComponent(searchQuery)}`, searchQuery);
                    }
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
                />

                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 text-gray-400 hover:text-white mr-1">
                    <X size={16} />
                  </button>
                )}

                <button 
                  onClick={() => setIsSearchExpanded(false)}
                  className="p-1.5 bg-[#111111] border border-gray-700 hover:border-[#D4AF37] rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Video-style Status Label Below Search Bar */}
          <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] mt-2 font-bold uppercase gold-text-glow">
            {searchStatusLabel}
          </span>

          {/* 🚀 VIDEO-STYLE EXPANDED RESULTS CARD LIST */}
          {isSearchExpanded && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-full max-w-2xl mt-3 bg-[#1A1A1A]/95 border border-[#D4AF37]/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-4 backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-200 glass-3d-panel">
              
              {/* Saved Search History Chips for Logged-In User */}
              {!searchQuery && currentUser && searchHistory.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center px-2 text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider border-b border-gray-800 pb-1">
                    <span className="flex items-center"><History size={12} className="mr-1" /> Your Saved Search History</span>
                    <span>Account: {currentUser.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {searchHistory.map((item, idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          setSearchQuery(item);
                          handleSelectSearchResult(`/products?search=${encodeURIComponent(item)}`, item);
                        }}
                        className="bg-[#111111] hover:bg-[#D4AF37]/20 border border-gray-800 hover:border-[#D4AF37] px-3 py-1.5 rounded-xl text-xs text-gray-300 hover:text-[#D4AF37] cursor-pointer transition-all flex items-center space-x-2"
                      >
                        <span>{item}</span>
                        <Trash2 
                          size={12} 
                          onClick={(e) => handleClearHistoryItem(e, item)}
                          className="text-gray-500 hover:text-red-400" 
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Search Suggestions Matching Video Design */}
              {searchQuery && searchResults.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {searchResults.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(res.url, res.name)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#111111] border border-gray-800 hover:border-[#D4AF37] transition-all cursor-pointer group shadow-md hover:scale-[1.01]"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {res.image ? (
                            <img src={res.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          ) : res.type === 'Category' ? (
                            <Folder size={18} className="text-[#D4AF37]" />
                          ) : (
                            <Package size={18} className="text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                            {res.name}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase">{res.type}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {res.price && (
                          <span className="text-xs font-bold text-[#D4AF37]">
                            ৳{Number(res.price || 0).toFixed(0)}
                          </span>
                        )}
                        <ArrowRight size={14} className="text-gray-500 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm font-bold text-gray-400">No titles or categories found 😞</p>
                  <p className="text-xs text-gray-600">Try searching with a different fashion keyword.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 2. THREE.JS 3D HERO SECTION WITH MULTI-ANIMATION */}
      <Hero products={products} settings={settings} />

      {/* 🚀 3. TRUST FEATURES BAR WITH 3D CARDS */}
      <section className="py-10 border-y border-gray-800/80 bg-[#161616]/60 backdrop-blur-md">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-[#1A1A1A]/80 border border-gray-800 hover:border-[#D4AF37]/50 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-4 shadow-lg hover:-translate-y-1 transition-all duration-300 glass-3d-panel">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] shrink-0 border border-[#D4AF37]/30">
                <Truck size={22} />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white">Express Delivery</h4>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Fast shipping nationwide</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A]/80 border border-gray-800 hover:border-[#D4AF37]/50 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-4 shadow-lg hover:-translate-y-1 transition-all duration-300 glass-3d-panel">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] shrink-0 border border-[#D4AF37]/30">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white">100% Authentic</h4>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Guaranteed original items</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A]/80 border border-gray-800 hover:border-[#D4AF37]/50 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-4 shadow-lg hover:-translate-y-1 transition-all duration-300 glass-3d-panel">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] shrink-0 border border-[#D4AF37]/30">
                <RotateCcw size={22} />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white">Easy Exchange</h4>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Hassle-free return policy</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A]/80 border border-gray-800 hover:border-[#D4AF37]/50 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-4 shadow-lg hover:-translate-y-1 transition-all duration-300 glass-3d-panel">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] shrink-0 border border-[#D4AF37]/30">
                <Award size={22} />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white">Premium Quality</h4>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Handpicked luxury wear</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 4. 3D CATEGORIES SECTION */}
      <Categories categories={categories} products={products} settings={settings} />

      {/* 🚀 5. NEW ARRIVALS & 3D DEPTH PRODUCTS */}
      <FeaturedProducts products={products} categories={categories} reviews={reviews} settings={settings} />

      {/* 🚀 6. THREE.JS 3D SPECIAL OFFER BANNER */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <Offer3DCanvas settings={settings} />
        </div>
      </section>

      {/* 🚀 7. DEDICATED STYLISH 3D CONTACT SECTION */}
      <section className="py-16 px-4 bg-[#0D0D0D] border-t border-[#D4AF37]/20 relative [perspective:1200px]">
        <div className="container mx-auto max-w-7xl space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30 inline-flex items-center space-x-1.5 uppercase tracking-widest">
              <Sparkles size={14} className="text-[#D4AF37] animate-pulse" />
              <span>STAY CONNECTED WITH US</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#D4AF37] uppercase tracking-wider gold-text-glow">
              CONTACT & ASSISTANCE
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-light">
              Reach out to our 24/7 dedicated luxury customer care team
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-gray-800 hover:border-[#D4AF37] transition-all duration-300 shadow-xl hover:-translate-y-2 glass-3d-card flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg shadow-[#D4AF37]/20">
                <PhoneCall size={26} />
              </div>
              <h3 className="font-serif font-bold text-lg text-white uppercase">Call Us Directly</h3>
              <p className="text-xs text-gray-400 font-light">Available 24/7 for order support</p>
              <a href={`tel:${settings?.phoneNumber || '+880 1707697445'}`} className="text-sm font-bold text-[#D4AF37] hover:underline">
                {settings?.phoneNumber || '+880 1707697445'}
              </a>
            </div>

            <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-gray-800 hover:border-[#D4AF37] transition-all duration-300 shadow-xl hover:-translate-y-2 glass-3d-card flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg shadow-[#D4AF37]/20">
                <Mail size={26} />
              </div>
              <h3 className="font-serif font-bold text-lg text-white uppercase">Email Support</h3>
              <p className="text-xs text-gray-400 font-light">Instant response for queries</p>
              <a href={`mailto:${settings?.contactEmail || 'kon497733@gmail.com'}`} className="text-sm font-bold text-[#D4AF37] hover:underline">
                {settings?.contactEmail || 'kon497733@gmail.com'}
              </a>
            </div>

            <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-gray-800 hover:border-[#D4AF37] transition-all duration-300 shadow-xl hover:-translate-y-2 glass-3d-card flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg shadow-[#D4AF37]/20">
                <MapPin size={26} />
              </div>
              <h3 className="font-serif font-bold text-lg text-white uppercase">Visit Showroom</h3>
              <p className="text-xs text-gray-400 font-light">Flagship store location</p>
              <p className="text-xs font-bold text-[#D4AF37] leading-relaxed">
                {settings?.address || 'CDA Agrabad, Chattogram, Bangladesh'}
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
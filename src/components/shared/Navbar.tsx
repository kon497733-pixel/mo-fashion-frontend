import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, Menu, X, Home, Grid, Info, User, 
  ShieldCheck, ChevronDown, Package, Folder, ArrowRight
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { 
  supabase, 
  getSupabaseSettings, 
  getSupabaseCategories, 
  getSupabaseProducts 
} from '../../lib/supabase';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items } = useCartStore();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchQueryOpen] = useState(false);
  const [isCategoriesHovered, setIsCategoriesHovered] = useState(false);
  const [logoTilt, setLogoTilt] = useState({ x: 0, y: 0 });

  // 🚀 কাস্টমার লগইন স্ট্যাটাস চেক (Customer Auth Check)
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState<boolean>(() => {
    try {
      const user = localStorage.getItem('mo_fashion_customer_user') || localStorage.getItem('mo_fashion_user');
      return !!user;
    } catch (e) {
      return false;
    }
  });

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    tagline: 'LUXURY COLLECTION',
    logoUrl: ''
  });

  // 🚀 মোট কার্ট আইটেম সংখ্যা হিসাব
  const totalCartCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  // 🚀 অল-ডিভাইস রিয়েল-টাইম সেটিংস সিঙ্ক (Supabase Realtime Channel)
  useEffect(() => {
    const loadNavbarData = async () => {
      try {
        const user = localStorage.getItem('mo_fashion_customer_user') || localStorage.getItem('mo_fashion_user');
        setIsCustomerLoggedIn(!!user);
      } catch (e) {}

      const cachedSet = localStorage.getItem('mo_fashion_settings');
      if (cachedSet) { try { setSettings(JSON.parse(cachedSet)); } catch (e) {} }

      const cachedCats = localStorage.getItem('mo_fashion_categories');
      if (cachedCats) { try { setCategoriesList(JSON.parse(cachedCats)); } catch (e) {} }

      const cachedProds = localStorage.getItem('mo_fashion_products');
      if (cachedProds) { try { setProductsList(JSON.parse(cachedProds)); } catch (e) {} }

      try {
        const [cloudSet, cloudCats, cloudProds] = await Promise.all([
          getSupabaseSettings().catch(() => null),
          getSupabaseCategories().catch(() => []),
          getSupabaseProducts().catch(() => [])
        ]);

        if (cloudSet) setSettings(cloudSet);
        if (Array.isArray(cloudCats) && cloudCats.length > 0) setCategoriesList(cloudCats);
        if (Array.isArray(cloudProds) && cloudProds.length > 0) setProductsList(cloudProds);
      } catch (e) {}
    };

    loadNavbarData();

    // 🚀 ALL-DEVICE REALTIME LISTENERS
    const channel = supabase
      .channel('public:navbar:live:sync:v120')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new) {
            setSettings((prev: any) => ({ ...prev, ...payload.new }));
            localStorage.setItem('mo_fashion_settings', JSON.stringify(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => loadNavbarData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => loadNavbarData()
      )
      .subscribe();

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleStorage = () => loadNavbarData();
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchQueryOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('settingsUpdated', handleStorage);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('settingsUpdated', handleStorage);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 🚀 ১ম অক্ষর টাইপ করা মাত্রই [Product] ও [Category] লাইভ সার্চ
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matchedCats = categoriesList
      .filter(c => String(c.name || '').toLowerCase().includes(q))
      .map(c => ({
        type: 'Category',
        id: String(c.id || c._id),
        name: c.name,
        image: c.image || c.imageUrl || '',
        url: `/products?category=${encodeURIComponent(c.name)}`
      }));

    const matchedProds = productsList
      .filter(p => String(p.name || '').toLowerCase().includes(q) || String(p.category || '').toLowerCase().includes(q))
      .map(p => {
        const origPrice = Number(p.price) || 0;
        const discountPercent = Number(p.discount) || 0;
        const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;

        return {
          type: 'Product',
          id: String(p.id || p._id),
          name: p.name,
          price: finalPrice,
          category: p.category,
          image: p.images?.[0] || p.imageUrl || p.image || '',
          url: `/product/${p.id || p._id}`
        };
      });

    return [...matchedCats, ...matchedProds].slice(0, 7);
  })();

  const handleLogoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setLogoTilt({ x: y * 25, y: -x * 25 });
  };

  const handleLogoMouseLeave = () => setLogoTilt({ x: 0, y: 0 });

  const handleSelectSearchResult = (url: string) => {
    navigate(url);
    setSearchQuery('');
    setSearchQueryOpen(false);
  };

  const customerProfilePath = isCustomerLoggedIn ? '/profile' : '/login';

  const bottomNavItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Categories', path: '/categories', icon: Grid },
    { name: 'Cart', path: '/cart', icon: ShoppingBag, badge: totalCartCount },
    { name: 'About', path: '/about', icon: Info },
    { name: isCustomerLoggedIn ? 'Profile' : 'Sign In', path: customerProfilePath, icon: User },
  ];

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';
  const storeTaglineText = settings?.tagline || settings?.storeTagline || 'LUXURY COLLECTION';

  return (
    <>
      {/* 🚀 3D GLASSMORPHIC TOP NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#111111]/90 backdrop-blur-2xl border-b border-[#D4AF37]/40 shadow-[0_15px_40px_rgba(0,0,0,0.9)] py-3 glass-3d-panel' 
          : 'bg-gradient-to-b from-[#111111] via-[#111111]/80 to-transparent py-5'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl flex items-center justify-between">
          
          {/* Mobile Menu Hamburger Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-gray-300 hover:text-[#D4AF37] p-2 rounded-xl border border-gray-800 bg-[#1A1A1A]/90 backdrop-blur-md active:scale-95 transition-all shadow-md"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* 🚀 3D STORE LOGO & DYNAMIC BRAND TITLE */}
          <div 
            className="[perspective:1000px] cursor-pointer group py-1"
            onMouseMove={handleLogoMouseMove}
            onMouseLeave={handleLogoMouseLeave}
            onClick={() => navigate('/')}
          >
            <div 
              className="flex items-center space-x-3 transition-transform duration-200 ease-out [transform-style:preserve-3d] will-change-transform"
              style={{
                transform: `rotateX(${logoTilt.x}deg) rotateY(${logoTilt.y}deg) translateZ(12px)`
              }}
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#fff5c0] to-[#aa8c2c] p-[1.5px] shadow-[0_10px_25px_rgba(212,175,55,0.35)] group-hover:shadow-[0_15px_35px_rgba(212,175,55,0.65)] transition-all duration-300 [transform-style:preserve-3d] shrink-0 overflow-hidden">
                <div className="w-full h-full bg-[#111111] rounded-2xl flex items-center justify-center border border-[#D4AF37]/50 backdrop-blur-md overflow-hidden [transform:translateZ(10px)]">
                  {storeLogoImage ? (
                    <img src={storeLogoImage} alt={storeBrandTitle} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-serif font-bold text-[#D4AF37] text-sm md:text-base tracking-widest">
                      {storeBrandTitle.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col [transform:translateZ(15px)]">
                <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#ffffff] to-[#aa8c2c] drop-shadow-[0_4px_12px_rgba(212,175,55,0.4)] uppercase">
                  {storeBrandTitle}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-gray-400 font-sans font-semibold -mt-1 flex items-center">
                  {storeTaglineText} <ShieldCheck size={10} className="ml-1 text-[#D4AF37]" />
                </span>
              </div>
            </div>
          </div>

          {/* 🚀 DESKTOP NAV LINKS */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/"
              className={`relative text-xs font-bold tracking-[0.2em] transition-all duration-300 py-2 group ${
                location.pathname === '/' ? 'text-[#D4AF37]' : 'text-gray-300 hover:text-[#D4AF37]'
              }`}
            >
              <span>HOME</span>
              <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-[#D4AF37] transition-transform ${
                location.pathname === '/' ? 'scale-x-100 shadow-[0_0_12px_#D4AF37]' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>

            {/* CATEGORIES WITH 3D HOVER DROPDOWN BOX */}
            <div 
              className="relative py-2"
              onMouseEnter={() => setIsCategoriesHovered(true)}
              onMouseLeave={() => setIsCategoriesHovered(false)}
            >
              <Link
                to="/categories"
                className={`flex items-center space-x-1 text-xs font-bold tracking-[0.2em] transition-all duration-300 group ${
                  location.pathname === '/categories' ? 'text-[#D4AF37]' : 'text-gray-300 hover:text-[#D4AF37]'
                }`}
              >
                <span>CATEGORIES</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isCategoriesHovered ? 'rotate-180 text-[#D4AF37]' : ''}`} />
              </Link>

              {/* 3D HOVER DROPDOWN BOX */}
              {isCategoriesHovered && categoriesList.length > 0 && (
                <div className="absolute top-full left-0 w-64 bg-[#1A1A1A]/95 border border-[#D4AF37]/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(212,175,55,0.25)] p-3 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 z-50 glass-3d-panel">
                  <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest px-3 py-1.5 border-b border-gray-800 mb-1 flex justify-between items-center">
                    <span>EXPLORE CATEGORIES</span>
                    <Folder size={12} />
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {categoriesList.map((cat: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => {
                          navigate(`/products?category=${encodeURIComponent(cat.name)}`);
                          setIsCategoriesHovered(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#111111] hover:text-[#D4AF37] text-gray-300 text-xs font-bold transition-all cursor-pointer group"
                      >
                        <span className="line-clamp-1">{cat.name}</span>
                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#D4AF37]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/about"
              className={`relative text-xs font-bold tracking-[0.2em] transition-all duration-300 py-2 group ${
                location.pathname === '/about' ? 'text-[#D4AF37]' : 'text-gray-300 hover:text-[#D4AF37]'
              }`}
            >
              <span>ABOUT</span>
              <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-[#D4AF37] transition-transform ${
                location.pathname === '/about' ? 'scale-x-100 shadow-[0_0_12px_#D4AF37]' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>
          </nav>

          {/* 🚀 SEARCH & ACTIONS */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* SEARCH INPUT BAR WITH 3D AUTOCOMPLETE DROPDOWN */}
            <div ref={searchContainerRef} className="relative hidden sm:block w-44 md:w-64">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products & categories..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchQueryOpen(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setSearchQueryOpen(true);
                  }}
                  className="w-full bg-[#1A1A1A]/90 border border-gray-800 focus:border-[#D4AF37] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all backdrop-blur-md shadow-inner"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              </div>

              {/* 3D SEARCH DROPDOWN BOX */}
              {searchDropdownOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A]/95 border border-[#D4AF37]/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-2 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 z-[100] max-h-80 overflow-y-auto custom-scrollbar glass-3d-panel">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1 border-b border-gray-800 mb-1 flex justify-between items-center">
                    <span>SUGGESTED RESULTS</span>
                    <span className="text-[#D4AF37]">{searchResults.length} Matches</span>
                  </div>

                  <div className="space-y-1">
                    {searchResults.map((result: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSearchResult(result.url)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-[#111111] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-[#111111] border border-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {result.image ? (
                              <img src={result.image} alt="" className="w-full h-full object-cover" />
                            ) : result.type === 'Category' ? (
                              <Folder size={14} className="text-[#D4AF37]" />
                            ) : (
                              <Package size={14} className="text-gray-500" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-gray-200 group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                            {result.name}
                          </span>
                        </div>

                        <div className="shrink-0 pl-2">
                          {result.type === 'Product' ? (
                            <span className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                              [Product] ৳{Number(result.price || 0).toFixed(0)}
                            </span>
                          ) : (
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                              [Category]
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3D Cart Icon Button */}
            <Link
              to="/cart"
              className="relative p-2.5 bg-[#1A1A1A]/90 hover:bg-[#D4AF37]/20 text-white hover:text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-300 group shadow-[0_5px_15px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 flex items-center justify-center [transform-style:preserve-3d]"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-[#D4AF37] to-[#e6c662] text-black font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#111111] shadow-[0_0_12px_rgba(212,175,55,0.9)] animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </Link>

            {/* USER PROFILE ICON */}
            <Link
              to={customerProfilePath}
              className={`hidden sm:flex p-2.5 rounded-xl border transition-all duration-300 active:scale-95 shadow-md ${
                isCustomerLoggedIn 
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40 hover:bg-[#D4AF37] hover:text-black' 
                  : 'bg-[#1A1A1A]/90 text-gray-300 hover:text-[#D4AF37] border-gray-800 hover:border-[#D4AF37]/40'
              }`}
              title={isCustomerLoggedIn ? "Customer Profile" : "Customer Sign In / Sign Up"}
            >
              <User size={20} />
            </Link>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#111111]/95 border-b border-[#D4AF37]/30 backdrop-blur-2xl animate-in slide-in-from-top-5 duration-300">
            <div className="px-6 py-6 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products & categories..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchQueryOpen(e.target.value.trim().length > 0);
                  }}
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-10 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />

                {searchQuery.trim() && searchResults.length > 0 && (
                  <div className="mt-2 bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-xl p-2 space-y-1">
                    {searchResults.map((res: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => {
                          handleSelectSearchResult(res.url);
                          setMobileMenuOpen(false);
                        }}
                        className="p-2 bg-[#111111] rounded-lg flex justify-between items-center text-xs font-bold text-white"
                      >
                        <span className="line-clamp-1">{res.name}</span>
                        <span className={res.type === 'Product' ? 'text-[#D4AF37]' : 'text-purple-400'}>
                          [{res.type}]
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-3 pt-2">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold tracking-wider py-2.5 px-4 rounded-xl text-gray-300 hover:bg-gray-800">
                  HOME
                </Link>
                <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold tracking-wider py-2.5 px-4 rounded-xl text-gray-300 hover:bg-gray-800">
                  CATEGORIES
                </Link>
                <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold tracking-wider py-2.5 px-4 rounded-xl text-gray-300 hover:bg-gray-800">
                  ABOUT
                </Link>
                <Link to={customerProfilePath} onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold tracking-wider py-2.5 px-4 rounded-xl text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-between">
                  <span>{isCustomerLoggedIn ? 'CUSTOMER PROFILE' : 'CUSTOMER SIGN IN / SIGN UP'}</span>
                  <User size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 🚀 3D FLOATING LUXURY MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50 [perspective:1000px]">
        <nav className="bg-[#1A1A1A]/85 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-2xl p-2 shadow-[0_15px_35px_rgba(0,0,0,0.95),0_0_25px_rgba(212,175,55,0.25)] flex items-center justify-around [transform-style:preserve-3d] transition-all duration-300 [transform:translateZ(15px)]">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-300 active:scale-90 [transform-style:preserve-3d] ${
                  isActive 
                    ? 'text-[#D4AF37] scale-105 [transform:translateZ(10px)]' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/25 to-transparent rounded-xl border border-[#D4AF37]/50 shadow-[0_0_18px_rgba(212,175,55,0.45)] animate-pulse" />
                )}

                <div className="relative z-10 flex flex-col items-center [transform-style:preserve-3d]">
                  <div className="relative">
                    <Icon size={20} className={isActive ? 'text-[#D4AF37] drop-shadow-[0_0_10px_#D4AF37]' : ''} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-black font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-black shadow-md animate-bounce">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold tracking-wider mt-1 font-serif">
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
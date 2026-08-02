import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, Search, Home as HouseIcon, Layers, Sparkles } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((total: number, item: any) => total + (item.quantity || 1), 0);

  // 🚀 ডায়নামিক API ইউআরএল (যাতে যেকোনো মোবাইল বা পিসি থেকে সেভড লোগো লোড হয়)
  const getApiUrl = () => {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:5000/api/settings`;
  };

  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: 'MO FASHION',
    logoUrl: ''
  });

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 🚀 ১. ক্লাউড ডাটাবেস (MongoDB API) থেকে লাইভ লোগো ও স্টোর নেম সিঙ্ক করা
  useEffect(() => {
    const fetchNavbarSettings = async () => {
      // ১. প্রথমে লোকাল মেমোরি থেকে ইনস্ট্যান্ট ডাটা লোড করা
      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try {
          setSiteSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error("Error parsing site settings", e);
        }
      }

      // ২. লাইভ ক্লাউড ডাটাবেস (MongoDB Backend) থেকে রিয়েল-টাইম লোগো সিঙ্ক করা
      try {
        const response = await fetch(getApiUrl());
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData && Object.keys(cloudData).length > 0) {
            setSiteSettings(cloudData);
            localStorage.setItem('mo_fashion_settings', JSON.stringify(cloudData));
          }
        }
      } catch (err) {
        console.warn("Backend API offline, using cached navbar settings.");
      }
    };

    fetchNavbarSettings();

    // অ্যাডমিন প্যানেল থেকে সেভ করার সাথে সাথে লাইভ আপডেট হওয়ার ইভেন্ট লিসেনার
    const handleSettingsUpdate = () => fetchNavbarSettings();
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    const savedProducts = localStorage.getItem('mo_fashion_products');
    if (savedProducts) {
      try { setAllProducts(JSON.parse(savedProducts)); } catch (e) {}
    }

    const savedCategories = localStorage.getItem('mo_fashion_categories');
    if (savedCategories) {
      try { setAllCategories(JSON.parse(savedCategories)); } catch (e) {}
    } else {
      setAllCategories([
        { id: 1, name: "Men's Collection" },
        { id: 2, name: "Women's Collection" },
        { id: 3, name: "Accessories" },
      ]);
    }
  }, []);

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const filteredResults: any[] = [];
  if (searchQuery.trim().length > 0) {
    const lowerQuery = searchQuery.toLowerCase();
    
    allCategories.forEach(c => {
      if (c.name && c.name.toLowerCase().includes(lowerQuery)) {
        filteredResults.push({ id: c.id || c._id, name: c.name, type: 'Category', link: `/category/${encodeURIComponent(c.name)}` });
      }
    });

    allProducts.forEach(p => {
      if (p.name && (p.name.toLowerCase().includes(lowerQuery) || (p.category && p.category.toLowerCase().includes(lowerQuery)))) {
        filteredResults.push({ id: p._id || p.id, name: p.name, type: 'Product', link: `/product/${p._id || p.id}` });
      }
    });
  }

  const SearchBarComponent = () => (
    <div className="relative w-full z-50">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-gray-500" />
      </div>
      <input
        type="text"
        placeholder="Search for products, categories..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="w-full bg-[#111111] border border-gray-800 rounded-full pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm shadow-inner"
      />

      {showDropdown && searchQuery.trim().length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto custom-scrollbar">
          {filteredResults.length > 0 ? (
            <ul className="py-2">
              {filteredResults.map((result, index) => (
                <li key={`${result.type}-${result.id}-${index}`}>
                  <Link
                    to={result.link}
                    onClick={() => {
                      setSearchQuery('');
                      setShowDropdown(false);
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#111111] transition-colors border-b border-gray-800 last:border-0"
                  >
                    <span className="text-white font-medium text-sm truncate pr-4">{result.name}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded shrink-0 ${
                      result.type === 'Category' 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                      : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                    }`}>
                      {result.type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm font-medium">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-secondary border-b border-primary/20 sticky top-0 z-50 shadow-md py-2">
      <div className="container mx-auto px-4 flex justify-between items-center gap-4">
        
        {/* 🚀 লোগো এবং স্টোরের নাম */}
        <div className="flex items-center space-x-3 shrink-0">
          
          <Link to="/" className="flex items-center space-x-3 group shrink-0">
            {siteSettings?.logoUrl && siteSettings.logoUrl.trim() !== '' && (
              <img 
                src={siteSettings.logoUrl} 
                alt="Logo" 
                className="h-10 md:h-12 w-auto max-w-[140px] md:max-w-[180px] object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.4)] mix-blend-screen transition-transform group-hover:scale-105"
              />
            )}
            <span className="text-2xl md:text-3xl font-serif font-bold text-primary tracking-widest drop-shadow">
              {siteSettings?.storeName || 'MO FASHION'}
            </span>
          </Link>

          {/* 🚀 নেভিগেশন লিংকসমূহ (হাউস আইকন এবং গ্লোয়িং বাটন সহ) */}
          <nav className="hidden lg:flex items-center space-x-3 pl-4 border-l border-primary/20">
            <Link 
              to="/" 
              className={`transition-all duration-300 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isActivePath('/') && location.pathname === '/'
                ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.6)] border border-[#D4AF37] scale-105' 
                : 'text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A] hover:shadow-[0_0_10px_rgba(212,175,55,0.3)]'
              }`}
            >
              <HouseIcon size={16} className={isActivePath('/') && location.pathname === '/' ? 'drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]' : 'text-[#D4AF37]'} />
              <span>Home</span>
            </Link>

            <Link 
              to="/categories" 
              className={`transition-all duration-300 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isActivePath('/categories') || isActivePath('/category')
                ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.6)] border border-[#D4AF37] scale-105' 
                : 'text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A] hover:shadow-[0_0_10px_rgba(212,175,55,0.3)]'
              }`}
            >
              <Layers size={16} className={isActivePath('/categories') || isActivePath('/category') ? 'drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]' : 'text-[#D4AF37]'} />
              <span>Categories</span>
            </Link>

            <Link 
              to="/about" 
              className={`transition-all duration-300 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isActivePath('/about')
                ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.6)] border border-[#D4AF37] scale-105' 
                : 'text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A] hover:shadow-[0_0_10px_rgba(212,175,55,0.3)]'
              }`}
            >
              <Sparkles size={16} className={isActivePath('/about') ? 'drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]' : 'text-[#D4AF37]'} />
              <span>About</span>
            </Link>
          </nav>

        </div>

        {/* ডেস্কটপ সার্চ বার */}
        <div className="hidden md:block flex-1 max-w-sm mx-4">
          <SearchBarComponent />
        </div>

        {/* 🚀 গ্লোয়িং আইকন সমূহ */}
        <div className="hidden md:flex items-center space-x-6 shrink-0">
          <Link to="/cart" className="text-white hover:text-[#D4AF37] transition-all relative group">
            <ShoppingBag size={24} className="group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.8)] transition-all" />
            <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-black text-xs font-black rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_10px_#D4AF37] animate-pulse">
              {cartCount}
            </span>
          </Link>
          <Link to="/profile" className="text-white hover:text-[#D4AF37] transition-all group">
            <User size={24} className="group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.8)] transition-all" />
          </Link>
        </div>

        {/* মোবাইল মেনু বাটন */}
        <button 
          className="md:hidden text-primary hover:text-white transition-colors" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* মোবাইল মেনু ড্রপডাউন */}
      {isOpen && (
        <div className="md:hidden bg-[#1A1A1A] border-t border-primary/20 pb-4 shadow-2xl absolute w-full">
          <div className="p-4 border-b border-gray-800">
            <SearchBarComponent />
          </div>

          <div className="flex flex-col space-y-2 px-4 pt-4">
            <Link 
              to="/" 
              onClick={() => setIsOpen(false)}
              className={`font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center space-x-2 ${
                isActivePath('/') && location.pathname === '/'
                ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                : 'text-white hover:text-primary'
              }`}
            >
              <HouseIcon size={16} />
              <span>Home</span>
            </Link>

            <Link 
              to="/categories" 
              onClick={() => setIsOpen(false)}
              className={`font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center space-x-2 ${
                isActivePath('/categories') || isActivePath('/category')
                ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                : 'text-white hover:text-primary'
              }`}
            >
              <Layers size={16} />
              <span>Categories</span>
            </Link>

            <Link 
              to="/about" 
              onClick={() => setIsOpen(false)}
              className={`font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all flex items-center space-x-2 ${
                isActivePath('/about')
                ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                : 'text-white hover:text-primary'
              }`}
            >
              <Sparkles size={16} />
              <span>About</span>
            </Link>

            <div className="flex space-x-6 pt-4 border-t border-primary/10">
              <Link to="/cart" className="text-white hover:text-primary flex items-center space-x-2" onClick={() => setIsOpen(false)}>
                <ShoppingBag size={20} /> <span>Cart ({cartCount})</span>
              </Link>
              <Link to="/profile" className="text-white hover:text-primary flex items-center space-x-2" onClick={() => setIsOpen(false)}>
                <User size={20} /> <span>Profile</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, Menu, X, Home, Grid, Info, User, 
  ShieldCheck 
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { getSupabaseSettings } from '../../lib/supabase';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items } = useCartStore();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logoTilt, setLogoTilt] = useState({ x: 0, y: 0 });
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    tagline: 'LUXURY COLLECTION',
    logoUrl: ''
  });

  // 🚀 মোট কার্ট আইটেম সংখ্যা হিসাব
  const totalCartCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  useEffect(() => {
    const loadSettings = async () => {
      const cached = localStorage.getItem('mo_fashion_settings');
      if (cached) {
        try { setSettings(JSON.parse(cached)); } catch (e) {}
      }

      try {
        const cloudSet = await getSupabaseSettings();
        if (cloudSet) setSettings(cloudSet);
      } catch (e) {}
    };

    loadSettings();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleSettingsUpdate = () => loadSettings();

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('storage', handleSettingsUpdate);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', handleSettingsUpdate);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  // 🚀 Pure CSS 3D Perspective Tilt Engine for Logo
  const handleLogoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setLogoTilt({ x: y * 25, y: -x * 25 });
  };

  const handleLogoMouseLeave = () => {
    setLogoTilt({ x: 0, y: 0 });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'CATEGORIES', path: '/categories' },
    { name: 'COLLECTION', path: '/products' },
    { name: 'ABOUT', path: '/about' },
  ];

  const bottomNavItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Categories', path: '/categories', icon: Grid },
    { name: 'Cart', path: '/cart', icon: ShoppingBag, badge: totalCartCount },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Profile', path: '/admin', icon: User },
  ];

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';
  const storeTaglineText = settings?.tagline || settings?.storeTagline || 'LUXURY COLLECTION';

  return (
    <>
      {/* 🚀 PURE CSS 3D LUXURY TOP NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#111111]/90 backdrop-blur-xl border-b border-[#D4AF37]/30 shadow-[0_10px_30px_rgba(0,0,0,0.85)] py-3' 
          : 'bg-gradient-to-b from-[#111111] via-[#111111]/80 to-transparent py-5'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl flex items-center justify-between">
          
          {/* Mobile Menu Hamburger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-gray-300 hover:text-[#D4AF37] p-2 rounded-xl border border-gray-800 bg-[#1A1A1A]/90 backdrop-blur-md active:scale-95 transition-all shadow-md"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* 🚀 PURE CSS 3D PERSPECTIVE LOGO (AUTHENTIC LOGO IMAGE OR BRAND EMBLEM) */}
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
              {/* 3D Pure CSS Metallic Gold Logo Container */}
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

              {/* 3D Brand Title & Dynamic Tagline from Admin Settings */}
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

          {/* Desktop Navigation Links with Pure CSS 3D Depth */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative text-xs font-bold tracking-[0.2em] transition-all duration-300 py-2 group [transform-style:preserve-3d] ${
                    isActive ? 'text-[#D4AF37]' : 'text-gray-300 hover:text-[#D4AF37]'
                  }`}
                >
                  <span className="relative z-10 group-hover:[transform:translateZ(8px)] transition-transform inline-block">
                    {link.name}
                  </span>
                  {/* 3D Glowing Underline Bar */}
                  <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent transform transition-transform duration-300 ${
                    isActive ? 'scale-x-100 shadow-[0_0_15px_#D4AF37]' : 'scale-x-0 group-hover:scale-x-100'
                  }`} />
                </Link>
              );
            })}
          </nav>

          {/* Search & Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-40 md:w-56">
              <input
                type="text"
                placeholder="Search luxury items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A]/80 border border-gray-800 rounded-xl px-9 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition-all backdrop-blur-md shadow-inner"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            </form>

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

            {/* Admin Profile Button */}
            <Link
              to="/admin"
              className="hidden sm:flex p-2.5 bg-[#1A1A1A]/90 hover:bg-[#D4AF37]/20 text-gray-300 hover:text-[#D4AF37] border border-gray-800 hover:border-[#D4AF37]/40 rounded-xl transition-all duration-300 active:scale-95 shadow-md"
              title="Admin Panel"
            >
              <User size={20} />
            </Link>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#111111]/95 border-b border-[#D4AF37]/30 backdrop-blur-2xl animate-in slide-in-from-top-5 duration-300">
            <div className="px-6 py-6 space-y-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-10 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
              </form>

              <div className="flex flex-col space-y-3 pt-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-sm font-bold tracking-wider py-2.5 px-4 rounded-xl transition-all ${
                      location.pathname === link.path 
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30' 
                        : 'text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 🚀 PURE CSS 3D FLOATING LUXURY MOBILE BOTTOM NAVIGATION BAR */}
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
                {/* Pure CSS 3D Active Glowing Pill */}
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
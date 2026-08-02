import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home as HouseIcon, Layers, ShoppingBag, Sparkles, User } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import { useCartStore } from '../store/useCartStore';

export default function MainLayout() {
  const location = useLocation();
  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((total: number, item: any) => total + (item.quantity || 1), 0);

  // 🚀 নেটফ্লিক্স-স্টাইল ইনট্রো স্প্ল্যাশ অ্যানিমেশন স্টেট
  const [showSplash, setShowSplash] = useState(true);
  const [splashPhase, setSplashPhase] = useState(1); 
  
  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: 'MO FASHION',
    logoUrl: '',
    tagline: 'Premium E-Commerce Experience'
  });

  // 🚀 প্রসেসড পিএনজি লোগো স্টেট (ব্যাকগ্রাউন্ড ঘর ভ্যানিশ করার পর)
  const [cleanLogoUrl, setCleanLogoUrl] = useState('');

  // 🚀 অটোমেটিক ফেইক চেকবার্ড ব্যাকগ্রাউন্ড মুছে ফেলার অ্যালগরিদম
  const removeCheckerboard = (imageSrc: string) => {
    if (!imageSrc || imageSrc.trim() === '') return;
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setCleanLogoUrl(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // পিক্সেল বাই পিক্সেল চেক করে ফেক চেকবার্ড ঘর ডিলিট করা
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // ধূসর ও সাদা ঘরের পিক্সেল চেনা
        const isGreyOrWhite = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
        const isNotGold = !(r > 120 && g > 80 && b < 140); // গোল্ডেন কালার রক্ষা করা

        if (isGreyOrWhite && isNotGold && (r > 60 || g > 60 || b > 60)) {
          data[i + 3] = 0; // স্বচ্ছ (Transparent) করে দেওয়া
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setCleanLogoUrl(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setCleanLogoUrl(imageSrc);
    img.src = imageSrc;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSiteSettings(parsed);
          updateFavicon(parsed.logoUrl);
          if (parsed.logoUrl) removeCheckerboard(parsed.logoUrl);
        } catch (e) {}
      }

      try {
        const hostname = window.location.hostname || 'localhost';
        const response = await fetch(`http://${hostname}:5000/api/settings`);
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData && Object.keys(cloudData).length > 0) {
            setSiteSettings(cloudData);
            localStorage.setItem('mo_fashion_settings', JSON.stringify(cloudData));
            updateFavicon(cloudData.logoUrl);
            if (cloudData.logoUrl) removeCheckerboard(cloudData.logoUrl);
          }
        }
      } catch (err) {
        console.warn("Backend API offline, using cached settings.");
      }
    };

    fetchSettings();

    // 🚀 নেটফ্লিক্স স্টাইল ইনট্রো অ্যানিমেশন টাইমিং
    const timer1 = setTimeout(() => setSplashPhase(2), 1200); 
    const timer2 = setTimeout(() => setSplashPhase(3), 3000); 
    const timer3 = setTimeout(() => setShowSplash(false), 3800); 

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const updateFavicon = (logoUrl: string) => {
    if (!logoUrl || logoUrl.trim() === '') return;
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = logoUrl;
  };

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const displayLogo = cleanLogoUrl || siteSettings?.logoUrl;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      
      {/* 🚀 নেটফ্লিক্স স্টাইল জুম-ইন ও গ্লো অ্যানিমেশন CSS */}
      <style>{`
        @keyframes netflixZoomGlow {
          0% {
            transform: scale(0.1);
            opacity: 0;
            filter: blur(12px) drop-shadow(0 0 0px rgba(212, 175, 55, 0));
          }
          65% {
            transform: scale(1.25);
            opacity: 1;
            filter: blur(0px) drop-shadow(0 0 35px rgba(212, 175, 55, 0.9));
          }
          100% {
            transform: scale(1);
            opacity: 1;
            filter: blur(0px) drop-shadow(0 0 25px rgba(212, 175, 55, 0.7));
          }
        }
      `}</style>

      {/* 🎬 🚀 ১. নেটফ্লিক্স-স্টাইল সিনেম্যাটিক ইনট্রো অ্যানিমেশন (Zero Default / Only Admin Selected Logo) */}
      {showSplash && (
        <div className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out select-none ${
          splashPhase === 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          
          {/* ৩৬০ ডিগ্রি অল-সাইড গ্লো ব্যাকগ্রাউন্ড আভা */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4AF37]/15 rounded-full blur-[180px] pointer-events-none animate-pulse"></div>

          <div className="flex items-center justify-center relative z-10 px-4 max-w-full">
            
            {/* 🚀 ছোট থেকে বড় হওয়ার পজিশন কন্টেইনার */}
            <div className={`transition-all duration-1000 ease-out transform flex items-center relative ${
              splashPhase === 1 ? 'scale-125' : 'scale-100'
            }`}>
              
              <div className="absolute inset-0 bg-[#D4AF37]/25 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

              {/* 🚀 শুধুমাত্র অ্যাডমিন থেকে সিলেক্ট করা অরিজিনাল লোগো (কোনো ডিফল্ট লোগো নেই) */}
              {displayLogo && displayLogo.trim() !== '' && (
                <img 
                  src={displayLogo} 
                  alt="Store Logo" 
                  className="w-32 h-32 sm:w-48 sm:h-48 md:w-60 md:h-60 object-contain relative z-10 transition-all duration-700 mix-blend-screen" 
                  style={{ animation: 'netflixZoomGlow 1.2s ease-out forwards' }}
                />
              )}

              {/* 🚀 "FASHION" শব্দটি 'N' সহ ১০০% পুরোপুরি দৃশ্যমান হওয়া */}
              <div className={`overflow-hidden transition-all duration-1000 ease-out flex items-center ml-2 sm:ml-4 shrink-0 ${
                splashPhase >= 2 ? 'max-w-[500px] opacity-100' : 'max-w-0 opacity-0'
              }`}>
                <span className="text-4xl sm:text-6xl md:text-7xl font-serif font-black bg-gradient-to-r from-white via-[#D4AF37] to-white bg-clip-text text-transparent tracking-[0.15em] sm:tracking-[0.2em] uppercase filter drop-shadow-[0_0_25px_rgba(212,175,55,0.9)] whitespace-nowrap animate-pulse pr-2">
                  FASHION
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow pt-16 pb-20 md:pb-0 safe-padding-bottom">
        <Outlet />
      </main>

      {/* 📱 🚀 মোবাইল বটম নেভিগেশন বার (Glowing Mobile App Nav Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141414]/95 backdrop-blur-xl border-t border-[#D4AF37]/30 z-50 px-3 py-2 flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        
        {/* 🏠 Home Button with Glowing House Icon */}
        <Link 
          to="/" 
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative ${
            isActivePath('/') && location.pathname === '/' 
            ? 'text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-[#D4AF37]/40' 
            : 'text-gray-400 hover:text-white'
          }`}
        >
          <HouseIcon size={20} className={isActivePath('/') && location.pathname === '/' ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]' : ''} />
          <span className="text-[10px] mt-1 font-medium tracking-wide">Home</span>
        </Link>

        {/* Categories */}
        <Link 
          to="/categories" 
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative ${
            isActivePath('/categories') || isActivePath('/category')
            ? 'text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-[#D4AF37]/40' 
            : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers size={20} className={isActivePath('/categories') || isActivePath('/category') ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]' : ''} />
          <span className="text-[10px] mt-1 font-medium tracking-wide">Categories</span>
        </Link>

        {/* Cart with Live Glowing Badge */}
        <Link 
          to="/cart" 
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative ${
            isActivePath('/cart') 
            ? 'text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-[#D4AF37]/40' 
            : 'text-gray-400 hover:text-white'
          }`}
        >
          <ShoppingBag size={20} className={isActivePath('/cart') ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]' : ''} />
          {cartCount > 0 && (
            <span className="absolute -top-1 right-1 bg-[#D4AF37] text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-[0_0_10px_#D4AF37] animate-pulse">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] mt-1 font-medium tracking-wide">Cart</span>
        </Link>

        {/* About */}
        <Link 
          to="/about" 
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative ${
            isActivePath('/about') 
            ? 'text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-[#D4AF37]/40' 
            : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles size={20} className={isActivePath('/about') ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]' : ''} />
          <span className="text-[10px] mt-1 font-medium tracking-wide">About</span>
        </Link>

        {/* Profile */}
        <Link 
          to="/profile" 
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative ${
            isActivePath('/profile') 
            ? 'text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-[#D4AF37]/40' 
            : 'text-gray-400 hover:text-white'
          }`}
        >
          <User size={20} className={isActivePath('/profile') ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]' : ''} />
          <span className="text-[10px] mt-1 font-medium tracking-wide">Profile</span>
        </Link>

      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
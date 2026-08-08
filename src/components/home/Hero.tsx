import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Award, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import Hero3DCanvas from './Hero3DCanvas';

interface HeroProps {
  products: any[];
  settings: any;
}

export default function Hero({ products, settings }: HeroProps) {
  const navigate = useNavigate();

  // 🚀 ১. টাইপরাইটার মাল্টি-অ্যানিমেশন স্টেট (Typed-Out Text Animation)
  const fullTitle = settings?.heroTitle || 'ELEVATE YOUR SIGNATURE STYLE';
  const [typedTitle, setTypedTitle] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  useEffect(() => {
    setTypedTitle('');
    setIsTypingDone(false);
    let index = 0;

    const interval = setInterval(() => {
      if (index < fullTitle.length) {
        setTypedTitle((prev) => prev + fullTitle.charAt(index));
        index++;
      } else {
        setIsTypingDone(true);
        clearInterval(interval);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [fullTitle]);

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center py-12 px-4 [perspective:1200px] overflow-hidden">
      
      {/* 🚀 3D Ambient Background Glow Particle Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-[#D4AF37]/15 rounded-full blur-[160px] pointer-events-none animate-pulse" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          
          {/* LEFT SIDE: TYPED-OUT ANIMATED TEXT & HEADINGS */}
          <div className="space-y-6 text-center lg:text-left [transform-style:preserve-3d]">
            
            {/* 1. Animated Badge */}
            <div className="inline-flex items-center space-x-2 bg-[#1A1A1A]/90 border border-[#D4AF37]/40 px-4 py-2 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(212,175,55,0.25)] animate-in fade-in slide-in-from-top-3 duration-500 glass-3d-panel">
              {storeLogoImage ? (
                <img src={storeLogoImage} alt={storeBrandTitle} className="w-4 h-4 object-cover rounded-full" />
              ) : (
                <Sparkles size={14} className="text-[#D4AF37] animate-pulse" />
              )}
              <span className="text-xs font-bold tracking-[0.25em] text-[#D4AF37] uppercase">
                {settings?.heroBadge || 'EXCLUSIVE LUXURY COLLECTION'}
              </span>
            </div>

            {/* 2. TYPED-OUT TYPEWRITER ANIMATED HEADLINE */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f3e5ab] to-[#D4AF37] drop-shadow-[0_10px_25px_rgba(212,175,55,0.35)] uppercase gold-text-glow min-h-[120px] sm:min-h-[150px]">
              {typedTitle}
              {!isTypingDone && (
                <span className="inline-block w-1.5 h-8 sm:h-12 bg-[#D4AF37] ml-1 animate-ping" />
              )}
            </h1>

            {/* 3. Animated Paragraph */}
            <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto lg:mx-0 leading-relaxed font-light animate-in fade-in duration-1000 delay-300">
              {settings?.heroDescription || 'Discover handcrafted luxury apparel and accessories designed to redefine modern elegance. Premium quality tailored for perfection.'}
            </p>

            {/* 4. Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => navigate('/products')}
                className="px-8 py-4 bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#aa8c2c] text-black font-extrabold text-xs sm:text-sm tracking-[0.2em] uppercase rounded-xl shadow-[0_10px_30px_rgba(212,175,55,0.4)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.7)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2"
              >
                <span>SHOP COLLECTION</span>
                <ChevronRight size={18} />
              </button>

              <button
                onClick={() => navigate('/categories')}
                className="px-8 py-4 bg-[#1A1A1A]/80 hover:bg-[#D4AF37]/20 text-white hover:text-[#D4AF37] font-extrabold text-xs sm:text-sm tracking-[0.2em] uppercase rounded-xl border border-gray-800 hover:border-[#D4AF37]/50 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 glass-3d-panel"
              >
                EXPLORE CATEGORIES
              </button>
            </div>

          </div>

          {/* RIGHT SIDE: THREE.JS WEBGL 3D CANVAS & SHOWCASE */}
          <div className="w-full">
            <Hero3DCanvas products={products} settings={settings} />
          </div>

        </div>
      </div>
    </section>
  );
}
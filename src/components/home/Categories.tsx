import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Folder, Sparkles, Grid } from 'lucide-react';

interface CategoriesProps {
  categories: any[];
  products: any[];
  settings: any;
}

export default function Categories({ categories, products, settings }: CategoriesProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cardTilt, setCardTilt] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [typedTitle, setTypedTitle] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  const fullTitle = "EXPLORE LUXURY COLLECTIONS";

  // 🚀 ১. টাইপরাইটার মাল্টি-অ্যানিমেশন (Typewriter Scrub Animation)
  useEffect(() => {
    setTypedTitle('');
    setIsTypingDone(false);
    let idx = 0;

    const interval = setInterval(() => {
      if (idx < fullTitle.length) {
        setTypedTitle((prev) => prev + fullTitle.charAt(idx));
        idx++;
      } else {
        setIsTypingDone(true);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [fullTitle]);

  // 🚀 ২. ব্যাকগ্রাউন্ড ৩ডি পার্টিকেলস ক্যানভাস (3D Particle Physics Animation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particleTime = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };

    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 200 + 20,
      radius: Math.random() * 2 + 1,
      speed: Math.random() * 0.6 + 0.2
    }));

    const renderParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particleTime += 0.015;

      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) p.y = canvas.height;

        const px = p.x + Math.sin(particleTime + p.z) * 8;
        const py = p.y;
        const scale = 200 / (200 + p.z);

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, p.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${0.4 * scale})`;
        ctx.shadowColor = '#D4AF37';
        ctx.shadowBlur = 8 * scale;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(renderParticles);
    };

    renderParticles();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // 🚀 ৩. মাউস ৩ডি প্যারালাক্স টিল্ট হ্যান্ডলার
  const handleMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCardTilt(prev => ({ ...prev, [id]: { x: y * 18, y: -x * 18 } }));
  };

  const handleMouseLeave = (id: string) => {
    setCardTilt(prev => ({ ...prev, [id]: { x: 0, y: 0 } }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayCats = categories.length > 0 ? categories : [
    { name: "Shirts", image: "" },
    { name: "T-Shirts", image: "" },
    { name: "Pants", image: "" },
    { name: "Accessories", image: "" }
  ];

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';

  return (
    <section className="py-16 px-4 bg-[#111111] relative overflow-hidden [perspective:1200px]">
      
      {/* 🚀 3D BACKGROUND PARTICLE CANVAS */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      <div className="container mx-auto max-w-7xl relative z-10 space-y-10">
        
        {/* SECTION HEADER WITH TYPED-OUT ANIMATION */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between border-b border-[#D4AF37]/20 pb-4 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-[#1A1A1A] px-3 py-1 rounded-full border border-[#D4AF37]/30 text-xs font-bold text-[#D4AF37] uppercase mb-2 shadow-md">
              <Sparkles size={14} className="text-[#D4AF37] animate-pulse" />
              <span>AUTHENTIC COLLECTIONS</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gold-text-glow min-h-[48px]">
              {storeLogoImage ? (
                <img src={storeLogoImage} alt="" className="w-8 h-8 mr-3 object-cover rounded-full border border-[#D4AF37]/40" />
              ) : null}
              {typedTitle}
              {!isTypingDone && <span className="inline-block w-1.5 h-7 bg-[#D4AF37] ml-1 animate-ping" />}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 uppercase tracking-widest font-light">
              BROWSE THROUGH {displayCats.length} AUTHENTIC LUXURY COLLECTIONS
            </p>
          </div>

          <button
            onClick={() => { navigate('/categories'); scrollToTop(); }}
            className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#D4AF37] text-gray-300 hover:text-black border border-[#D4AF37]/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-lg flex items-center space-x-2"
          >
            <span>VIEW ALL CATEGORIES</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* 🚀 3D DEPTH CATEGORY CARDS GRID WITH MULTI-ANIMATION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayCats.map((cat: any, idx: number) => {
            const catId = String(cat.id || cat._id || cat.name);
            const catName = cat.name || 'Category';
            
            // ক্যাটাগরির প্রোডাক্ট সংখ্যা হিসাব
            const count = products.filter((p: any) => 
              p && p.category && String(p.category).trim().toLowerCase() === String(catName).trim().toLowerCase()
            ).length;

            const tilt = cardTilt[catId] || { x: 0, y: 0 };
            const catImg = cat.image || cat.imageUrl || '';

            return (
              <div
                key={catId}
                onMouseMove={(e) => handleMouseMove(catId, e)}
                onMouseLeave={() => handleMouseLeave(catId)}
                onClick={() => {
                  navigate(`/products?category=${encodeURIComponent(catName)}`);
                  scrollToTop();
                }}
                style={{
                  transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  animationDelay: `${idx * 120}ms`
                }}
                className="group relative bg-[#1A1A1A] border border-gray-800 hover:border-[#D4AF37]/60 rounded-3xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 ease-out [transform-style:preserve-3d] glass-3d-card p-6 flex flex-col justify-between min-h-[220px] animate-in fade-in slide-in-from-bottom-4"
              >
                {/* 3D Metallic Shimmer Border Wave Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* 3D Top Badge & Product Count */}
                <div className="flex justify-between items-start z-10 [transform:translateZ(30px)]">
                  <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg shadow-[#D4AF37]/10">
                    <Layers size={22} />
                  </div>

                  <span className="bg-[#111111]/90 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md animate-pulse">
                    {count} {count === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                {/* 3D Image Layer (Pop-Out Effect) */}
                {catImg && (
                  <div className="absolute right-3 bottom-3 w-28 h-28 opacity-20 group-hover:opacity-40 transition-all duration-500 overflow-hidden rounded-2xl [transform:translateZ(25px)] pointer-events-none">
                    <img src={catImg} alt={catName} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700" />
                  </div>
                )}

                {/* 3D Category Title & Explore Link */}
                <div className="z-10 pt-8 [transform:translateZ(35px)]">
                  <h3 className="font-serif font-bold text-xl text-white group-hover:text-[#D4AF37] transition-colors uppercase tracking-wider gold-text-glow">
                    {catName}
                  </h3>
                  
                  <p className="text-xs text-gray-400 font-light mt-1 line-clamp-1">
                    {cat.description || `Explore ${catName} luxury collection`}
                  </p>

                  <div className="flex items-center text-xs text-[#D4AF37] font-bold uppercase tracking-widest mt-4 group-hover:translate-x-2 transition-transform duration-300">
                    <span>Explore Collection</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
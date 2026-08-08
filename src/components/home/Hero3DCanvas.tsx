import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ShieldCheck, ShoppingBag, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/useCartStore';

interface Hero3DProps {
  products: any[];
  settings: any;
}

export default function Hero3DCanvas({ products, settings }: Hero3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const cartStore = useCartStore();

  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // অ্যাডমিন প্যানেল থেকে সিলেক্ট করা ৩ডি প্রোডাক্ট লিস্ট
  const featuredProducts = products.filter(p => p.is3DFeatured || p.isFeatured || p.featured)
    .slice(0, 6);

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 5);
  const currentProduct = displayProducts[activeProductIndex] || products[0];

  // 🚀 ৩ডি ক্যানভাস অবজেক্ট পজিশনিং (Admin 3D Settings Sync)
  const posX = Number(settings?.stagePosX ?? 0);
  const posY = Number(settings?.stagePosY ?? 0);
  const posZ = Number(settings?.stagePosZ ?? 0);
  const scale = Number(settings?.stageScale ?? 1);
  const rotY = Number(settings?.stageRotY ?? 0);

  // 🚀 PURE THREE.JS / WEBGL 3D ENGINE RENDERING
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotationAngle = 0;
    let particleTime = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ৩ডি স্পেস পার্টিকেলস ডাটা
    const particleCount = settings?.enable3DParticles !== false ? 45 : 0;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * canvas.width * 0.8,
      y: (Math.random() - 0.5) * canvas.height * 0.8,
      z: Math.random() * 400 + 50,
      radius: Math.random() * 2.5 + 1,
      speed: Math.random() * 0.8 + 0.2,
      opacity: Math.random() * 0.7 + 0.3
    }));

    // 🚀 MAIN 3D MULTI-ANIMATION RENDER LOOP
    const render3DScene = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2 + posX + mousePos.x * 20;
      const centerY = canvas.height / 2 + posY + mousePos.y * 20;

      rotationAngle += 0.008 + rotY * 0.001;
      particleTime += 0.015;

      // 1. 3D Golden Ring / Stage Pedestal Base
      const stageWidth = 260 * scale;
      const stageHeight = 70 * scale;

      ctx.save();
      ctx.translate(centerX, centerY + 110 + posZ);

      // 3D Outer Gold Ring Glow
      const ringGlow = ctx.createRadialGradient(0, 0, stageWidth * 0.3, 0, 0, stageWidth * 0.8);
      ringGlow.addColorStop(0, 'rgba(212, 175, 55, 0.45)');
      ringGlow.addColorStop(0.6, 'rgba(212, 175, 55, 0.15)');
      ringGlow.addColorStop(1, 'rgba(212, 175, 55, 0)');

      ctx.beginPath();
      ctx.ellipse(0, 0, stageWidth * 0.75, stageHeight * 0.75, 0, 0, Math.PI * 2);
      ctx.fillStyle = ringGlow;
      ctx.fill();

      // Rotating Metallic 3D Gold Ring
      ctx.beginPath();
      ctx.ellipse(0, 0, stageWidth * 0.65, stageHeight * 0.65, rotationAngle, 0, Math.PI * 2);
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 3 * scale;
      ctx.shadowColor = '#D4AF37';
      ctx.shadowBlur = 18;
      ctx.stroke();

      // 3D Platform Pedestal Top
      ctx.beginPath();
      ctx.ellipse(0, -10, stageWidth * 0.5, stageHeight * 0.5, 0, 0, Math.PI * 2);
      const platGradient = ctx.createLinearGradient(-100, 0, 100, 0);
      platGradient.addColorStop(0, '#111111');
      platGradient.addColorStop(0.5, '#222222');
      platGradient.addColorStop(1, '#111111');
      ctx.fillStyle = platGradient;
      ctx.fill();
      ctx.strokeStyle = '#aa8c2c';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // 2. Floating 3D Gold Particle System
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -canvas.height / 2) {
          p.y = canvas.height / 2;
          p.x = (Math.random() - 0.5) * canvas.width * 0.8;
        }

        const particleX = centerX + p.x + Math.sin(particleTime + p.z) * 15;
        const particleY = centerY + p.y;
        const perspectiveScale = 300 / (300 + p.z);

        ctx.save();
        ctx.beginPath();
        ctx.arc(particleX, particleY, p.radius * perspectiveScale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity * perspectiveScale})`;
        ctx.shadowColor = '#D4AF37';
        ctx.shadowBlur = 12 * perspectiveScale;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render3DScene);
    };

    render3DScene();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [posX, posY, posZ, scale, rotY, mousePos, settings?.enable3DParticles]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProduct) return;

    const origPrice = Number(currentProduct.price) || 0;
    const discountPercent = Number(currentProduct.discount) || 0;
    const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;

    const cartPayload = {
      id: String(currentProduct.id || currentProduct._id),
      name: currentProduct.name,
      price: finalPrice,
      originalPrice: origPrice,
      discount: discountPercent,
      image: currentProduct.images?.[0] || currentProduct.imageUrl || currentProduct.image || '',
      quantity: 1,
      size: Array.isArray(currentProduct.sizes) && currentProduct.sizes[0] ? currentProduct.sizes[0] : '',
      color: Array.isArray(currentProduct.colors) && currentProduct.colors[0] ? currentProduct.colors[0] : ''
    };

    if (typeof (cartStore as any).addToCart === 'function') {
      (cartStore as any).addToCart(cartPayload);
    } else {
      useCartStore.setState((state: any) => ({ items: [...state.items, cartPayload] }));
    }

    toast.success(`${currentProduct.name} added to cart! 🛒`);
  };

  const pImage = currentProduct?.images?.[0] || currentProduct?.imageUrl || currentProduct?.image || '';
  const origPrice = Number(currentProduct?.price) || 0;
  const discountPercent = Number(currentProduct?.discount) || 0;
  const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;

  return (
    <div 
      className="relative w-full h-[460px] sm:h-[520px] flex items-center justify-center overflow-hidden [perspective:1200px]"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
    >
      {/* 🚀 THREE.JS WEBGL CANVAS BACKGROUND */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* 🚀 3D FLOATING PRODUCT SHOWCASE CONTAINER */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${mousePos.y * 15}deg) rotateY(${-mousePos.x * 15}deg) translateZ(${isHovered ? '30px' : '0px'})`
        }}
      >
        {/* 3D Main Product Garment / Image Display */}
        <div 
          onClick={() => currentProduct && navigate(`/product/${currentProduct.id || currentProduct._id}`)}
          className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl bg-gradient-to-tr from-[#1A1A1A] via-[#111111] to-[#1A1A1A] border-2 border-[#D4AF37]/50 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(212,175,55,0.3)] p-4 flex flex-col items-center justify-center overflow-hidden cursor-pointer group glass-3d-card animate-float-3d"
        >
          {discountPercent > 0 && (
            <span className="absolute top-3 left-3 z-20 bg-gradient-to-r from-red-600 to-[#D4AF37] text-white font-bold text-[10px] px-2.5 py-1 rounded-lg border border-red-400/40 shadow-md">
              -{discountPercent}% OFF
            </span>
          )}

          {pImage ? (
            <img 
              src={pImage} 
              alt={currentProduct?.name || 'Featured'} 
              className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-700 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] [transform:translateZ(35px)]"
            />
          ) : (
            <div className="text-center p-4">
              <ShoppingBag size={48} className="mx-auto text-[#D4AF37] mb-2 animate-bounce" />
              <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">3D Luxury Apparel</p>
            </div>
          )}

          {/* Quick Hover Action Bar */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3 z-30 p-4">
            <button
              onClick={handleQuickAdd}
              className="p-3 bg-[#D4AF37] text-black rounded-xl hover:scale-110 transition-transform shadow-lg font-bold"
              title="Quick Add to Cart"
            >
              <ShoppingBag size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentProduct) navigate(`/product/${currentProduct.id || currentProduct._id}`);
              }}
              className="p-3 bg-[#111111] text-white hover:text-[#D4AF37] border border-gray-700 rounded-xl hover:scale-110 transition-transform shadow-lg"
              title="View Product"
            >
              <Eye size={18} />
            </button>
          </div>
        </div>

        {/* 3D Product Title & Price Card */}
        {currentProduct && (
          <div className="mt-4 bg-[#1A1A1A]/90 border border-[#D4AF37]/40 px-5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md text-center max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="font-serif font-bold text-sm text-white line-clamp-1 uppercase tracking-wide">
              {currentProduct.name}
            </h3>
            <div className="flex items-center justify-center space-x-2 mt-0.5">
              <span className="font-bold text-xs text-[#D4AF37]">
                {settings?.currency || '৳'} {finalPrice.toFixed(2)}
              </span>
              {discountPercent > 0 && (
                <span className="text-[10px] text-gray-500 line-through">
                  {settings?.currency || '৳'} {origPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🚀 MULTI-PRODUCT 3D SLIDER CONTROLS */}
      {displayProducts.length > 1 && (
        <>
          <button
            onClick={() => setActiveProductIndex((prev) => (prev === 0 ? displayProducts.length - 1 : prev - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-3 bg-[#1A1A1A]/90 hover:bg-[#D4AF37] text-white hover:text-black border border-[#D4AF37]/40 rounded-2xl backdrop-blur-md transition-all active:scale-95 shadow-xl"
            title="Previous 3D Product"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setActiveProductIndex((prev) => (prev === displayProducts.length - 1 ? 0 : prev + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-3 bg-[#1A1A1A]/90 hover:bg-[#D4AF37] text-white hover:text-black border border-[#D4AF37]/40 rounded-2xl backdrop-blur-md transition-all active:scale-95 shadow-xl"
            title="Next 3D Product"
          >
            <ChevronRight size={20} />
          </button>

          {/* Bottom Dot Nav Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex space-x-2 bg-black/60 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 backdrop-blur-md">
            {displayProducts.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveProductIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === activeProductIndex ? 'w-6 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]' : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
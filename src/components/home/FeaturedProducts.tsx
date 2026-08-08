import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, Star, ChevronRight, ChevronLeft, Filter, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/useCartStore';

interface FeaturedProductsProps {
  products: any[];
  categories: any[];
  reviews: any[];
  settings: any;
}

// 🚀 ৩ডি অটোমেটিক গ্যালারি ইমেজ স্লাইডার Component
function Card3DImageSlider({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!Array.isArray(images) || images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  const validImgs = Array.isArray(images) ? images.filter(i => i && i.trim() !== '') : [];

  if (validImgs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 font-bold uppercase bg-[#111111]">
        No Image
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#111111]">
      {validImgs.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`${name} ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out [transform:translateZ(35px)] group-hover:scale-110 ${
            i === index ? 'opacity-100 scale-105' : 'opacity-0 scale-100 pointer-events-none'
          }`}
        />
      ))}

      {validImgs.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-20 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
          {validImgs.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === index ? 'bg-[#D4AF37] w-3 shadow-[0_0_8px_#D4AF37]' : 'bg-white/40 w-1'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeaturedProducts({ products, categories, reviews, settings }: FeaturedProductsProps) {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const sliderRef = useRef<HTMLDivElement>(null);

  const [activeCat, setActiveCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cardTilt, setCardTilt] = useState<{ [key: string]: { x: number; y: number } }>({});

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCardMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCardTilt(prev => ({ ...prev, [id]: { x: y * 15, y: -x * 15 } }));
  };

  const handleCardMouseLeave = (id: string) => {
    setCardTilt(prev => ({ ...prev, [id]: { x: 0, y: 0 } }));
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();

    const origPrice = Number(product.price) || 0;
    const discountPercent = Number(product.discount) || 0;
    const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;

    const cartPayload = {
      id: String(product.id || product._id),
      name: product.name,
      price: finalPrice,
      originalPrice: origPrice,
      discount: discountPercent,
      image: product.images?.[0] || product.imageUrl || product.image || '',
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

  const filtered = products.filter(p => {
    const matchesCat = activeCat === 'All' || String(p.category || '').toLowerCase() === activeCat.toLowerCase();
    const searchQ = searchQuery.trim().toLowerCase();
    const matchesSearch = !searchQ || String(p.name || '').toLowerCase().includes(searchQ) || String(p.category || '').toLowerCase().includes(searchQ);
    return matchesCat && matchesSearch;
  });

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';

  return (
    <section className="py-16 px-4 bg-[#111111] relative overflow-hidden">
      <div className="container mx-auto max-w-7xl space-y-8">
        
        {/* 3D GLASS SEARCH & FILTER BAR */}
        <div className="bg-[#1A1A1A]/90 border border-[#D4AF37]/30 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 glass-3d-panel">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Search luxury products or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border border-gray-700 focus:border-[#D4AF37] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
            />
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#D4AF37] font-bold">
            <Filter size={14} />
            <span>Filtering {filtered.length} Items</span>
          </div>
        </div>

        {/* SECTION HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D4AF37]/20 pb-4 gap-4">
          <div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gold-text-glow">
              {storeLogoImage ? (
                <img src={storeLogoImage} alt="" className="w-8 h-8 mr-3 object-cover rounded-full border border-[#D4AF37]/40" />
              ) : null}
              NEW ARRIVALS
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 uppercase tracking-widest font-light">
              SHOWING {filtered.length} REAL PRODUCTS AVAILABLE
            </p>
          </div>

          <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveCat('All')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCat === 'All'
                    ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 scale-105'
                    : 'bg-[#1A1A1A] text-gray-400 border border-gray-800 hover:border-[#D4AF37]/40'
                }`}
              >
                ALL PRODUCTS
              </button>

              {categories.slice(0, 5).map((cat: any, idx: number) => {
                const cName = cat.name || cat;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveCat(cName)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeCat.toLowerCase() === cName.toLowerCase()
                        ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 scale-105'
                        : 'bg-[#1A1A1A] text-gray-400 border border-gray-800 hover:border-[#D4AF37]/40'
                    }`}
                  >
                    {String(cName).toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center space-x-2 shrink-0 pl-4 border-l border-gray-800">
              <button
                onClick={() => scrollSlider('left')}
                className="p-2.5 bg-[#1A1A1A] hover:bg-[#D4AF37] text-gray-300 hover:text-black rounded-xl border border-gray-800 hover:border-[#D4AF37] transition-all active:scale-95 shadow-md"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollSlider('right')}
                className="p-2.5 bg-[#1A1A1A] hover:bg-[#D4AF37] text-gray-300 hover:text-black rounded-xl border border-gray-800 hover:border-[#D4AF37] transition-all active:scale-95 shadow-md"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* 🚀 3D DEPTH INTERACTIVE PRODUCT SLIDER GRID */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1A1A]/60 rounded-3xl border border-gray-800 p-8 max-w-xl mx-auto glass-3d-panel">
            <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
            <h3 className="text-lg font-serif font-bold text-white mb-2">No products matched your search or category!</h3>
            <button
              onClick={() => { setActiveCat('All'); setSearchQuery(''); }}
              className="px-6 py-2.5 bg-[#D4AF37] text-black font-bold text-xs uppercase rounded-xl hover:scale-105 transition-all mt-4"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div 
            ref={sliderRef}
            className="flex space-x-3 sm:space-x-6 overflow-x-auto custom-scrollbar pb-6 pt-2 scroll-smooth snap-x snap-mandatory [perspective:1200px]"
          >
            {filtered.map((product: any, idx: number) => {
              const pId = String(product.id || product._id);
              const pName = product.name || 'Luxury Item';
              const origPrice = Number(product.price) || 0;
              const discountPercent = Number(product.discount) || 0;
              const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;

              const stockCount = Number(product.stock) || 0;
              const soldCount = Number(product.sold) || 0;
              const isOutOfStock = stockCount <= 0 || product.status === 'Out of Stock';

              const productImagesList = Array.isArray(product.images) && product.images.length > 0 
                ? product.images 
                : [product.imageUrl || product.image || ''];

              const tilt = cardTilt[pId] || { x: 0, y: 0 };

              return (
                <div
                  key={pId}
                  onMouseMove={(e) => handleCardMouseMove(pId, e)}
                  onMouseLeave={() => handleCardMouseLeave(pId)}
                  onClick={() => { navigate(`/product/${pId}`); scrollToTop(); }}
                  style={{
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    animationDelay: `${idx * 100}ms`
                  }}
                  className="w-[48%] sm:w-[48%] md:w-[30%] lg:w-[23%] shrink-0 snap-start group relative bg-[#1A1A1A] border border-gray-800 hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-transform duration-200 ease-out [transform-style:preserve-3d] glass-3d-card animate-in fade-in slide-in-from-bottom-4"
                >
                  {/* 3D Depth Image Frame */}
                  <div className="relative aspect-square w-full bg-[#111111] overflow-hidden [transform-style:preserve-3d]">
                    <Card3DImageSlider images={productImagesList} name={pName} />

                    <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start z-20 [transform:translateZ(40px)]">
                      {discountPercent > 0 ? (
                        <span className="bg-gradient-to-r from-red-600 to-[#D4AF37] text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg shadow-md border border-red-400/40">
                          -{discountPercent}% OFF
                        </span>
                      ) : <span />}

                      <span className={`font-bold text-[9px] sm:text-[10px] px-2.5 py-1 rounded-full uppercase border backdrop-blur-md shadow-md ${
                        isOutOfStock 
                          ? 'bg-red-500/30 text-red-300 border-red-500' 
                          : 'bg-emerald-500/30 text-emerald-200 border-emerald-500'
                      }`}>
                        {isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3 z-30 p-4 [transform:translateZ(45px)]">
                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        disabled={isOutOfStock}
                        className="p-3 bg-[#D4AF37] text-black rounded-xl hover:scale-110 transition-transform shadow-lg disabled:opacity-50 font-bold"
                        title="Quick Add to Cart"
                      >
                        <ShoppingBag size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/product/${pId}`);
                          scrollToTop();
                        }}
                        className="p-3 bg-[#111111] text-white hover:text-[#D4AF37] border border-gray-700 rounded-xl hover:scale-110 transition-transform shadow-lg"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-5 space-y-2 [transform:translateZ(20px)]">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400">
                      <span className="uppercase tracking-wider font-semibold text-[#D4AF37]">
                        {product.category || 'Luxury'}
                      </span>
                      
                      <span className="flex items-center text-yellow-400 font-bold bg-[#111111] px-2 py-0.5 rounded-full border border-gray-800">
                        <Star size={12} className="fill-yellow-400 mr-1" />
                        5.0
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-[#D4AF37] transition-colors uppercase tracking-wide">
                      {pName}
                    </h3>

                    <div className="flex flex-col space-y-1.5 pt-1">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline space-x-1.5">
                          <span className="font-bold text-sm sm:text-base text-[#D4AF37]">
                            {settings?.currency || '৳'} {finalPrice.toFixed(2)}
                          </span>
                          {discountPercent > 0 && (
                            <span className="text-[10px] sm:text-xs text-gray-500 line-through">
                              {settings?.currency || '৳'} {origPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          {soldCount > 0 && (
                            <span className="bg-[#D4AF37] text-black px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase">
                              {soldCount} Sold
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
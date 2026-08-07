import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingBag, Eye, Star, ArrowLeft,
  Filter, RefreshCw, Search 
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/useCartStore';
import { 
  getSupabaseProducts, 
  getSupabaseCategories,
  getSupabaseSettings,
  getSupabaseReviews 
} from '../../lib/supabase';

// 🚀 প্রোডাক্ট কার্ডের ভেতরের অটোমেটিক ইমেজ স্লাইডার
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
          className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 ease-out ${
            idx === currentIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100 pointer-events-none'
          }`}
        />
      ))}

      {validImages.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-10 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
          {validImages.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'bg-[#D4AF37] w-3' : 'bg-white/40 w-1'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryProductsPage() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cartStore = useCartStore();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    currency: '৳',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  // URL Parameter OR Query Parameter
  const queryCategory = searchParams.get('category');
  const activeCategoryParam = queryCategory || categoryName || '';
  const decodedCategoryName = decodeURIComponent(activeCategoryParam).trim();

  // Check if viewing all products or specific category
  const isAllProductsView = !decodedCategoryName || 
                            decodedCategoryName.toLowerCase() === 'collection' || 
                            decodedCategoryName.toLowerCase() === 'all' || 
                            decodedCategoryName.toLowerCase() === 'products';

  useEffect(() => {
    const loadCategoryProducts = async () => {
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

    loadCategoryProducts();

    const handleStorageUpdate = () => loadCategoryProducts();
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('productUpdated', handleStorageUpdate);
    window.addEventListener('categoryUpdated', handleStorageUpdate);
    window.addEventListener('reviewUpdated', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('productUpdated', handleStorageUpdate);
      window.removeEventListener('categoryUpdated', handleStorageUpdate);
      window.removeEventListener('reviewUpdated', handleStorageUpdate);
    };
  }, [categoryName, queryCategory]);

  // 🚀 Quick Add to Cart Handler
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
    } else if (typeof (cartStore as any).addItem === 'function') {
      (cartStore as any).addItem(cartPayload);
    } else {
      useCartStore.setState((state: any) => {
        const existingItem = state.items.find((i: any) => String(i.id) === cartPayload.id);
        if (existingItem) {
          return {
            items: state.items.map((i: any) => String(i.id) === cartPayload.id ? { ...i, quantity: i.quantity + 1 } : i)
          };
        }
        return { items: [...state.items, cartPayload] };
      });
    }

    toast.success(`${product.name} added to cart! 🛒`);
  };

  // 🚀 REAL-TIME AVERAGE STAR RATING CALCULATOR
  const getProductRatingStats = (productId: string) => {
    const prodReviews = reviews.filter(r => String(r.productId || r.product_id) === String(productId));
    if (prodReviews.length === 0) return { rating: '0.0', count: 0 };
    
    const sum = prodReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / prodReviews.length).toFixed(1);
    return { rating: avg, count: prodReviews.length };
  };

  // 🚀 SMART FUZZY CATEGORY MATCHING
  const isCategoryMatch = (prodCategory: string, targetCatName: string) => {
    if (!prodCategory || !targetCatName) return false;
    
    const pCat = String(prodCategory).trim().toLowerCase().replace(/s$/, ''); 
    const tCat = String(targetCatName).trim().toLowerCase().replace(/s$/, '');

    if (pCat === tCat) return true;
    if (pCat.includes(tCat) || tCat.includes(pCat)) return true;
    
    return false;
  };

  let categoryProducts = products.filter(p => {
    const matchesCat = isAllProductsView ? true : isCategoryMatch(p.category, decodedCategoryName);

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || String(p.name || '').toLowerCase().includes(q);

    return matchesCat && matchesSearch;
  });

  if (sortBy === 'price-low') {
    categoryProducts.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortBy === 'price-high') {
    categoryProducts.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortBy === 'discount') {
    categoryProducts.sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0));
  }

  const currentCategoryObj = categories.find(c => String(c.name || '').toLowerCase().trim() === decodedCategoryName.toLowerCase().trim());
  const categoryDescription = currentCategoryObj?.description || (
    isAllProductsView 
      ? 'Explore our complete range of authentic handcrafted luxury fashion, apparel, and accessories.' 
      : `Discover curated premium items in our ${decodedCategoryName} collection.`
  );

  const displayTitle = isAllProductsView ? 'ALL LUXURY COLLECTIONS' : decodedCategoryName;
  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';

  return (
    <main className="min-h-screen pt-24 pb-16 text-white bg-[#111111] transition-all duration-300">
      <Helmet>
        <title>{displayTitle} | {storeBrandTitle}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Back Link */}
        <Link 
          to="/categories" 
          className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-[#D4AF37] transition-all duration-200 mb-6 hover:-translate-x-1"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          <span>BACK TO ALL CATEGORIES</span>
        </Link>

        {/* 🚀 3D GLASSMORPHIC CATEGORY HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 border-b border-[#D4AF37]/20 gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-[#1A1A1A] border border-[#D4AF37]/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#D4AF37] uppercase mb-3 glass-3d-panel">
              {storeLogoImage ? (
                <img src={storeLogoImage} alt="" className="w-4 h-4 object-cover rounded-full" />
              ) : null}
              <span>{isAllProductsView ? 'GLOBAL COLLECTION' : 'CATEGORY COLLECTION'}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white uppercase tracking-wider gold-text-glow">
              {displayTitle}
            </h1>

            <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed font-light">
              {categoryDescription}
            </p>
            <p className="text-[11px] text-[#D4AF37] font-bold mt-1 flex items-center">
              Showing {categoryProducts.length} authentic items
              {loading && <RefreshCw size={12} className="ml-2 animate-spin text-[#D4AF37]" />}
            </p>
          </div>

          {/* Controls: Search Bar & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            
            {/* IN-CATEGORY SEARCH INPUT */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder={`Search in ${displayTitle}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-gray-800 focus:border-[#D4AF37] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-all shadow-inner"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={14} />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2 bg-[#1A1A1A] border border-gray-800 rounded-xl px-3 py-2 glass-3d-panel">
              <Filter size={14} className="text-[#D4AF37]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-[#111111]">Sort by: Newest</option>
                <option value="price-low" className="bg-[#111111]">Price: Low to High</option>
                <option value="price-high" className="bg-[#111111]">Price: High to Low</option>
                <option value="discount" className="bg-[#111111]">Biggest Discount</option>
              </select>
            </div>

          </div>
        </div>

        {/* 🚀 3D METALLIC GRID CARDS */}
        {categoryProducts.length === 0 && !loading ? (
          <div className="text-center py-20 bg-[#1A1A1A]/60 rounded-3xl border border-gray-800 p-8 max-w-xl mx-auto glass-3d-panel">
            <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
            <h3 className="text-lg font-serif font-bold text-white mb-2">No products found in "{displayTitle}"!</h3>
            <p className="text-xs text-gray-400 mb-6">Try searching for a different keyword or reset filters.</p>
            <button
              onClick={() => { setSearchQuery(''); navigate('/products'); }}
              className="px-6 py-2.5 bg-[#D4AF37] text-black font-bold text-xs uppercase rounded-xl hover:scale-105 transition-all shadow-md"
            >
              Browse All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 [perspective:1200px]">
            {categoryProducts.map((product: any) => {
              const pId = String(product.id || product._id);
              const pName = product.name || 'Luxury Fashion Item';
              const origPrice = Number(product.price) || 0;
              const discountPercent = Number(product.discount) || 0;
              const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;

              const stockCount = Number(product.stock) || 0;
              const soldCount = Number(product.sold) || 0;
              const isOutOfStock = stockCount <= 0 || product.status === 'Out of Stock';
              const isLowStock = stockCount > 0 && stockCount <= 3;

              const productImagesList = Array.isArray(product.images) && product.images.length > 0 
                ? product.images 
                : (product.imageUrl || product.image ? [product.imageUrl || product.image] : []);

              const ratingStats = getProductRatingStats(pId);

              return (
                <div
                  key={pId}
                  onClick={() => navigate(`/product/${pId}`)}
                  className="group relative bg-[#1A1A1A] border border-gray-800 hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-500 hover:-translate-y-2 [perspective:1000px] [transform-style:preserve-3d] glass-3d-card"
                >
                  {/* 3D Image Box with Auto Image Slideshow */}
                  <div className="relative aspect-square w-full bg-[#111111] overflow-hidden">
                    <ProductCardImageSlider images={productImagesList} name={pName} />

                    {/* 3D Floating Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start z-10">
                      {discountPercent > 0 ? (
                        <span className="bg-gradient-to-r from-red-600 via-orange-500 to-[#D4AF37] text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg shadow-[0_4px_12px_rgba(220,38,38,0.4)] border border-red-400/40">
                          -{discountPercent}% OFF
                        </span>
                      ) : <span />}

                      <span className={`font-bold text-[9px] sm:text-[10px] px-2.5 py-1 rounded-full uppercase border backdrop-blur-md shadow-md ${
                        isOutOfStock 
                          ? 'bg-red-500/30 text-red-300 border-red-500 shadow-red-500/30' 
                          : isLowStock
                          ? 'bg-amber-500/30 text-amber-200 border-amber-500 shadow-amber-500/30 animate-pulse'
                          : 'bg-emerald-500/30 text-emerald-200 border-emerald-500 shadow-emerald-500/30'
                      }`}>
                        {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                      </span>
                    </div>

                    {/* Quick Hover Overlay Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3 p-4">
                      <button
                        onClick={(e) => handleQuickAddToCart(e, product)}
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
                        }}
                        className="p-3 bg-[#111111]/80 text-white hover:text-[#D4AF37] border border-gray-700 rounded-xl hover:scale-110 transition-transform shadow-lg"
                        title="View Product Details"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Product Details Content */}
                  <div className="p-3.5 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400">
                      <span className="uppercase tracking-wider font-semibold text-[#D4AF37]">
                        {product.category || displayTitle}
                      </span>
                      
                      <span className="flex items-center text-yellow-400 font-bold bg-[#111111] px-2 py-0.5 rounded-full border border-gray-800">
                        <Star size={12} className="fill-yellow-400 mr-1" />
                        {ratingStats.rating > '0.0' ? `${ratingStats.rating} (${ratingStats.count})` : 'New'}
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
                            <span className="bg-gradient-to-r from-[#D4AF37] to-[#aa8c2c] text-black border border-[#D4AF37] px-2 py-0.5 rounded-lg text-[9px] font-bold shadow-md shadow-[#D4AF37]/20 uppercase">
                              {soldCount} Sold
                            </span>
                          )}
                          <span className="bg-[#111111] text-[#D4AF37] border border-gray-800 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                            {isOutOfStock ? '0 Left' : `${stockCount} Left`}
                          </span>
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
    </main>
  );
}
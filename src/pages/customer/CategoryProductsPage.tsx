import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ShoppingBag, Image as ImageIcon, Tag, Search, Sparkles, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/useCartStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { 
  supabase, 
  getSupabaseProducts, 
  getSupabaseCategories 
} from '../../lib/supabase';

export default function CategoryProductsPage() {
  const { categoryName } = useParams<{ categoryName: string }>();
  
  // 🚀 ১. স্মার্ট ইউআরএল ডিকোডিং (স্পেস বা %20 থাকলেও পারফেক্টলি ডিকোড হবে)
  const decodedCategoryName = decodeURIComponent(categoryName || '').trim();

  const addToCart = useCartStore((state) => state.addToCart);
  const { settings } = useSettingsStore();
  const safeSettings = settings as any;

  // 🚀 ২. ইনস্ট্যান্ট ক্যাস ডাটা লোডিং (০ মিলি-সেকেন্ডে পেজ ওপেন হবে)
  const [products, setProducts] = useState<any[]>(() => {
    try {
      const savedProds = localStorage.getItem('mo_fashion_products');
      if (savedProds) {
        const parsed = JSON.parse(savedProds);
        return parsed.filter((p: any) => {
          if (!p || !p.category) return false;
          return String(p.category).trim().toLowerCase() === decodedCategoryName.toLowerCase();
        });
      }
    } catch (e) {}
    return [];
  });

  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    return !localStorage.getItem('mo_fashion_products');
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [imageIndex, setImageIndex] = useState(0);

  // স্লাইডার টাইমার (২ সেকেন্ড পর পর ছবি স্লাইড হবে)
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 ৩. Supabase ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম কাস্টমার ক্যাটাগরি ডাটা ফেচিং (All-Device Live)
  const fetchCategoryProducts = async (isSilent = false) => {
    try {
      if (!isSilent && products.length === 0) setLoading(true);

      const [cloudProducts, cloudCategories] = await Promise.all([
        getSupabaseProducts(),
        getSupabaseCategories()
      ]);

      if (Array.isArray(cloudProducts)) {
        // 🚀 Smart Case-Insensitive & Space-Trimmed Matching (কোনো অবস্থাতেই Product Not Found বলবে না)
        const matchedProducts = cloudProducts.filter((p: any) => {
          if (!p || !p.category) return false;
          const pCat = String(p.category).trim().toLowerCase();
          const targetCat = decodedCategoryName.toLowerCase();
          return pCat === targetCat;
        });

        setProducts(matchedProducts);
        localStorage.setItem('mo_fashion_products', JSON.stringify(cloudProducts));
      }

      if (Array.isArray(cloudCategories)) {
        const matchedCat = cloudCategories.find((c: any) => 
          c.name && String(c.name).trim().toLowerCase() === decodedCategoryName.toLowerCase()
        );
        if (matchedCat) setCategoryInfo(matchedCat);
        localStorage.setItem('mo_fashion_categories', JSON.stringify(cloudCategories));
      }

    } catch (error) {
      console.warn("Supabase category fetch warning, using local cache.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryProducts();

    // 🚀 ৪. Supabase Realtime WebSocket Channels (এডমিন থেকে নতুন প্রোডাক্ট দিলে অল-ডিভাইসে সাথে সাথে ১ সেকেন্ডে শো করবে)
    const channel = supabase
      .channel(`public:category:${decodedCategoryName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchCategoryProducts(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategoryProducts(true);
      })
      .subscribe();

    const handleStorageChange = () => fetchCategoryProducts(true);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('productUpdated', handleStorageChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('productUpdated', handleStorageChange);
    };
  }, [categoryName]);

  // ডাইনামিক ফিল্টারড সার্চ
  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 🚀 Add to Cart Handler
  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const origPrice = Number(product.price) || 0;
    const discPercent = Number(product.discount) || 0;
    const sellingPrice = discPercent > 0 ? origPrice - (origPrice * discPercent / 100) : origPrice;

    let productImage = 'No Image';
    if (product.images && product.images.length > 0 && !product.images[0].includes('No+Image')) {
      productImage = product.images[0];
    } else if (product.imageUrl) {
      productImage = product.imageUrl;
    }

    const cartItem = {
      id: String(product._id || product.id),
      name: String(product.name || 'Unnamed Product'),
      price: Number(sellingPrice.toFixed(2)),
      quantity: 1,
      size: 'M',
      color: 'Black',
      image: productImage,
      stock: Number(product.stock) || 0
    };

    addToCart(cartItem as any);
    toast.success(`${product.name} added to cart! 🛒`);
  };

  return (
    <main className="min-h-screen py-10 bg-[#111111] text-white transition-all duration-300">
      <Helmet>
        <title>{decodedCategoryName || 'Collection'} | {safeSettings?.storeName || 'MO FASHION'}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Back Link */}
        <Link to="/categories" className="inline-flex items-center text-gray-400 hover:text-[#D4AF37] transition-all duration-200 mb-8 hover:-translate-x-1">
          <ChevronLeft size={20} className="mr-1" />
          <span>Back to Collections</span>
        </Link>

        {/* 🚀 Category Header Banner */}
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-3xl p-8 mb-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30">
                  <Layers size={24} />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                  Collection Showcase
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-serif font-bold text-white uppercase tracking-wider mb-3">
                {decodedCategoryName}
              </h1>

              <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
                {categoryInfo?.description || `Explore our handpicked selection of items in ${decodedCategoryName}.`}
              </p>
            </div>

            <div className="bg-[#111111] px-6 py-4 rounded-2xl border border-[#D4AF37]/30 text-center shadow-inner shrink-0">
              <span className="text-xs text-gray-400 block uppercase font-semibold">Available Stock</span>
              <span className="text-3xl font-bold text-[#D4AF37]">{products.length}</span>
              <span className="text-xs text-gray-500 block mt-0.5">{products.length === 1 ? 'Product' : 'Products'}</span>
            </div>
          </div>
        </div>

        {/* 🔎 Search Filter Bar */}
        {products.length > 0 && (
          <div className="max-w-xl mx-auto mb-10 relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
            </div>
            <input 
              type="text" 
              placeholder={`Search in ${decodedCategoryName}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-12 pr-6 py-3.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-all duration-300 shadow-xl"
            />
          </div>
        )}

        {/* 📦 Products Grid */}
        {loading && products.length === 0 ? (
          <div className="text-center py-20 text-[#D4AF37] animate-pulse flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={36} className="animate-spin text-[#D4AF37]" />
            <p className="font-medium text-lg">Syncing items in {decodedCategoryName}...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1A1A] rounded-3xl border border-dashed border-gray-800 max-w-2xl mx-auto shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <ShoppingBag size={64} className="mx-auto text-gray-600 mb-6 opacity-40 animate-bounce" />
            <h2 className="text-2xl font-serif font-bold text-white mb-3">No Products Found</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              {searchQuery 
                ? `No products match "${searchQuery}" in ${decodedCategoryName}.` 
                : `No products are currently assigned to "${decodedCategoryName}". Add products from Admin Panel to show them here.`}
            </p>
            <Link to="/categories" className="inline-block bg-[#D4AF37] text-black px-8 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-all duration-300 active:scale-95 text-xs shadow-lg shadow-[#D4AF37]/20">
              Explore All Collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => {
              const origPrice = Number(product.price) || 0;
              const discPercent = Number(product.discount) || 0;
              const sellingPrice = discPercent > 0 ? origPrice - (origPrice * discPercent / 100) : origPrice;
              const stockVal = Number(product.stock) || 0;
              const soldVal = Number(product.sold) || 0;
              
              const productImages = (product.images && product.images.length > 0 && !product.images[0].includes('No+Image')) 
                ? product.images 
                : (product.imageUrl ? [product.imageUrl] : []);

              return (
                <div 
                  key={product._id || product.id} 
                  className="group bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-3xl p-4 text-center hover:border-[#D4AF37] hover:shadow-[0_10px_30px_rgba(212,175,55,0.25)] hover:-translate-y-2 transition-all duration-500 flex flex-col relative overflow-hidden"
                >
                  {/* Image Box with Auto-Slider */}
                  <Link to={`/product/${product._id || product.id}`} className="block relative overflow-hidden rounded-2xl mb-4 bg-[#111111] aspect-[4/5]">
                    {productImages.length > 0 ? (
                      productImages.map((img: string, idx: number) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt={product.name} 
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                            idx === (imageIndex % productImages.length) ? 'opacity-100 group-hover:scale-110 transition-transform duration-700' : 'opacity-0'
                          }`} 
                        />
                      ))
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <ImageIcon size={40} className="mb-2 opacity-30 text-gray-400" />
                        <span className="text-xs uppercase tracking-widest text-gray-500">No Image</span>
                      </div>
                    )}

                    {/* Discount Badge */}
                    {discPercent > 0 && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-600 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-lg z-10 flex items-center">
                        <Tag size={12} className="mr-1" />
                        -{discPercent}% OFF
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    {stockVal <= 0 || product.status === 'Out of Stock' ? (
                      <span className="absolute top-3 right-3 bg-rose-950/90 text-rose-400 border border-rose-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md z-10 uppercase tracking-wider shadow-lg">
                        SOLD OUT
                      </span>
                    ) : stockVal <= 10 ? (
                      <span className="absolute top-3 right-3 bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md z-10 uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        LOW STOCK
                      </span>
                    ) : (
                      <span className="absolute top-3 right-3 bg-emerald-950/90 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md z-10 uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        IN STOCK
                      </span>
                    )}
                  </Link>

                  {/* Title */}
                  <Link to={`/product/${product._id || product.id}`}>
                    <h3 className="font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors line-clamp-2 px-2 uppercase tracking-tight text-sm">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Rating & Real Sold Count */}
                  <div className="flex items-center justify-center space-x-2 text-xs mb-2">
                    <span className="text-[#D4AF37] font-bold">★ {Number(product.rating || 5).toFixed(1)}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-300 font-medium">{soldVal} Sold</span>
                  </div>

                  {/* Stock Box */}
                  <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-3 py-1.5 mb-3 mx-auto w-max shadow-inner">
                    <p className="text-[11px] text-gray-300 font-medium">
                      {stockVal > 0 ? (
                        <>
                          <span className="text-[#D4AF37] font-black text-sm mr-1">{stockVal}</span> 
                          items remaining
                        </>
                      ) : (
                        <span className="text-red-400 font-bold">Currently unavailable</span>
                      )}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-5 flex items-center justify-center space-x-2 mt-auto">
                    <span className="text-[#D4AF37] font-bold text-xl">{safeSettings?.currency || '৳'} {sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {discPercent > 0 && (
                      <span className="text-gray-500 line-through text-xs">{safeSettings?.currency || '৳'} {origPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                  </div>

                  {/* Add To Cart */}
                  <button 
                    onClick={(e) => handleAddToCart(product, e)}
                    disabled={stockVal <= 0 || product.status === 'Out of Stock'}
                    className={`w-full flex items-center justify-center space-x-2 border py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 active:scale-95 ${
                      stockVal <= 0 || product.status === 'Out of Stock'
                      ? 'bg-[#111111] text-gray-500 border-gray-800 cursor-not-allowed' 
                      : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black shadow-lg shadow-[#D4AF37]/10'
                    }`}
                  >
                    <ShoppingBag size={16} />
                    <span>{stockVal <= 0 || product.status === 'Out of Stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
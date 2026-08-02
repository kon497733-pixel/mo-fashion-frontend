import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ShoppingBag, Search, Tag, Image as ImageIcon, Star } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCartStore } from '../../store/useCartStore';

export default function CategoryProductsPage() {
  const { id } = useParams(); 
  const { settings } = useSettingsStore();
  const safeSettings = settings as any;
  const addToCart = useCartStore((state) => state.addToCart);

  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 🚀 ছবিগুলো অটোমেটিক স্লাইড করার টাইমার
  const [imageIndex, setImageIndex] = useState(0);

  // URL থেকে ক্যাটাগরির আসল নাম নেওয়া
  const categoryTitle = id ? decodeURIComponent(id) : "Exclusive Collection";

  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((prev) => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // 🚀 সরাসরি ডাটাবেস থেকে শুধু এই নির্দিষ্ট ক্যাটাগরির প্রোডাক্ট ফেচ করা
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      setLoading(true);
      const targetCat = categoryTitle.trim().toLowerCase();

      try {
        const response = await fetch('http://localhost:5000/api/products');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const filtered = data.filter((product: any) => {
              const pCat = (product.category || '').trim().toLowerCase();
              return pCat === targetCat;
            });
            setCategoryProducts(filtered.reverse());
          } else {
            setCategoryProducts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching category products:", err);
        const savedProducts = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
        const filtered = savedProducts.filter((product: any) => {
          const pCat = (product.category || '').trim().toLowerCase();
          return pCat === targetCat;
        });
        setCategoryProducts(filtered.reverse());
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryTitle]);

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (product.stock <= 0 || product.status === 'Out of Stock') {
      toast.error('This product is currently out of stock!');
      return;
    }

    const originalPrice = Number(product.price) || 0;
    const discPercent = Number(product.discount) || 0;
    const sellingPrice = discPercent > 0 ? originalPrice - (originalPrice * discPercent / 100) : originalPrice;

    const productImage = product.images && product.images.length > 0 && !product.images[0].includes('No+Image') 
      ? product.images[0] 
      : (product.imageUrl || '');

    const cartItem = {
      id: String(product._id || product.id),
      name: product.name,
      price: sellingPrice,
      quantity: 1,
      size: product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard',
      color: product.colors && product.colors.length > 0 ? product.colors[0] : 'Default',
      imageUrl: productImage,
      image: productImage,
      stock: Number(product.stock) || 0
    };

    addToCart(cartItem as any);
    toast.success(`${product.name} added to cart!`);
  };

  const displayedProducts = categoryProducts.filter(product => 
    (product.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen py-12 bg-[#111111] text-white border-t border-[#D4AF37]/10">
      <Helmet>
        <title>{categoryTitle} | {safeSettings?.storeName || 'MO FASHION'}</title>
      </Helmet>

      <div className="container mx-auto px-4">
        
        <Link to="/categories" className="inline-flex items-center text-gray-400 hover:text-[#D4AF37] transition-colors mb-8 font-medium">
          <ChevronLeft size={20} className="mr-1" />
          <span>Back to Categories</span>
        </Link>

        <div className="text-center mb-12 border-b border-[#D4AF37]/10 pb-10">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#D4AF37] mb-4 tracking-wider uppercase">
            {categoryTitle}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
            Explore our exclusive collection of {categoryTitle.toLowerCase()}.
          </p>

          {categoryProducts.length > 0 && (
            <div className="max-w-xl mx-auto relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" size={20} />
              </div>
              <input 
                type="text" 
                placeholder={`Search in ${categoryTitle}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-12 pr-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-colors shadow-lg"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-[#D4AF37] py-20 text-xl font-serif animate-pulse">Loading products from database...</div>
        ) : categoryProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1A1A] rounded-2xl border border-dashed border-gray-800 max-w-2xl mx-auto shadow-2xl">
            <ShoppingBag size={64} className="mx-auto text-gray-600 mb-6" />
            <h2 className="text-2xl font-serif font-bold text-white mb-4">No Products Found</h2>
            <p className="text-gray-400 mb-8">We currently don't have any products available in the "{categoryTitle}".</p>
            <Link to="/categories" className="inline-block bg-[#D4AF37] text-black px-8 py-3 rounded-lg hover:bg-white transition-colors font-bold tracking-wide uppercase">
              Browse Other Categories
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {displayedProducts.map((product) => {
                const originalPrice = Number(product.price) || 0;
                const discount = Number(product.discount) || 0;
                const sellingPrice = discount > 0 ? originalPrice - (originalPrice * discount / 100) : originalPrice;
                const stockVal = Number(product.stock) || 0;
                
                // 🚀 রিয়েল সোল্ড ও রেটিং ডাটা (কোনো ফেইক ভ্যালু নেই)
                const realSoldCount = product.sold || 0;
                const realRatingValue = product.rating || 0;

                const productImages = (product.images && product.images.length > 0 && !product.images[0].includes('No+Image')) 
                  ? product.images 
                  : (product.imageUrl ? [product.imageUrl] : []);

                return (
                  <div key={product._id || product.id} className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-xl p-4 text-center hover:border-[#D4AF37]/60 transition-all duration-300 group flex flex-col shadow-lg relative">
                    
                    <Link to={`/product/${product._id || product.id}`} className="block relative overflow-hidden rounded-lg mb-4 bg-[#111111] aspect-[4/5]">
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

                      {discount > 0 && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-extrabold px-3 py-1.5 rounded shadow-lg z-10 flex items-center">
                          <Tag size={12} className="mr-1" />
                          -{discount}% OFF
                        </div>
                      )}

                      {stockVal <= 0 || product.status === 'Out of Stock' ? (
                        <span className="absolute top-3 right-3 bg-red-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded backdrop-blur-sm z-10 uppercase tracking-wider">Sold Out</span>
                      ) : stockVal <= 5 ? (
                        <span className="absolute top-3 right-3 bg-yellow-500/90 text-black text-[10px] font-bold px-2.5 py-1 rounded backdrop-blur-sm z-10 uppercase tracking-wider">Few Left</span>
                      ) : null}
                    </Link>
                    
                    <Link to={`/product/${product._id || product.id}`} className="mt-auto">
                      <h3 className="font-bold text-white mb-1 hover:text-[#D4AF37] transition-colors line-clamp-2 cursor-pointer text-sm">
                        {product.name}
                      </h3>
                    </Link>

                    {/* 🚀 রিয়েল রেটিং ও সোল্ড ডাটা */}
                    <div className="flex items-center justify-center space-x-2 mt-1 mb-2 text-xs">
                      <div className="flex items-center text-[#D4AF37]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.round(realRatingValue) ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-400">{realSoldCount} Sold</span>
                    </div>

                    {/* Stylish Remaining Stock Box */}
                    <div className="bg-[#111111] border border-gray-800 rounded px-2 py-1.5 mb-3 mx-auto w-max">
                      <p className="text-[11px] text-gray-400">
                        {stockVal > 0 ? (
                          <><span className="text-white font-bold">{stockVal}</span> items remaining in stock</>
                        ) : (
                          <span className="text-red-400 font-bold">Currently unavailable</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="mb-5 flex items-center justify-center space-x-2">
                      <span className="text-[#D4AF37] font-bold text-xl">{safeSettings?.currency || '৳'} {sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {discount > 0 && (
                        <span className="text-gray-500 line-through text-sm">{safeSettings?.currency || '৳'} {originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={stockVal <= 0 || product.status === 'Out of Stock'}
                      className={`w-full flex items-center justify-center space-x-2 border py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all duration-300 ${
                        stockVal <= 0 || product.status === 'Out of Stock'
                        ? 'bg-[#111111] text-gray-500 border-gray-700 cursor-not-allowed' 
                        : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                      }`}
                    >
                      <ShoppingBag size={16} />
                      <span>{stockVal <= 0 || product.status === 'Out of Stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {displayedProducts.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <p>No products match your search "{searchQuery}".</p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
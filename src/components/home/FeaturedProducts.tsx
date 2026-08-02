import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/useCartStore';

export default function FeaturedProducts() {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [displayProducts, setDisplayProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const addToCart = useCartStore((state) => state.addToCart);
  const sliderRef = useRef<HTMLDivElement>(null);

  // 🚀 Force Clear and Load Real Products Only
  const loadProducts = () => {
    setLoading(true);
    try {
      const savedProductsRaw = localStorage.getItem('mo_fashion_products');
      
      if (savedProductsRaw) {
        let parsedProducts = JSON.parse(savedProductsRaw);
        
        // 🚀 STRICT FILTER: শুধুমাত্র অ্যাডমিন প্যানেল থেকে তৈরি করা রিয়েল প্রোডাক্টগুলোই (যাদের _id আছে এবং নাম "Premium Gold T-Shirt" বা এরকম ডামি নয়) ফিল্টার করা হচ্ছে।
        const realProductsOnly = parsedProducts.filter((p: any) => {
          // যদি প্রোডাক্টের দাম ফিক্সড 49.99 বা 89.99 হয় এবং নাম ডামি হয়, তাহলে সেগুলো বাদ দেবে
          const isDummy1 = p.name === "Premium Gold T-Shirt" && Number(p.price) === 49.99;
          const isDummy2 = p.name === "Black Signature Hoodie" && Number(p.price) === 89.99;
          const isDummy3 = p.name === "Classic Denim Jacket" || p.name === "Luxury Golden Watch";
          
          return p && p.name && p.price !== undefined && !isDummy1 && !isDummy2 && !isDummy3;
        });

        // যদি ব্রাউজারে ডামি ডাটা থাকে, তবে তা লোকাল স্টোরেজ থেকেও মুছে ফেলে রিয়েল ডাটা দিয়ে রিপ্লেস করবে
        if (realProductsOnly.length !== parsedProducts.length) {
          localStorage.setItem('mo_fashion_products', JSON.stringify(realProductsOnly));
        }
        
        // নতুন প্রোডাক্ট সবার আগে দেখানোর জন্য রিভার্স করা হলো
        const latestFirst = [...realProductsOnly].reverse();
        setAllProducts(latestFirst);
        setDisplayProducts(latestFirst); 
      } else {
        setAllProducts([]);
        setDisplayProducts([]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // অ্যাডমিন প্যানেলে চেঞ্জ করলে হোমপেজ সাথে সাথে আপডেট হবে
    window.addEventListener('storage', loadProducts);
    return () => window.removeEventListener('storage', loadProducts);
  }, []);

  // সার্চ বারের জন্য লাইভ ফিল্টারিং লজিক
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setDisplayProducts(allProducts);
    } else {
      const filtered = allProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setDisplayProducts(filtered);
    }
  }, [searchQuery, allProducts]);

  // অটোমেটিক স্লাইডার লজিক
  useEffect(() => {
    const interval = setInterval(() => {
      if (sliderRef.current && searchQuery.trim() === '') {
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          const cardWidth = clientWidth > 1024 ? clientWidth / 4 : clientWidth > 640 ? clientWidth / 2 : clientWidth;
          sliderRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [searchQuery, displayProducts.length]);

  const slideLeft = () => {
    if (sliderRef.current) {
      const cardWidth = sliderRef.current.clientWidth > 1024 ? sliderRef.current.clientWidth / 4 : sliderRef.current.clientWidth > 640 ? sliderRef.current.clientWidth / 2 : sliderRef.current.clientWidth;
      sliderRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    }
  };
  
  const slideRight = () => {
    if (sliderRef.current) {
      const cardWidth = sliderRef.current.clientWidth > 1024 ? sliderRef.current.clientWidth / 4 : sliderRef.current.clientWidth > 640 ? sliderRef.current.clientWidth / 2 : sliderRef.current.clientWidth;
      sliderRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();

    const originalPrice = Number(product.price) || 0;
    const discount = Number(product.discount) || 0;
    const sellingPrice = discount > 0 ? originalPrice - (originalPrice * discount / 100) : originalPrice;

    let productImage = 'No Image';
    if (product.images && product.images.length > 0 && !product.images[0].includes('No+Image')) {
        productImage = product.images[0];
    } else if (product.imageUrl) {
        productImage = product.imageUrl;
    }

    const cartItem = {
      id: String(product.id || product._id || Date.now()),
      name: String(product.name || 'Unnamed Product'),
      price: Number(sellingPrice.toFixed(2)),
      quantity: 1,
      size: 'M', 
      color: 'Black', 
      image: productImage,
    };

    addToCart(cartItem as any); 
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <section className="py-16 bg-[#111111] border-t border-[#D4AF37]/10 overflow-hidden">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#D4AF37] tracking-wider mb-4 uppercase">
            NEW ARRIVALS
          </h2>
          <p className="text-gray-400">Discover our latest premium additions directly from the store</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12 relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search products by name or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-12 pr-6 py-4 text-white focus:outline-none focus:border-[#D4AF37] transition-colors shadow-lg"
          />
        </div>
        
        {loading ? (
          <div className="text-center text-[#D4AF37] font-medium animate-pulse py-10">Loading latest products...</div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center text-gray-400 py-10 bg-[#1A1A1A] rounded-xl border border-gray-800">
            No products found. Please add products from the Admin Panel.
          </div>
        ) : (
          <div className="relative group/slider">
            
            {searchQuery.trim() === '' && displayProducts.length > 4 && (
              <>
                <button onClick={slideLeft} className="absolute left-0 top-1/2 -translate-y-1/2 -ml-5 z-20 bg-[#111111] border border-[#D4AF37]/50 text-[#D4AF37] p-2 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#D4AF37] hover:text-black hidden md:block">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={slideRight} className="absolute right-0 top-1/2 -translate-y-1/2 -mr-5 z-20 bg-[#111111] border border-[#D4AF37]/50 text-[#D4AF37] p-2 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#D4AF37] hover:text-black hidden md:block">
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div 
              ref={sliderRef} 
              className={
                searchQuery.trim() !== '' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" 
                : "flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 hide-scrollbar"
              }
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {displayProducts.map((product) => {
                const originalPrice = Number(product.price) || 0;
                const discountPercent = Number(product.discount) || 0;
                const currentPrice = discountPercent > 0 ? originalPrice - (originalPrice * discountPercent / 100) : originalPrice;

                let displayImage = '';
                if (product.images && product.images.length > 0 && !product.images[0].includes('No+Image')) {
                    displayImage = product.images[0];
                } else if (product.imageUrl) {
                    displayImage = product.imageUrl;
                }

                return (
                  <div 
                    key={product.id || product._id || Math.random()} 
                    className={`bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-xl p-4 text-center hover:border-[#D4AF37]/60 transition-all duration-300 group flex flex-col shadow-lg relative ${
                      searchQuery.trim() === '' ? 'min-w-[100%] sm:min-w-[calc(50%-12px)] lg:min-w-[calc(25%-18px)] flex-shrink-0 snap-center' : ''
                    }`}
                  >
                    <Link to={`/product/${product.id || product._id}`} className="block relative overflow-hidden rounded-lg mb-4 bg-[#111111] aspect-square">
                      {displayImage ? (
                        <img 
                          src={displayImage} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs uppercase tracking-widest text-[#D4AF37]">No Image</span>
                        </div>
                      )}
                      
                      {/* Daraz Style Discount Badge */}
                      {discountPercent > 0 && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-extrabold px-2.5 py-1 rounded shadow-md z-10 flex items-center">
                          <Tag size={12} className="mr-1" />
                          -{discountPercent}% OFF
                        </div>
                      )}

                      {/* Stock Badge */}
                      {product.stock > 0 && product.stock <= 5 && (
                        <span className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm z-10">
                          Only {product.stock} left
                        </span>
                      )}
                      {(product.stock === 0 || product.status === 'Out of Stock') && (
                        <span className="absolute top-2 right-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm z-10">
                          Sold Out
                        </span>
                      )}
                    </Link>
                    
                    <Link to={`/product/${product.id || product._id}`} className="mt-auto">
                      <h3 className="font-serif font-bold text-white mb-1 hover:text-[#D4AF37] transition-colors line-clamp-1 cursor-pointer">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="mb-4 flex items-center justify-center space-x-2">
                      <span className="text-[#D4AF37] font-bold text-xl">৳{currentPrice.toFixed(2)}</span>
                      {discountPercent > 0 && (
                        <span className="text-gray-500 line-through text-sm">৳{originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={product.stock === 0 || product.status === 'Out of Stock'}
                      className={`w-full flex items-center justify-center space-x-2 border py-2.5 rounded-lg font-bold uppercase tracking-wider transition-colors ${
                        product.stock === 0 || product.status === 'Out of Stock'
                        ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' 
                        : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                      }`}
                    >
                      <ShoppingBag size={18} />
                      <span>{product.stock === 0 || product.status === 'Out of Stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
      </div>
    </section>
  );
}
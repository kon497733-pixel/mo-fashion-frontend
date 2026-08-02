import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Star, Truck, ChevronLeft, Minus, Plus, 
  MapPin, RotateCcw, Share2, Heart, 
  X, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/useCartStore';
import { getLiveSettings, apiRequest } from '../../config/api';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const addToCart = useCartStore((state) => state.addToCart);

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  
  const [mainImage, setMainImage] = useState('');

  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: 'MO FASHION',
    currency: '৳',
    shippingInside: 60,
    shippingOutside: 150
  });

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadProductDetails = async () => {
      setLoading(true);
      
      if (!id) {
        setLoading(false);
        return;
      }

      const localProducts = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
      let foundProduct = localProducts.find((p: any) => String(p._id || p.id) === String(id));

      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try { setSiteSettings(JSON.parse(savedSettings)); } catch(e){}
      }

      const initializeProduct = (prodData: any) => {
        setProduct(prodData);
        
        const initialVariants: Record<string, string> = {};
        
        if (prodData.variants && prodData.variants.length > 0) {
          prodData.variants.forEach((v: any) => {
            if (v.options && v.options.length > 0) {
              initialVariants[v.name] = v.options[0]; 
            }
          });
        } else {
          if (prodData.colors && prodData.colors.length > 0) initialVariants['Color'] = prodData.colors[0];
          if (prodData.sizes && prodData.sizes.length > 0) initialVariants['Size'] = prodData.sizes[0];
        }
        
        setSelectedVariants(initialVariants);

        const img = (prodData.images && prodData.images[0] && !prodData.images[0].includes('No+Image')) 
          ? prodData.images[0] 
          : (prodData.imageUrl || '');
        setMainImage(img);
      };

      if (foundProduct) {
        initializeProduct(foundProduct);
      }

      try {
        const [cloudProduct, cloudSettings] = await Promise.all([
          apiRequest(`/products/${id}`).catch(() => null),
          getLiveSettings().catch(() => null)
        ]);

        if (cloudProduct && !cloudProduct.message) {
          initializeProduct(cloudProduct);
        }

        if (cloudSettings) {
          setSiteSettings(cloudSettings);
        }
      } catch (e) {
        console.warn("Backend API offline, using local cached data.");
      } finally {
        setLoading(false);
      }
    };

    loadProductDetails();
  }, [id]);

  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  const increaseQuantity = () => setQuantity(prev => (prev < (product?.stock || 10) ? prev + 1 : prev));

  const handleSelectVariant = (name: string, value: string) => {
    setSelectedVariants(prev => ({ ...prev, [name]: value }));
  };

  const handleAddToCart = () => {
    if (!product || product.stock === 0 || product.status === 'Out of Stock') {
      toast.error('This product is currently out of stock!');
      return;
    }

    const originalPrice = Number(product.price) || 0;
    const discountPercent = Number(product.discount) || 0;
    const sellingPrice = discountPercent > 0 ? originalPrice - (originalPrice * discountPercent / 100) : originalPrice;

    let cartColor = 'N/A';
    let cartSizeArray: string[] = [];

    const variantKeys = Object.keys(selectedVariants);
    if (variantKeys.length > 0) {
      variantKeys.forEach((key) => {
        if (key.toLowerCase().includes('color')) {
          cartColor = selectedVariants[key];
        } else {
          cartSizeArray.push(`${key}: ${selectedVariants[key]}`);
        }
      });
    }

    const cartSize = cartSizeArray.length > 0 ? cartSizeArray.join(', ') : 'Standard';

    const cartItem = {
      id: String(product._id || product.id),
      name: String(product.name),
      price: Number(sellingPrice.toFixed(2)),
      quantity: quantity,
      size: cartSize,
      color: cartColor,
      image: mainImage || product.imageUrl || (product.images && product.images[0]) || '',
      stock: Number(product.stock) || 0
    };

    addToCart(cartItem as any);
    toast.success(`${quantity}x ${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!product || product.stock === 0 || product.status === 'Out of Stock') {
      toast.error('This product is currently out of stock!');
      return;
    }
    handleAddToCart();
    navigate('/cart');
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4)); 
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1)); 
  
  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setZoomLevel(1); 
    setPosition({ x: 0, y: 0 }); 
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) handleZoomIn(); 
    else handleZoomOut(); 
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <h2 className="text-2xl font-serif text-[#D4AF37] animate-pulse">Loading Product Details...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#111111] text-center px-4">
        <h2 className="text-3xl font-bold text-red-500 mb-4">Product Not Found!</h2>
        <p className="text-gray-400 mb-6">The product you are looking for does not exist or has been removed from the Admin Panel.</p>
        <Link to="/" className="bg-[#D4AF37] text-black px-6 py-2 rounded font-bold hover:bg-white transition-colors">
          Go Back Home
        </Link>
      </div>
    );
  }

  let displayVariants = product.variants || [];
  if (displayVariants.length === 0) {
    if (product.colors && product.colors.length > 0) displayVariants.push({ name: 'Color', options: product.colors });
    if (product.sizes && product.sizes.length > 0) displayVariants.push({ name: 'Size', options: product.sizes });
  }
  
  const galleryImages = product.images && product.images.length > 0 && !product.images[0].includes('No+Image') 
    ? product.images 
    : (product.imageUrl ? [product.imageUrl] : []);

  const originalPrice = Number(product.price) || 0;
  const discountPercent = Number(product.discount) || 0;
  const currentPrice = discountPercent > 0 ? originalPrice - (originalPrice * discountPercent / 100) : originalPrice;
  const stockVal = Number(product.stock) || 0;
  
  const realSoldCount = product.sold || 0;
  const realReviewCount = product.reviews || 0;
  const realRatingValue = product.rating || 0;

  return (
    <main className="min-h-screen py-8 bg-[#111111] text-white">
      <div className="container mx-auto px-4">
        
        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6 flex items-center space-x-2">
          <Link to="/" className="hover:text-[#D4AF37] transition-colors">
            <ChevronLeft size={16} className="inline mr-1 mb-0.5" />Home
          </Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-[#D4AF37] transition-colors">{product.category}</Link>
          <span>/</span>
          <span className="text-[#D4AF37] truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          
          {/* Column 1: Image Gallery */}
          <div className="lg:col-span-4 space-y-4">
            <div 
              onClick={() => mainImage && setIsLightboxOpen(true)}
              className={`bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-xl aspect-square flex items-center justify-center overflow-hidden relative group ${mainImage ? 'cursor-zoom-in' : 'cursor-default'}`}
              title={mainImage ? "Click to view full screen" : ""}
            >
              {mainImage ? (
                <>
                  <img src={mainImage} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Maximize2 size={36} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </>
              ) : (
                <span className="text-xl uppercase tracking-widest text-gray-500">No Image</span>
              )}
            </div>
            
            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex space-x-3 overflow-x-auto custom-scrollbar pb-2">
                {galleryImages.map((img: string, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => setMainImage(img)}
                    className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      mainImage === img ? 'border-[#D4AF37]' : 'border-transparent hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Product Info */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-white leading-tight">
                {product.name}
              </h1>
              <div className="flex space-x-3 text-gray-400">
                <button className="hover:text-[#D4AF37] transition-colors"><Share2 size={20} /></button>
                <button className="hover:text-red-500 transition-colors"><Heart size={20} /></button>
              </div>
            </div>

            <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-800 flex-wrap gap-y-2">
              <div className="flex text-[#D4AF37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(realRatingValue) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-blue-400 text-sm hover:underline cursor-pointer">
                {realReviewCount} Ratings
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 text-sm">{realSoldCount} Sold</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 text-sm">Brand: <span className="text-blue-400 hover:underline cursor-pointer">MO Premium</span></span>
            </div>

            <div className="mb-4 flex items-center space-x-3">
              <p className="text-4xl font-bold text-[#D4AF37]">{siteSettings?.currency || '৳'} {currentPrice.toFixed(2)}</p>
              {discountPercent > 0 && (
                <p className="text-gray-500 line-through text-lg">{siteSettings?.currency || '৳'} {originalPrice.toFixed(2)}</p>
              )}
            </div>

            {/* Stylish Stock Status */}
            <div className="mb-6">
              {stockVal > 10 ? (
                <span className="inline-block bg-green-500/10 text-green-500 px-3 py-1 rounded text-xs font-bold border border-green-500/20 tracking-wider">
                  IN STOCK
                </span>
              ) : stockVal > 0 ? (
                <div className="inline-flex flex-col">
                  <span className="inline-block bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded text-xs font-bold border border-yellow-500/20 tracking-wider w-max mb-1">
                    LOW STOCK
                  </span>
                  <span className="text-[#D4AF37] text-xs font-bold">Only {stockVal} items left!</span>
                </div>
              ) : (
                <span className="inline-block bg-red-500/10 text-red-500 px-3 py-1 rounded text-xs font-bold border border-red-500/20 tracking-wider">
                  OUT OF STOCK
                </span>
              )}
            </div>

            {/* Dynamic Variants Render */}
            {displayVariants.map((variant: any, index: number) => (
              <div key={index} className="mb-6">
                <h3 className="text-gray-400 mb-2 text-sm">
                  {variant.name}: <span className="text-white font-bold ml-1">{selectedVariants[variant.name]}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {variant.options.map((opt: string) => (
                    <button
                      key={opt}
                      onClick={() => handleSelectVariant(variant.name, opt)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all border ${
                        selectedVariants[variant.name] === opt 
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' 
                          : 'border-gray-700 text-gray-300 hover:border-[#D4AF37]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div className="mb-8 flex items-center space-x-4">
              <h3 className="text-gray-400 text-sm">Quantity</h3>
              <div className="flex items-center border border-gray-600 bg-[#1A1A1A] rounded-md h-10 w-28">
                <button onClick={decreaseQuantity} className="px-3 text-gray-400 hover:text-[#D4AF37] transition-colors"><Minus size={16} /></button>
                <span className="flex-1 text-center font-bold text-white">{quantity}</span>
                <button onClick={increaseQuantity} className="px-3 text-gray-400 hover:text-[#D4AF37] transition-colors"><Plus size={16} /></button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
              <button 
                onClick={handleBuyNow}
                disabled={stockVal === 0 || product.status === 'Out of Stock'}
                className="flex-1 h-12 rounded-md font-bold uppercase tracking-wider transition-all shadow-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                Buy Now
              </button>
              <button 
                onClick={handleAddToCart}
                disabled={stockVal === 0 || product.status === 'Out of Stock'}
                className="flex-1 h-12 flex items-center justify-center space-x-2 rounded-md font-bold uppercase tracking-wider transition-colors bg-[#D4AF37] text-black hover:bg-white disabled:opacity-50"
              >
                <ShoppingBag size={20} />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>

          {/* Column 3: Shipping */}
          <div className="lg:col-span-3">
            <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-5 space-y-6 sticky top-24">
              <div>
                <h3 className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-4">Delivery Options</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin size={20} className="text-[#D4AF37] mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">Inside Chittagong</p>
                      <p className="text-xs text-gray-500">Delivery in 1-2 Days</p>
                    </div>
                    <span className="text-white font-bold text-sm">{siteSettings?.currency || '৳'} {siteSettings?.shippingInside || 60}</span>
                  </div>
                  <div className="flex items-start space-x-3 border-t border-gray-800 pt-4">
                    <Truck size={20} className="text-[#D4AF37] mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">Outside Chittagong</p>
                      <p className="text-xs text-gray-500">Delivery in 3-5 Days</p>
                    </div>
                    <span className="text-white font-bold text-sm">{siteSettings?.currency || '৳'} {siteSettings?.shippingOutside || 150}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-4">Return & Warranty</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <RotateCcw size={20} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-white">14 days easy return</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden mb-8">
          <div className="bg-[#111111] px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Product details of {product.name}</h2>
          </div>
          <div className="p-6 md:p-8">
            <div className="prose prose-invert max-w-none text-gray-300">
              <p className="mb-6 whitespace-pre-wrap leading-relaxed">{product.description || 'No detailed description available for this product.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && mainImage && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-sm">
          <div className="absolute top-6 right-6 flex items-center space-x-3 z-50 bg-[#1A1A1A] p-2 rounded-full border border-gray-700 shadow-2xl">
            <button onClick={handleZoomOut} disabled={zoomLevel <= 1} className="p-2 text-white hover:text-[#D4AF37] disabled:opacity-30">
              <ZoomOut size={24} />
            </button>
            <span className="text-white font-bold min-w-[3rem] text-center text-sm">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={handleZoomIn} disabled={zoomLevel >= 4} className="p-2 text-white hover:text-[#D4AF37] disabled:opacity-30">
              <ZoomIn size={24} />
            </button>
            <div className="w-px h-6 bg-gray-600 mx-2"></div>
            <button onClick={handleCloseLightbox} className="p-2 text-red-500 hover:text-red-400">
              <X size={28} />
            </button>
          </div>
          <div 
            className={`w-full h-full overflow-hidden flex items-center justify-center p-4 ${zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <img 
              src={mainImage} 
              alt={product.name} 
              className="transition-transform duration-300 object-contain max-h-[90vh] max-w-full select-none"
              style={{ transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)` }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
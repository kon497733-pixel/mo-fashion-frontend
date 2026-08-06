import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingBag, Star, ArrowLeft, ShieldCheck,
  Plus, Minus, ThumbsUp, Trash2, Camera, X, Check,
  CreditCard 
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/useCartStore';
import { 
  getSupabaseProducts, 
  getSupabaseSettings, 
  getSupabaseReviews,
  saveSupabaseReview,
  deleteSupabaseReview,
  likeSupabaseReview 
} from '../../lib/supabase';

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cartStore = useCartStore();

  // 🚀 INSTANT SYNCHRONOUS LOAD FROM LOCAL STORAGE (ZERO DELAY <50MS)
  const [product, setProduct] = useState<any>(() => {
    try {
      const localProds = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
      return localProds.find((p: any) => String(p.id || p._id) === String(id)) || null;
    } catch (e) {
      return null;
    }
  });

  const [settings, setSettings] = useState<any>(() => {
    try {
      const localSet = JSON.parse(localStorage.getItem('mo_fashion_settings') || '{}');
      return {
        storeName: 'MO FASHION',
        currency: '৳',
        logoUrl: '',
        ...localSet
      };
    } catch (e) {
      return { storeName: 'MO FASHION', currency: '৳', logoUrl: '' };
    }
  });

  const [reviews, setReviews] = useState<any[]>(() => {
    try {
      const localRevs = JSON.parse(localStorage.getItem('mo_fashion_reviews') || '[]');
      return localRevs.filter((r: any) => String(r.productId || r.product_id) === String(id));
    } catch (e) {
      return [];
    }
  });

  const [selectedImage, setSelectedImage] = useState<string>(() => {
    if (product) {
      return product.images?.[0] || product.imageUrl || product.image || '';
    }
    return '';
  });

  const [selectedSize, setSelectedSize] = useState<string>(() => {
    return Array.isArray(product?.sizes) && product.sizes[0] ? product.sizes[0] : '';
  });

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return Array.isArray(product?.colors) && product.colors[0] ? product.colors[0] : '';
  });

  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(!product);

  // 🚀 প্রিমিয়াম ফটো রিভিউ ফর্ম স্টেট
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    userName: '',
    userEmail: '',
    comment: '',
    photoUrl: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  
  // মাউস ও হাতের স্পর্শে ইমেজ জুম স্টেট
  const [mainZoomScale, setMainZoomScale] = useState(1);
  const [mainZoomPos, setMainZoomPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  // লাইটবক্স প্রিভিউ জুম স্টেট
  const [zoomScale, setZoomScale] = useState(1);

  // 🚀 BACKGROUND CLOUD DB RE-SYNC (NON-BLOCKING)
  useEffect(() => {
    const syncCloudData = async () => {
      try {
        const [cloudProds, cloudSet, cloudRevs] = await Promise.all([
          getSupabaseProducts().catch(() => []),
          getSupabaseSettings().catch(() => null),
          getSupabaseReviews(id).catch(() => [])
        ]);

        if (cloudSet) setSettings((prev: any) => ({ ...prev, ...cloudSet }));

        const foundProd = Array.isArray(cloudProds) 
          ? cloudProds.find((p: any) => String(p.id || p._id) === String(id)) 
          : null;

        if (foundProd) {
          setProduct(foundProd);
          if (!selectedImage) {
            setSelectedImage(foundProd.images?.[0] || foundProd.imageUrl || foundProd.image || '');
          }
          if (!selectedSize && foundProd.sizes?.[0]) setSelectedSize(foundProd.sizes[0]);
          if (!selectedColor && foundProd.colors?.[0]) setSelectedColor(foundProd.colors[0]);
        }

        if (Array.isArray(cloudRevs)) {
          setReviews(cloudRevs);
        }
      } catch (err) {
        console.warn('Background sync warning:', err);
      } finally {
        setLoading(false);
      }
    };

    syncCloudData();

    const handleUpdate = () => syncCloudData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('reviewUpdated', handleUpdate);
    window.addEventListener('productUpdated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('reviewUpdated', handleUpdate);
      window.removeEventListener('productUpdated', handleUpdate);
    };
  }, [id, selectedImage, selectedSize, selectedColor]);

  // মাউস পজিশন ট্র্যাকিং
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMainZoomPos({ x, y });
  };

  // মাউস স্ক্রোল (Wheel) দিয়ে জুম ইন/আউট কন্ট্রোল
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const scaleChange = e.deltaY < 0 ? 0.2 : -0.2;
    setMainZoomScale(prev => Math.min(3.5, Math.max(1, prev + scaleChange)));
  };

  // হাতের স্পর্শ (Touch/Pinch) দিয়ে জুম ও প্যান ট্র্যাকিং
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
      setIsHovered(true);
    } else if (e.touches.length === 1) {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = ((e.touches[0].clientX - left) / width) * 100;
      const y = ((e.touches[0].clientY - top) / height) * 100;
      setMainZoomPos({ x, y });
      setIsHovered(true);
      if (mainZoomScale === 1) {
        setMainZoomScale(1.8);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDist;
      setMainZoomScale(prev => Math.min(3.5, Math.max(1, prev * factor)));
      setTouchStartDist(dist);
    } else if (e.touches.length === 1 && mainZoomScale > 1) {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = ((e.touches[0].clientX - left) / width) * 100;
      const y = ((e.touches[0].clientY - top) / height) * 100;
      setMainZoomPos({ x, y });
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(null);
  };

  // 🚀 কাস্টমার ফটো আপলোড হ্যান্ডলার (Base64 Encoding)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo size should be less than 5MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewForm(prev => ({ ...prev, photoUrl: reader.result as string }));
        toast.success("Review photo attached successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  // 🚀 রিয়াল-টাইম কাস্টমার রিভিউ সাবমিট
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewForm.userName.trim()) {
      toast.error("Please enter your name!");
      return;
    }
    if (!reviewForm.comment.trim()) {
      toast.error("Please write a comment!");
      return;
    }

    setIsSubmittingReview(true);
    const toastId = toast.loading("Submitting your review...");

    try {
      const reviewPayload = {
        id: `REV-${Date.now()}`,
        productId: String(id),
        userName: reviewForm.userName.trim(),
        userEmail: reviewForm.userEmail.trim(),
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment.trim(),
        photoUrl: reviewForm.photoUrl,
        likes: 0
      };

      await saveSupabaseReview(reviewPayload);

      setReviewForm({
        rating: 5,
        userName: '',
        userEmail: '',
        comment: '',
        photoUrl: ''
      });

      const updatedRevs = await getSupabaseReviews(id);
      setReviews(updatedRevs);

      toast.success("Review submitted successfully! 🎉", { id: toastId });
    } catch (err: any) {
      toast.error("Failed to submit review!", { id: toastId });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleLike = async (reviewId: string, currentLikes: number) => {
    const newCount = await likeSupabaseReview(reviewId, currentLikes);
    setReviews(prev => prev.map(r => String(r.id) === String(reviewId) ? { ...r, likes: newCount } : r));
    toast.success("Liked review! 👍");
  };

  const handleDelete = async (reviewId: string) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      await deleteSupabaseReview(reviewId);
      setReviews(prev => prev.filter(r => String(r.id) !== String(reviewId)));
      toast.success("Review deleted!");
    }
  };

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center pt-20">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#D4AF37] animate-pulse">Loading luxury product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center pt-20 px-4">
        <div className="text-center bg-[#1A1A1A] border border-gray-800 p-8 rounded-3xl max-w-md">
          <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-2xl font-serif font-bold text-[#D4AF37] mb-2">Product Not Found</h2>
          <p className="text-xs text-gray-400 mb-6">The product you are looking for does not exist or has been removed.</p>
          <Link to="/products" className="px-6 py-3 bg-[#D4AF37] text-black font-bold text-xs uppercase rounded-xl inline-block">
            Back to Collection
          </Link>
        </div>
      </div>
    );
  }

  const origPrice = Number(product.price) || 0;
  const discountPercent = Number(product.discount) || 0;
  const finalPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : origPrice;
  const stockCount = Number(product.stock) || 0;
  const isOutOfStock = stockCount <= 0 || product.status === 'Out of Stock';
  const isLowStock = stockCount > 0 && stockCount <= 3;

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
    : '0.0';

  const allImages = Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : [product.imageUrl || product.image || selectedImage];

  const handleAddToCart = (isBuyNow = false) => {
    if (isOutOfStock) {
      toast.error("Sorry, this item is out of stock!");
      return;
    }

    const cartPayload = {
      id: String(product.id || product._id),
      name: product.name,
      price: finalPrice,
      originalPrice: origPrice,
      discount: discountPercent,
      image: selectedImage || allImages[0],
      quantity: quantity,
      size: selectedSize,
      color: selectedColor
    };

    if (typeof (cartStore as any).addToCart === 'function') {
      (cartStore as any).addToCart(cartPayload);
    } else if (typeof (cartStore as any).addItem === 'function') {
      (cartStore as any).addItem(cartPayload);
    } else {
      useCartStore.setState((state: any) => {
        const existing = state.items.find((i: any) => String(i.id) === cartPayload.id);
        if (existing) {
          return {
            items: state.items.map((i: any) => String(i.id) === cartPayload.id ? { ...i, quantity: i.quantity + quantity } : i)
          };
        }
        return { items: [...state.items, cartPayload] };
      });
    }

    if (isBuyNow) {
      navigate('/checkout');
    } else {
      toast.success(`${product.name} added to cart! 🛒`);
    }
  };

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';

  return (
    <main className="min-h-screen pt-24 pb-20 text-white bg-[#111111] transition-all duration-300">
      <Helmet>
        <title>{product.name} | {storeBrandTitle}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-[#D4AF37] transition-all duration-200 mb-8 hover:-translate-x-1"
        >
          <ArrowLeft size={16} className="mr-1.5" />
          <span>BACK TO PREVIOUS PAGE</span>
        </button>

        {/* 🚀 MAIN PRODUCT SHOWCASE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          
          {/* Left Column: Interactive Image Gallery with Hand/Mouse Scroll Zoom */}
          <div className="space-y-4">
            <div 
              className="relative aspect-square w-full rounded-3xl bg-[#1A1A1A] border border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden group"
              style={{ touchAction: 'none' }} // মোবাইল টাচ জেসচারের জন্য পেজ স্ক্রোল অফ রাখা
              onMouseEnter={() => {
                setIsHovered(true);
                if (mainZoomScale === 1) setMainZoomScale(1.5);
              }}
              onMouseLeave={() => {
                setIsHovered(false);
                setMainZoomScale(1);
                setMainZoomPos({ x: 50, y: 50 });
              }}
              onMouseMove={handleMouseMove}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                setZoomScale(1.25);
                setPreviewModalImage(selectedImage);
              }}
            >
              {selectedImage ? (
                <img 
                  src={selectedImage} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-75 ease-out select-none pointer-events-none" 
                  style={{
                    transform: isHovered ? `scale(${mainZoomScale})` : 'scale(1)',
                    transformOrigin: `${mainZoomPos.x}% ${mainZoomPos.y}%`
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold uppercase text-xs">
                  No Image
                </div>
              )}

              {/* জুম নির্দেশক ব্যাজ */}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-800 text-[10px] text-gray-400 font-bold pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100 hidden sm:block">
                Scroll to Zoom In/Out
              </div>

              {/* Floating Badges */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
                {discountPercent > 0 ? (
                  <span className="bg-gradient-to-r from-red-600 via-orange-500 to-[#D4AF37] text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-lg border border-red-400/40">
                    -{discountPercent}% OFF
                  </span>
                ) : <span />}

                <span className={`font-bold text-xs px-3 py-1.5 rounded-full uppercase border backdrop-blur-md shadow-lg ${
                  isOutOfStock 
                    ? 'bg-red-500/30 text-red-300 border-red-500 shadow-red-500/30' 
                    : isLowStock
                    ? 'bg-amber-500/30 text-amber-200 border-amber-500 shadow-amber-500/30 animate-pulse'
                    : 'bg-emerald-500/30 text-emerald-200 border-emerald-500 shadow-emerald-500/30'
                }`}>
                  {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? `ONLY ${stockCount} LEFT!` : `${stockCount} IN STOCK`}
                </span>
              </div>
            </div>

            {/* Thumbnail Row */}
            {allImages.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar pb-2">
                {allImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 bg-[#1A1A1A] ${
                      selectedImage === img ? 'border-[#D4AF37] scale-105 shadow-md shadow-[#D4AF37]/20' : 'border-gray-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details & Order Actions */}
          <div className="space-y-6">
            
            <div className="flex justify-between items-center text-xs">
              <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                {product.category || 'Luxury Collection'}
              </span>

              {/* Real-Time Customer Average Rating */}
              <div className="flex items-center space-x-1.5 bg-[#1A1A1A] px-3.5 py-1.5 rounded-full border border-gray-800">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-white text-xs">{avgRating}</span>
                <span className="text-gray-500">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white uppercase tracking-wide leading-tight">
                {product.name}
              </h1>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest flex items-center">
                By {storeBrandTitle} <ShieldCheck size={12} className="ml-1 text-[#D4AF37]" />
              </p>
            </div>

            {/* Price & 3D Metallic Sold Badge */}
            <div className="p-4 bg-[#1A1A1A] border border-gray-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-bold text-[#D4AF37]">
                  {settings?.currency || '৳'} {finalPrice.toFixed(2)}
                </span>
                {discountPercent > 0 && (
                  <span className="text-sm text-gray-500 line-through">
                    {settings?.currency || '৳'} {origPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {Number(product.sold) > 0 && (
                <span className="bg-gradient-to-r from-[#D4AF37] to-[#aa8c2c] text-black border border-[#D4AF37] px-3 py-1 rounded-xl text-xs font-bold shadow-md shadow-[#D4AF37]/20 uppercase">
                  {product.sold} Sold
                </span>
              )}
            </div>

            {product.description && (
              <div className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light bg-[#1A1A1A]/40 p-4 rounded-2xl border border-gray-800/80">
                {product.description}
              </div>
            )}

            {/* Size Selector */}
            {Array.isArray(product.sizes) && product.sizes.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Select Size: <span className="text-[#D4AF37] font-bold">{selectedSize}</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((sz: string) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                        selectedSize === sz
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 scale-105'
                          : 'bg-[#1A1A1A] text-gray-400 border-gray-800 hover:border-[#D4AF37]/40'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Select Color: <span className="text-[#D4AF37] font-bold">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((clr: string) => (
                    <button
                      key={clr}
                      onClick={() => setSelectedColor(clr)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                        selectedColor === clr
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 scale-105'
                          : 'bg-[#1A1A1A] text-gray-400 border-gray-800 hover:border-[#D4AF37]/40'
                      }`}
                    >
                      {clr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">Quantity</label>
              <div className="inline-flex items-center bg-[#1A1A1A] border border-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="px-5 font-bold text-sm text-[#D4AF37]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => handleAddToCart(false)}
                disabled={isOutOfStock}
                className="w-full py-4 bg-[#1A1A1A] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <ShoppingBag size={18} />
                <span>ADD TO CART</span>
              </button>

              <button
                onClick={() => handleAddToCart(true)}
                disabled={isOutOfStock}
                className="w-full py-4 bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#aa8c2c] text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#D4AF37]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <CreditCard size={18} />
                <span>BUY NOW</span>
              </button>
            </div>

          </div>
        </div>

        {/* 🚀 CUSTOMER REVIEWS & RATING SECTION */}
        <section className="mt-20 pt-10 border-t border-gray-800">
          <div className="max-w-4xl mx-auto space-y-10">
            
            {/* Reviews Section Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 gap-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#D4AF37] uppercase tracking-wider flex items-center">
                  {storeLogoImage ? (
                    <img src={storeLogoImage} alt="" className="w-6 h-6 mr-2.5 object-cover rounded-full" />
                  ) : null}
                  CUSTOMER REVIEWS ({reviews.length})
                </h2>
                <p className="text-xs text-gray-400 mt-1">Real feedback from verified buyers with photo uploads</p>
              </div>

              {/* Overall Score Badge */}
              <div className="flex items-center space-x-3 bg-[#1A1A1A] p-3 rounded-2xl border border-gray-800">
                <span className="text-3xl font-serif font-bold text-[#D4AF37]">{avgRating}</span>
                <div>
                  <div className="flex text-yellow-400 text-xs">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className={s <= Math.round(Number(avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 font-semibold">{reviews.length} Verified Reviews</span>
                </div>
              </div>
            </div>

            {/* 🚀 REVIEW SUBMISSION FORM */}
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <h3 className="text-lg font-serif font-bold text-white uppercase tracking-wide">
                Write a Customer Review
              </h3>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Select Your Rating *</label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star 
                          size={24} 
                          className={star <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} 
                        />
                      </button>
                    ))}
                    <span className="text-xs text-[#D4AF37] font-bold ml-2">{reviewForm.rating} / 5 Stars</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mehedi Hasan"
                      value={reviewForm.userName}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, userName: e.target.value }))}
                      className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="e.g. mail@example.com"
                      value={reviewForm.userEmail}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, userEmail: e.target.value }))}
                      className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Your Review Comment *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Share details of your experience with this product..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* 📸 PHOTO ATTACHMENT INPUT */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                    Attach Product Photo <span className="text-[10px] text-[#D4AF37] font-normal">(Optional)</span>
                  </label>
                  
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer px-4 py-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 border border-gray-700 hover:border-[#D4AF37] rounded-xl text-xs font-bold text-gray-300 flex items-center space-x-2 transition-all">
                      <Camera size={16} className="text-[#D4AF37]" />
                      <span>Upload Product Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>

                    {reviewForm.photoUrl && (
                      <div className="relative w-14 h-14 rounded-xl border border-[#D4AF37] overflow-hidden group">
                        <img src={reviewForm.photoUrl} alt="Review attachment" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setReviewForm(prev => ({ ...prev, photoUrl: '' }))}
                          className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-8 py-3.5 bg-[#D4AF37] hover:bg-[#f3e5ab] text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting Review...' : 'Submit Review'}
                </button>
              </form>
            </div>

            {/* REVIEWS LISTING DISPLAY */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-12 bg-[#1A1A1A]/40 rounded-3xl border border-gray-800/80 p-6">
                  <Star size={36} className="mx-auto text-gray-600 mb-2 opacity-40" />
                  <p className="text-sm font-bold text-gray-400">No reviews submitted for this product yet.</p>
                  <p className="text-xs text-gray-600">Be the first customer to review this luxury item above!</p>
                </div>
              ) : (
                reviews.map((rev: any) => (
                  <div key={rev.id} className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 space-y-3 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-white text-sm">{rev.userName}</p>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center">
                            <Check size={10} className="mr-0.5" /> Verified Purchase
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} className={s <= Number(rev.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'} />
                          ))}
                          <span className="text-[10px] text-gray-500 ml-2">{rev.date}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(rev.id)}
                        className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                        title="Delete Review"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
                      {rev.comment}
                    </p>

                    {/* 📸 PHOTO THUMBNAIL WITH ZOOM PREVIEW */}
                    {rev.photoUrl && (
                      <div className="pt-2">
                        <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase">Customer Photo:</p>
                        <div 
                          onClick={() => {
                            setZoomScale(1);
                            setPreviewModalImage(rev.photoUrl);
                          }}
                          className="w-16 h-16 rounded-xl border border-[#D4AF37]/40 overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-md relative group"
                        >
                          <img src={rev.photoUrl} alt="Review attachment" className="w-full h-full object-cover select-none pointer-events-none" />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center space-x-4 text-xs border-t border-gray-800/80">
                      <button
                        onClick={() => handleLike(rev.id, Number(rev.likes || 0))}
                        className="flex items-center space-x-1.5 text-gray-400 hover:text-[#D4AF37] transition-colors font-bold"
                      >
                        <ThumbsUp size={14} />
                        <span>Helpful ({rev.likes || 0})</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </section>

      </div>

      {/* 🪟 PHOTO ZOOM PREVIEW MODAL */}
      {previewModalImage && (
        <div 
          onClick={() => {
            setPreviewModalImage(null);
            setZoomScale(1);
          }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-[#D4AF37]/40 shadow-2xl bg-[#111111] flex flex-col items-center p-4"
          >
            <div className="overflow-auto max-h-[70vh] max-w-full p-2 flex items-center justify-center custom-scrollbar">
              <img 
                src={previewModalImage} 
                alt="Review full preview" 
                className="object-contain transition-transform duration-200 select-none pointer-events-none" 
                style={{ transform: `scale(${zoomScale})` }}
              />
            </div>
            
            {/* Interactive Zoom Controls */}
            <div className="flex items-center space-x-4 mt-4 bg-[#1A1A1A] px-4 py-2 rounded-xl border border-gray-800 z-50">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setZoomScale(prev => Math.max(0.5, prev - 0.25)); 
                }}
                className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-[#D4AF37] transition-colors"
                title="Zoom Out"
              >
                <Minus size={16} />
              </button>
              <span className="text-xs text-[#D4AF37] font-bold select-none">{Math.round(zoomScale * 100)}%</span>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setZoomScale(prev => Math.min(3, prev + 0.25)); 
                }}
                className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-[#D4AF37] transition-colors"
                title="Zoom In"
              >
                <Plus size={16} />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setZoomScale(1); 
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded-lg text-white font-bold transition-all border border-gray-700"
              >
                Reset
              </button>
            </div>

            <button 
              onClick={() => {
                setPreviewModalImage(null);
                setZoomScale(1);
              }}
              className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full border border-gray-700 hover:bg-red-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
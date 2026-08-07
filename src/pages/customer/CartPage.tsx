import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag, Ticket, Image as ImageIcon, ShieldCheck, Truck, RotateCcw, Tag, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/useCartStore';
import { 
  supabase, 
  getSupabaseProducts, 
  getSupabaseSettings, 
  getSupabaseCoupons 
} from '../../lib/supabase';

export default function CartPage() {
  const navigate = useNavigate();

  const cartStore = useCartStore() as any;
  const { items, appliedCoupon, applyCoupon, removeCoupon } = cartStore;

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside' | 'outside'>('inside');
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 🚀 লাইভ ক্লাউড সেটিং ডাটা
  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: 'MO FASHION',
    currency: '৳',
    taxRate: 0,
    shippingInside: 60,
    shippingOutside: 150,
  });

  // 🚀 ১. সরাসরি Supabase Cloud Database থেকে প্রোডাক্ট ও সেটিংস সিঙ্ক করা
  useEffect(() => {
    if (typeof removeCoupon === 'function') removeCoupon();

    const loadCartData = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}

      const savedProducts = localStorage.getItem('mo_fashion_products');
      if (savedProducts) {
        try { setDbProducts(JSON.parse(savedProducts)); } catch (e) {}
      }

      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try { setSiteSettings(JSON.parse(savedSettings)); } catch (e) {}
      }

      try {
        const [cloudProds, cloudSet] = await Promise.all([
          getSupabaseProducts().catch(() => []),
          getSupabaseSettings().catch(() => null)
        ]);

        if (Array.isArray(cloudProds) && cloudProds.length > 0) {
          setDbProducts(cloudProds);
        }

        if (cloudSet && Object.keys(cloudSet).length > 0) {
          setSiteSettings(cloudSet);
        }
      } catch (e) {
        console.warn("Supabase Cloud offline, using cached cart settings.");
      }
    };

    loadCartData();
  }, []);

  const safeIncrease = (id: string, size: string, color: string) => {
    if (typeof cartStore.increaseQuantity === 'function') {
      cartStore.increaseQuantity(id, size, color);
    } else if (typeof cartStore.updateQuantity === 'function') {
      cartStore.updateQuantity(id, size, color, 'increase');
    }
  };

  const safeDecrease = (id: string, size: string, color: string) => {
    if (typeof cartStore.decreaseQuantity === 'function') {
      cartStore.decreaseQuantity(id, size, color);
    } else if (typeof cartStore.updateQuantity === 'function') {
      cartStore.updateQuantity(id, size, color, 'decrease');
    }
  };

  // 🚀 স্মুথ ও ইনস্ট্যান্ট রিমুভ (কোনো পেজ রিলোড ছাড়া)
  const safeRemove = (id: string, size: string, color: string) => {
    try {
      if (typeof cartStore.removeFromCart === 'function') {
        cartStore.removeFromCart(id, size, color);
      } else if (typeof cartStore.removeItem === 'function') {
        cartStore.removeItem(id, size, color);
      }

      const savedCart = localStorage.getItem('mo_fashion_cart_storage');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (parsed?.state?.items) {
          parsed.state.items = parsed.state.items.filter(
            (item: any) => !(String(item.id) === String(id) && item.size === size && item.color === color)
          );
        }
        if (parsed?.state?.cartItems) {
          parsed.state.cartItems = parsed.state.cartItems.filter(
            (item: any) => !(String(item.id) === String(id) && item.size === size && item.color === color)
          );
        }
        localStorage.setItem('mo_fashion_cart_storage', JSON.stringify(parsed));
      }

      toast.success('Item removed from cart');
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  let totalOriginalPrice = 0;
  let totalProductDiscount = 0;
  let subtotalAfterProductDiscount = 0;

  const enrichedCartItems = (items || []).map((cartItem: any) => {
    const dbProduct = dbProducts.find((p: any) => String(p.id || p._id) === String(cartItem.id));
    
    const originalPrice = dbProduct ? Number(dbProduct.price) : Number(cartItem.price);
    const discountPercent = dbProduct ? Number(dbProduct.discount) || 0 : 0;
    
    const discountAmountPerItem = (originalPrice * discountPercent) / 100;
    const sellingPrice = originalPrice - discountAmountPerItem;
    
    const itemOriginalTotal = originalPrice * cartItem.quantity;
    const itemDiscountTotal = discountAmountPerItem * cartItem.quantity;
    const itemSubtotal = sellingPrice * cartItem.quantity;

    totalOriginalPrice += itemOriginalTotal;
    totalProductDiscount += itemDiscountTotal;
    subtotalAfterProductDiscount += itemSubtotal;

    return {
      ...cartItem,
      originalPrice,
      discountPercent,
      sellingPrice,
      itemSubtotal,
      image: cartItem.image && cartItem.image !== 'No Image' ? cartItem.image : (dbProduct?.images?.[0] || dbProduct?.imageUrl || ''),
      stock: dbProduct ? Number(dbProduct.stock) : cartItem.stock
    };
  });

  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscountAmount = (subtotalAfterProductDiscount * Number(appliedCoupon.discountValue || 0)) / 100;
    } else {
      couponDiscountAmount = Number(appliedCoupon.discountValue || 0);
    }
    if (couponDiscountAmount > subtotalAfterProductDiscount) {
      couponDiscountAmount = subtotalAfterProductDiscount;
    }
  }

  const shippingInside = Number(siteSettings.shippingInside) || 60;
  const shippingOutside = Number(siteSettings.shippingOutside) || 150;
  const shipping = enrichedCartItems.length > 0 ? (deliveryArea === 'inside' ? shippingInside : shippingOutside) : 0;
  
  const subtotalAfterCoupon = subtotalAfterProductDiscount - couponDiscountAmount;
  const taxRate = Number(siteSettings.taxRate) || 0; 
  const taxAmount = (subtotalAfterCoupon * taxRate) / 100;
  
  const grandTotal = Math.max(0, subtotalAfterCoupon + shipping + taxAmount);

  // 🚀 ২. কুপন ভ্যালিডেট ও তারিখ চেকিং
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code!');
      return;
    }

    const inputCode = couponInput.trim().toUpperCase();
    setIsVerifyingCoupon(true);
    const toastId = toast.loading("Verifying coupon code live on Cloud Database...");

    try {
      const { data: cloudCoupons, error } = await supabase
        .from('coupons')
        .select('*');

      let allCoupons = cloudCoupons;

      if (error || !Array.isArray(cloudCoupons) || cloudCoupons.length === 0) {
        allCoupons = await getSupabaseCoupons();
      }

      if (Array.isArray(allCoupons) && allCoupons.length > 0) {
        const validCoupon = allCoupons.find((c: any) => 
          c.code && String(c.code).trim().toUpperCase() === inputCode
        );

        if (!validCoupon) {
          toast.error(`Invalid Coupon Code "${inputCode}"!`, { id: toastId });
          return;
        }

        if (validCoupon.status !== 'Active') {
          toast.error(`Coupon "${inputCode}" is currently inactive or disabled!`, { id: toastId });
          return;
        }

        const usedCount = Number(validCoupon.used) || 0;
        const limitCount = Number(validCoupon.usageLimit) || 100;
        if (usedCount >= limitCount) {
          toast.error(`Coupon "${inputCode}" has reached its maximum usage limit!`, { id: toastId });
          return;
        }

        if (validCoupon.expiryDate) {
          const expiry = new Date(validCoupon.expiryDate);
          expiry.setHours(23, 59, 59, 999);
          const now = new Date();

          if (expiry.getTime() < now.getTime()) {
            const formattedExpiry = new Date(validCoupon.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            toast.error(`Coupon "${inputCode}" expired on ${formattedExpiry}!`, { id: toastId });
            return;
          }
        }

        const discountValue = Number(validCoupon.discountValue || validCoupon.discount || 0);
        const discountType = (validCoupon.type || 'percentage').toLowerCase() === 'percentage' ? 'percentage' : 'fixed';

        if (typeof applyCoupon === 'function') {
          applyCoupon({
            code: validCoupon.code,
            discountValue: discountValue,
            discountType: discountType
          } as any);
        }

        const discText = discountType === 'percentage' ? `${discountValue}% OFF` : `৳${discountValue} OFF`;
        toast.success(`Coupon "${validCoupon.code}" applied LIVE! You saved ${discText}! 🎉`, { id: toastId });
        setCouponInput('');
      } else {
        toast.error('No active coupons found in database!', { id: toastId });
      }

    } catch (e) {
      console.warn("Cloud Coupon Error:", e);
      toast.error('Failed to verify coupon code.', { id: toastId });
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  return (
    <main className="min-h-screen py-12 bg-[#0a0a0a] text-white transition-all duration-300">
      <Helmet>
        <title>Shopping Cart | {siteSettings?.storeName || 'MO FASHION'}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase gold-text-glow">
            Your Shopping Cart
          </h1>
          <div className="hidden sm:flex items-center space-x-2 text-gray-500 text-sm font-semibold">
            <ShieldCheck size={18} className="text-green-500" />
            <span>Secure 256-bit SSL Checkout</span>
          </div>
        </div>

        {/* 🚀 3D GLASSMORPHIC GUEST CART WARNING BANNER */}
        {!currentUser && enrichedCartItems.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl mb-6 text-center text-xs sm:text-sm text-amber-200 glass-3d-panel">
            💡 You are currently shopping as a <strong className="text-[#D4AF37]">Guest</strong>. Your cart items are temporarily saved on this device. To save them permanently and access them from any device, please{' '}
            <Link to="/login" className="underline font-bold text-[#D4AF37] hover:text-white">Sign In</Link> now.
          </div>
        )}

        {enrichedCartItems.length === 0 ? (
          <div className="text-center py-24 bg-[#111111] rounded-3xl border border-gray-800 shadow-2xl max-w-3xl mx-auto relative overflow-hidden group glass-3d-panel">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <ShoppingBag size={80} className="mx-auto text-gray-700 mb-6 group-hover:text-[#D4AF37] transition-colors duration-500" strokeWidth={1} />
            <h2 className="text-3xl font-serif font-bold text-white mb-4 gold-text-glow">Your MO Cart is Empty</h2>
            <p className="text-gray-400 mb-10 text-lg font-light">Indulge in luxury. Discover our premium collections and elevate your style.</p>
            <Link to="/categories" className="inline-block bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] px-10 py-3.5 rounded-full hover:bg-[#D4AF37] hover:text-black transition-all duration-300 font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]">
              Explore Collections
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 [perspective:1200px]">
            
            <div className="lg:w-2/3 space-y-6">
              
              <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4 flex items-center justify-around text-xs sm:text-sm text-gray-400 glass-3d-panel">
                <span className="flex items-center"><RotateCcw size={16} className="mr-2 text-[#D4AF37]"/> Free 14-Day Returns</span>
                <span className="flex items-center"><Truck size={16} className="mr-2 text-[#D4AF37]"/> Fast Delivery</span>
                <span className="flex items-center"><ShieldCheck size={16} className="mr-2 text-[#D4AF37]"/> 100% Authentic</span>
              </div>

              <div className="space-y-4">
                {enrichedCartItems.map((item: any, index: number) => (
                  <div key={index} className="bg-[#111111] p-5 sm:p-6 rounded-2xl border border-gray-800 flex flex-col sm:flex-row items-center gap-6 shadow-xl hover:border-[#D4AF37]/50 transition-all relative overflow-hidden group glass-3d-card">
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                    <Link to={`/product/${item.id}`} className="w-full sm:w-36 h-36 bg-[#0a0a0a] rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden relative shadow-inner">
                      {item.image && item.image !== 'No Image' ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <ImageIcon size={32} className="text-gray-700" />
                      )}
                      {item.discountPercent > 0 && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-md uppercase tracking-wider">
                          {item.discountPercent}% OFF
                        </div>
                      )}
                    </Link>
                    
                    <div className="flex-grow w-full flex flex-col justify-center">
                      <Link to={`/product/${item.id}`}>
                        <h3 className="font-serif font-bold text-xl text-white hover:text-[#D4AF37] transition-colors cursor-pointer line-clamp-2 leading-tight">
                          {item.name}
                        </h3>
                      </Link>
                      
                      <p className="text-sm text-gray-500 mb-4 mt-2 font-medium">
                        Color: <span className="text-gray-300">{item.color || 'Default'}</span> <span className="mx-2">|</span> 
                        Size: <span className="text-gray-300">{item.size || 'Standard'}</span>
                      </p>
                      
                      <div className="flex items-center space-x-3">
                        <span className="text-[#D4AF37] font-black text-2xl">{siteSettings.currency} {item.sellingPrice.toFixed(2)}</span>
                        {item.discountPercent > 0 && (
                          <span className="text-gray-600 line-through text-sm font-medium">{siteSettings.currency} {item.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center justify-between w-full sm:w-auto sm:items-end gap-3 py-1 z-10 shrink-0">
                      <button 
                        onClick={() => safeRemove(item.id, item.size, item.color)}
                        className="text-gray-500 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-full"
                        title="Remove Item"
                      >
                        <Trash2 size={20} />
                      </button>

                      <div className="flex items-center border border-gray-700 rounded-full bg-[#0a0a0a] p-1 shadow-inner">
                        <button 
                          onClick={() => safeDecrease(item.id, item.size, item.color)} 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-30"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold w-8 text-center text-white text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => safeIncrease(item.id, item.size, item.color)} 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] transition-colors disabled:opacity-30"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right hidden sm:block mt-1">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Subtotal</p>
                        <p className="font-bold text-[#D4AF37] tracking-wide text-sm">{siteSettings.currency} {item.itemSubtotal.toFixed(2)}</p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* 🚀 3D GLASSMORPHIC ORDER SUMMARY CARD */}
            <div className="lg:w-1/3">
              <div className="bg-[#111111] p-8 rounded-3xl border border-[#D4AF37]/30 sticky top-24 shadow-[0_20px_50px_rgba(0,0,0,0.9)] glass-3d-panel">
                
                <h2 className="text-xl font-serif font-bold text-white mb-6 uppercase tracking-widest flex items-center gold-text-glow">
                  <span className="w-1.5 h-6 bg-[#D4AF37] mr-3 rounded-full shadow-[0_0_10px_#D4AF37]"></span>
                  Order Summary
                </h2>
                
                <div className="space-y-4 text-sm mb-8 font-medium">
                  <div className="flex justify-between text-gray-400">
                    <span>Original Value ({enrichedCartItems.length} items)</span>
                    <span className="text-white">{siteSettings.currency} {totalOriginalPrice.toFixed(2)}</span>
                  </div>

                  {totalProductDiscount > 0 && (
                    <div className="flex justify-between text-[#D4AF37]">
                      <span className="flex items-center"><Tag size={14} className="mr-1"/> Product Discount</span>
                      <span>-{siteSettings.currency} {totalProductDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-y border-gray-800 py-4 my-2">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-3 font-bold flex items-center">
                      <Truck size={14} className="mr-2 text-gray-600"/> Select Delivery Area
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${deliveryArea === 'inside' ? 'border-[#D4AF37] bg-[#D4AF37]/20 shadow-[0_0_8px_#D4AF37]' : 'border-gray-600'}`}>
                          {deliveryArea === 'inside' && <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>}
                        </div>
                        <input type="radio" name="area" value="inside" className="hidden" checked={deliveryArea === 'inside'} onChange={() => setDeliveryArea('inside')} />
                        <span className="text-gray-300 group-hover:text-white transition-colors">Inside Chattogram ({siteSettings.currency} {shippingInside})</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${deliveryArea === 'outside' ? 'border-[#D4AF37] bg-[#D4AF37]/20 shadow-[0_0_8px_#D4AF37]' : 'border-gray-600'}`}>
                          {deliveryArea === 'outside' && <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>}
                        </div>
                        <input type="radio" name="area" value="outside" className="hidden" checked={deliveryArea === 'outside'} onChange={() => setDeliveryArea('outside')} />
                        <span className="text-gray-300 group-hover:text-white transition-colors">Outside Chattogram ({siteSettings.currency} {shippingOutside})</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping Fee</span>
                    <span className="text-white">{siteSettings.currency} {shipping.toFixed(2)}</span>
                  </div>

                  {taxRate > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Estimated Tax ({taxRate}%)</span>
                      <span className="text-white">{siteSettings.currency} {taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-green-500 bg-green-500/10 p-3 rounded-lg border border-green-500/20 mt-2">
                      <div className="flex flex-col">
                        <span className="flex items-center font-bold text-xs uppercase tracking-wider"><Ticket size={14} className="mr-1.5"/> Code: {appliedCoupon.code}</span>
                        <button onClick={() => { if(typeof removeCoupon === 'function') removeCoupon(); toast.success('Coupon removed!'); }} className="text-[10px] text-gray-400 hover:text-red-400 hover:underline text-left mt-1.5 uppercase tracking-wider">Remove Coupon</button>
                      </div>
                      <span className="font-bold">-{siteSettings.currency} {couponDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-gray-800 pt-5 mb-8">
                  <div className="flex justify-between items-end">
                    <span className="font-serif font-bold text-lg text-gray-300 uppercase tracking-widest">Total Amount</span>
                    <span className="font-black text-3xl text-[#D4AF37] gold-text-glow">{siteSettings.currency} {grandTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-right text-gray-500 mt-1">Inclusive of all taxes & fees</p>
                </div>

                {!appliedCoupon && (
                  <div className="mb-6 relative">
                    <div className="flex items-stretch h-12 rounded-lg overflow-hidden border border-gray-700 focus-within:border-[#D4AF37] transition-colors shadow-inner">
                      <input 
                        type="text" 
                        placeholder="PROMO CODE" 
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="flex-grow bg-[#0a0a0a] px-4 text-white focus:outline-none uppercase tracking-widest text-sm placeholder-gray-600"
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        disabled={isVerifyingCoupon || !couponInput.trim()}
                        className="bg-gray-800 hover:bg-[#D4AF37] text-white hover:text-black px-6 transition-all duration-300 font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-1"
                      >
                        {isVerifyingCoupon ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 🚀 3D METALLIC CHECKOUT BUTTON WITH LOGIN GATE */}
                <button 
                  onClick={() => {
                    if (!currentUser) {
                      toast.error("Please sign in to proceed to checkout! 🔐");
                      navigate('/login', { state: { from: { pathname: '/checkout' } } });
                      return;
                    }
                    localStorage.setItem('mo_selected_delivery_area', deliveryArea);
                    navigate('/checkout');
                  }}
                  className="w-full bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#aa8c2c] text-black h-14 rounded-xl flex items-center justify-center space-x-3 hover:brightness-110 transition-all duration-300 font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(212,175,55,0.35)] hover:shadow-[0_15px_45px_rgba(212,175,55,0.6)] transform hover:-translate-y-1 active:scale-95"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={20} strokeWidth={3} />
                </button>
                
                <div className="text-center mt-6">
                  <Link to="/categories" className="text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold transition-colors border-b border-transparent hover:border-white pb-0.5">
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
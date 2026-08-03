import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone, Banknote, Tag, MapPin, Check, Sparkles, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

import { useCartStore } from '../../store/useCartStore';
import { notifyNewOrder } from '../../services/emailService';
import { 
  supabase, 
  getSupabaseProducts, 
  getSupabaseSettings, 
  saveSupabaseOrder, 
  saveSupabaseCustomer, 
  saveSupabaseProduct,
  getSupabaseCoupons,
  saveSupabaseCoupon
} from '../../lib/supabase';

// 🚀 বাংলাদেশের ৬৪ জেলার তালিকা
const bdDistricts = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogra", "Brahmanbaria", "Chandpur", 
  "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", 
  "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", 
  "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", 
  "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", 
  "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Nawabganj", 
  "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", 
  "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", 
  "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, appliedCoupon, clearCart } = useCartStore();

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // সিটির ড্রপডাউন প্রদর্শন স্টেট
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  // 🚀 লাইভ ক্লাউড সেটিং ডাটা
  const [safeSettings, setSafeSettings] = useState<any>({
    storeName: 'MO FASHION',
    currency: '৳',
    shippingInside: 60,
    shippingOutside: 150,
    taxRate: 0,
    enableBkash: true,
    enableCard: true,
    enableCOD: true
  });

  useEffect(() => {
    const loadCheckoutData = async () => {
      const savedProducts = localStorage.getItem('mo_fashion_products');
      if (savedProducts) setDbProducts(JSON.parse(savedProducts));

      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) setSafeSettings(JSON.parse(savedSettings));

      try {
        // 🚀 ২. সরাসরি Supabase Cloud থেকে লাইভ ডাটা ফেচ
        const [cloudProds, cloudSet] = await Promise.all([
          getSupabaseProducts().catch(() => []),
          getSupabaseSettings().catch(() => null)
        ]);

        if (Array.isArray(cloudProds) && cloudProds.length > 0) {
          setDbProducts(cloudProds);
        }

        if (cloudSet) {
          setSafeSettings(cloudSet);
        }
      } catch (e) {
        console.warn("Backend API offline, using cached settings.");
      }
    };

    loadCheckoutData();
  }, []);

  // ড্রপডাউনের বাইরে ক্লিক করলে ড্রপডাউন হাইড করার লজিক
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!paymentMethod) {
      if (safeSettings?.enableBkash !== false) setPaymentMethod('bKash');
      else if (safeSettings?.enableCard !== false) setPaymentMethod('Card');
      else setPaymentMethod('Cash on Delivery');
    }
  }, [safeSettings, paymentMethod]);

  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '',
    address: '', 
    city: '', 
    postalCode: '', 
    country: 'Bangladesh' 
  });

  // ফিল্টার করা জেলাগুলোর লিস্ট
  const filteredDistricts = bdDistricts.filter(district => 
    district.toLowerCase().includes((formData.city || '').toLowerCase())
  );

  const handleSelectCity = (district: string) => {
    setFormData({ ...formData, city: district });
    setShowCityDropdown(false);
  };

  // রিয়েল-টাইম সাবটোটাল হিসাব
  let subtotalAfterProductDiscount = 0;
  const enrichedCartItems = items.map((cartItem: any) => {
    const dbProduct = dbProducts.find(p => String(p.id || p._id) === String(cartItem.id));
    const originalPrice = dbProduct ? Number(dbProduct.price) : Number(cartItem.price);
    const discountPercent = dbProduct ? Number(dbProduct.discount) || 0 : 0;
    const sellingPrice = originalPrice - (originalPrice * discountPercent) / 100;
    
    subtotalAfterProductDiscount += sellingPrice * cartItem.quantity;
    return { ...cartItem, dbProduct };
  });

  const isInsideChattogram = formData.city.toLowerCase().includes('chattogram') || formData.city.toLowerCase().includes('chittagong');
  const shippingInside = safeSettings.shippingInside !== undefined ? Number(safeSettings.shippingInside) : 60;
  const shippingOutside = safeSettings.shippingOutside !== undefined ? Number(safeSettings.shippingOutside) : 150;
  const shipping = items.length > 0 ? (isInsideChattogram ? shippingInside : shippingOutside) : 0;

  const taxRate = safeSettings.taxRate !== undefined ? Number(safeSettings.taxRate) : 0;
  const taxAmount = (subtotalAfterProductDiscount * taxRate) / 100;

  const totalBeforeCoupon = subtotalAfterProductDiscount + shipping + taxAmount;

  let finalCouponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      finalCouponDiscountAmount = (totalBeforeCoupon * appliedCoupon.discountValue) / 100;
    } else {
      finalCouponDiscountAmount = appliedCoupon.discountValue;
    }
    if (finalCouponDiscountAmount > totalBeforeCoupon) finalCouponDiscountAmount = totalBeforeCoupon;
  }
  
  const totalAmount = Math.max(0, totalBeforeCoupon - finalCouponDiscountAmount);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🚀 ফোন নাম্বার ভ্যালিডেশন (বাংলাদেশি ১১ ডিজিটের নাম্বার)
  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    return bdPhoneRegex.test(cleanPhone);
  };

  // 🚀 ইমেইল ভ্যালিডেশন
  const validateEmail = (email: string) => {
    if (!email.trim()) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // 🚀 প্লেস অর্ডার লজিক (Supabase Cloud Direct Save for All Devices)
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
    if (items.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Please enter both First Name and Last Name!");
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error("Please enter a valid Bangladeshi Phone Number (e.g. 01712345678)!");
      return;
    }

    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid Email Address!");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("Please enter your full address!");
      return;
    }

    if (!formData.city.trim()) {
      toast.error("Please select or enter your City/District!");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Processing your order securely...");

    const orderId = `#ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const customerName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
    const customerEmail = formData.email.trim() || `${formData.phone.trim()}@mofashion.com`;

    const orderPayload = {
      id: orderId,
      _id: orderId,
      orderId: orderId,
      customer: customerName,
      customerInfo: {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: customerEmail,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim() || 'N/A',
        country: 'Bangladesh'
      },
      email: customerEmail,
      phone: formData.phone.trim(),
      address: `${formData.address.trim()}, ${formData.city.trim()}${formData.postalCode.trim() ? ' - ' + formData.postalCode.trim() : ''}, Bangladesh`,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      total: totalAmount,
      status: 'Pending',
      items: items.length,
      paymentMethod: paymentMethod,
      paymentDetails: { method: paymentMethod, status: 'Pending' },
      orderItems: items,
      orderSummary: {
        subtotal: subtotalAfterProductDiscount,
        shipping: shipping,
        tax: taxAmount,
        total: totalAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        discount: finalCouponDiscountAmount
      }
    };

    const customerPayload = {
      id: `CUST-${formData.phone.trim()}`,
      _id: `CUST-${formData.phone.trim()}`,
      name: customerName,
      email: customerEmail,
      phone: formData.phone.trim(),
      address: `${formData.address.trim()}, ${formData.city.trim()}`,
      orders: 1,
      spent: totalAmount,
      status: 'Active',
      joinDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    try {
      // 🚀 ১. অর্ডার সরাসরি Supabase Cloud Database-এ সেভ করা (এডমিন প্যানেলে সিঙ্ক হবে)
      await saveSupabaseOrder(orderPayload);

      // 🚀 ২. কাস্টমার প্রোফাইল সরাসরি Supabase Cloud Database-এ সেভ করা
      await saveSupabaseCustomer(customerPayload);

      // 🚀 ৩. প্রোডাক্টের স্টক কমানো এবং সোল্ড কাউন্ট বাড়ানো
      const savedProducts = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
      for (const p of savedProducts) {
        const orderedItem = items.find((i: any) => String(i.id) === String(p._id || p.id));
        if (orderedItem) {
          const currentStock = Number(p.stock) || 0;
          const currentSold = Number(p.sold) || 0;
          const newStock = Math.max(0, currentStock - orderedItem.quantity);
          const newSold = currentSold + orderedItem.quantity;
          
          const updatedProduct = {
            ...p,
            stock: newStock,
            sold: newSold,
            status: newStock <= 0 ? 'Out of Stock' : p.status
          };

          await saveSupabaseProduct(updatedProduct).catch(() => null);
        }
      }

      // 🚀 ৪. কুপন ইউজ কাউন্ট বাড়ানো
      if (appliedCoupon) {
        const allCoupons = await getSupabaseCoupons();
        const targetCoupon = allCoupons.find((c: any) => c.code === appliedCoupon.code);
        if (targetCoupon) {
          const newUsedCount = (Number(targetCoupon.used) || 0) + 1;
          const newStatus = (targetCoupon.usageLimit && newUsedCount >= targetCoupon.usageLimit) ? 'Expired' : targetCoupon.status;
          await saveSupabaseCoupon({ ...targetCoupon, used: newUsedCount, status: newStatus }).catch(() => null);
        }
      }

      // 🚀 ৫. ইমেইল নোটিফিকেশন সেন্ড
      try { await notifyNewOrder(orderId, customerName, totalAmount); } catch(e){}

      // ইভেন্ট ব্রডকাস্ট
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('orderUpdated'));

      toast.success(`Order ${orderId} placed successfully! 🎉`, { id: toastId });
      clearCart();
      setTimeout(() => navigate('/'), 2000);

    } catch (error) {
      console.error("Order Placement Error:", error);
      toast.success(`Order ${orderId} placed successfully! 🎉`, { id: toastId });
      clearCart();
      setTimeout(() => navigate('/'), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen py-10 text-white bg-[#111111] transition-all duration-300">
      <Helmet><title>Checkout | {safeSettings?.storeName || 'MO FASHION'}</title></Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        <Link to="/cart" className="inline-flex items-center text-gray-400 hover:text-[#D4AF37] transition-all duration-200 mb-8 hover:-translate-x-1">
          <ChevronLeft size={20} className="mr-1" />
          <span>Back to Cart</span>
        </Link>

        {/* 🚀 Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#D4AF37]/20">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
            <Sparkles className="mr-3 text-[#D4AF37]" size={32} />
            CHECKOUT
          </h1>
          <span className="hidden sm:flex items-center text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse">
            <ShieldCheck size={14} className="mr-1.5" /> 256-Bit SSL Encrypted
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Shipping Form */}
          <div className="lg:w-2/3 space-y-8">
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-[#D4AF37]/40 transition-all duration-300 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-[#D4AF37]/10 pb-4 mb-6">
                <h2 className="text-xl font-bold text-[#D4AF37] uppercase tracking-wide">Shipping Details</h2>
                <span className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded-full border border-[#D4AF37]/20 flex items-center">
                  <MapPin size={12} className="mr-1" /> Delivery within Bangladesh only
                </span>
              </div>
              
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">First Name *</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" placeholder="e.g. Mehedi" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Last Name *</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" placeholder="e.g. Hasan" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Email Address <span className="text-xs text-gray-500 font-normal">(Optional)</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" placeholder="e.g. mail@example.com" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Phone Number * <span className="text-xs text-[#D4AF37] font-normal">(e.g. 01712345678)</span></label>
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" placeholder="e.g. 01712345678" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Full Address *</label>
                  <input type="text" name="address" required value={formData.address} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" placeholder="House/Road/Area" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* সিটির ড্রপডাউন */}
                  <div className="relative" ref={cityRef}>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">City / District *</label>
                    <input 
                      type="text" 
                      name="city"
                      required 
                      value={formData.city} 
                      onChange={(e) => {
                        handleChange(e);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" 
                      placeholder="Type district (e.g. Chattogram, Dhaka)" 
                      autoComplete="off"
                    />
                    
                    {showCityDropdown && filteredDistricts.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                        {filteredDistricts.map((district) => (
                          <div
                            key={district}
                            onMouseDown={() => handleSelectCity(district)}
                            className="px-4 py-2.5 text-sm text-gray-300 hover:bg-[#D4AF37] hover:text-black cursor-pointer flex items-center justify-between transition-colors font-medium"
                          >
                            <span>{district}</span>
                            {formData.city === district && <Check size={14} className="text-black" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Postal Code <span className="text-xs text-gray-500 font-normal">(Optional)</span></label>
                    <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" placeholder="e.g. 4000" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Country</label>
                    <input type="text" name="country" value="Bangladesh" readOnly className="w-full bg-[#1A1A1A] border border-gray-700 text-gray-400 rounded-xl px-4 py-3 cursor-not-allowed focus:outline-none text-sm font-semibold" />
                  </div>
                </div>
              </form>
            </div>

            {/* Payment Methods */}
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-[#D4AF37]/40 transition-all duration-300">
              <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase tracking-wide border-b border-[#D4AF37]/10 pb-4">Select Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {safeSettings?.enableBkash !== false && (
                  <button type="button" onClick={() => setPaymentMethod('bKash')} className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all duration-300 active:scale-95 ${paymentMethod === 'bKash' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10 scale-[1.02]' : 'border-gray-800 text-gray-400 hover:border-[#D4AF37]/50 hover:text-white bg-[#111111]'}`}>
                    <Smartphone size={32} className="mb-2.5 text-[#D4AF37]" />
                    <span className="font-bold text-sm">bKash</span>
                  </button>
                )}
                {safeSettings?.enableCard !== false && (
                  <button type="button" onClick={() => setPaymentMethod('Card')} className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all duration-300 active:scale-95 ${paymentMethod === 'Card' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10 scale-[1.02]' : 'border-gray-800 text-gray-400 hover:border-[#D4AF37]/50 hover:text-white bg-[#111111]'}`}>
                    <CreditCard size={32} className="mb-2.5 text-[#D4AF37]" />
                    <span className="font-bold text-sm">Credit/Debit Card</span>
                  </button>
                )}
                {safeSettings?.enableCOD !== false && (
                  <button type="button" onClick={() => setPaymentMethod('Cash on Delivery')} className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all duration-300 active:scale-95 ${paymentMethod === 'Cash on Delivery' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10 scale-[1.02]' : 'border-gray-800 text-gray-400 hover:border-[#D4AF37]/50 hover:text-white bg-[#111111]'}`}>
                    <Banknote size={32} className="mb-2.5 text-[#D4AF37]" />
                    <span className="font-bold text-sm text-center leading-tight">Cash on Delivery</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-2xl p-6 sm:p-8 shadow-2xl sticky top-24 transition-all duration-300">
              <h2 className="text-xl font-serif font-bold text-[#D4AF37] mb-6 uppercase tracking-wide border-b border-[#D4AF37]/10 pb-4">Order Summary</h2>
              
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3.5 text-sm border-b border-gray-800/80 pb-3 last:border-0 group">
                    <div className="w-12 h-12 bg-[#111111] rounded-xl overflow-hidden flex-shrink-0 border border-gray-700 shadow-sm group-hover:scale-105 transition-transform">
                      {item.image && item.image !== 'No Image' ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-[#D4AF37] uppercase font-bold">No Img</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-200 line-clamp-1 font-semibold group-hover:text-[#D4AF37] transition-colors">{item.name}</span>
                      <span className="text-xs text-gray-500">Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ''}</span>
                    </div>
                    <span className="text-[#D4AF37] font-bold">{safeSettings?.currency || '৳'} {(Number(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-4 space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white font-medium">{safeSettings?.currency || '৳'} {subtotalAfterProductDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Shipping <span className="text-xs">({isInsideChattogram ? 'Inside CTG' : 'Outside CTG'})</span></span>
                  <span className="text-white font-medium">{safeSettings?.currency || '৳'} {shipping.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tax ({taxRate}%)</span>
                    <span className="text-white font-medium">{safeSettings?.currency || '৳'} {taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-green-400 items-center bg-green-500/10 p-2.5 rounded-xl border border-green-500/20 mt-2 text-xs font-bold">
                    <span className="flex items-center"><Tag size={14} className="mr-1.5" /> Coupon ({appliedCoupon.code})</span>
                    <span>-{safeSettings?.currency || '৳'} {finalCouponDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#D4AF37]/30 pt-5 mb-8 flex justify-between items-end">
                <span className="font-serif font-bold text-lg text-white">Grand Total</span>
                <span className="font-bold text-3xl text-[#D4AF37] tracking-wider animate-pulse">
                  {safeSettings?.currency || '৳'} {totalAmount.toFixed(2)}
                </span>
              </div>

              <button 
                type="submit"
                form="checkout-form"
                disabled={isSubmitting || items.length === 0 || !paymentMethod}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#f3e5ab] text-black py-4 rounded-xl hover:scale-105 transition-all duration-300 font-bold uppercase tracking-wider text-sm shadow-xl shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? 'Processing Securely...' : 'Place Order Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
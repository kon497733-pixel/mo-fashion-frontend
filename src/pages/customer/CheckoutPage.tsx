import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone, Banknote, Tag, MapPin, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

import { useCartStore } from '../../store/useCartStore';
import { getLiveProducts, getLiveSettings, apiRequest } from '../../config/api'; // 🚀 সেন্ট্রাল এপিআই ইমপোর্ট

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
        // 🚀 ২. সেন্ট্রাল এপিআই থেকে লাইভ ডাটা ফেচ
        const [cloudProds, cloudSet] = await Promise.all([
          getLiveProducts().catch(() => null),
          getLiveSettings().catch(() => null)
        ]);

        if (Array.isArray(cloudProds)) {
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

  // ফিল্টার করা জেলাগুলোর লিস্ট (টাইপিংয়ের সাথে সাথে সাজেশন দেখাবে)
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

  // 🚀 ইমেইল ভ্যালিডেশন (ফাঁকা রাখলে ভ্যালিড, কিন্তু টাইপ করলে ফরম্যাট সঠিক হতে হবে)
  const validateEmail = (email: string) => {
    if (!email.trim()) return true; // অপশনাল
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // 🚀 প্লেস অর্ডার লজিক
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
    // ১. কার্ট চেক
    if (items.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }

    // ২. নাম ভ্যালিডেশন
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Please enter both First Name and Last Name!");
      return;
    }

    // ৩. ফোন নাম্বার সঠিকতার ভ্যালিডেশন
    if (!validatePhone(formData.phone)) {
      toast.error("Please enter a valid Bangladeshi Phone Number (e.g. 01712345678)!");
      return;
    }

    // ৪. ইমেইল ফরম্যাট ভ্যালিডেশন (যদি দেওয়া হয়)
    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid Email Address!");
      return;
    }

    // ৫. ঠিকানা ও জেলা ভ্যালিডেশন
    if (!formData.address.trim()) {
      toast.error("Please enter your full address!");
      return;
    }

    if (!formData.city.trim()) {
      toast.error("Please select or enter your City/District!");
      return;
    }

    // ৬. পেমেন্ট মেথড চেক
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

    try {
      // 🚀 ১. কেনা প্রোডাক্টগুলোর স্টক কমানো এবং Sold সংখ্যা লাইভ ডাটাবেসে বাড়ানো
      const savedProducts = JSON.parse(localStorage.getItem('mo_fashion_products') || '[]');
      const updatedProducts = savedProducts.map((p: any) => {
        const orderedItem = items.find((i: any) => String(i.id) === String(p._id || p.id));
        if (orderedItem) {
          const currentStock = Number(p.stock) || 0;
          const currentSold = Number(p.sold) || 0;
          const newStock = Math.max(0, currentStock - orderedItem.quantity);
          const newSold = currentSold + orderedItem.quantity;
          
          // সেন্ট্রাল এপিআই দিয়ে লাইভ স্টক আপডেট
          apiRequest(`/products/${p._id || p.id}`, {
            method: 'PUT',
            body: JSON.stringify({ stock: newStock, sold: newSold })
          }).catch(() => null);

          return {
            ...p,
            stock: newStock,
            sold: newSold,
            status: newStock <= 0 ? 'Out of Stock' : p.status
          };
        }
        return p;
      });
      localStorage.setItem('mo_fashion_products', JSON.stringify(updatedProducts));

      // 🚀 ২. কুপন ইউজ লিমিট কমানো এবং লাইভ ডাটাবেসে সিঙ্ক
      if (appliedCoupon) {
        const allCoupons = JSON.parse(localStorage.getItem('mo_fashion_coupons') || '[]');
        const updatedCoupons = allCoupons.map((c: any) => {
          if (c.code === appliedCoupon.code) {
            const newUsedCount = (Number(c.used) || 0) + 1;
            const newStatus = (c.usageLimit && newUsedCount >= c.usageLimit) ? 'Expired' : c.status;
            
            // সেন্ট্রাল এপিআই দিয়ে লাইভ কুপন আপডেট
            apiRequest(`/coupons/${c._id || c.id}`, {
              method: 'PUT',
              body: JSON.stringify({ used: newUsedCount, status: newStatus })
            }).catch(() => null);

            return { ...c, used: newUsedCount, status: newStatus };
          }
          return c;
        });
        localStorage.setItem('mo_fashion_coupons', JSON.stringify(updatedCoupons));
      }

      // 🚀 ৩. ক্লাউড ডাটাবেসে অর্ডার সেভ (Central API POST Call)
      try {
        await apiRequest('/orders', {
          method: 'POST',
          body: JSON.stringify(orderPayload)
        });
      } catch (err) {
        console.warn("Cloud Sync warning: Backend offline, saving locally.");
      }

      // 🚀 ৪. লোকাল স্টোরেজে ব্যাকআপ সেভ করা
      const existingOrders = JSON.parse(localStorage.getItem('mo_fashion_orders') || '[]');
      localStorage.setItem('mo_fashion_orders', JSON.stringify([orderPayload, ...existingOrders]));

      const existingCustomers = JSON.parse(localStorage.getItem('mo_fashion_customers') || '[]');
      const customerIndex = existingCustomers.findIndex((c: any) => c.phone === formData.phone.trim());
      
      if (customerIndex >= 0) {
        existingCustomers[customerIndex].orders += 1;
        existingCustomers[customerIndex].spent += totalAmount;
      } else {
        existingCustomers.push({
          id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
          name: customerName,
          email: customerEmail,
          phone: formData.phone.trim(),
          orders: 1,
          spent: totalAmount,
          status: 'Active',
          joinDate: new Date().toLocaleDateString('en-GB')
        });
      }
      localStorage.setItem('mo_fashion_customers', JSON.stringify(existingCustomers));

      toast.success(`Order ${orderId} placed successfully!`, { id: toastId });
      clearCart();
      setTimeout(() => navigate('/'), 2000);

    } catch (error) {
      console.error("Order Error:", error);
      toast.success(`Order placed successfully!`, { id: toastId });
      clearCart();
      setTimeout(() => navigate('/'), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen py-10 text-white bg-[#111111]">
      <Helmet><title>Checkout | {safeSettings?.storeName || 'MO FASHION'}</title></Helmet>

      <div className="container mx-auto px-4">
        <Link to="/cart" className="inline-flex items-center text-gray-400 hover:text-[#D4AF37] transition-colors mb-8">
          <ChevronLeft size={20} className="mr-1" />
          <span>Back to Cart</span>
        </Link>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#D4AF37] mb-8 tracking-wider uppercase">
          CHECKOUT
        </h1>

        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Shipping Form */}
          <div className="lg:w-2/3 space-y-8">
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center border-b border-[#D4AF37]/10 pb-3 mb-6">
                <h2 className="text-xl font-bold text-[#D4AF37] uppercase tracking-wide">Shipping Details</h2>
                <span className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-1 rounded border border-[#D4AF37]/20 flex items-center">
                  <MapPin size={12} className="mr-1" /> Delivery within Bangladesh only
                </span>
              </div>
              
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">First Name *</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-md px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" placeholder="e.g. Mehedi" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Last Name *</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-md px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" placeholder="e.g. Hasan" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {/* ইমেইল অপশনাল */}
                    <label className="block text-gray-400 text-sm mb-2">Email Address <span className="text-xs text-gray-500">(Optional)</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-md px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" placeholder="e.g. mail@example.com (optional)" />
                  </div>
                  <div>
                    {/* ফোন নাম্বার ভ্যালিডেশন সহ */}
                    <label className="block text-gray-400 text-sm mb-2">Phone Number * <span className="text-xs text-gray-500">(e.g. 01712345678)</span></label>
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-md px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" placeholder="e.g. 01712345678" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Full Address *</label>
                  <input type="text" name="address" required value={formData.address} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-md px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" placeholder="House/Road/Area" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* সিটির ড্রপডাউন */}
                  <div className="relative" ref={cityRef}>
                    <label className="block text-gray-400 text-sm mb-2">City / District *</label>
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
                      className="w-full bg-[#111111] border border-gray-700 rounded-md px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" 
                      placeholder="Type district (e.g. Chattogram, Dhaka)" 
                      autoComplete="off"
                    />
                    
                    {showCityDropdown && filteredDistricts.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 custom-scrollbar">
                        {filteredDistricts.map((district) => (
                          <div
                            key={district}
                            onMouseDown={() => handleSelectCity(district)}
                            className="px-4 py-2.5 text-sm text-gray-300 hover:bg-[#D4AF37] hover:text-black cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span>{district}</span>
                            {formData.city === district && <Check size={14} className="text-black" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {/* 🚀 পোস্টাল কোড এখন অপশনাল */}
                    <label className="block text-gray-400 text-sm mb-2">Postal Code <span className="text-xs text-gray-500">(Optional)</span></label>
                    <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-md px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" placeholder="e.g. 4000 (optional)" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Country</label>
                    <input type="text" name="country" value="Bangladesh" readOnly className="w-full bg-[#1A1A1A] border border-gray-700 text-gray-400 rounded-md px-4 py-2.5 cursor-not-allowed focus:outline-none" />
                  </div>
                </div>
              </form>
            </div>

            {/* Payment Methods */}
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase tracking-wide border-b border-[#D4AF37]/10 pb-3">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {safeSettings?.enableBkash !== false && (
                  <button type="button" onClick={() => setPaymentMethod('bKash')} className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-300 ${paymentMethod === 'bKash' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-700 text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-[#111111]'}`}>
                    <Smartphone size={32} className="mb-2" />
                    <span className="font-medium">bKash</span>
                  </button>
                )}
                {safeSettings?.enableCard !== false && (
                  <button type="button" onClick={() => setPaymentMethod('Card')} className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-300 ${paymentMethod === 'Card' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-700 text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-[#111111]'}`}>
                    <CreditCard size={32} className="mb-2" />
                    <span className="font-medium">Credit/Debit Card</span>
                  </button>
                )}
                {safeSettings?.enableCOD !== false && (
                  <button type="button" onClick={() => setPaymentMethod('Cash on Delivery')} className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-300 ${paymentMethod === 'Cash on Delivery' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-700 text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-[#111111]'}`}>
                    <Banknote size={32} className="mb-2" />
                    <span className="font-medium text-center leading-tight">Cash on Delivery</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-xl p-6 shadow-lg sticky top-24">
              <h2 className="text-xl font-serif font-bold text-[#D4AF37] mb-6 uppercase tracking-wide border-b border-[#D4AF37]/10 pb-3">Order Summary</h2>
              
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 text-sm border-b border-gray-800 pb-3 last:border-0">
                    <div className="w-12 h-12 bg-[#111111] rounded overflow-hidden flex-shrink-0 border border-gray-700">
                      {item.image && item.image !== 'No Image' ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-[#D4AF37] uppercase">No Img</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-200 line-clamp-1 font-medium">{item.name}</span>
                      <span className="text-xs text-gray-500">Qty: {item.quantity} | {item.size}</span>
                    </div>
                    <span className="text-[#D4AF37] font-bold">{safeSettings?.currency || '৳'} {(Number(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">{safeSettings?.currency || '৳'} {subtotalAfterProductDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Shipping <span className="text-xs">({isInsideChattogram ? 'Inside CTG' : 'Outside CTG'})</span></span>
                  <span className="text-white">{safeSettings?.currency || '৳'} {shipping.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tax ({taxRate}%)</span>
                    <span className="text-white">{safeSettings?.currency || '৳'} {taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-green-400 items-center bg-green-500/10 p-2 rounded border border-green-500/20 mt-2">
                    <span className="flex items-center"><Tag size={14} className="mr-1" /> Coupon ({appliedCoupon.code})</span>
                    <span>-{safeSettings?.currency || '৳'} {finalCouponDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#D4AF37]/30 pt-5 mb-8 flex justify-between items-end">
                <span className="font-serif font-bold text-lg text-white">Grand Total</span>
                <span className="font-bold text-3xl text-[#D4AF37]">{safeSettings?.currency || '৳'} {totalAmount.toFixed(2)}</span>
              </div>

              <button 
                type="submit"
                form="checkout-form"
                disabled={isSubmitting || items.length === 0 || !paymentMethod}
                className="w-full bg-[#D4AF37] text-black py-4 rounded-lg hover:bg-white transition-colors font-bold uppercase tracking-wider text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
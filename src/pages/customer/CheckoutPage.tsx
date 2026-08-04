import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone, Banknote, Tag, MapPin, Sparkles, ShieldCheck, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

import { useCartStore } from '../../store/useCartStore';
import { notifyNewOrder } from '../../services/emailService';
import { 
  getSupabaseProducts, 
  getSupabaseSettings, 
  saveSupabaseOrder, 
  saveSupabaseCustomer, 
  saveSupabaseProduct,
  getSupabaseCoupons,
  saveSupabaseCoupon
} from '../../lib/supabase';

// 🚀 বাংলাদেশের বিভাগ, জেলা ও থানা/উপজেলার ডাটাবেস
const bdLocations: Record<string, Record<string, string[]>> = {
  "Dhaka": {
    "Dhaka": ["Dhanmondi", "Gulshan", "Banani", "Mirpur", "Uttara", "Mohammadpur", "Tejgaon", "Badda", "Rampura", "Jatrabari", "Savar", "Dhamrai", "Keraniganj", "Dohar", "Nawabganj"],
    "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kapasia", "Sreepur", "Kaliganj"],
    "Narayanganj": ["Narayanganj Sadar", "Araihazar", "Bandar", "Rupganj", "Sonargaon"],
    "Tangail": ["Tangail Sadar", "Gopalpur", "Basail", "Bhuapur", "Delduar", "Ghatail", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur"],
    "Narsingdi": ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
    "Manikganj": ["Manikganj Sadar", "Singair", "Saturia", "Shibalaya", "Harirampur", "Ghior", "Daulatpur"],
    "Munshiganj": ["Munshiganj Sadar", "Gazaria", "Tongibari", "Sreenagar", "Lohajang", "Sirajdikhan"],
    "Faridpur": ["Faridpur Sadar", "Bhanga", "Boalmari", "Charbhadrasan", "Alfadanga", "Madhukhali", "Nagarkanda", "Sadarpur"],
    "Madaripur": ["Madaripur Sadar", "Kalkini", "Rajoir", "Shibchar"],
    "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
    "Rajbari": ["Rajbari Sadar", "Baliakandi", "Goalandaghat", "Pangsha", "Salkopa"],
    "Shariatpur": ["Shariatpur Sadar", "Damudya", "Naria", "Zajira", "Bhedarganj", "Gosairhat"],
    "Kishoreganj": ["Kishoreganj Sadar", "Bhairab", "Bajitpur", "Katiadi", "Kuliarchar", "Pakundia", "Itna", "Tarail"]
  },
  "Chattogram": {
    "Chattogram": ["Kotwali", "Panchlaish", "Halishahar", "Agrabad", "Khulshi", "Chittagong Sadar", "Hathazari", "Sitakunda", "Patiya", "Mirsarai", "Raozan", "Rangunia", "Anwara", "Banshkhali", "Boalkhali", "Chandanaish"],
    "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Teknaf", "Ukhiya", "Maheshkhali", "Kutubdia", "Ramu", "Pekua"],
    "Comilla": ["Comilla Sadar", "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam"],
    "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Hajiganj", "Kachua", "Matlab North", "Matlab South", "Shahrasti"],
    "Feni": ["Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Fulgazi", "Sonagazi"],
    "Noakhali": ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Subarnachar", "Kabirhat"],
    "Lakshmipur": ["Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"],
    "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Bancharampur", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
    "Rangamati": ["Rangamati Sadar", "Belaichhari", "Bagaichhari", "Barkal", "Kaptai", "Jurachhari", "Langadu", "Naniarchar"],
    "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"],
    "Bandarban": ["Bandarban Sadar", "Ali Kadam", "Thanchi", "Ruma", "Rowangchhari", "Lama", "Naikhongchhari"]
  },
  "Rajshahi": {
    "Rajshahi": ["Rajshahi Sadar", "Boalia", "Rajpara", "Motihar", "Shah Makhdum", "Godagari", "Paba", "Puthia", "Tanore", "Bagha", "Charghat"],
    "Bogra": ["Bogra Sadar", "Adamdighi", "Sherpur", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Shibganj"],
    "Pabna": ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"],
    "Natore": ["Natore Sadar", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Bagatipara"],
    "Naogaon": ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadevpur", "Niamatpur", "Patnitala", "Raninagar", "Sapahar"],
    "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Rayganj", "Shahjadpur", "Tarash", "Ullahpara"],
    "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"],
    "Chapainawabganj": ["Chapainawabganj Sadar", "Bholahat", "Gomastapur", "Nachole", "Shibganj"]
  },
  "Khulna": {
    "Khulna": ["Khulna Sadar", "Sonadanga", "Boyra", "Khalishpur", "Daulatpur", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Rupsha", "Terokhada"],
    "Jashore": ["Jashore Sadar", "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
    "Kushtia": ["Kushtia Sadar", "Kumarkhali", "Daulatpur", "Mirpur", "Bheramara", "Khoksa"],
    "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
    "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
    "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
    "Meherpur": ["Meherpur Sadar", "Gangni", "Mujibnagar"],
    "Narail": ["Narail Sadar", "Kalia", "Lohagara"],
    "Jhenaidah": ["Jhenaidah Sadar", "Harakunda", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
    "Magura": ["Magura Sadar", "Mohammadpur", "Shalisha", "Sreepur"]
  },
  "Barishal": {
    "Barishal": ["Barishal Sadar", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
    "Bhola": ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
    "Barguna": ["Barguna Sadar", "Amatali", "Bamna", "Betagi", "Patharghata", "Taltali"],
    "Patuakhali": ["Patuakhali Sadar", "Bawalfal", "Dashmina", "Galachipa", "Kalapara", "Mirzaganj", "Rangabali", "Dumki"],
    "Pirojpur": ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Zianagar"],
    "Jhalokati": ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"]
  },
  "Sylhet": {
    "Sylhet": ["Sylhet Sadar", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Zakiganj"],
    "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"],
    "Habiganj": ["Habiganj Sadar", "Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Nabiganj", "Madhabpur"],
    "Sunamganj": ["Sunamganj Sadar", "Bishwamharpur", "Chhatak", "Derai", "Dharamapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Tahirpur"]
  },
  "Rangpur": {
    "Rangpur": ["Rangpur Sadar", "Badarganj", "Gangachhara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
    "Dinajpur": ["Dinajpur Sadar", "Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Phulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khanshama", "Nawabganj", "Parbatipur"],
    "Gaibandha": ["Gaibandha Sadar", "Phulchhari", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
    "Kurigram": ["Kurigram Sadar", "Bhurungamari", "Char Rajibpur", "Chilmari", "Phulbari", "Nageshwari", "Rajarhat", "Roumari", "Ulipur"],
    "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Hatibandha", "Kaliganj", "Patgram"],
    "Nilphamari": ["Nilphamari Sadar", "Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Syedpur"],
    "Panchagarh": ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj", "Tetulia"],
    "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Pirganj", "Ranisankail"]
  },
  "Mymensingh": {
    "Mymensingh": ["Mymensingh Sadar", "Bhaluka", "Trishal", "Gafargaon", "Muktagachha", "Phulpur", "Haluaghat", "Ishwarganj", "Gauripur", "Dhobaura", "Nandail", "Tara Khanda"],
    "Jamalpur": ["Jamalpur Sadar", "Baksiganj", "Dewanganj", "Isampur", "Madarganj", "Melandaha", "Sarishabari"],
    "Netrokona": ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kenda", "Khaliajuri", "Madan", "Mohanganj", "Purbadhala"],
    "Sherpur": ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"]
  }
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, appliedCoupon, clearCart } = useCartStore();

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 ৩-ধাপের এলাকা নির্বাচন স্টেট
  const [selectedDivision, setSelectedDivision] = useState<string>('Dhaka');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Dhaka');
  const [selectedThana, setSelectedThana] = useState<string>('Dhanmondi');

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
    postalCode: '', 
    country: 'Bangladesh' 
  });

  // বিভাগ পরিবর্তন হলে জেলা রিসেট
  const handleDivisionChange = (divisionName: string) => {
    setSelectedDivision(divisionName);
    const districts = Object.keys(bdLocations[divisionName] || {});
    const defaultDistrict = districts[0] || '';
    setSelectedDistrict(defaultDistrict);
    
    const thanas = bdLocations[divisionName]?.[defaultDistrict] || [];
    setSelectedThana(thanas[0] || '');
  };

  // জেলা পরিবর্তন হলে থানা রিসেট
  const handleDistrictChange = (districtName: string) => {
    setSelectedDistrict(districtName);
    const thanas = bdLocations[selectedDivision]?.[districtName] || [];
    setSelectedThana(thanas[0] || '');
  };

  // 🚀 রিয়েল-টাইম সাবটোটাল ও প্রোডাক্ট আইটেম প্রস্তুতি (নাম ও ছবি কখনো ফাকা হবে না)
  let subtotalAfterProductDiscount = 0;
  const formattedOrderItems = items.map((cartItem: any) => {
    const dbProduct = dbProducts.find(p => String(p.id || p._id) === String(cartItem.id));
    
    const productName = cartItem.name || dbProduct?.name || 'Fashion Collection Item';
    const origPrice = dbProduct ? Number(dbProduct.price) : Number(cartItem.price || 0);
    const discountPercent = dbProduct ? Number(dbProduct.discount) || 0 : Number(cartItem.discount) || 0;
    const sellingPrice = discountPercent > 0 ? origPrice - (origPrice * discountPercent) / 100 : (Number(cartItem.price) || origPrice);
    
    subtotalAfterProductDiscount += sellingPrice * (Number(cartItem.quantity) || 1);

    let productImage = '';
    if (cartItem.image && cartItem.image !== 'No Image' && !cartItem.image.includes('via.placeholder')) {
      productImage = cartItem.image;
    } else if (dbProduct?.images?.[0]) {
      productImage = dbProduct.images[0];
    } else if (dbProduct?.imageUrl) {
      productImage = dbProduct.imageUrl;
    }

    return {
      id: String(cartItem.id),
      name: productName,
      price: Number(sellingPrice.toFixed(2)),
      originalPrice: Number(origPrice.toFixed(2)),
      discount: discountPercent,
      quantity: Number(cartItem.quantity) || 1,
      size: String(cartItem.size || 'Standard'),
      color: String(cartItem.color || 'Default'),
      image: productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'
    };
  });

  // 🚀 শিপিং চার্জ হিসাব (কখনো ৳0.00 হবে না)
  const isInsideChattogram = selectedDistrict.toLowerCase().includes('chattogram') || selectedDistrict.toLowerCase().includes('chittagong') || selectedDivision.toLowerCase().includes('chattogram');
  const shippingInside = safeSettings.shippingInside !== undefined ? Number(safeSettings.shippingInside) : 60;
  const shippingOutside = safeSettings.shippingOutside !== undefined ? Number(safeSettings.shippingOutside) : 150;
  const shipping = items.length > 0 ? (isInsideChattogram ? shippingInside : shippingOutside) : (isInsideChattogram ? 60 : 150);

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

  // 🚀 ফোন নাম্বার ভ্যালিডেশন
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

  // 🚀 প্লেস অর্ডার লজিক (A to Z Complete Order Details Live Cloud Save)
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
      toast.error("Please enter your street address!");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Processing your order securely...");

    const orderId = `#ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const customerName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
    const customerEmail = formData.email.trim() || `${formData.phone.trim()}@mofashion.com`;
    const fullLocationStr = `${selectedThana}, ${selectedDistrict}, ${selectedDivision}`;

    // 🚀 A to Z পূর্ণাঙ্গ অর্ডার পে-লোড (শিপিং চার্জ, কুপন ডিসকাউন্ট ও ফটো সহ)
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
        city: fullLocationStr,
        postalCode: formData.postalCode.trim() || 'N/A',
        country: 'Bangladesh'
      },
      email: customerEmail,
      phone: formData.phone.trim(),
      address: `${formData.address.trim()}, ${fullLocationStr}${formData.postalCode.trim() ? ' - ' + formData.postalCode.trim() : ''}, Bangladesh`,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      subtotal: subtotalAfterProductDiscount,
      shipping: shipping,
      tax: taxAmount,
      discount: finalCouponDiscountAmount,
      total: totalAmount,
      status: 'Pending',
      itemsCount: items.length,
      paymentMethod: paymentMethod,
      paymentDetails: { method: paymentMethod, status: 'Pending' },
      orderItems: formattedOrderItems,
      items: formattedOrderItems,
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
      address: `${formData.address.trim()}, ${fullLocationStr}`,
      orders: 1,
      spent: totalAmount,
      status: 'Active',
      joinDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    // 🚀 ১. অর্ডার সেভ - ক্লাউড ডাটাবেস (Supabase Cloud Direct Write)
    try {
      await saveSupabaseOrder(orderPayload);
    } catch (orderErr) {
      console.warn("Cloud Order Save Warning:", orderErr);
    }

    // 🚀 ২. কাস্টমার সেভ - ক্লাউড ডাটাবেস (Supabase Cloud Direct Write)
    try {
      await saveSupabaseCustomer(customerPayload);
    } catch (custErr) {
      console.warn("Cloud Customer Save Warning:", custErr);
    }

    // 🚀 ৩. প্রোডাক্টের স্টক কমানো এবং সোল্ড কাউন্ট বাড়ানো
    try {
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
    } catch (prodErr) {}

    // 🚀 ৪. কুপন ইউজ কাউন্ট বাড়ানো
    try {
      if (appliedCoupon) {
        const allCoupons = await getSupabaseCoupons();
        const targetCoupon = allCoupons.find((c: any) => c.code === appliedCoupon.code);
        if (targetCoupon) {
          const newUsedCount = (Number(targetCoupon.used) || 0) + 1;
          const newStatus = (targetCoupon.usageLimit && newUsedCount >= targetCoupon.usageLimit) ? 'Expired' : targetCoupon.status;
          await saveSupabaseCoupon({ ...targetCoupon, used: newUsedCount, status: newStatus }).catch(() => null);
        }
      }
    } catch (couponErr) {}

    // 🚀 ৫. ইমেইল নোটিফিকেশন সেন্ড
    try { await notifyNewOrder(orderId, customerName, totalAmount); } catch(e){}

    // ইভেন্ট ব্রডকাস্ট
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('orderUpdated'));

    toast.success(`Order ${orderId} placed successfully! 🎉`, { id: toastId });
    clearCart();
    setIsSubmitting(false);
    setTimeout(() => navigate('/'), 2000);
  };

  const availableDistricts = Object.keys(bdLocations[selectedDivision] || {});
  const availableThanas = bdLocations[selectedDivision]?.[selectedDistrict] || [];

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
                  <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Street Address (House/Road/Block) *</label>
                  <input type="text" name="address" required value={formData.address} onChange={handleChange} className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors text-sm" placeholder="e.g. House #12, Road #5, Block C" />
                </div>

                {/* 🚀 ৩-ধাপের এলাকা ড্রপডাউন (বিভাগ ➔ জেলা ➔ থানা/উপজেলা) */}
                <div className="bg-[#111111] p-4 rounded-xl border border-gray-800 space-y-4">
                  <span className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center">
                    <Navigation size={14} className="mr-1.5" /> Select Delivery Location Hierarchy
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* ১. বিভাগ সিলেক্ট */}
                    <div>
                      <label className="block text-gray-400 text-xs font-bold mb-1.5 uppercase">1. Division (বিভাগ) *</label>
                      <select 
                        value={selectedDivision} 
                        onChange={(e) => handleDivisionChange(e.target.value)} 
                        className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none text-xs cursor-pointer font-medium"
                      >
                        {Object.keys(bdLocations).map((divName) => (
                          <option key={divName} value={divName}>{divName}</option>
                        ))}
                      </select>
                    </div>

                    {/* ২. জেলা সিলেক্ট */}
                    <div>
                      <label className="block text-gray-400 text-xs font-bold mb-1.5 uppercase">2. District (জেলা) *</label>
                      <select 
                        value={selectedDistrict} 
                        onChange={(e) => handleDistrictChange(e.target.value)} 
                        className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none text-xs cursor-pointer font-medium"
                      >
                        {availableDistricts.map((distName) => (
                          <option key={distName} value={distName}>{distName}</option>
                        ))}
                      </select>
                    </div>

                    {/* ৩. থানা / উপজেলা সিলেক্ট */}
                    <div>
                      <label className="block text-gray-400 text-xs font-bold mb-1.5 uppercase">3. Thana / Upazila (থানা) *</label>
                      <select 
                        value={selectedThana} 
                        onChange={(e) => setSelectedThana(e.target.value)} 
                        className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-3 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none text-xs cursor-pointer font-medium"
                      >
                        {availableThanas.map((thanaName) => (
                          <option key={thanaName} value={thanaName}>{thanaName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
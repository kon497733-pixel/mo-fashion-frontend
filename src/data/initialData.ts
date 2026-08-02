// src/data/initialData.ts

// 🚀 ক্যাশ ক্লিনিং ভার্সন (যাতে মোবাইলের পুরানো ফেইক "Black Shirt" অটোমেটিক মুছে যায়)
const STORAGE_VERSION = "MO_FASHION_V10_CLEAN_NO_DUMMY";

export const INITIAL_SETTINGS = {
  storeName: 'MO FASHION',
  logoUrl: '', 
  aboutImageUrl: '', 
  tagline: 'Premium E-Commerce Experience. OWNER - MD.MEHEDI HASAN . (1589)',
  contactEmail: 'kon497733@gmail.com',
  phoneNumber: '+880 1707697445',
  address: 'CDA Agrabad, Chattogram, Bangladesh',
  currency: '$',
  taxRate: 0,
  shippingInside: 60,
  shippingOutside: 150,
  enableBkash: true,
  enableCard: true,
  enableCOD: true,
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  twitter: 'https://twitter.com',
  faqs: [
    { question: 'What is your return policy?', answer: 'We offer a 30-day return policy for all unworn items.' }
  ]
};

export const INITIAL_CATEGORIES = [
  {
    id: 1,
    name: "Men's Collection",
    description: "All premium items for men",
    images: []
  },
  {
    id: 2,
    name: "Women's Collection",
    description: "Exclusive women's fashion",
    images: []
  },
  {
    id: 3,
    name: "Accessories",
    description: "Watches, belts, and more",
    images: []
  }
];

// 🚀 জিরো ফেইক প্রোডাক্ট (কোনো প্রকার ফেইক শার্ট বা ডামি ছবি থাকবে না)
export const INITIAL_PRODUCTS = [];

export const initStoreData = () => {
  // 🟢 ১. মোবাইলের মেমোরি থেকে পুরানো ফেইক "Black Shirt" চিরতরে মুছে ফেলার লজিক
  const currentVersion = localStorage.getItem('mo_fashion_storage_version');
  if (currentVersion !== STORAGE_VERSION) {
    localStorage.removeItem('mo_fashion_products'); // পুরানো ফেইক প্রোডাক্ট ক্যাশ ডিলিট
    localStorage.setItem('mo_fashion_storage_version', STORAGE_VERSION);
  }

  // 🟢 ২. শুধুমাত্র এডমিন প্যানেলের সেভ করা ডাটা থাকবে
  if (!localStorage.getItem('mo_fashion_settings')) {
    localStorage.setItem('mo_fashion_settings', JSON.stringify(INITIAL_SETTINGS));
  }
  if (!localStorage.getItem('mo_fashion_categories')) {
    localStorage.setItem('mo_fashion_categories', JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem('mo_fashion_products')) {
    localStorage.setItem('mo_fashion_products', JSON.stringify(INITIAL_PRODUCTS));
  }
};
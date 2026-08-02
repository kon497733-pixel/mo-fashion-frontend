import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Users, Sparkles, Award, ShieldCheck, Truck, 
  Headphones, Lock, CheckCircle2, RotateCcw 
} from 'lucide-react';

export default function About() {
  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: 'MO FASHION',
    aboutImageUrl: ''
  });

  // 🚀 ডায়নামিক API ইউআরএল (যাতে যেকোনো মোবাইল বা পিসি থেকে ক্লাউড সেটিং লোড হয়)
  const getApiUrl = () => {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:5000/api/settings`;
  };

  // 🚀 ১. ক্লাউড ডাটাবেস (MongoDB API) থেকে রিয়েল-টাইম এবাউট সেটিং লোড করা
  useEffect(() => {
    const fetchAboutSettings = async () => {
      // ১. প্রথমে লোকাল মেমোরি থেকে ইনস্ট্যান্ট ডাটা লোড
      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try {
          setSiteSettings((prev: any) => ({ ...prev, ...JSON.parse(savedSettings) }));
        } catch (e) {
          console.error("Error loading settings in About page", e);
        }
      }

      // ২. ক্লাউড ডাটাবেস (MongoDB Backend) থেকে সিঙ্ক করা
      try {
        const response = await fetch(getApiUrl());
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData && Object.keys(cloudData).length > 0) {
            setSiteSettings((prev: any) => ({ ...prev, ...cloudData }));
            localStorage.setItem('mo_fashion_settings', JSON.stringify(cloudData));
          }
        }
      } catch (err) {
        console.warn("Backend API offline, using cached about settings.");
      }
    };

    fetchAboutSettings();

    // সেটিংস আপডেট ইভেন্ট লিসেনার
    const handleSettingsUpdate = () => fetchAboutSettings();
    window.addEventListener('storage', handleSettingsUpdate);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleSettingsUpdate);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  // 🚀 ৮টি প্রিমিয়াম ফিচার কার্ডের ডাটা
  const features = [
    {
      icon: Award,
      title: "Premium Quality",
      desc: "Finest fabrics and meticulous attention to every fashion detail."
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      desc: "Swift and safe shipping right to your doorstep across Bangladesh."
    },
    {
      icon: ShieldCheck,
      title: "100% Satisfaction",
      desc: "Hassle-free 14 days return and easy exchange guarantee."
    },
    {
      icon: Headphones,
      title: "24/7 Customer Support",
      desc: "Dedicated support team available anytime to assist your needs."
    },
    {
      icon: Lock,
      title: "Secure Payment",
      desc: "Encrypted transactions via bKash, Cards, and Cash on Delivery."
    },
    {
      icon: Sparkles,
      title: "Exclusive Designs",
      desc: "Handpicked luxury collections crafted for fashion trendsetters."
    },
    {
      icon: CheckCircle2,
      title: "100% Authentic",
      desc: "Guaranteed genuine fashion items sourced directly from top craftsmen."
    },
    {
      icon: RotateCcw,
      title: "Easy Exchange",
      desc: "Seamless and instant product replacement without any hassle."
    }
  ];

  return (
    <main className="min-h-screen bg-[#111111] text-white py-12">
      <Helmet>
        <title>About Us | {siteSettings?.storeName || 'MO FASHION'}</title>
      </Helmet>

      <div className="container mx-auto px-4">
        
        {/* Header Section */}
        <div className="text-center mb-16 border-b border-[#D4AF37]/20 pb-10">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-[#D4AF37] mb-4 uppercase tracking-widest">
            About {siteSettings?.storeName || 'MO FASHION'}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Redefining Luxury & Fashion.
          </p>
        </div>

        {/* Our Story & Fashion Team Box Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-20">
          
          {/* Left Text */}
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-[#D4AF37] flex items-center">
              <Sparkles size={24} className="mr-3 text-[#D4AF37]" />
              Our Story
            </h2>
            <p className="text-gray-300 leading-relaxed text-base">
              Founded in Bangladesh, <strong className="text-[#D4AF37]">{siteSettings?.storeName || 'MO FASHION'}</strong> started with a simple vision: to make premium, high-quality fashion accessible to everyone. What began as a small boutique has now transformed into a nationwide e-commerce destination for fashion enthusiasts.
            </p>
            <p className="text-gray-300 leading-relaxed text-base">
              We believe that clothes are not just fabric; they are a statement of who you are. That’s why every product in our catalog is handpicked to ensure it meets the highest standards of craftsmanship, durability, and style.
            </p>
          </div>

          {/* Right Box: "The Fashion Team" (ডাটাবেস থেকে সিঙ্ক করা অরিজিনাল ফটো) */}
          <div className="bg-[#1A1A1A] border-2 border-[#D4AF37]/30 rounded-2xl p-3 flex items-center justify-center overflow-hidden shadow-2xl relative min-h-[300px] md:min-h-[360px]">
            {siteSettings?.aboutImageUrl ? (
              <img 
                src={siteSettings.aboutImageUrl} 
                alt="The Fashion Team" 
                className="w-full h-full max-h-[380px] object-cover rounded-xl transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="text-center p-8 border border-dashed border-[#D4AF37]/20 rounded-xl w-full h-full flex flex-col items-center justify-center bg-[#111111]/50">
                <Users size={56} className="text-[#D4AF37] mb-4 opacity-80" />
                <h3 className="text-2xl font-serif text-[#D4AF37] font-bold tracking-wider">The Fashion Team</h3>
                <p className="text-gray-500 text-xs mt-2">Upload a photo from Settings to show your team here</p>
              </div>
            )}
          </div>

        </div>

        {/* 🚀 ফিচার কার্ড সেকশন */}
        <div className="pt-12 border-t border-[#D4AF37]/20">
          
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-[#D4AF37] uppercase tracking-widest">
              Why Choose {siteSettings?.storeName || 'MO FASHION'}
            </h2>
            <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-4 rounded-full opacity-50"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index} 
                  className="bg-[#1A1A1A] p-6 rounded-2xl border border-gray-800/80 hover:border-[#D4AF37] transition-all duration-500 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:-translate-y-2 group relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div>
                    <div className="w-14 h-14 bg-[#111111] border border-[#D4AF37]/30 rounded-xl flex items-center justify-center mb-5 mx-auto group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] transition-all duration-300 shadow-md">
                      <Icon size={28} className="text-[#D4AF37] group-hover:text-black transition-colors duration-300" />
                    </div>

                    <h3 className="text-lg font-serif font-bold text-white mb-2 text-center group-hover:text-[#D4AF37] transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-gray-400 text-sm text-center leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </main>
  );
}
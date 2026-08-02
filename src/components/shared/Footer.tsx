import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, CreditCard, Smartphone, Banknote, HelpCircle, ShieldCheck, Truck, Globe } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getLiveSettings } from '../../config/api';

export default function Footer() {
  const { settings } = useSettingsStore();
  const safeSettings = settings as any;

  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: 'MO FASHION',
    logoUrl: '',
    tagline: 'Premium E-Commerce Experience.',
    contactEmail: 'kon497733@gmail.com',
    phoneNumber: '+880 1707697445',
    address: 'CDA Agrabad, Chattogram, Bangladesh',
    currency: '৳',
    shippingInside: 60,
    shippingOutside: 150,
    enableBkash: true,
    enableCard: true,
    enableCOD: true,
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    twitter: 'https://twitter.com'
  });

  // 🚀 ১. সেন্ট্রাল এপিআই দিয়ে ক্লাউড ডাটাবেস (MongoDB API) থেকে রিয়েল-টাইম সেটিংস লোড করা
  useEffect(() => {
    const fetchFooterSettings = async () => {
      // ১. প্রথমে লোকাল মেমোরি থেকে ইনস্ট্যান্ট ডাটা লোড
      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try {
          setSiteSettings((prev: any) => ({ ...prev, ...JSON.parse(savedSettings) }));
        } catch (e) {
          console.error("Error parsing footer settings", e);
        }
      }

      // ২. সেন্ট্রাল এপিআই দিয়ে লাইভ ক্লাউড ডাটাবেস (MongoDB Backend) থেকে সিঙ্ক করা
      try {
        const cloudData = await getLiveSettings();
        if (cloudData && Object.keys(cloudData).length > 0) {
          setSiteSettings((prev: any) => ({ ...prev, ...cloudData }));
          localStorage.setItem('mo_fashion_settings', JSON.stringify(cloudData));
        }
      } catch (e) {
        console.warn("Backend API offline, using cached footer settings.");
      }
    };

    fetchFooterSettings();

    // অ্যাডমিন প্যানেল থেকে সেটিংস সেভ হলে লাইভ আপডেটের ইভেন্ট লিসেনার
    const handleSettingsUpdate = () => fetchFooterSettings();
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, []);

  const active = { ...safeSettings, ...siteSettings };

  return (
    <footer className="bg-[#0A0A0A] border-t border-[#D4AF37]/20 pt-16 pb-12 text-gray-400 mt-auto">
      <div className="container mx-auto px-4">
        
        {/* ৪ কলামের সম্পূর্ণ বিস্তারিত ফুটার সেকশন */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-gray-800">
          
          {/* Column 1: Brand Info & Admin Uploaded Logo */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-3 group">
              {active?.logoUrl && active.logoUrl.trim() !== '' && (
                <img 
                  src={active.logoUrl} 
                  alt="Logo" 
                  className="h-12 w-auto max-w-[160px] object-contain drop-shadow transition-transform group-hover:scale-105"
                />
              )}
              <span className="text-2xl font-serif font-bold text-[#D4AF37] tracking-widest">
                {active?.storeName || 'MO FASHION'}
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-gray-400">
              {active?.tagline || 'Premium E-Commerce Experience'}
            </p>

            <div className="flex items-center space-x-2 text-xs text-[#D4AF37] pt-2 font-medium">
              <ShieldCheck size={16} />
              <span>100% Authentic & Secure Shopping</span>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-3 pt-2">
              {active?.facebook && (
                <a href={active.facebook} target="_blank" rel="noopener noreferrer" className="bg-[#1A1A1A] p-2 rounded-full text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors border border-gray-800">
                  <Globe size={16} />
                </a>
              )}
              {active?.instagram && (
                <a href={active.instagram} target="_blank" rel="noopener noreferrer" className="bg-[#1A1A1A] p-2 rounded-full text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors border border-gray-800">
                  <Globe size={16} />
                </a>
              )}
              {active?.twitter && (
                <a href={active.twitter} target="_blank" rel="noopener noreferrer" className="bg-[#1A1A1A] p-2 rounded-full text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors border border-gray-800">
                  <Globe size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-serif font-bold text-base mb-4 uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2 inline-block">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link></li>
              <li><Link to="/categories" className="hover:text-[#D4AF37] transition-colors">Categories</Link></li>
              <li><Link to="/about" className="hover:text-[#D4AF37] transition-colors">About Us</Link></li>
              <li><Link to="/cart" className="hover:text-[#D4AF37] transition-colors">Shopping Cart</Link></li>
              <li><Link to="/profile" className="hover:text-[#D4AF37] transition-colors">My Profile / Account</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Shipping Info */}
          <div>
            <h3 className="text-white font-serif font-bold text-base mb-4 uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2 inline-block">
              Customer Care
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <Truck size={16} className="text-[#D4AF37]" />
                <span>Inside Chittagong: {active?.currency || '৳'}{active?.shippingInside || 60}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Truck size={16} className="text-[#D4AF37]" />
                <span>Outside Chittagong: {active?.currency || '৳'}{active?.shippingOutside || 150}</span>
              </li>
              <li className="flex items-center space-x-2 pt-1">
                <HelpCircle size={16} className="text-[#D4AF37]" />
                <Link to="/about" className="hover:text-[#D4AF37] transition-colors">FAQs & Support</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Store Contact Information */}
          <div>
            <h3 className="text-white font-serif font-bold text-base mb-4 uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2 inline-block">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>{active?.address || 'CDA Agrabad, Chattogram, Bangladesh'}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-[#D4AF37] shrink-0" />
                <span>{active?.phoneNumber || '+880 1707697445'}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-[#D4AF37] shrink-0" />
                <span>{active?.contactEmail || 'kon497733@gmail.com'}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Payment Options & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} {active?.storeName || 'MO FASHION'}. All rights reserved.</p>

          {/* Accepted Payment Badges */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Payment Methods:</span>
            <div className="flex items-center space-x-2">
              {active?.enableBkash && <span className="bg-[#1A1A1A] border border-gray-800 px-2.5 py-1 rounded text-pink-500 font-bold flex items-center"><Smartphone size={12} className="mr-1"/> bKash</span>}
              {active?.enableCard && <span className="bg-[#1A1A1A] border border-gray-800 px-2.5 py-1 rounded text-blue-400 font-bold flex items-center"><CreditCard size={12} className="mr-1"/> Card</span>}
              {active?.enableCOD && <span className="bg-[#1A1A1A] border border-gray-800 px-2.5 py-1 rounded text-[#D4AF37] font-bold flex items-center"><Banknote size={12} className="mr-1"/> COD</span>}
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
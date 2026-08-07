import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, CreditCard, Smartphone, Banknote, HelpCircle, ShieldCheck, Truck, Globe } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getLiveSettings } from '../../config/api';

export default function Footer() {
  const { settings } = useSettingsStore();
  const safeSettings = settings as any;
  const footerRef = useRef<HTMLDivElement>(null);

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
      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try {
          setSiteSettings((prev: any) => ({ ...prev, ...JSON.parse(savedSettings) }));
        } catch (e) {
          console.error("Error parsing footer settings", e);
        }
      }

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

    const handleSettingsUpdate = () => fetchFooterSettings();
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, []);

  // 🚀 Apple-Style 3D Scroll Tilt Interaction Effect for Footer
  useEffect(() => {
    const handleScroll = () => {
      if (footerRef.current) {
        const rect = footerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const scrollPercent = Math.min(1, Math.max(0, (windowHeight - rect.top) / windowHeight));
        
        const rotateX = (1 - scrollPercent) * 10;
        const scale = 0.97 + scrollPercent * 0.03;
        
        footerRef.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) scale(${scale})`;
        footerRef.current.style.opacity = `${scrollPercent}`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const active = { ...safeSettings, ...siteSettings };

  return (
    <footer 
      ref={footerRef}
      className="bg-[#0A0A0A] border-t border-[#D4AF37]/30 pt-16 pb-12 text-gray-400 mt-auto relative overflow-hidden transition-all duration-300 ease-out origin-bottom glass-3d-panel"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* 🚀 3D Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        
        {/* ৪ কলামের সম্পূর্ণ বিস্তারিত ফুটার সেকশন (3D Card Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-gray-800/80">
          
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
              <span className="text-2xl font-serif font-bold text-[#D4AF37] tracking-widest gold-text-glow">
                {active?.storeName || 'MO FASHION'}
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-gray-400 font-light">
              {active?.tagline || 'Premium E-Commerce Experience'}
            </p>

            <div className="flex items-center space-x-2 text-xs text-[#D4AF37] pt-2 font-semibold">
              <ShieldCheck size={16} className="text-[#D4AF37]" />
              <span>100% Authentic & Secure Shopping</span>
            </div>

            {/* 3D Floating Social Media Links */}
            <div className="flex items-center space-x-3 pt-2">
              {active?.facebook && (
                <a 
                  href={active.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#1A1A1A] p-2.5 rounded-full text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all border border-gray-800 hover:border-[#D4AF37]/40 hover:-translate-y-1 hover:scale-110 shadow-md"
                >
                  <Globe size={16} />
                </a>
              )}
              {active?.instagram && (
                <a 
                  href={active.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#1A1A1A] p-2.5 rounded-full text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all border border-gray-800 hover:border-[#D4AF37]/40 hover:-translate-y-1 hover:scale-110 shadow-md"
                >
                  <Globe size={16} />
                </a>
              )}
              {active?.twitter && (
                <a 
                  href={active.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#1A1A1A] p-2.5 rounded-full text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all border border-gray-800 hover:border-[#D4AF37]/40 hover:-translate-y-1 hover:scale-110 shadow-md"
                >
                  <Globe size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-serif font-bold text-base mb-4 uppercase tracking-wider border-b border-[#D4AF37]/30 pb-2 inline-block">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm font-medium">
              <li><Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link></li>
              <li><Link to="/categories" className="hover:text-[#D4AF37] transition-colors">Categories</Link></li>
              <li><Link to="/about" className="hover:text-[#D4AF37] transition-colors">About Us</Link></li>
              <li><Link to="/cart" className="hover:text-[#D4AF37] transition-colors">Shopping Cart</Link></li>
              <li><Link to="/profile" className="hover:text-[#D4AF37] transition-colors">My Profile / Account</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Shipping Info */}
          <div>
            <h3 className="text-white font-serif font-bold text-base mb-4 uppercase tracking-wider border-b border-[#D4AF37]/30 pb-2 inline-block">
              Customer Care
            </h3>
            <ul className="space-y-3 text-sm font-medium">
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
            <h3 className="text-white font-serif font-bold text-base mb-4 uppercase tracking-wider border-b border-[#D4AF37]/30 pb-2 inline-block">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm font-medium">
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
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium">
          <p>&copy; {new Date().getFullYear()} {active?.storeName || 'MO FASHION'}. All rights reserved.</p>

          {/* Accepted Payment Badges */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Payment Methods:</span>
            <div className="flex items-center space-x-2">
              {active?.enableBkash && <span className="bg-[#1A1A1A] border border-gray-800 px-2.5 py-1 rounded-xl text-pink-500 font-bold flex items-center shadow-sm"><Smartphone size={12} className="mr-1"/> bKash</span>}
              {active?.enableCard && <span className="bg-[#1A1A1A] border border-gray-800 px-2.5 py-1 rounded-xl text-blue-400 font-bold flex items-center shadow-sm"><CreditCard size={12} className="mr-1"/> Card</span>}
              {active?.enableCOD && <span className="bg-[#1A1A1A] border border-gray-800 px-2.5 py-1 rounded-xl text-[#D4AF37] font-bold flex items-center shadow-sm"><Banknote size={12} className="mr-1"/> COD</span>}
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
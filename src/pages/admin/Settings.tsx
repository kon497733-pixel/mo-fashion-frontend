import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Save, Store, Mail, Phone, Globe,
  MapPin, Percent, Truck, 
  Settings as SettingsIcon, CreditCard, HelpCircle, Plus, Trash2, Image as ImageIcon, Upload, Type, RefreshCw, Sparkles, Layout
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function Settings() {
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const aboutFileInputRef = useRef<HTMLInputElement>(null);

  const { settings, fetchSettings, updateSettings } = useSettingsStore();

  // 🚀 জিরো ডিফল্ট স্ট্রাকচার (সব ফিল্ড পারফেক্টলি যুক্ত করা হয়েছে)
  const emptySettings = {
    storeName: '',
    logoUrl: '', 
    aboutImageUrl: '', 
    tagline: '',
    heroBadge: 'EXCLUSIVE LUXURY COLLECTION',
    heroTitle: 'ELEVATE YOUR SIGNATURE STYLE',
    heroDescription: 'Discover handcrafted luxury apparel and accessories designed to redefine modern elegance. Premium quality tailored for perfection.',
    heroCardTitle: '100% AUTHENTIC',
    heroCardSubtitle: 'PREMIUM FASHION GUARANTEED',
    heroCardEst: 'EST. 2026',
    offerBadge: 'LIMITED TIME OFFER',
    offerTitle: 'SPECIAL LUXURY DISCOUNT UP TO 30% OFF',
    offerDescription: 'Upgrade your wardrobe today with our exclusive premium collection. Fast nationwide delivery available.',
    contactEmail: '',
    phoneNumber: '',
    address: '',
    currency: '৳',
    taxRate: 0,
    shippingInside: 60,   
    shippingOutside: 150, 
    enableBkash: true,
    enableCard: true,
    enableCOD: true,
    facebook: '',
    instagram: '',
    twitter: '',
    faqs: []
  };

  const [localSettings, setLocalSettings] = useState<any>(emptySettings);
  const [activeTab, setActiveTab] = useState('General');
  const [loading, setLoading] = useState(true);

  // 🚀 ১. সেন্ট্রাল ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম সেটিংস সিঙ্ক করা
  useEffect(() => {
    const loadSettings = async () => {
      try {
        await fetchSettings();
        const currentSettings = useSettingsStore.getState().settings;
        if (currentSettings && Object.keys(currentSettings).length > 0) {
          setLocalSettings({ ...emptySettings, ...currentSettings });
        }
      } catch (e) {
        console.warn("Failed to load settings from cloud.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // ক্লাউড স্টোর চেঞ্জ হলে ফর্মে রিয়েল-টাইমে সিঙ্ক করা
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setLocalSettings((prev: any) => ({ ...emptySettings, ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalSettings((prev: any) => ({ ...prev, [name]: value }));
  };

  // 🚀 ২. হাই-কোয়ালিটি আল্ট্রা-লাইটওয়েট লোগো কমপ্রেশন
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; 
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          const compressedLogo = canvas.toDataURL('image/webp', 0.85);
          setLocalSettings((prev: any) => ({ ...prev, logoUrl: compressedLogo }));
          toast.success('Logo compressed & ready! Click "Save All Settings" below.');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // 🚀 ৩. এবাউট টিম ফটো কমপ্রেশন
  const handleAboutImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          const compressedImg = canvas.toDataURL('image/jpeg', 0.75);
          setLocalSettings((prev: any) => ({ ...prev, aboutImageUrl: compressedImg }));
          toast.success('About photo compressed & ready! Click "Save All Settings" below.');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => setLocalSettings({ ...localSettings, logoUrl: '' });
  const handleRemoveAboutImage = () => setLocalSettings({ ...localSettings, aboutImageUrl: '' });

  const handleToggle = (name: string) => {
    setLocalSettings((prev: any) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    const updatedFaqs = [...(localSettings.faqs || [])];
    updatedFaqs[index][field] = value;
    setLocalSettings({ ...localSettings, faqs: updatedFaqs });
  };

  const addFaq = () => {
    setLocalSettings({
      ...localSettings,
      faqs: [...(localSettings.faqs || []), { question: '', answer: '' }]
    });
  };

  const removeFaq = (index: number) => {
    const updatedFaqs = (localSettings.faqs || []).filter((_: any, i: number) => i !== index);
    setLocalSettings({ ...localSettings, faqs: updatedFaqs });
  };

  // 🚀 ৪. ক্লাউড ডাটাবেসে সেভ করা (১০০% পার্মানেন্ট)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const toastId = toast.loading("Saving settings LIVE to Cloud Database...");

    try {
      await updateSettings(localSettings);
      window.dispatchEvent(new Event('settingsUpdated'));
      window.dispatchEvent(new Event('storage'));
      toast.success('Settings saved LIVE in Cloud Database! 🎉', { id: toastId });
    } catch (err) {
      console.error("Cloud Sync Error:", err);
      toast.error('Failed to save settings to Cloud Database!', { id: toastId });
    }
  };

  const menuItems = [
    { name: 'General', icon: Store },
    { name: 'Homepage 3D', icon: Layout },
    { name: 'Operations', icon: Truck },
    { name: 'Payment', icon: CreditCard },
    { name: 'Social Links', icon: Globe },
    { name: 'FAQs', icon: HelpCircle },
  ];

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet><title>Admin - Advanced Settings | MO FASHION</title></Helmet>

      {/* Top-Notch Animated Glassmorphic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-2xl border border-[#D4AF37]/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-[#D4AF37]/40">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
              <SettingsIcon className="mr-3 text-[#D4AF37]" size={28} />
              Advanced Store Settings
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30 flex items-center">
              Global Cloud Hub
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Manage global store settings, logo, tagline, hero text, and live cloud database</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar Menu */}
        <div className="lg:w-1/4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 p-4 sticky top-24 shadow-xl backdrop-blur-md">
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setActiveTab(item.name)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm active:scale-95 ${
                      isActive 
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/10 scale-[1.02]' 
                      : 'text-gray-400 hover:bg-[#111111] hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:w-3/4">
          {loading ? (
            <div className="bg-[#1A1A1A] p-16 rounded-2xl text-center text-[#D4AF37] border border-[#D4AF37]/20 flex flex-col items-center justify-center space-y-3 shadow-xl">
              <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
              <p className="font-medium animate-pulse">Loading Cloud Settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="bg-[#1A1A1A] p-6 sm:p-8 rounded-2xl border border-[#D4AF37]/20 shadow-2xl relative min-h-[400px] transition-all duration-300">
              
              {/* 1. General Settings */}
              {activeTab === 'General' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/20 pb-3 flex items-center">
                    <Sparkles size={20} className="mr-2 text-[#D4AF37]" /> General Information
                  </h2>
                  
                  {/* ওয়েবসাইট লোগো সেকশন */}
                  <div className="bg-[#111111] p-5 rounded-2xl border border-[#D4AF37]/20 space-y-4 hover:border-[#D4AF37]/40 transition-colors">
                    <label className="block text-[#D4AF37] font-bold text-sm">Website Logo Management</label>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                      <div className="w-40 h-28 bg-[#1A1A1A] border-2 border-dashed border-[#D4AF37]/40 rounded-xl flex items-center justify-center overflow-hidden relative group flex-shrink-0 shadow-inner">
                        {localSettings.logoUrl ? (
                          <>
                            <img src={localSettings.logoUrl} alt="Store Logo" className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="absolute inset-0 bg-black/80 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-bold"
                            >
                              <Trash2 size={20} className="mb-1" />
                              <span>Remove</span>
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-2 text-gray-500">
                            <ImageIcon size={24} className="mx-auto mb-1 text-[#D4AF37]/50" />
                            <span className="text-[10px] uppercase font-bold text-gray-500">No Logo</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => logoFileInputRef.current?.click()}
                            className="bg-[#D4AF37] text-black px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-white transition-all duration-200 flex items-center space-x-2 shadow-md uppercase tracking-wider active:scale-95"
                          >
                            <Upload size={16} />
                            <span>Upload HD Logo</span>
                          </button>
                          <input type="file" ref={logoFileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        </div>

                        <div className="relative">
                          <ImageIcon size={18} className="absolute left-3 top-3 text-gray-500" />
                          <input 
                            type="text" 
                            name="logoUrl" 
                            value={localSettings.logoUrl || ''} 
                            onChange={handleChange} 
                            placeholder="Or paste copied logo URL from Chrome..." 
                            className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* এবাউট পেজের টিম ছবি সেকশন */}
                  <div className="bg-[#111111] p-5 rounded-2xl border border-[#D4AF37]/20 space-y-4 hover:border-[#D4AF37]/40 transition-colors">
                    <label className="block text-[#D4AF37] font-bold text-sm">About Page Image ("The Fashion Team" Box)</label>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                      <div className="w-40 h-28 bg-[#1A1A1A] border-2 border-dashed border-[#D4AF37]/40 rounded-xl flex items-center justify-center overflow-hidden relative group flex-shrink-0 shadow-inner">
                        {localSettings.aboutImageUrl ? (
                          <>
                            <img src={localSettings.aboutImageUrl} alt="Team" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <button
                              type="button"
                              onClick={handleRemoveAboutImage}
                              className="absolute inset-0 bg-black/80 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-bold"
                            >
                              <Trash2 size={20} className="mb-1" />
                              <span>Remove</span>
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-2 text-gray-500">
                            <ImageIcon size={24} className="mx-auto mb-1 text-[#D4AF37]/50" />
                            <span className="text-[10px] uppercase font-bold text-gray-500">No Image</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => aboutFileInputRef.current?.click()}
                            className="bg-[#D4AF37] text-black px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-white transition-all duration-200 flex items-center space-x-2 shadow-md uppercase tracking-wider active:scale-95"
                          >
                            <Upload size={16} />
                            <span>Upload About Image</span>
                          </button>
                          <input type="file" ref={aboutFileInputRef} onChange={handleAboutImageUpload} accept="image/*" className="hidden" />
                        </div>

                        <div className="relative">
                          <ImageIcon size={18} className="absolute left-3 top-3 text-gray-500" />
                          <input 
                            type="text" 
                            name="aboutImageUrl" 
                            value={localSettings.aboutImageUrl || ''} 
                            onChange={handleChange} 
                            placeholder="Or paste copied image URL from Chrome..." 
                            className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* সাধারণ তথ্য ফিল্ডস */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div>
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Store Name</label>
                      <div className="relative">
                        <Store size={18} className="absolute left-3.5 top-3 text-gray-500" />
                        <input type="text" name="storeName" value={localSettings.storeName || ''} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#D4AF37] font-bold text-xs uppercase tracking-wider mb-2">Navbar Tagline</label>
                      <div className="relative">
                        <Type size={18} className="absolute left-3.5 top-3 text-[#D4AF37]" />
                        <input 
                          type="text" 
                          name="tagline" 
                          value={localSettings.tagline || ''} 
                          onChange={handleChange} 
                          placeholder="e.g. LUXURY COLLECTION" 
                          className="w-full bg-[#111111] border border-[#D4AF37]/50 rounded-xl pl-10 pr-4 py-2.5 text-white font-medium text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Support Email</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3.5 top-3 text-gray-500" />
                        <input type="email" name="contactEmail" value={localSettings.contactEmail || ''} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-3.5 top-3 text-gray-500" />
                        <input type="text" name="phoneNumber" value={localSettings.phoneNumber || ''} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Store Address</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-3.5 top-3 text-gray-500" />
                        <input type="text" name="address" value={localSettings.address || ''} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🚀 Homepage & Special Offer 3D Banner Controls */}
              {activeTab === 'Homepage 3D' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/20 pb-3 flex items-center">
                    <Layout size={20} className="mr-2 text-[#D4AF37]" /> Dynamic Homepage & Offer Banner Controls
                  </h2>

                  {/* Hero Section Banner */}
                  <div className="bg-[#111111] p-5 rounded-2xl border border-[#D4AF37]/20 space-y-4">
                    <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider border-b border-gray-800 pb-2">
                      1. Hero Banner Section Controls
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Hero Badge Text</label>
                        <input
                          type="text"
                          name="heroBadge"
                          value={localSettings.heroBadge || ''}
                          onChange={handleChange}
                          placeholder="e.g. EXCLUSIVE LUXURY COLLECTION"
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Hero Main Title</label>
                        <input
                          type="text"
                          name="heroTitle"
                          value={localSettings.heroTitle || ''}
                          onChange={handleChange}
                          placeholder="e.g. ELEVATE YOUR SIGNATURE STYLE"
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#D4AF37] focus:outline-none font-bold"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Hero Description Paragraph</label>
                        <textarea
                          rows={2}
                          name="heroDescription"
                          value={localSettings.heroDescription || ''}
                          onChange={handleChange}
                          placeholder="e.g. Discover handcrafted luxury apparel and accessories..."
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Right 3D Card Main Title</label>
                        <input
                          type="text"
                          name="heroCardTitle"
                          value={localSettings.heroCardTitle || ''}
                          onChange={handleChange}
                          placeholder="e.g. 100% AUTHENTIC"
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#D4AF37] focus:outline-none font-bold text-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Right 3D Card Subtitle</label>
                        <input
                          type="text"
                          name="heroCardSubtitle"
                          value={localSettings.heroCardSubtitle || ''}
                          onChange={handleChange}
                          placeholder="e.g. PREMIUM FASHION GUARANTEED"
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Special Offer Banner */}
                  <div className="bg-[#111111] p-5 rounded-2xl border border-[#D4AF37]/20 space-y-4">
                    <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider border-b border-gray-800 pb-2">
                      2. Special Offer Banner Controls
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Offer Badge</label>
                        <input
                          type="text"
                          name="offerBadge"
                          value={localSettings.offerBadge || ''}
                          onChange={handleChange}
                          placeholder="e.g. LIMITED TIME OFFER"
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Offer Title</label>
                        <input
                          type="text"
                          name="offerTitle"
                          value={localSettings.offerTitle || ''}
                          onChange={handleChange}
                          placeholder="e.g. SPECIAL LUXURY DISCOUNT UP TO 30% OFF"
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#D4AF37] focus:outline-none font-bold text-[#D4AF37]"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-1.5">Offer Description</label>
                        <textarea
                          rows={2}
                          name="offerDescription"
                          value={localSettings.offerDescription || ''}
                          onChange={handleChange}
                          placeholder="e.g. Upgrade your wardrobe today with our exclusive premium collection..."
                          className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* 2. Operations Settings */}
              {activeTab === 'Operations' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/20 pb-3 flex items-center">
                    <Truck size={20} className="mr-2 text-[#D4AF37]" /> Operations & Shipping
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Default Currency</label>
                      <select name="currency" value={localSettings.currency || '৳'} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer text-sm font-semibold">
                        <option value="৳">৳ (BDT)</option>
                        <option value="$">$ (USD)</option>
                        <option value="€">€ (EUR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Tax Rate (%)</label>
                      <div className="relative">
                        <Percent size={18} className="absolute left-3.5 top-3 text-gray-500" />
                        <input type="number" name="taxRate" value={localSettings.taxRate || 0} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] text-sm" min="0" step="0.1" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Shipping Cost (Inside Chattogram)</label>
                      <div className="relative">
                        <Truck size={18} className="absolute left-3.5 top-3 text-[#D4AF37]" />
                        <input type="number" name="shippingInside" value={localSettings.shippingInside || 0} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl pl-10 pr-4 py-2.5 text-[#D4AF37] font-bold focus:outline-none focus:border-[#D4AF37] text-sm" min="0" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Shipping Cost (Outside Chattogram)</label>
                      <div className="relative">
                        <Truck size={18} className="absolute left-3.5 top-3 text-[#D4AF37]" />
                        <input type="number" name="shippingOutside" value={localSettings.shippingOutside || 0} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl pl-10 pr-4 py-2.5 text-[#D4AF37] font-bold focus:outline-none focus:border-[#D4AF37] text-sm" min="0" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Payment Settings */}
              {activeTab === 'Payment' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/20 pb-3 flex items-center">
                    <CreditCard size={20} className="mr-2 text-[#D4AF37]" /> Payment Methods
                  </h2>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 p-4 bg-[#111111] border border-[#D4AF37]/20 rounded-xl cursor-pointer hover:border-[#D4AF37]/50 transition-colors">
                      <input type="checkbox" checked={localSettings.enableBkash ?? true} onChange={() => handleToggle('enableBkash')} className="w-5 h-5 accent-[#D4AF37] rounded" />
                      <span className="text-white font-medium text-base">Enable bKash Payment</span>
                    </label>
                    <label className="flex items-center space-x-3 p-4 bg-[#111111] border border-[#D4AF37]/20 rounded-xl cursor-pointer hover:border-[#D4AF37]/50 transition-colors">
                      <input type="checkbox" checked={localSettings.enableCard ?? true} onChange={() => handleToggle('enableCard')} className="w-5 h-5 accent-[#D4AF37] rounded" />
                      <span className="text-white font-medium text-base">Enable Credit/Debit Card</span>
                    </label>
                    <label className="flex items-center space-x-3 p-4 bg-[#111111] border border-[#D4AF37]/20 rounded-xl cursor-pointer hover:border-[#D4AF37]/50 transition-colors">
                      <input type="checkbox" checked={localSettings.enableCOD ?? true} onChange={() => handleToggle('enableCOD')} className="w-5 h-5 accent-[#D4AF37] rounded" />
                      <span className="text-white font-medium text-base">Enable Cash on Delivery (COD)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 4. Social Links */}
              {activeTab === 'Social Links' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/20 pb-3 flex items-center">
                    <Globe size={20} className="mr-2 text-[#D4AF37]" /> Social Media URLs
                  </h2>
                  <div className="space-y-4">
                    <input type="url" name="facebook" value={localSettings.facebook || ''} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" placeholder="Facebook Page URL (e.g. https://facebook.com/...)" />
                    <input type="url" name="instagram" value={localSettings.instagram || ''} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" placeholder="Instagram Profile URL (e.g. https://instagram.com/...)" />
                    <input type="url" name="twitter" value={localSettings.twitter || ''} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors" placeholder="Twitter Profile URL (e.g. https://twitter.com/...)" />
                  </div>
                </div>
              )}

              {/* 5. FAQs */}
              {activeTab === 'FAQs' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6 border-b border-[#D4AF37]/20 pb-3">
                    <h2 className="text-xl font-bold text-[#D4AF37] uppercase flex items-center">
                      <HelpCircle size={20} className="mr-2 text-[#D4AF37]" /> Manage FAQs
                    </h2>
                    <button type="button" onClick={addFaq} className="flex items-center text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-3.5 py-2 rounded-xl border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black font-bold transition-all active:scale-95">
                      <Plus size={16} className="mr-1" /> Add FAQ Box
                    </button>
                  </div>
                  {(localSettings.faqs || []).map((faq: any, index: number) => (
                    <div key={index} className="bg-[#111111] p-4 rounded-xl border border-[#D4AF37]/20 space-y-3 relative group hover:border-[#D4AF37]/40 transition-colors">
                      <button type="button" onClick={() => removeFaq(index)} className="absolute top-3 right-3 text-gray-500 hover:text-red-500 p-1 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      <input type="text" value={faq.question || ''} onChange={(e) => handleFaqChange(index, 'question', e.target.value)} className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-[#D4AF37] focus:outline-none" placeholder="Enter Question..." />
                      <input type="text" value={faq.answer || ''} onChange={(e) => handleFaqChange(index, 'answer', e.target.value)} className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-[#D4AF37] focus:outline-none" placeholder="Enter Answer..." />
                    </div>
                  ))}
                </div>
              )}

              {/* 💾 Save All Settings Button */}
              <div className="mt-10 pt-6 border-t border-[#D4AF37]/20 flex justify-end">
                <button 
                  type="submit"
                  className="bg-gradient-to-r from-[#D4AF37] to-[#f3e5ab] text-black px-8 py-3 rounded-xl hover:scale-105 transition-all duration-300 font-bold flex items-center space-x-2 shadow-lg shadow-[#D4AF37]/20 active:scale-95 uppercase tracking-wider text-sm"
                >
                  <Save size={18} />
                  <span>Save All Settings to Cloud</span>
                </button>
              </div>
              
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
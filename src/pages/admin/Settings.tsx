import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Save, Store, Mail, Phone, Globe,
  MapPin, Percent, Truck, 
  Settings as SettingsIcon, CreditCard, HelpCircle, Plus, Trash2, Image as ImageIcon, Upload, Type
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function Settings() {
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const aboutFileInputRef = useRef<HTMLInputElement>(null);

  const { settings, fetchSettings, updateSettings } = useSettingsStore();

  // ডিফল্ট সেটিংস ডাটা
  const defaultSettings = {
    storeName: 'MO FASHION',
    logoUrl: '', 
    aboutImageUrl: '', 
    tagline: 'Premium E-Commerce Experience. OWNER - MD.MEHEDI HASAN . (1589)',
    contactEmail: 'kon497733@gmail.com',
    phoneNumber: '+880 1707697445',
    address: 'CDA Agrabad, Chattogram, Bangladesh',
    currency: '৳',
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

  const [localSettings, setLocalSettings] = useState<any>({ ...defaultSettings, ...settings });
  const [activeTab, setActiveTab] = useState('General');
  const [loading, setLoading] = useState(true);

  // 🚀 ১. সেন্ট্রাল ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম সেটিংস সিঙ্ক করা
  useEffect(() => {
    const loadSettings = async () => {
      try {
        await fetchSettings();
        const currentSettings = useSettingsStore.getState().settings;
        setLocalSettings({ ...defaultSettings, ...currentSettings });
      } catch (e) {
        console.warn("Failed to load settings from cloud, using cached settings.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // স্টোর চেঞ্জ হলে লোকাল ফর্মে সিঙ্ক করা
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setLocalSettings((prev: any) => ({ ...defaultSettings, ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalSettings((prev: any) => ({ ...prev, [name]: value }));
  };

  // 🚀 ২. লোগো আপলোড ও আল্ট্রা-লাইটওয়েট কমপ্রেশন
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 220; 
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          const compressedLogo = canvas.toDataURL('image/png');
          setLocalSettings((prev: any) => ({ ...prev, logoUrl: compressedLogo }));
          toast.success('Logo selected! Click "Save All Settings" below.');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // 🚀 ৩. এবাউট পিকচার কমপ্রেশন
  const handleAboutImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 450;
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          const compressedImg = canvas.toDataURL('image/jpeg', 0.7);
          setLocalSettings((prev: any) => ({ ...prev, aboutImageUrl: compressedImg }));
          toast.success('About photo selected! Click "Save All Settings" below.');
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
    const updatedFaqs = [...localSettings.faqs];
    updatedFaqs[index][field] = value;
    setLocalSettings({ ...localSettings, faqs: updatedFaqs });
  };

  const addFaq = () => {
    setLocalSettings({
      ...localSettings,
      faqs: [...localSettings.faqs, { question: '', answer: '' }]
    });
  };

  const removeFaq = (index: number) => {
    const updatedFaqs = localSettings.faqs.filter((_: any, i: number) => i !== index);
    setLocalSettings({ ...localSettings, faqs: updatedFaqs });
  };

  // 🚀 ৪. গ্লোবাল জাস্ট্যান্ড স্টোর ও ক্লাউড ডাটাবেসে সেভ করা
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const toastId = toast.loading("Saving settings LIVE to MongoDB Cloud Database...");

    try {
      await updateSettings(localSettings);
      toast.success('Settings saved LIVE in Cloud Database! 🎉', { id: toastId });
    } catch (err) {
      console.warn("Cloud Sync warning: Saved locally.");
      toast.success('Settings saved locally!', { id: toastId });
    }
  };

  const menuItems = [
    { name: 'General', icon: Store },
    { name: 'Operations', icon: Truck },
    { name: 'Payment', icon: CreditCard },
    { name: 'Social Links', icon: Globe },
    { name: 'FAQs', icon: HelpCircle },
  ];

  return (
    <div className="text-white pb-10">
      <Helmet><title>Admin - Advanced Settings | MO FASHION</title></Helmet>

      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
          <SettingsIcon className="mr-3 text-[#D4AF37]" size={28} />
          Advanced Store Settings
        </h1>
        <p className="text-sm text-gray-400 mt-1">Manage global store settings, logo, tagline, and live cloud database</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar */}
        <div className="lg:w-1/4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#D4AF37]/20 p-4 sticky top-24 shadow-lg">
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setActiveTab(item.name)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                      isActive 
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_10px_rgba(212,175,55,0.1)]' 
                      : 'text-gray-400 hover:bg-[#111111] hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon size={20} />
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
            <div className="bg-[#1A1A1A] p-10 rounded-xl text-center text-[#D4AF37] animate-pulse">Loading Cloud Settings...</div>
          ) : (
            <form onSubmit={handleSaveSettings} className="bg-[#1A1A1A] p-6 sm:p-8 rounded-xl border border-[#D4AF37]/20 shadow-lg relative min-h-[400px]">
              
              {/* 1. General Settings */}
              {activeTab === 'General' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/10 pb-3">General Information</h2>
                  
                  {/* ওয়েবসাইট লোগো সেকশন */}
                  <div className="bg-[#111111] p-5 rounded-xl border border-[#D4AF37]/20 space-y-4">
                    <label className="block text-[#D4AF37] font-bold text-sm">Website Logo Management</label>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                      <div className="w-40 h-28 bg-[#1A1A1A] border-2 border-dashed border-[#D4AF37]/40 rounded-xl flex items-center justify-center overflow-hidden relative group flex-shrink-0 shadow-inner">
                        {localSettings.logoUrl ? (
                          <>
                            <img src={localSettings.logoUrl} alt="Store Logo" className="w-full h-full object-contain p-2" />
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
                            className="bg-[#D4AF37] text-black px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-white transition-colors flex items-center space-x-2 shadow-md uppercase tracking-wider"
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
                            value={localSettings.logoUrl} 
                            onChange={handleChange} 
                            placeholder="Or paste copied logo URL from Chrome..." 
                            className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* এবাউট পেজের টিম ছবি সেকশন */}
                  <div className="bg-[#111111] p-5 rounded-xl border border-[#D4AF37]/20 space-y-4">
                    <label className="block text-[#D4AF37] font-bold text-sm">About Page Image ("The Fashion Team" Box)</label>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                      <div className="w-40 h-28 bg-[#1A1A1A] border-2 border-dashed border-[#D4AF37]/40 rounded-xl flex items-center justify-center overflow-hidden relative group flex-shrink-0 shadow-inner">
                        {localSettings.aboutImageUrl ? (
                          <>
                            <img src={localSettings.aboutImageUrl} alt="Team" className="w-full h-full object-cover" />
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
                            className="bg-[#D4AF37] text-black px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-white transition-colors flex items-center space-x-2 shadow-md uppercase tracking-wider"
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
                            value={localSettings.aboutImageUrl} 
                            onChange={handleChange} 
                            placeholder="Or paste copied image URL from Chrome..." 
                            className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* সাধারণ তথ্য ফিল্ডস */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Store Name</label>
                      <div className="relative">
                        <Store size={18} className="absolute left-3 top-3 text-gray-500" />
                        <input type="text" name="storeName" value={localSettings.storeName} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#D4AF37] font-bold text-sm mb-2">Homepage Tagline / Description</label>
                      <div className="relative">
                        <Type size={18} className="absolute left-3 top-3 text-[#D4AF37]" />
                        <input 
                          type="text" 
                          name="tagline" 
                          value={localSettings.tagline} 
                          onChange={handleChange} 
                          placeholder="e.g. Premium E-Commerce Experience" 
                          className="w-full bg-[#111111] border border-[#D4AF37]/50 rounded-lg pl-10 pr-4 py-2.5 text-white font-medium focus:outline-none focus:border-[#D4AF37] transition-colors" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Support Email</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
                        <input type="email" name="contactEmail" value={localSettings.contactEmail} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-3 top-3 text-gray-500" />
                        <input type="text" name="phoneNumber" value={localSettings.phoneNumber} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-300 text-sm mb-2">Store Address</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-3 top-3 text-gray-500" />
                        <input type="text" name="address" value={localSettings.address} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Operations Settings */}
              {activeTab === 'Operations' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/10 pb-3">Operations & Shipping</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Default Currency</label>
                      <select name="currency" value={localSettings.currency} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer">
                        <option value="৳">৳ (BDT)</option>
                        <option value="$">$ (USD)</option>
                        <option value="€">€ (EUR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Tax Rate (%)</label>
                      <div className="relative">
                        <Percent size={18} className="absolute left-3 top-3 text-gray-500" />
                        <input type="number" name="taxRate" value={localSettings.taxRate} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]" min="0" step="0.1" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Shipping Cost (Inside Chattogram)</label>
                      <div className="relative">
                        <Truck size={18} className="absolute left-3 top-3 text-[#D4AF37]" />
                        <input type="number" name="shippingInside" value={localSettings.shippingInside} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg pl-10 pr-4 py-2.5 text-[#D4AF37] font-bold focus:outline-none focus:border-[#D4AF37]" min="0" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Shipping Cost (Outside Chattogram)</label>
                      <div className="relative">
                        <Truck size={18} className="absolute left-3 top-3 text-[#D4AF37]" />
                        <input type="number" name="shippingOutside" value={localSettings.shippingOutside} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg pl-10 pr-4 py-2.5 text-[#D4AF37] font-bold focus:outline-none focus:border-[#D4AF37]" min="0" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Payment Settings */}
              {activeTab === 'Payment' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/10 pb-3">Payment Methods</h2>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 p-4 bg-[#111111] border border-[#D4AF37]/20 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={localSettings.enableBkash} onChange={() => handleToggle('enableBkash')} className="w-5 h-5 accent-[#D4AF37]" />
                      <span className="text-white font-medium text-lg">Enable bKash Payment</span>
                    </label>
                    <label className="flex items-center space-x-3 p-4 bg-[#111111] border border-[#D4AF37]/20 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={localSettings.enableCard} onChange={() => handleToggle('enableCard')} className="w-5 h-5 accent-[#D4AF37]" />
                      <span className="text-white font-medium text-lg">Enable Credit/Debit Card</span>
                    </label>
                    <label className="flex items-center space-x-3 p-4 bg-[#111111] border border-[#D4AF37]/20 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={localSettings.enableCOD} onChange={() => handleToggle('enableCOD')} className="w-5 h-5 accent-[#D4AF37]" />
                      <span className="text-white font-medium text-lg">Enable Cash on Delivery (COD)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 4. Social Links */}
              {activeTab === 'Social Links' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold text-[#D4AF37] mb-6 uppercase border-b border-[#D4AF37]/10 pb-3">Social Media URLs</h2>
                  <div className="space-y-5">
                    <input type="url" name="facebook" value={localSettings.facebook} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="Facebook URL" />
                    <input type="url" name="instagram" value={localSettings.instagram} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="Instagram URL" />
                    <input type="url" name="twitter" value={localSettings.twitter} onChange={handleChange} className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="Twitter URL" />
                  </div>
                </div>
              )}

              {/* 5. FAQs */}
              {activeTab === 'FAQs' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center mb-6 border-b border-[#D4AF37]/10 pb-3">
                    <h2 className="text-xl font-bold text-[#D4AF37] uppercase">Manage FAQs</h2>
                    <button type="button" onClick={addFaq} className="flex items-center text-sm bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded hover:bg-[#D4AF37] hover:text-black">
                      <Plus size={16} className="mr-1" /> Add FAQ
                    </button>
                  </div>
                  {localSettings.faqs.map((faq: any, index: number) => (
                    <div key={index} className="bg-[#111111] p-4 rounded-lg border border-[#D4AF37]/20 space-y-3 relative">
                      <button type="button" onClick={() => removeFaq(index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                      <input type="text" value={faq.question} onChange={(e) => handleFaqChange(index, 'question', e.target.value)} className="w-full bg-[#1A1A1A] border border-gray-700 rounded p-2 text-white" placeholder="Question" />
                      <input type="text" value={faq.answer} onChange={(e) => handleFaqChange(index, 'answer', e.target.value)} className="w-full bg-[#1A1A1A] border border-gray-700 rounded p-2 text-white" placeholder="Answer" />
                    </div>
                  ))}
                </div>
              )}

              {/* Save Button */}
              <div className="mt-10 pt-6 border-t border-[#D4AF37]/20 flex justify-end">
                <button 
                  type="submit"
                  className="bg-[#D4AF37] text-black px-8 py-3 rounded-lg hover:bg-white transition-colors font-bold flex items-center space-x-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-95"
                >
                  <Save size={20} />
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
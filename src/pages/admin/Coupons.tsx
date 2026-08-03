import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Ticket, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { getLiveCoupons, apiRequest } from '../../config/api';

export default function Coupons() {
  const [coupons, setCoupons] = useState<any[]>(() => {
    const savedCoupons = localStorage.getItem('mo_fashion_coupons');
    return savedCoupons ? JSON.parse(savedCoupons) : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    _id: '',
    code: '',
    discountValue: '',
    type: 'percentage',
    usageLimit: '',
    used: 0,
    expiryDate: '',
    status: 'Active'
  });

  // 🚀 ১. সেন্ট্রাল এপিআই দিয়ে ক্লাউড ডাটাবেজ (MongoDB API) থেকে রিয়েল-টাইম কুপন ডাটা ফেচ করা
  const fetchCoupons = async () => {
    // লোকালস্টোরেজ থেকে ইনস্ট্যান্ট লোড
    const savedLocal = localStorage.getItem('mo_fashion_coupons');
    if (savedLocal) {
      try {
        setCoupons(JSON.parse(savedLocal));
      } catch (e) {}
    }

    // ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম সিঙ্ক
    try {
      setLoading(true);
      const data = await getLiveCoupons();
      if (Array.isArray(data)) {
        const formatted = data.map(item => ({
          id: item._id || item.id,
          _id: item._id || item.id,
          ...item
        }));
        setCoupons(formatted);
        localStorage.setItem('mo_fashion_coupons', JSON.stringify(formatted));
      }
    } catch (error) {
      console.warn("Backend API offline, using cached coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // 🚀 অটোমেটিক সিকিউর কুপন কোড জেনারেটর
  const generateRandomCode = () => {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData({ ...formData, code: `MO-${randomString}` });
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({ 
      id: '',
      _id: '', 
      code: '', 
      discountValue: '', 
      type: 'percentage', 
      usageLimit: '', 
      used: 0, 
      expiryDate: '', 
      status: 'Active' 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: any) => {
    setModalMode('edit');
    const targetId = coupon._id || coupon.id;
    
    // HTML input[type="date"] এর জন্য এক্সপায়ারি ডেট ফরম্যাট করা
    let formattedDate = coupon.expiryDate;
    if (coupon.expiryDate) {
      try {
        formattedDate = new Date(coupon.expiryDate).toISOString().split('T')[0];
      } catch(e){}
    }

    setFormData({
      ...coupon,
      id: targetId,
      _id: targetId,
      expiryDate: formattedDate || ''
    });
    setIsModalOpen(true);
  };

  // 🚀 ২. সেন্ট্রাল এপিআই দিয়ে ক্লাউড ডাটাবেস থেকে কুপন ডিলিট করা
  const handleDelete = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete the coupon "${code}"?`)) {
      const updated = coupons.filter(c => (c._id || c.id) !== id);
      setCoupons(updated);
      localStorage.setItem('mo_fashion_coupons', JSON.stringify(updated));
      toast.success(`Coupon ${code} deleted!`);

      try {
        await apiRequest(`/coupons/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn("Cloud delete failed.");
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code ${code} copied to clipboard! 📋`);
  };

  // 🚀 ৩. সেন্ট্রাল এপিআই দিয়ে ক্লাউড ডাটাবেসে সেভ বা আপডেট করার লজিক (POST / PUT API)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.discountValue || !formData.usageLimit || !formData.expiryDate) {
      toast.error("Please fill in all required fields!");
      return;
    }

    const finalCode = formData.code.trim().toUpperCase();

    if (modalMode === 'add') {
      const isDuplicate = coupons.some(c => c.code === finalCode);
      if (isDuplicate) {
        toast.error(`Coupon code "${finalCode}" already exists!`);
        return;
      }
    }

    const couponPayload = {
      code: finalCode,
      discountValue: Number(formData.discountValue),
      type: formData.type,
      usageLimit: Number(formData.usageLimit),
      used: Number(formData.used) || 0,
      expiryDate: formData.expiryDate,
      status: formData.status
    };

    const targetId = formData._id || formData.id || Date.now().toString();
    const localObj = { id: targetId, _id: targetId, ...couponPayload };

    let updatedList = [];
    if (modalMode === 'add') {
      updatedList = [localObj, ...coupons];
    } else {
      updatedList = coupons.map(c => (c._id || c.id) === targetId ? localObj : c);
    }

    // ১. লোকাল স্টোরেজে ইনস্ট্যান্ট সেভ
    setCoupons(updatedList);
    localStorage.setItem('mo_fashion_coupons', JSON.stringify(updatedList));

    setIsModalOpen(false);
    const toastId = toast.loading("Saving coupon to Cloud Database...");

    // ২. ক্লাউড ডাটাবেসে (MongoDB API) সেভ করা
    try {
      if (modalMode === 'add') {
        await apiRequest('/coupons', {
          method: 'POST',
          body: JSON.stringify(couponPayload)
        });
      } else {
        await apiRequest(`/coupons/${targetId}`, {
          method: 'PUT',
          body: JSON.stringify(couponPayload)
        });
      }

      toast.success("Coupon saved LIVE on Cloud! 🎉", { id: toastId });
      fetchCoupons(); // রি-লোডের জন্য
    } catch (error) {
      console.warn("Cloud Sync warning:", error);
      toast.success("Coupon saved locally!", { id: toastId });
    }
  };

  const filteredCoupons = coupons.filter(coupon => 
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet>
        <title>Admin - Coupons Management | MO FASHION</title>
      </Helmet>

      {/* 🚀 Header Section with Animated Glassmorphism */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-2xl border border-[#D4AF37]/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-[#D4AF37]/40">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
              <Ticket className="mr-3 text-[#D4AF37] animate-bounce" size={28} /> Coupons Management
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30 flex items-center">
              Total: {coupons.length} Active Codes
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Create, track, and manage promotional discount codes</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={fetchCoupons}
            className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 flex items-center space-x-2 font-bold text-xs"
            title="Refresh Coupons"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={handleOpenAdd}
            className="bg-gradient-to-r from-[#D4AF37] to-[#f3e5ab] text-black px-6 py-2.5 rounded-xl hover:scale-105 transition-all duration-300 font-bold flex items-center space-x-2 shadow-lg shadow-[#D4AF37]/20 w-full sm:w-auto justify-center active:scale-95"
          >
            <Plus size={20} />
            <span>Create New Coupon</span>
          </button>
        </div>
      </div>

      {/* 🔎 Search Section */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#D4AF37]/20 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg transition-all duration-300">
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Search coupons by code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-gray-700 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 placeholder-gray-500 transition-all duration-200 uppercase tracking-wider text-sm font-semibold"
          />
          <Search className="absolute left-3.5 top-3 text-gray-500" size={18} />
        </div>
      </div>

      {/* 📦 Coupons Table */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Coupon Code</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Discount</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Usage & Limit</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Expiry Date</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredCoupons.map((coupon) => {
                const usagePercent = coupon.usageLimit > 0 ? (coupon.used / coupon.usageLimit) * 100 : 0;
                const isNearingLimit = usagePercent > 80;

                return (
                  <tr key={coupon._id || coupon.id} className="hover:bg-[#111111] transition-all duration-200 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform duration-300 shadow-sm">
                          <Ticket size={18} />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white tracking-widest text-lg group-hover:text-[#D4AF37] transition-colors">{coupon.code}</span>
                          <button 
                            onClick={() => handleCopyCode(coupon.code)}
                            className="text-gray-500 hover:text-[#D4AF37] p-1.5 hover:bg-[#D4AF37]/10 rounded-lg transition-all active:scale-95"
                            title="Copy Code"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#D4AF37] text-lg">
                        {coupon.type === 'percentage' ? `${coupon.discountValue}% OFF` : `৳${coupon.discountValue} OFF`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col w-36">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-white font-medium">{coupon.used || 0} Used</span>
                          <span className="text-gray-400">of {coupon.usageLimit}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${isNearingLimit ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-[#D4AF37] to-[#f3e5ab]'}`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 font-medium text-sm">
                        {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block transition-all duration-300 ${
                        coupon.status === 'Active' 
                        ? 'text-green-400 bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/20 animate-pulse' 
                        : 'text-red-400 bg-red-500/10 border-red-500/30 shadow-sm shadow-red-500/20'
                      }`}>
                        {coupon.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleOpenEdit(coupon)}
                          className="p-2.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-[#D4AF37]/50 active:scale-95"
                          title="Edit Coupon"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(coupon._id || coupon.id, coupon.code)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-red-500/50 active:scale-95"
                          title="Delete Coupon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Ticket size={48} className="text-gray-600 opacity-40 animate-pulse" />
                      <p className="text-lg font-medium text-white">No coupons found!</p>
                      <p className="text-xs text-gray-500">Click "Create New Coupon" to generate promotional codes.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪟 Add/Edit Coupon Modal with High-Level Animations */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-[#D4AF37]/20 bg-[#111111]">
              <h2 className="text-xl font-serif font-bold text-[#D4AF37] uppercase flex items-center tracking-wide">
                <Sparkles className="mr-2 text-[#D4AF37]" size={22} />
                {modalMode === 'add' ? 'Create New Coupon' : 'Edit Coupon Settings'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form id="couponForm" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
              
              <div>
                <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Coupon Code *</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors uppercase tracking-widest font-bold text-lg"
                    placeholder="e.g. MO-WINTER50"
                  />
                  {modalMode === 'add' && (
                    <button 
                      type="button"
                      onClick={generateRandomCode}
                      className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-4 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95"
                      title="Generate Random Code"
                    >
                      <RefreshCw size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Discount Type *</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'percentage' | 'fixed'})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer text-sm font-semibold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">
                    Discount Value {formData.type === 'percentage' ? '(%)' : '(৳)'} *
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    max={formData.type === 'percentage' ? 99 : 99999}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors font-bold text-sm"
                    placeholder={formData.type === 'percentage' ? "e.g. 20" : "e.g. 500"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Total Usage Limit *</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                    placeholder="How many times can it be used?"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Expiry Date *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                    className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Coupon Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-[#111111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer font-bold text-sm"
                >
                  <option value="Active" className="text-green-500">🟢 Active</option>
                  <option value="Disabled" className="text-yellow-500">🟡 Disabled</option>
                  <option value="Expired" className="text-red-500">🔴 Expired</option>
                </select>
              </div>

            </form>

            <div className="p-6 border-t border-gray-800 flex justify-end space-x-3 bg-[#111111]">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-[#1A1A1A] hover:text-white transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                form="couponForm"
                type="submit"
                className="bg-[#D4AF37] text-black px-8 py-2.5 rounded-xl hover:bg-white transition-all duration-300 font-bold shadow-lg shadow-[#D4AF37]/20 uppercase tracking-wider text-sm active:scale-95"
              >
                {modalMode === 'add' ? 'Save Coupon & Push Live' : 'Update Coupon'}
              </button>
            </div>
            
          </div>
        </div>
      )}
      
    </div>
  );
}
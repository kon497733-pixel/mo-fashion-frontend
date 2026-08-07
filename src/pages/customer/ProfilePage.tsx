import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit, Camera, Mail, MapPin, Calendar, Check, X, LogOut,
  User, LogIn, UserPlus, Phone, Package, Clock, Truck, 
  Trash2, RefreshCcw, ArchiveX, ShoppingCart, Sparkles, CheckCircle, Tag
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { apiRequest, getLiveOrders } from '../../config/api';
import { useCartStore } from '../../store/useCartStore';

interface UserProfile {
  _id?: string;
  id?: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  joinedDate: string;
  avatarUrl: string;
  coverUrl: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const cartStore = useCartStore();

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'recycle_bin'>('orders');
  const [orderFilter, setOrderFilter] = useState<string>('All');

  // 🚀 কাস্টমারের কার্ট থেকে রিমুভ করা পণ্যের রিসাইকেল বিন স্টেট
  const [customerRecycleBin, setCustomerRecycleBin] = useState<any[]>([]);

  const defaultProfile: UserProfile = {
    name: currentUser?.name || 'Customer Name',
    role: currentUser?.role || 'Customer',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    bio: 'Premium Customer at MO FASHION.',
    joinedDate: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    avatarUrl: currentUser?.profilePicture || currentUser?.photoURL || '',
    coverUrl: ''
  };

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [formData, setFormData] = useState<UserProfile>(defaultProfile);

  useEffect(() => {
    const fetchUserDataAndOrders = async () => {
      if (!currentUser) return;
      const userId = currentUser._id || currentUser.id;
      const userEmail = currentUser.email?.toLowerCase().trim();

      const recycleBinKey = `customer_recycle_bin_${userEmail || userId}`;
      const savedBin = localStorage.getItem(recycleBinKey);
      if (savedBin) {
        try { setCustomerRecycleBin(JSON.parse(savedBin)); } catch (e) {}
      }

      const userKey = `user_profile_${userEmail || userId}`;
      const savedLocal = localStorage.getItem(userKey);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          setProfile(parsed);
          setFormData(parsed);
        } catch (e) {}
      }

      if (userId && !userId.includes('SOCIAL-')) {
        try {
          const cloudUser = await apiRequest(`/users/${userId}`);
          if (cloudUser && !cloudUser.message) {
            const merged: UserProfile = {
              ...defaultProfile,
              _id: cloudUser._id,
              id: cloudUser._id,
              name: cloudUser.name || defaultProfile.name,
              email: cloudUser.email || defaultProfile.email,
              phone: cloudUser.phone || defaultProfile.phone,
              address: cloudUser.address || defaultProfile.address,
              avatarUrl: cloudUser.profilePicture || defaultProfile.avatarUrl,
            };
            setProfile(merged);
            setFormData(merged);
            localStorage.setItem(userKey, JSON.stringify(merged));
          }
        } catch (error) {
          console.warn("Backend API offline, using cached profile.");
        }
      }

      if (userEmail) {
        try {
          const allOrders = await getLiveOrders();
          if (Array.isArray(allOrders)) {
            const customerOrders = allOrders.filter(order => 
              (order.email && order.email.toLowerCase().trim() === userEmail) ||
              (order.customerInfo && order.customerInfo.email && order.customerInfo.email.toLowerCase().trim() === userEmail)
            );
            setMyOrders(customerOrders);
          }
        } catch (e) {
          console.warn("Failed to fetch live orders.");
        }
      }
    };

    fetchUserDataAndOrders();
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setProfile(formData);
    const userKey = `user_profile_${currentUser.email || currentUser._id || currentUser.id}`;
    localStorage.setItem(userKey, JSON.stringify(formData));
    
    const updatedUserObj = { 
      ...currentUser, 
      name: formData.name, 
      phone: formData.phone, 
      address: formData.address, 
      profilePicture: formData.avatarUrl,
      photoURL: formData.avatarUrl 
    };
    localStorage.setItem('currentUser', JSON.stringify(updatedUserObj));
    localStorage.setItem('user', JSON.stringify(updatedUserObj));
    
    setIsEditing(false);

    const userId = currentUser._id || currentUser.id;
    const toastId = toast.loading("Saving profile to Cloud Database...");

    try {
      if (userId && !userId.includes('SOCIAL-')) {
        await apiRequest(`/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            profilePicture: formData.avatarUrl
          })
        });
        toast.success("Profile saved LIVE on Cloud Database! 🎉", { id: toastId });
        return;
      }
      toast.success("Profile updated successfully!", { id: toastId });
    } catch (err) {
      toast.success("Profile updated locally!", { id: toastId });
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    imageType: 'avatarUrl' | 'coverUrl'
  ) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = imageType === 'avatarUrl' ? 250 : 600;
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          const updatedProfile = { ...profile, [imageType]: compressedBase64 };
          
          setProfile(updatedProfile);
          setFormData(updatedProfile);

          const userKey = `user_profile_${currentUser.email || currentUser._id || currentUser.id}`;
          localStorage.setItem(userKey, JSON.stringify(updatedProfile));
          toast.success(`${imageType === 'avatarUrl' ? 'Profile picture' : 'Cover photo'} loaded! Click "Save Live" to sync.`);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestoreToCart = (item: any) => {
    const store = cartStore as any;
    if (store && typeof store.addItem === 'function') {
      store.addItem(item);
    } else if (store && typeof store.addToCart === 'function') {
      store.addToCart(item);
    }
    
    const userId = currentUser?._id || currentUser?.id || currentUser?.email;
    const recycleBinKey = `customer_recycle_bin_${userId}`;
    const updatedBin = customerRecycleBin.filter(i => (i.id || i._id) !== (item.id || item._id));
    setCustomerRecycleBin(updatedBin);
    localStorage.setItem(recycleBinKey, JSON.stringify(updatedBin));

    toast.success(`"${item.name || 'Item'}" restored to your shopping cart! 🛒`);
  };

  const handleDeleteFromRecycleBin = (itemId: string, itemName: string) => {
    if (window.confirm(`Permanently remove "${itemName}" from your trash?`)) {
      const userId = currentUser?._id || currentUser?.id || currentUser?.email;
      const recycleBinKey = `customer_recycle_bin_${userId}`;
      const updatedBin = customerRecycleBin.filter(i => (i.id || i._id) !== itemId);
      setCustomerRecycleBin(updatedBin);
      localStorage.setItem(recycleBinKey, JSON.stringify(updatedBin));

      toast.success("Item permanently removed.");
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      setCurrentUser(null);
      setProfile(defaultProfile);
      setFormData(defaultProfile);
      setIsEditing(false);

      toast.success('You have logged out successfully.');
      navigate('/login');
    }
  };

  const deliveredOrdersCount = myOrders.filter(o => o.status === 'Delivered').length;
  const activeOrdersCount = myOrders.filter(o => o.status === 'Pending' || o.status === 'Processing' || o.status === 'Shipped').length;
  const totalSpentAmount = myOrders.reduce((sum, o) => sum + (Number(o.orderSummary?.total || o.total) || 0), 0);

  const filteredOrders = myOrders.filter(order => orderFilter === 'All' || order.status === orderFilter);

  if (!currentUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#111111] text-white px-4">
        <Helmet><title>Profile | MO FASHION</title></Helmet>
        <div className="max-w-md w-full bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl shadow-2xl p-8 text-center space-y-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 glass-3d-panel">
          <div className="w-20 h-20 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-white uppercase tracking-wider gold-text-glow">
              Access Your Profile
            </h2>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
              Please sign in to view your live orders, order history, trash bin, and profile settings.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-bold py-3 px-4 rounded-xl hover:bg-white transition shadow-lg shadow-[#D4AF37]/20 uppercase text-xs tracking-wider active:scale-95"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#111111] border border-gray-700 text-white font-medium py-3 px-4 rounded-xl hover:border-[#D4AF37] transition text-xs uppercase tracking-wider active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white py-10 px-4 sm:px-6 lg:px-8 transition-all duration-300">
      <Helmet><title>{profile.name || 'User Profile'} | MO FASHION</title></Helmet>
      
      <input type="file" ref={avatarInputRef} onChange={(e) => handleImageUpload(e, 'avatarUrl')} accept="image/*" className="hidden" />
      <input type="file" ref={coverInputRef} onChange={(e) => handleImageUpload(e, 'coverUrl')} accept="image/*" className="hidden" />

      <div className="max-w-5xl mx-auto space-y-8 [perspective:1200px]">
        
        {/* 🚀 Header & 3D Glassmorphic Profile Card */}
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl shadow-2xl overflow-hidden relative backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/50 glass-3d-panel">
          
          {/* Banner Photo Section */}
          <div className="relative h-48 sm:h-64 bg-[#0a0a0a] border-b border-[#D4AF37]/20 overflow-hidden group">
            {profile.coverUrl ? (
              <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-[#111111] via-[#1A1A1A] to-[#111111]">
                <span className="flex items-center space-x-2">
                  <Camera size={18} className="text-[#D4AF37]" />
                  <span>Upload Cover Banner</span>
                </span>
              </div>
            )}

            <button onClick={() => coverInputRef.current?.click()} className="absolute top-4 right-4 bg-black/80 hover:bg-[#D4AF37] hover:text-black text-white p-3 rounded-full shadow-xl border border-[#D4AF37]/40 transition-all duration-300 active:scale-95" title="Change Cover Banner">
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <div className="relative px-6 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-6 gap-4">
              
              {/* Profile Avatar with Glowing Ring */}
              <div className="relative group">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#1A1A1A] object-cover shadow-2xl bg-[#111111] group-hover:scale-105 transition-transform duration-300 ring-2 ring-[#D4AF37]/50" />
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#1A1A1A] shadow-2xl bg-[#111111] flex items-center justify-center text-[#D4AF37] ring-2 ring-[#D4AF37]/50">
                    <User className="w-16 h-16 animate-pulse" />
                  </div>
                )}

                <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-2 right-2 bg-[#D4AF37] text-black hover:bg-white p-2.5 rounded-full shadow-lg transition-all duration-300 border border-black active:scale-95" title="Change Profile Picture">
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Edit and Logout Actions */}
              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#f3e5ab] text-black hover:bg-white px-5 py-2.5 rounded-xl shadow-lg transition font-bold text-xs uppercase tracking-wider active:scale-95">
                      <Edit className="w-4 h-4" /> Edit Profile
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-4 py-2.5 rounded-xl border border-red-500/30 transition font-medium text-xs active:scale-95">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={handleSave} className="flex items-center gap-1.5 bg-[#D4AF37] text-black px-5 py-2.5 rounded-xl shadow-md hover:bg-white transition font-bold text-xs uppercase active:scale-95">
                      <Check className="w-4 h-4" /> Save Live
                    </button>
                    <button onClick={handleCancel} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-xl transition text-xs font-medium active:scale-95">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white flex items-center space-x-2 gold-text-glow">
                    <span>{profile.name || 'Your Name'}</span>
                    <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                  </h1>
                  <p className="text-[#D4AF37] font-medium text-xs tracking-wider uppercase mt-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-2 animate-ping"></span>
                    {profile.role} • Active Member
                  </p>
                </div>

                <p className="text-gray-400 max-w-2xl text-sm leading-relaxed font-light">
                  {profile.bio || 'No bio added yet. Click "Edit Profile" to write something about yourself.'}
                </p>

                <div className="flex flex-wrap gap-6 pt-3 text-xs sm:text-sm text-gray-400 border-t border-gray-800/80">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#D4AF37]" /><span>{profile.email || 'No Email'}</span></div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#D4AF37]" /><span>{profile.phone || 'No Phone'}</span></div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#D4AF37]" /><span>{profile.address || 'No Address'}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#D4AF37]" /><span>Member Since: {profile.joinedDate}</span></div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 mt-4 bg-[#111111] p-6 rounded-2xl border border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Phone Number</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Email (Read Only)</label>
                  <input type="email" name="email" value={formData.email} readOnly className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-gray-800 text-gray-500 rounded-xl cursor-not-allowed text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Bio</label>
                  <textarea name="bio" rows={3} value={formData.bio} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] text-sm resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Shipping Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] text-sm" />
                </div>
              </form>
            )}

          </div>
        </div>

        {/* 📊 3D Glassmorphic Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-xl group glass-3d-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-xs uppercase font-bold">Total Orders</span>
              <Package className="w-5 h-5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-white">{myOrders.length}</p>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-xl group glass-3d-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-xs uppercase font-bold">In Transit</span>
              <Truck className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{activeOrdersCount}</p>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-xl group glass-3d-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-xs uppercase font-bold">Delivered</span>
              <CheckCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{deliveredOrdersCount}</p>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-xl group glass-3d-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-xs uppercase font-bold">Total Spent</span>
              <Tag className="w-5 h-5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-[#D4AF37]">৳{totalSpentAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* 🏷️ Dynamic Tabs: Live Orders & Cart Trash Bin */}
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-3xl shadow-xl p-6 glass-3d-panel">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 mb-6 gap-4">
            
            <div className="flex space-x-3">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'orders' 
                  ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 scale-105' 
                  : 'bg-[#111111] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                <Package size={16} />
                <span>My Live Orders ({myOrders.length})</span>
              </button>

              <button 
                onClick={() => setActiveTab('recycle_bin')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'recycle_bin' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-md scale-105' 
                  : 'bg-[#111111] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                <ArchiveX size={16} />
                <span>Cart Trash Bin ({customerRecycleBin.length})</span>
              </button>
            </div>

            {activeTab === 'orders' && (
              <select 
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="bg-[#111111] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
              >
                <option value="All">All Status ({myOrders.length})</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}
          </div>

          {/* 📦 Tab 1: Live Orders */}
          {activeTab === 'orders' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 animate-in fade-in zoom-in-95 duration-200">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl bg-[#111111]">
                  <Package size={48} className="mx-auto mb-3 opacity-20 text-[#D4AF37]" />
                  <p className="text-gray-400 mb-4 text-sm">No orders found in this category.</p>
                  <Link to="/" className="inline-block bg-[#D4AF37] text-black px-6 py-2.5 rounded-xl font-bold hover:bg-white transition-colors text-xs uppercase shadow-md active:scale-95">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                filteredOrders.map((order, idx) => {
                  const orderId = order._id || order.id || order.orderId;
                  let orderDate = 'Unknown Date';
                  if (order.createdAt) orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  else if (order.date) orderDate = order.date;

                  const orderTotal = order.orderSummary ? order.orderSummary.total : (order.total || 0);

                  return (
                    <div key={idx} className="bg-[#111111] p-5 rounded-2xl border border-gray-800 hover:border-[#D4AF37]/40 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:shadow-lg glass-3d-card">
                      <div className="space-y-1">
                        <p className="font-bold text-[#D4AF37] uppercase text-sm group-hover:scale-105 transition-transform">
                          Order #{String(orderId).slice(-6)}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center">
                          <Calendar size={12} className="mr-1 text-gray-500" /> {orderDate}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">
                          Items: {order.items || (order.orderItems && order.orderItems.length) || 0}
                        </p>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                        <p className="font-bold text-white text-lg">৳{Number(orderTotal).toFixed(2)}</p>
                        
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center transition-all ${
                          order.status === 'Delivered' ? 'text-green-400 bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/20' : 
                          order.status === 'Shipped' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-sm shadow-blue-500/20' : 
                          (order.status === 'Processing' || order.status === 'Pending') ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30 animate-pulse' :
                          order.status === 'Cancelled' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                          'text-orange-400 bg-orange-500/10 border-orange-500/30'
                        }`}>
                          {order.status === 'Delivered' && <Check size={12} className="mr-1" />}
                          {order.status === 'Shipped' && <Truck size={12} className="mr-1" />}
                          {(order.status === 'Processing' || order.status === 'Pending') && <Clock size={12} className="mr-1" />}
                          {order.status === 'Cancelled' && <X size={12} className="mr-1" />}
                          {order.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 🗑️ Tab 2: Customer Cart Trash Bin */}
          {activeTab === 'recycle_bin' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 animate-in fade-in zoom-in-95 duration-200">
              {customerRecycleBin.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl bg-[#111111]">
                  <ArchiveX size={48} className="mx-auto mb-3 opacity-20 text-red-400" />
                  <p className="text-gray-400 text-sm">Your trash bin is empty.</p>
                  <p className="text-xs text-gray-600 mt-1">Items removed from your shopping cart will appear here.</p>
                </div>
              ) : (
                customerRecycleBin.map((item, idx) => (
                  <div key={idx} className="bg-[#111111] p-4 rounded-2xl border border-gray-800 hover:border-red-500/30 transition-all duration-300 flex items-center justify-between gap-4 glass-3d-card">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-full h-full object-cover grayscale" />
                        ) : (
                          <ShoppingCart size={20} className="w-full h-full p-3 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm line-through decoration-gray-600">{item.name}</p>
                        <p className="text-xs text-[#D4AF37] font-bold">৳{Number(item.price || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleRestoreToCart(item)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black rounded-xl text-xs font-bold transition-all active:scale-95"
                        title="Restore Item to Cart"
                      >
                        <RefreshCcw size={14} />
                        <span>Restore to Cart</span>
                      </button>

                      <button 
                        onClick={() => handleDeleteFromRecycleBin(item.id || item._id, item.name)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors border border-gray-800"
                        title="Remove Permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
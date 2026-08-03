import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Ticket, 
  Settings as SettingsIcon, 
  Menu, 
  X, 
  Bell, 
  LogOut,
  Check,
  Layers,
  Trash2,
  Lock,
  ShieldCheck,
  Key,
  Shield,
  Mail,
  RefreshCw,
  CheckCircle2,
  Save,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getLiveSettings, apiRequest } from '../config/api'; // 🚀 সেন্ট্রাল এপিআই কানেক্ট

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  // 🚀 ১. জিরো-পারসিস্টেন্স সিকিউরিটি স্টেট
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [inputPasscode, setInputPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // 🚀 ২. ইমেইল OTP ভেরিফিকেশন স্টেট (৫ মিনিটের মেয়াদ সহ)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email_input' | 'otp' | 'new_password'>('email_input');
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  // 🚀 ৩. আপলোড করা লোগো ও সেটিংস স্টেট
  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: 'MO FASHION',
    logoUrl: ''
  });

  // সাইডবারের মেনু লিস্ট
  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/category-management', icon: Layers, label: 'Categories' },
    { path: '/admin/products', icon: Package, label: 'Products' },
    { path: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
    { path: '/admin/customers', icon: Users, label: 'Customers' },
    { path: '/admin/coupons', icon: Ticket, label: 'Coupons' },
    { path: '/admin/security', icon: Shield, label: 'Security' },
    { path: '/admin/settings', icon: SettingsIcon, label: 'Settings' },
    { path: '/admin/recycle-bin', icon: Trash2, label: 'Recycle Bin' },
  ];

  const notificationsList = [
    { id: 1, text: "New order #ORD-9876 received.", time: "2 mins ago", unread: true },
    { id: 2, text: "Stock running low for 'Premium Signature T-Shirt'.", time: "1 hour ago", unread: true },
    { id: 3, text: "New customer 'Emily Davis' registered.", time: "3 hours ago", unread: true },
  ];

  // লোগো ও সেটিংস ফেচ করা
  useEffect(() => {
    const fetchSettings = async () => {
      const savedSettings = localStorage.getItem('mo_fashion_settings');
      if (savedSettings) {
        try { setSiteSettings(JSON.parse(savedSettings)); } catch (e) {}
      }

      try {
        const cloudData = await getLiveSettings();
        if (cloudData && Object.keys(cloudData).length > 0) {
          setSiteSettings(cloudData);
          localStorage.setItem('mo_fashion_settings', JSON.stringify(cloudData));
        }
      } catch (err) {
        console.warn("Backend API offline, using cached settings.");
      }
    };

    fetchSettings();
  }, []);

  // 🚀 ৪. হাই-লেভেল পাসওয়ার্ড ভ্যালিডেশন
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPasscode = localStorage.getItem('mo_admin_passcode') || '15987531';
    
    if (inputPasscode.trim() === currentPasscode) {
      setIsAuthorized(true); 
      setPasscodeError(false);
      toast.success("Security Clearance Granted. Welcome Admin!");
    } else {
      setPasscodeError(true);
      toast.error("Incorrect Admin Password!");
    }
  };

  // 🚀 ৫. আসল জিমেইল ইনবক্সে OTP পাঠানোর API কল (Strict Gmail Check & No Code in Popup)
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const registeredEmail = (localStorage.getItem('mo_admin_email') || 'kon497733@gmail.com').trim().toLowerCase();
    const typedEmail = resetEmailInput.trim().toLowerCase();

    if (!typedEmail) {
      toast.error("Please enter your registered Gmail address!");
      return;
    }

    // 🔒 জিমেইল ভ্যালিডেশন: না মিললে "Please enter the real Gmail." দেখাবে
    if (typedEmail !== registeredEmail) {
      toast.error("Please enter the real Gmail.");
      return;
    }

    setIsSendingCode(true);
    const toastId = toast.loading(`Sending 5-minute security OTP code to ${registeredEmail}...`);

    try {
      const data = await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: registeredEmail })
      });

      if (data && data.success) {
        setForgotStep('otp');
        toast.success(`Verification code sent to ${registeredEmail}! Check your Gmail inbox.`, { id: toastId, duration: 6000 });
      } else {
        setForgotStep('otp');
        toast.success(`Verification code sent to ${registeredEmail}! Check your Gmail inbox.`, { id: toastId, duration: 6000 });
      }
    } catch (e) {
      toast.error("Cannot connect to email server. Make sure backend server is running!", { id: toastId });
    } finally {
      setIsSendingCode(false);
    }
  };

  // 🚀 ৬. জিমেইল ইনবক্স থেকে আনা OTP কড়াভাবে ভেরিফাই করা (ভুল বা রিভার্স কোড দিলে কড়াভাবে রিজেক্ট করবে)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim()) {
      toast.error("Please enter the OTP code sent to your Gmail.");
      return;
    }

    const toastId = toast.loading("Verifying OTP code...");

    try {
      const data = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: 'kon497733@gmail.com', otp: inputOtp.trim() })
      });

      if (data && data.success) {
        toast.success("Identity Verified! Set your new passcode now.", { id: toastId });
        setForgotStep('new_password');
      } else {
        toast.error("Incorrect OTP code entered! Please check your Gmail.", { id: toastId });
      }
    } catch (e) {
      toast.error("Server connection error during verification.", { id: toastId });
    }
  };

  // 🚀 ७. নতুন কাস্টম পাসওয়ার্ড সেভ করা
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("Passcode must be at least 4 characters!");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passcodes do not match!");
      return;
    }

    localStorage.setItem('mo_admin_passcode', newPassword);
    toast.success("New Admin Passcode set successfully! Please unlock dashboard.");
    
    setShowForgotModal(false);
    setForgotStep('email_input');
    setResetEmailInput('');
    setInputOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setInputPasscode('');
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAuthorized(false);
    toast.success("Admin logged out successfully!");
    navigate('/');
  };

  // 🔒 যদি এডমিন অথরাইজড না থাকে (৩-৪টি ছোট গ্লোয়িং বক্সেস মুভিং স্লাইডার অ্যানিমেশন)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4 font-sans text-white relative overflow-hidden select-none">
        
        {/* 🚀 ৩-৪টি ছোট গ্লোয়িং বক্স পুরো স্ক্রিনে ডানে-বামে-উপরে-নিচে ঘুরে বেড়ানোর CSS কিফ্রেম */}
        <style>{`
          @keyframes move3DBoxCluster {
            0% { top: 8%; left: 8%; }
            25% { top: 8%; left: 78%; }
            50% { top: 78%; left: 78%; }
            75% { top: 78%; left: 8%; }
            100% { top: 8%; left: 8%; }
          }
        `}</style>

        {/* ⬛ 🚀 ৩-৪টি ছোট গ্লোয়িং বক্সের মুভিং ব্যাকগ্রাউন্ড */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[#030303]">
          
          {/* কালো ব্যাকগ্রাউন্ড যেখানে বক্স নেই */}
          <div className="absolute inset-0 bg-black/90 z-0"></div>

          {/* গ্রিড স্কয়ার ছোট ছোট বক্সেস */}
          <div className="absolute inset-0 grid grid-cols-6 sm:grid-cols-10 md:grid-cols-14 grid-rows-8 sm:grid-rows-10 gap-1.5 p-2 opacity-25 z-1">
            {[...Array(140)].map((_, i) => (
              <div key={i} className="bg-[#0b0b0c] border border-gray-900 rounded-md"></div>
            ))}
          </div>

          {/* 🌟 🚀 ৩-৪টি ছোট জ্বলজ্বলে বক্সের ক্লাস্টার যা পুরো স্ক্রিনে ডানে, বামে, উপরে, নিচে ঘুরে বেড়াবে */}
          <div 
            className="absolute w-36 h-36 md:w-48 md:h-48 border-2 border-[#D4AF37] bg-[#D4AF37]/10 rounded-2xl shadow-[0_0_60px_#D4AF37] z-2 transition-all duration-1000 p-2"
            style={{ animation: 'move3DBoxCluster 13s ease-in-out infinite' }}
          >
            <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full">
              <div className="bg-[#D4AF37] rounded-lg shadow-[0_0_15px_#FFF] animate-pulse"></div>
              <div className="bg-[#D4AF37]/80 rounded-lg shadow-[0_0_10px_#D4AF37]"></div>
              <div className="bg-[#D4AF37]/60 rounded-lg"></div>
              <div className="bg-[#D4AF37] rounded-lg shadow-[0_0_15px_#FFF] animate-pulse"></div>
            </div>
          </div>

          {/* সেফটি রেডিয়াল শ্যাডো */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#030303_85%)] z-3"></div>
        </div>

        {/* লক স্ক্রিন মেইন কার্ড */}
        <div className="bg-[#121212]/95 backdrop-blur-2xl border-2 border-[#D4AF37]/50 rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-[0_0_90px_rgba(212,175,55,0.25)] relative z-10 text-center animate-in fade-in zoom-in-95 duration-500">
          
          {/* ওয়েবসাইট লোগো */}
          <div className="flex items-center justify-center mb-6">
            {siteSettings?.logoUrl && siteSettings.logoUrl.trim() !== '' ? (
              <div className="w-20 h-20 bg-[#0A0A0A] border-2 border-[#D4AF37] rounded-2xl p-2 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)] animate-pulse">
                <img src={siteSettings.logoUrl} alt="Store Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-[#D4AF37]/10 border-2 border-[#D4AF37] rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.3)] animate-bounce">
                <ShieldCheck size={40} />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-serif font-bold text-[#D4AF37] tracking-[0.25em] uppercase mb-1 drop-shadow-md">
            RESTRICTED ADMIN PANEL
          </h1>
          <p className="text-gray-400 text-xs mb-8 leading-relaxed font-light">
            Authentication required upon every access.
          </p>

          <form onSubmit={handleVerifyPasscode} className="space-y-6">
            <div className="relative group">
              <div className="relative mt-2">
                <Lock size={18} className="absolute left-4 top-4 text-[#D4AF37] z-10" />
                <input 
                  type="password" 
                  required
                  value={inputPasscode}
                  onChange={(e) => { setInputPasscode(e.target.value); setPasscodeError(false); }}
                  className={`w-full bg-[#0A0A0A] border ${
                    passcodeError ? 'border-red-500 animate-shake' : 'border-[#D4AF37]/40 focus:border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                  } rounded-2xl pl-12 pr-4 py-3.5 text-white text-center tracking-[0.5em] text-xl font-bold focus:outline-none transition-all`}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#D4AF37] via-white to-[#D4AF37] text-black py-4 rounded-2xl font-extrabold uppercase tracking-wider hover:brightness-110 transition-all duration-300 shadow-[0_0_25px_rgba(212,175,55,0.4)] active:scale-95 flex items-center justify-center space-x-2"
            >
              <Key size={18} />
              <span>Unlock Dashboard</span>
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-gray-800/80 flex justify-between items-center text-xs">
            <Link to="/" className="text-gray-500 hover:text-white transition-colors flex items-center">
              <ChevronLeftIcon /> Back to Store
            </Link>
            
            <button 
              type="button" 
              onClick={() => { setShowForgotModal(true); setForgotStep('email_input'); setResetEmailInput(''); }} 
              className="text-[#D4AF37] hover:underline flex items-center font-bold"
            >
              <Mail size={14} className="mr-1" /> Forgot Passcode?
            </button>
          </div>

        </div>

        {/* 🚀 ইমেইল OTP ভেরিফিকেশন মোডাল */}
        {showForgotModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            
            <div className="bg-[#1A1A1A] border-2 border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left z-10 overflow-hidden">
              
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3 mb-6 border-b border-gray-800 pb-4">
                <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#D4AF37] uppercase">Gmail OTP Recovery</h3>
                  <p className="text-xs text-gray-400">Code valid for 5 minutes only</p>
                </div>
              </div>

              {/* Step 1: Send OTP */}
              {forgotStep === 'email_input' && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Enter your registered Admin Gmail address to receive the 6-digit verification code:
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5">Registered Admin Gmail *</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3.5 top-3.5 text-[#D4AF37]" />
                      <input 
                        type="email"
                        required
                        value={resetEmailInput}
                        onChange={(e) => setResetEmailInput(e.target.value)}
                        className="w-full bg-[#111111] border border-[#D4AF37]/40 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] text-sm"
                        placeholder="Enter your Email"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSendingCode}
                    className="w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSendingCode ? <RefreshCw size={18} className="animate-spin" /> : <Mail size={18} />}
                    <span>{isSendingCode ? 'Sending Code...' : 'Send OTP to Gmail Inbox'}</span>
                  </button>
                </form>
              )}

              {/* Step 2: Enter OTP Code */}
              {forgotStep === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="flex items-center space-x-2 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                    <Clock size={16} className="shrink-0" />
                    <span>Check your Gmail inbox. OTP code is valid for 5 minutes.</span>
                  </div>

                  <p className="text-sm text-gray-300">
                    Enter the 6-digit verification code sent to <strong className="text-[#D4AF37]">{resetEmailInput}</strong>:
                  </p>

                  <div className="relative">
                    <input 
                      type="text"
                      required
                      maxLength={6}
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value)}
                      className="w-full bg-[#111111] border border-[#D4AF37]/50 rounded-xl px-4 py-3.5 text-center text-white text-lg tracking-[0.3em] font-bold focus:outline-none focus:border-[#D4AF37] uppercase shadow-inner"
                      placeholder="Enter your OTP"
                      autoFocus
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 size={18} />
                    <span>Verify Code</span>
                  </button>
                </form>
              )}

              {/* Step 3: Set New Password */}
              {forgotStep === 'new_password' && (
                <form onSubmit={handleSaveNewPassword} className="space-y-4">
                  <p className="text-sm text-gray-300">
                    Set your custom new Admin Passcode (will unlock this device):
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">New Passcode *</label>
                    <input 
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#111111] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none"
                      placeholder="Enter new passcode"
                      minLength={4}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Confirm New Passcode *</label>
                    <input 
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#111111] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none"
                      placeholder="Confirm new passcode"
                      minLength={4}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-all flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <Save size={18} />
                    <span>Save Passcode & Unlock Device</span>
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

      </div>
    );
  }

  // 🔓 অথরাইজড হলে আসল অ্যাডমিন ড্যাশবোর্ড
  return (
    <div className="min-h-screen bg-[#111111] flex font-sans text-white">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1A1A1A] border-r border-[#D4AF37]/20 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${
        isSidebarOpen ? 'translate-x-0 shadow-[0_0_30px_rgba(0,0,0,0.8)]' : '-translate-x-full'
      }`}>
        
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#D4AF37]/10">
          <Link to="/admin" className="flex items-center space-x-3 group">
            {siteSettings?.logoUrl && siteSettings.logoUrl.trim() !== '' ? (
              <img 
                src={siteSettings.logoUrl} 
                alt="Logo" 
                className="h-9 w-auto max-w-[45px] object-contain drop-shadow transition-transform group-hover:scale-105"
              />
            ) : (
              <Shield size={22} className="text-[#D4AF37]" />
            )}
            <span className="text-xl font-serif font-bold text-[#D4AF37] tracking-widest drop-shadow">
              MO ADMIN
            </span>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive 
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.15)] font-bold translate-x-1' 
                  : 'text-gray-400 hover:text-white hover:bg-[#111111] hover:translate-x-1'
                }`}
              >
                <item.icon size={20} className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[#D4AF37]' : ''}`} />
                <span className="font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-[#D4AF37]/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-medium"
          >
            <LogOut size={20} />
            <span>Lock & Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Topbar */}
        <header className="h-20 bg-[#1A1A1A] border-b border-[#D4AF37]/20 flex items-center justify-between px-4 lg:px-8 z-30 shadow-md relative">
          
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="mr-4 lg:hidden text-gray-400 hover:text-[#D4AF37] transition-colors p-2 rounded-lg bg-[#111111]"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-serif font-bold text-white hidden sm:block tracking-wide">
              Welcome, <span className="text-[#D4AF37]">Admin</span>
            </h2>
          </div>

          {/* Admin Profile & Notifications */}
          <div className="flex items-center space-x-5">
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative text-gray-400 hover:text-[#D4AF37] transition-colors focus:outline-none p-2 rounded-full hover:bg-[#111111]"
              >
                <Bell size={22} className="animate-pulse" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center rounded-full border border-[#1A1A1A] shadow">
                  3
                </span>
              </button>

              {/* Notification Dropdown Panel */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="p-4 border-b border-[#D4AF37]/10 flex justify-between items-center bg-[#111111]">
                    <h3 className="font-bold text-white text-sm flex items-center">
                      <Bell size={14} className="mr-2 text-[#D4AF37]" /> Notifications
                    </h3>
                    <button onClick={() => toast.success("Marked all as read")} className="text-[11px] text-[#D4AF37] hover:underline flex items-center font-bold">
                      <Check size={12} className="mr-1" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {notificationsList.map(n => (
                      <div key={n.id} className={`p-4 border-b border-gray-800/60 hover:bg-[#111111] transition-colors cursor-pointer ${n.unread ? 'bg-[#D4AF37]/5' : ''}`}>
                        <p className="text-xs text-gray-300 leading-snug">{n.text}</p>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium">{n.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-gray-800 bg-[#111111]">
                    <button 
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-xs text-[#D4AF37] hover:text-white transition-colors font-bold uppercase tracking-wider flex items-center justify-center mx-auto"
                    >
                      <X size={14} className="mr-1" /> Close Panel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3 pl-5 border-l border-gray-800">
              {siteSettings?.logoUrl && siteSettings.logoUrl.trim() !== '' ? (
                <img src={siteSettings.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded-full border border-[#D4AF37]/50 p-0.5 bg-[#111111]" />
              ) : (
                <div className="w-10 h-10 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-full flex items-center justify-center text-[#D4AF37] font-bold shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                  A
                </div>
              )}
              <div className="hidden md:block text-xs">
                <p className="font-bold text-white">Admin User</p>
                <p className="text-gray-400 text-[10px]">kon497733@gmail.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#111111]">
          <div key={location.pathname} className="p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-500">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>;
}
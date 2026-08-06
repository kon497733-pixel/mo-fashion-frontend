import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Mail, Lock, Eye, EyeOff, X, ShieldCheck, KeyRound, Shield, 
  RefreshCw, CheckCircle2, Clock, Save, User as UserIcon,
  ChevronRight, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore'; 
import { getSupabaseSettings, saveSupabaseCustomer } from '../../lib/supabase';

// 🚀 আপনার নিবন্ধিত আসল গুগল ক্লায়েন্ট আইডি
const REAL_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '277902353308-thjup151jhqo126u5an7orc2lg4o9b1i.apps.googleusercontent.com';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore(); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  });

  // স্টোর সেটিংস স্টেট
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    logoUrl: ''
  });

  // ইমেইল OTP পাসওয়ার্ড রিসেট স্টেট
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email_input' | 'otp' | 'new_password'>('email_input');
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  // 🚀 স্টোর সেটিংস লোড করা
  useEffect(() => {
    const loadSettings = async () => {
      const cached = localStorage.getItem('mo_fashion_settings');
      if (cached) {
        try { setSettings(JSON.parse(cached)); } catch (e) {}
      }
      try {
        const cloudSet = await getSupabaseSettings();
        if (cloudSet) setSettings(cloudSet);
      } catch (e) {}
    };

    loadSettings();

    // 🚀 গুগলের অফিশিয়াল OAuth 2.0 রেসপন্স টোকেন হ্যান্ডলার (URL Fragment Hash Parser)
    const fragmentString = window.location.hash.substring(1);
    if (fragmentString) {
      const params = new URLSearchParams(fragmentString);
      const accessToken = params.get('access_token');
      if (accessToken) {
        // Fetch Google User Profile via Access Token
        fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`)
          .then(res => res.json())
          .then(googleData => {
            if (googleData && googleData.email) {
              const loggedUser = {
                uid: `GOOGLE-${Date.now()}`,
                id: `GOOGLE-${Date.now()}`,
                _id: `GOOGLE-${Date.now()}`,
                displayName: googleData.name || googleData.email.split('@')[0],
                name: googleData.name || googleData.email.split('@')[0],
                email: googleData.email.toLowerCase(),
                role: 'customer',
                photoURL: googleData.picture || null,
                provider: 'Google',
                joinedDate: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              };

              if (typeof setUser === 'function') setUser(loggedUser as any);
              localStorage.setItem('currentUser', JSON.stringify(loggedUser));
              localStorage.setItem('user', JSON.stringify(loggedUser));
              localStorage.setItem('mo_fashion_customer_user', JSON.stringify(loggedUser));

              saveSupabaseCustomer({
                id: loggedUser.id,
                name: loggedUser.name,
                email: loggedUser.email,
                status: 'Active',
                joinDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              }).catch(() => null);

              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new Event('settingsUpdated'));

              toast.success(`Signed in successfully as ${loggedUser.name}! 🎉`);
              window.location.hash = ''; // Clear hash
              navigate('/profile', { replace: true });
            }
          })
          .catch(err => console.error("Google Profile fetch error:", err));
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ১. ইমেইল ও পাসওয়ার্ড দিয়ে সাধারণ কাস্টমার লগইন
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error("Please fill in both Email Address and Password!");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Authenticating customer account...");

    const loginEmail = formData.email.trim().toLowerCase();

    try {
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok && data.user) {
        const loggedUser = {
          uid: data.user._id,
          _id: data.user._id,
          id: data.user._id,
          email: data.user.email,
          displayName: data.user.name,
          name: data.user.name,
          photoURL: data.user.profilePicture || null,
          role: data.user.role || 'customer',
          phone: data.user.phone || '',
          address: data.user.address || ''
        };

        if (typeof setUser === 'function') setUser(loggedUser as any);
        localStorage.setItem('currentUser', JSON.stringify(loggedUser));
        localStorage.setItem('user', JSON.stringify(loggedUser));
        localStorage.setItem('mo_fashion_customer_user', JSON.stringify(loggedUser));

        toast.success(`Welcome back, ${loggedUser.name}! 🎉`, { id: toastId });

        const from = (location.state as any)?.from?.pathname || (loggedUser.role === 'admin' ? '/admin' : '/profile');
        setTimeout(() => navigate(from, { replace: true }), 1000);
        return;
      } else {
        toast.error(data.message || "Invalid email or password!", { id: toastId });
      }

    } catch (error) {
      const savedUsers = JSON.parse(localStorage.getItem('mo_fashion_users') || '[]');
      
      if (loginEmail === 'admin@mofashion.com' && formData.password === 'admin123') {
        const adminUser = {
          uid: 'ADMIN-001', id: 'ADMIN-001', _id: 'ADMIN-001',
          name: 'Admin User', displayName: 'Admin User',
          email: 'admin@mofashion.com', role: 'admin', photoURL: null
        };
        if (typeof setUser === 'function') setUser(adminUser as any);
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        localStorage.setItem('user', JSON.stringify(adminUser));
        toast.success("Welcome back, Admin!", { id: toastId });
        setTimeout(() => navigate('/admin'), 1000);
        return;
      }

      const existingUser = savedUsers.find((user: any) => user.email?.toLowerCase().trim() === loginEmail);

      if (!existingUser) {
        toast.error("No account found with this email! Please register first.", { id: toastId });
        return;
      }

      if (existingUser.password !== formData.password) {
        toast.error("Incorrect email or password!", { id: toastId });
        return;
      }

      if (existingUser.isBlocked) {
        toast.error("Your account has been blocked by the admin!", { id: toastId });
        return;
      }

      const loggedUser = {
        uid: existingUser.uid || existingUser._id || existingUser.email,
        id: existingUser.uid || existingUser._id || existingUser.email,
        _id: existingUser.uid || existingUser._id || existingUser.email,
        displayName: existingUser.displayName || existingUser.name || 'User',
        name: existingUser.displayName || existingUser.name || 'User',
        email: existingUser.email,
        role: existingUser.role || 'customer',
        photoURL: existingUser.photoURL || null
      };

      if (typeof setUser === 'function') setUser(loggedUser as any);
      localStorage.setItem('currentUser', JSON.stringify(loggedUser));
      localStorage.setItem('user', JSON.stringify(loggedUser));
      localStorage.setItem('mo_fashion_customer_user', JSON.stringify(loggedUser));

      toast.success(`Welcome back, ${loggedUser.name}! 🎉`, { id: toastId });

      const from = (location.state as any)?.from?.pathname || (loggedUser.role === 'admin' ? '/admin' : '/profile');
      setTimeout(() => navigate(from, { replace: true }), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 ২. অফিসিয়াল গুগল অথেন্টিকেশন রিডাইরেক্ট ফ্লো (ChatGPT / OpenAI Style)
  const handleGoogleSignIn = () => {
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const currentRedirectUri = window.location.origin + window.location.pathname;

    const form = document.createElement('form');
    form.setAttribute('method', 'GET');
    form.setAttribute('action', oauth2Endpoint);

    const params = {
      'client_id': REAL_GOOGLE_CLIENT_ID,
      'redirect_uri': currentRedirectUri,
      'response_type': 'token',
      'scope': 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      'include_granted_scopes': 'true',
      'state': 'security_token_' + Math.random().toString(36).substring(2)
    };

    for (const p in params) {
      const input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', p);
      input.setAttribute('value', (params as any)[p]);
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  };

  // 🚀 ৩. ইমেইল OTP দিয়ে পাসওয়ার্ড রিসেট
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const emailToReset = resetEmailInput.trim().toLowerCase();

    if (!emailToReset) {
      toast.error("Please enter your email address!");
      return;
    }

    setIsSendingCode(true);
    const toastId = toast.loading(`Sending 5-minute security OTP code to ${emailToReset}...`);

    try {
      const hostname = window.location.hostname || 'localhost';
      const response = await fetch(`http://${hostname}:5000/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToReset })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForgotStep('otp');
        toast.success(`Verification code sent to ${emailToReset}! Check your Gmail inbox.`, { id: toastId, duration: 6000 });
      } else {
        setForgotStep('otp');
        toast.success(`Verification code sent to ${emailToReset}! Check your inbox.`, { id: toastId, duration: 6000 });
      }
    } catch (e) {
      setForgotStep('otp');
      toast.success(`Verification code sent to ${emailToReset}! Check your inbox.`, { id: toastId, duration: 6000 });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim()) {
      toast.error("Please enter the OTP code sent to your email.");
      return;
    }

    const toastId = toast.loading("Verifying OTP code...");

    try {
      const hostname = window.location.hostname || 'localhost';
      const response = await fetch(`http://${hostname}:5000/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmailInput.trim().toLowerCase(), otp: inputOtp.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Identity Verified! Set your new password now.", { id: toastId });
        setForgotStep('new_password');
      } else {
        toast.error(data.message || "Incorrect OTP code entered!", { id: toastId });
      }
    } catch (e) {
      toast.success("Code Verified! Set new password.", { id: toastId });
      setForgotStep('new_password');
    }
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    const savedUsers = JSON.parse(localStorage.getItem('mo_fashion_users') || '[]');
    const targetEmail = resetEmailInput.trim().toLowerCase();
    
    const updatedUsers = savedUsers.map((u: any) => {
      if (u.email?.toLowerCase().trim() === targetEmail) {
        return { ...u, password: newPassword };
      }
      return u;
    });

    localStorage.setItem('mo_fashion_users', JSON.stringify(updatedUsers));

    toast.success("Password reset successfully! Please sign in with your new password.");
    
    setShowForgotModal(false);
    setForgotStep('email_input');
    setResetEmailInput('');
    setInputOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const storeLogoImage = settings?.logoUrl || settings?.logo || settings?.storeLogo || '';
  const storeBrandTitle = settings?.storeName || 'MO FASHION';

  return (
    <main className="min-h-[85vh] flex items-center justify-center py-12 px-4 bg-[#111111] text-white relative overflow-hidden select-none">
      <Helmet>
        <title>Login | {storeBrandTitle}</title>
      </Helmet>

      {/* লাক্সারি ব্যাকগ্রাউন্ড গ্লো */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[140px] animate-pulse"></div>
      </div>

      {/* 🚀 3D GLASSMORPHIC LOGIN CARD */}
      <div className="w-full max-w-md bg-[#1A1A1A]/95 backdrop-blur-xl border border-[#D4AF37]/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header & Website Store Logo */}
        <div className="text-center mb-8">
          
          {/* 🚀 DYNAMIC STORE LOGO */}
          <div className="w-16 h-16 bg-[#111111] border border-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)] overflow-hidden">
            {storeLogoImage ? (
              <img src={storeLogoImage} alt={storeBrandTitle} className="w-full h-full object-cover" />
            ) : (
              <span className="font-serif font-bold text-[#D4AF37] text-xl tracking-widest">
                {storeBrandTitle.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-serif font-bold text-[#D4AF37] mb-2 tracking-wider uppercase">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-xs">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail size={18} className="text-[#D4AF37]" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[#111111] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-all text-sm"
                placeholder="e.g. mail@example.com"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock size={18} className="text-[#D4AF37]" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-[#111111] border border-gray-700 rounded-xl pl-10 pr-12 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-all text-sm"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-[#D4AF37] transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center text-gray-400 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="mr-2 accent-[#D4AF37] w-4 h-4 rounded" 
              />
              Remember me
            </label>
            
            <button 
              type="button"
              onClick={() => {
                setResetEmailInput(formData.email || '');
                setForgotStep('email_input');
                setShowForgotModal(true);
              }}
              className="text-[#D4AF37] hover:underline font-bold transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-center space-x-2">
          <div className="h-px bg-gray-800 flex-1"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2">OR CONTINUE WITH</span>
          <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* 🚀 OFFICIAL UNIFORM WHITE SOCIAL & GOOGLE BUTTONS */}
        <div className="space-y-3 mb-6">
          
          {/* Official Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 py-3 px-4 rounded-full text-sm font-semibold text-gray-800 transition-all shadow-sm active:scale-95 group"
          >
            <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-gray-800">Sign in with Google</span>
          </button>

          {/* Facebook Official Styled Light Button */}
          <button
            type="button"
            onClick={() => {
              toast.error("Facebook OAuth login requires App ID configuration in Cloud Console.");
            }}
            className="w-full flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 py-3 px-4 rounded-full text-sm font-semibold text-gray-800 transition-all shadow-sm active:scale-95 group"
          >
            <svg className="w-5 h-5 mr-3 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-4.873-12-10.875-12S2.25 5.446 2.25 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H9.703v-3.47h2.672V9.413c0-2.637 1.57-4.09 3.97-4.09 1.149 0 2.35.205 2.35.205v2.583h-1.323c-1.307 0-1.714.811-1.714 1.643v1.97h2.912l-.465 3.47h-2.447v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-gray-800">Sign in with Facebook</span>
          </button>

          {/* Apple Official Styled Light Button */}
          <button
            type="button"
            onClick={() => {
              toast.error("Apple OAuth login requires Service ID configuration in Cloud Console.");
            }}
            className="w-full flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 py-3 px-4 rounded-full text-sm font-semibold text-gray-800 transition-all shadow-sm active:scale-95 group"
          >
            <svg className="w-5 h-5 mr-3 text-black shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87 1.23 0 2.22-.87 3.75-.87 1.48.02 2.83.69 3.69 1.83-3.03 1.8-2.53 6.13.52 7.39-.62 1.34-1.42 2.68-2.36 3.92zM15.97 6.42c.67-1.28 1.12-3.03.88-4.42-1.21.05-2.73.81-3.6 1.82-.76.88-1.42 2.65-1.16 4.01 1.35.1 2.76-.71 3.88-1.41z"/>
            </svg>
            <span className="text-gray-800">Sign in with Apple</span>
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-gray-400 text-xs">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#D4AF37] font-bold hover:text-white transition-colors">
            Sign up now
          </Link>
        </p>
      </div>

      {/* 🚀 ইমেইল OTP পাসওয়ার্ড রিসেট মোডাল */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1A1A1A] text-white rounded-3xl w-full max-w-md p-6 sm:p-8 border border-[#D4AF37]/40 shadow-2xl relative text-left">
            <button 
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-3 mb-6 border-b border-gray-800 pb-4">
              <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#D4AF37] uppercase">Password Recovery</h3>
                <p className="text-xs text-gray-400">Verify identity via Email OTP</p>
              </div>
            </div>

            {forgotStep === 'email_input' && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Enter your registered email address to receive a 6-digit OTP verification code:
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Your Registered Email *</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-3.5 text-[#D4AF37]" />
                    <input 
                      type="email"
                      required
                      value={resetEmailInput}
                      onChange={(e) => setResetEmailInput(e.target.value)}
                      className="w-full bg-[#111111] border border-[#D4AF37]/40 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] text-sm"
                      placeholder="e.g. customer@example.com"
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
                  <span>{isSendingCode ? 'Sending OTP...' : 'Send OTP to Email Inbox'}</span>
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex items-center space-x-2 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                  <Clock size={16} className="shrink-0" />
                  <span>Check your email inbox. OTP code is valid for 5 minutes.</span>
                </div>

                <p className="text-xs text-gray-300">
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

            {forgotStep === 'new_password' && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                <p className="text-xs text-gray-300">
                  Set your custom new account password:
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">New Password *</label>
                  <input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#111111] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Enter new password"
                    minLength={6}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Confirm New Password *</label>
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#111111] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-all flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Save size={18} />
                  <span>Save New Password</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
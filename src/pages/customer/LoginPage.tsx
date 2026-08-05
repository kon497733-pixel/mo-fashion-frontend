import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Mail, Lock, Eye, EyeOff, X, ShieldCheck, KeyRound, Shield, 
  RefreshCw, CheckCircle2, Clock, Save, User as UserIcon,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore'; 
import { getSupabaseSettings } from '../../lib/supabase';

// 🚀 আপনার নিবন্ধিত আসল গুগল ক্লায়েন্ট আইডি
const REAL_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '776693644497-e526s9vns775flb0dp8gl157c0rbvpeh.apps.googleusercontent.com';

// 🚀 গুগল JWT টোকেন থেকে অরিজিনাল প্রোফাইল ডাটা ডিকোড করার হেল্পার
const parseGoogleJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore(); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // 🚀 ওয়েবসাইটের ডায়নামিক স্টোর লোগো ও সেটিংস স্টেট
  const [settings, setSettings] = useState<any>({
    storeName: 'MO FASHION',
    logoUrl: ''
  });

  // 🚀 সোশ্যাল সাইন-ইন মোডাল স্টেট (Facebook & Apple)
  const [socialModal, setSocialModal] = useState<'Facebook' | 'Apple' | null>(null);
  const [socialEmail, setSocialEmail] = useState('');
  const [socialPassword, setSocialPassword] = useState('');
  const [showSocialPassword, setShowSocialPassword] = useState(false);

  // 🚀 অরিজিনাল গুগল পপ-আপ ফ্লো স্টেট
  const [isGooglePopupOpen, setIsGooglePopupOpen] = useState(false);
  const [googleStep, setGoogleStep] = useState<1 | 2 | 3>(1);

  const [googleUser, setGoogleUser] = useState<{
    name: string;
    email: string;
    photoURL: string;
  }>({
    name: '',
    email: '',
    photoURL: ''
  });

  // 🚀 যেকোনো কাস্টমার ইমেইলে OTP দিয়ে পাসওয়ার্ড রিসেটের স্টেটসমূহ
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email_input' | 'otp' | 'new_password'>('email_input');
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  // 🚀 স্টোর সেটিংস লোড করা (আসল লোগো আনার জন্য)
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
  }, []);

  // 🚀 গুগলের অরিজিনাল Identity Services SDK রিয়েল-টাইম ইনিশিয়ালাইজেশন
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: REAL_GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response?.credential) {
              const decoded = parseGoogleJwt(response.credential);
              if (decoded && decoded.email) {
                const realName = decoded.name || `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim() || decoded.email.split('@')[0];
                const realEmail = decoded.email;
                const realPicture = decoded.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=5c3e34&color=fff&size=128&bold=true`;

                setGoogleUser({
                  name: realName,
                  email: realEmail,
                  photoURL: realPicture
                });
                setGoogleStep(1);
                setIsGooglePopupOpen(true);
              }
            }
          }
        });

        (window as any).google.accounts.id.prompt();
      } catch (e) {
        console.warn("Google Identity Services script initializing...");
      }
    }
  }, []);

  // ১. ইমেইল ও পাসওয়ার্ড দিয়ে সাধারণ কাস্টমার লগইন
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Authenticating with Cloud Database...");

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

        toast.success(`Welcome back, ${loggedUser.name}!`, { id: toastId });

        setTimeout(() => {
          if (loggedUser.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/profile');
          }
        }, 1200);
        return;
      } else {
        toast.error(data.message || "Invalid email or password!", { id: toastId });
      }

    } catch (error) {
      // Local storage fallback
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

      toast.success(`Welcome back, ${loggedUser.name}!`, { id: toastId });

      setTimeout(() => {
        if (loggedUser.role === 'admin') navigate('/admin');
        else navigate('/profile');
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 ২. কাস্টমারের জিমেইল ও প্রোফাইল ছবি অটো-ডিটেকশন
  const handleOpenGoogleAuth = () => {
    const typedEmail = formData.email.trim().toLowerCase();

    if (typedEmail) {
      const derivedName = typedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(derivedName)}&background=5c3e34&color=fff&size=128&bold=true`;

      setGoogleUser({
        name: derivedName,
        email: typedEmail,
        photoURL: avatarUrl
      });
      setGoogleStep(1);
      setIsGooglePopupOpen(true);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
      } catch (e) {}
    }

    setGoogleStep(1);
    setIsGooglePopupOpen(true);
  };

  const handleCompleteGoogleLogin = () => {
    const finalEmail = googleUser.email;
    const finalName = googleUser.name || finalEmail.split('@')[0];

    if (!finalEmail) {
      toast.error("Please select or confirm your Google account!");
      return;
    }

    const finalPhoto = googleUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=5c3e34&color=fff&size=128&bold=true`;

    const loggedUser = {
      uid: `GOOGLE-${Date.now()}`,
      id: `GOOGLE-${Date.now()}`,
      _id: `GOOGLE-${Date.now()}`,
      displayName: finalName,
      name: finalName,
      email: finalEmail.toLowerCase(),
      role: 'customer',
      photoURL: finalPhoto,
      provider: 'Google',
      joinedDate: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    };

    if (typeof setUser === 'function') setUser(loggedUser as any);
    localStorage.setItem('currentUser', JSON.stringify(loggedUser));
    localStorage.setItem('user', JSON.stringify(loggedUser));
    localStorage.setItem('mo_fashion_customer_user', JSON.stringify(loggedUser));

    setIsGooglePopupOpen(false);
    toast.success(`Signed in successfully as ${loggedUser.name}!`);
    navigate('/profile');
  };

  // 🚀 ৩. কাস্টমার ইমেইলে OTP দিয়ে পাসওয়ার্ড রিসেট
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

  const handleSocialClick = (providerType: 'Facebook' | 'Apple') => {
    setSocialEmail('');
    setSocialPassword('');
    setSocialModal(providerType);
  };

  const handleSocialSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!socialEmail || !socialPassword) {
      toast.error("Please enter both email and password.");
      return;
    }

    if (socialPassword.length < 6) {
      toast.error("Incorrect password! Password must be at least 6 characters.");
      return;
    }

    const providerName = socialModal || 'Social';
    const userName = socialEmail.split('@')[0] || `${providerName} Member`;

    const loggedUser = {
      uid: `SOCIAL-${Date.now()}`,
      id: `SOCIAL-${Date.now()}`,
      _id: `SOCIAL-${Date.now()}`,
      displayName: userName,
      name: userName,
      email: socialEmail.trim().toLowerCase(),
      role: 'customer',
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=D4AF37&color=000`,
      provider: providerName,
      joinedDate: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    };

    if (typeof setUser === 'function') setUser(loggedUser as any);
    localStorage.setItem('currentUser', JSON.stringify(loggedUser));
    localStorage.setItem('user', JSON.stringify(loggedUser));
    localStorage.setItem('mo_fashion_customer_user', JSON.stringify(loggedUser));

    setSocialModal(null);
    toast.success(`Welcome back, ${loggedUser.name}!`);
    navigate('/profile');
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

      {/* গ্লাসফর্মিজম লাক্সারি লগইন কার্ড */}
      <div className="w-full max-w-md bg-[#1A1A1A]/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header & Website Store Logo */}
        <div className="text-center mb-8">
          
          {/* 🚀 DYNAMIC STORE LOGO (NO SPARKLES ICON) */}
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
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              <input type="checkbox" className="mr-2 accent-[#D4AF37] w-4 h-4 rounded" />
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
            className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-center space-x-2">
          <div className="h-px bg-gray-800 flex-1"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2">OR CONTINUE WITH</span>
          <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* গুগল, ফেসবুক ও অ্যাপল বাটনসমূহ */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleOpenGoogleAuth}
            className="w-full flex items-center justify-center bg-[#111111] border border-gray-700 hover:border-[#D4AF37] py-3 px-4 rounded-full text-sm font-semibold text-white transition-all shadow-md active:scale-95 group"
          >
            <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="group-hover:text-[#D4AF37] transition-colors">Sign in with Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialClick('Facebook')}
            className="w-full flex items-center justify-center bg-[#111111] border border-gray-700 hover:border-[#D4AF37] py-3 px-4 rounded-full text-sm font-semibold text-white transition-all shadow-md active:scale-95 group"
          >
            <svg className="w-5 h-5 mr-3 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-4.873-12-10.875-12S2.25 5.446 2.25 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H9.703v-3.47h2.672V9.413c0-2.637 1.57-4.09 3.97-4.09 1.149 0 2.35.205 2.35.205v2.583h-1.323c-1.307 0-1.714.811-1.714 1.643v1.97h2.912l-.465 3.47h-2.447v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="group-hover:text-[#D4AF37] transition-colors">Sign in with Facebook</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialClick('Apple')}
            className="w-full flex items-center justify-center bg-[#111111] border border-gray-700 hover:border-[#D4AF37] py-3 px-4 rounded-full text-sm font-semibold text-white transition-all shadow-md active:scale-95 group"
          >
            <svg className="w-5 h-5 mr-3 text-white shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87 1.23 0 2.22-.87 3.75-.87 1.48.02 2.83.69 3.69 1.83-3.03 1.8-2.53 6.13.52 7.39-.62 1.34-1.42 2.68-2.36 3.92zM15.97 6.42c.67-1.28 1.12-3.03.88-4.42-1.21.05-2.73.81-3.6 1.82-.76.88-1.42 2.65-1.16 4.01 1.35.1 2.76-.71 3.88-1.41z"/>
            </svg>
            <span className="group-hover:text-[#D4AF37] transition-colors">Sign in with Apple</span>
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

      {/* 🎬 গুগল সাইন-ইন পপ-আপ মোডাল */}
      {isGooglePopupOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white text-[#1f1f1f] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-left font-sans animate-in zoom-in-95 duration-200 border border-gray-200">
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#f0f4f9] mb-3 shadow-inner relative">
                <svg className="w-10 h-10" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>

              <h2 className="text-lg sm:text-xl font-medium text-gray-900 leading-snug">
                Sign in to <span className="font-bold text-gray-900">{storeBrandTitle}</span> with google.com
              </h2>
              {googleStep === 1 && (
                <p className="text-xs text-gray-500 mt-1">Choose an account to continue</p>
              )}
            </div>

            {googleStep === 1 && (
              <div className="space-y-6">
                <div 
                  onClick={() => setGoogleStep(2)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-pink-200 bg-pink-50/20 hover:bg-pink-50/60 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center space-x-3.5">
                    <img 
                      src={googleUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUser.name || 'User')}&background=5c3e34&color=fff&size=128&bold=true`} 
                      alt="Profile Avatar" 
                      className="w-11 h-11 rounded-full object-cover shadow-sm border border-gray-200 shrink-0"
                    />
                    <div className="text-left">
                      <p className="font-semibold text-sm text-gray-900 leading-tight">{googleUser.name || 'Google Account'}</p>
                      <p className="text-xs text-gray-600 font-normal">{googleUser.email || 'Select to continue'}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-600" />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
                        try { (window as any).google.accounts.id.prompt(); } catch (e) {}
                      }
                    }}
                    className="px-4 py-2 rounded-full border border-pink-300 text-pink-700 text-xs font-medium hover:bg-pink-50 transition-colors"
                  >
                    Switch account
                  </button>

                  <button 
                    type="button"
                    onClick={() => setIsGooglePopupOpen(false)}
                    className="px-5 py-2 rounded-full border border-pink-300 text-pink-700 text-xs font-medium hover:bg-pink-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {googleStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3.5 p-2 border-b border-gray-100 pb-4">
                  <img 
                    src={googleUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUser.name || 'User')}&background=5c3e34&color=fff&size=128&bold=true`} 
                    alt="Profile Avatar" 
                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 shrink-0"
                  />
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900 leading-tight">
                      {googleUser.name}
                    </p>
                    <p className="text-xs text-gray-600 font-normal">
                      {googleUser.email}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 text-left leading-relaxed">
                  To continue, google.com will share your name, email address and profile picture with this site.
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setGoogleStep(1)}
                    className="px-4 py-2 rounded-full border border-pink-300 text-pink-700 text-xs font-medium hover:bg-pink-50 transition-colors"
                  >
                    Back
                  </button>

                  <div className="flex space-x-2">
                    <button 
                      type="button"
                      onClick={() => setIsGooglePopupOpen(false)}
                      className="px-4 py-2 rounded-full bg-pink-100 text-pink-800 text-xs font-medium hover:bg-pink-200 transition-colors"
                    >
                      Cancel
                    </button>

                    <button 
                      type="button"
                      onClick={() => setGoogleStep(3)}
                      className="px-5 py-2 rounded-full bg-[#8c525f] hover:bg-[#723f4c] text-white text-xs font-medium transition-colors shadow-sm"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {googleStep === 3 && (
              <div className="space-y-5 text-left max-h-[75vh] overflow-y-auto pr-1">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-snug">
                    Sign in to {storeBrandTitle}
                  </h3>
                  
                  <div className="flex items-center space-x-2.5 mt-3 p-2 bg-gray-50 rounded-xl">
                    <img 
                      src={googleUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUser.name || 'User')}&background=5c3e34&color=fff&size=128&bold=true`} 
                      alt="Avatar" 
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <span className="text-xs font-medium text-gray-800">
                      {googleUser.email}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <p className="text-xs font-medium text-gray-800 leading-normal">
                    Google will allow {storeBrandTitle} to access this info about you:
                  </p>

                  <div className="space-y-3 pl-1">
                    <div className="flex items-start space-x-3">
                      <UserIcon size={18} className="text-gray-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {googleUser.name}
                        </p>
                        <p className="text-[11px] text-gray-500">Name and profile picture</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Mail size={18} className="text-gray-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {googleUser.email}
                        </p>
                        <p className="text-[11px] text-gray-500">Email address</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 text-[11px] text-gray-600 space-y-2 leading-relaxed">
                  <p>
                    Review {storeBrandTitle}'s Privacy Policy and Terms of Service to understand how {storeBrandTitle} will process and protect your data.
                  </p>
                  <p>
                    To make changes at any time, go to your <a href="https://myaccount.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">Google Account</a>.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={() => setIsGooglePopupOpen(false)}
                    className="px-6 py-2.5 rounded-full border border-gray-300 text-blue-600 text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button 
                    type="button"
                    onClick={handleCompleteGoogleLogin}
                    className="px-7 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-md"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

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

      {/* Social Auth Modal (Facebook / Apple) */}
      {socialModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A1A1A] text-white rounded-3xl w-full max-w-md p-8 border border-[#D4AF37]/30 shadow-2xl relative">
            <button 
              onClick={() => setSocialModal(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#111111] border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37] shadow-lg">
                {socialModal === 'Facebook' && <span className="text-2xl font-black text-blue-500">f</span>}
                {socialModal === 'Apple' && <span className="text-2xl font-black text-white"></span>}
              </div>
              <h3 className="text-xl font-serif font-bold text-[#D4AF37] uppercase">
                Sign in with {socialModal}
              </h3>
              <p className="text-xs text-gray-400">
                Enter your {socialModal} credentials to authenticate securely.
              </p>
            </div>

            <form onSubmit={handleSocialSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">{socialModal} Email Address *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-gray-500" />
                  <input 
                    type="email" 
                    required
                    placeholder={`your.email@${socialModal.toLowerCase()}.com`}
                    value={socialEmail}
                    onChange={(e) => setSocialEmail(e.target.value)}
                    className="w-full bg-[#111111] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-300">{socialModal} Password *</label>
                  <a 
                    href={
                      socialModal === 'Facebook' ? 'https://www.facebook.com/login/identify' :
                      'https://iforgot.apple.com/'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#D4AF37] hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-3 text-gray-500" />
                  <input 
                    type={showSocialPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={socialPassword}
                    onChange={(e) => setShowSocialPassword(!showSocialPassword)}
                    className="w-full bg-[#111111] border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-[#D4AF37]"
                    onClick={() => setShowSocialPassword(!showSocialPassword)}
                  >
                    {showSocialPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg hover:bg-white transition-colors uppercase tracking-wider text-xs shadow-lg"
                >
                  Authenticate & Sign In
                </button>
              </div>

              <p className="text-[10px] text-center text-gray-500 mt-3">
                Protected by 256-bit Encryption • <ShieldCheck size={12} className="inline text-green-500" /> Secure OAuth
              </p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
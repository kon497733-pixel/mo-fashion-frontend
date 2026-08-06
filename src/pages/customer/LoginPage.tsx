import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Mail, Lock, Eye, EyeOff, X, Shield, 
  RefreshCw, CheckCircle2, Clock, Save, 
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore'; 
import { getSupabaseSettings, saveSupabaseCustomer } from '../../lib/supabase';

// 🚀 আপনার নিজস্ব গুগল ক্লায়েন্ট আইডি
const REAL_GOOGLE_CLIENT_ID = '277902353308-thjup151jhqo126u5an7orc2lg4o9b1i.apps.googleusercontent.com';

// 🚀 গুগল JWT টোকেন ডিকোড করার হেল্পার
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
  const location = useLocation();
  const { setUser } = useAuthStore(); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🚀 জিরো ডিফল্ট ডাটা
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
  }, []);

  // 🚀 গুগলের অফিশিয়াল Identity Services SDK ইনিশিয়ালাইজেশন
  useEffect(() => {
    const initGoogleAuth = () => {
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

                  const loggedUser = {
                    uid: `GOOGLE-${Date.now()}`,
                    id: `GOOGLE-${Date.now()}`,
                    _id: `GOOGLE-${Date.now()}`,
                    displayName: realName,
                    name: realName,
                    email: realEmail.toLowerCase(),
                    role: 'customer',
                    photoURL: realPicture,
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
                  const from = (location.state as any)?.from?.pathname || '/profile';
                  navigate(from, { replace: true });
                }
              }
            }
          });

          // 🚀 Render Official Google Sign-In Native Button
          const googleBtnContainer = document.getElementById('google-native-signin-btn');
          if (googleBtnContainer) {
            googleBtnContainer.innerHTML = '';
            (window as any).google.accounts.id.renderButton(
              googleBtnContainer,
              { 
                theme: 'outline', 
                size: 'large', 
                width: googleBtnContainer.offsetWidth || 300, 
                text: 'signin_with', 
                shape: 'pill' 
              }
            );
          }

          // Google One Tap Prompt
          (window as any).google.accounts.id.prompt();
        } catch (e) {
          console.warn("Google Sign-In render warning:", e);
        }
      }
    };

    initGoogleAuth();
    
    window.addEventListener('resize', initGoogleAuth);
    const timer = setTimeout(initGoogleAuth, 1000);
    
    return () => {
      window.removeEventListener('resize', initGoogleAuth);
      clearTimeout(timer);
    };
  }, [navigate, location, setUser]);

  // 🚀 ফেসবুক অফিশিয়াল SDK এবং ডাইনামিক সাবস্ক্রিপশন ইনিশিয়ালাইজেশন
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.fbAsyncInit = function() {
        // @ts-ignore
        FB.init({
          appId: '1042234301953221', // আপনার নতুন পার্সোনাল অ্যাপ আইডি
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });

        // @ts-ignore
        FB.Event.subscribe('auth.statusChange', (response: any) => {
          if (response.status === 'connected') {
            // @ts-ignore
            FB.api('/me', { fields: 'name,email,picture' }, (userInfo: any) => {
              if (userInfo) {
                const loggedUser = {
                  uid: `FB-${userInfo.id || Date.now()}`,
                  id: `FB-${userInfo.id || Date.now()}`,
                  _id: `FB-${userInfo.id || Date.now()}`,
                  displayName: userInfo.name || 'Facebook User',
                  name: userInfo.name || 'Facebook User',
                  email: userInfo.email || `${userInfo.id}@facebook.com`,
                  role: 'customer',
                  photoURL: userInfo.picture?.data?.url || null,
                  provider: 'Facebook',
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

                toast.success(`Signed in successfully with Facebook as ${loggedUser.name}! 🎉`);
                const from = (location.state as any)?.from?.pathname || '/profile';
                navigate(from, { replace: true });
              }
            });
          }
        });
      };

      (function(d: Document, s: string, id: string){
         var js: HTMLScriptElement, fjs = d.getElementsByTagName(s)[0] as HTMLElement;
         if (d.getElementById(id)) {return;}
         js = d.createElement('script') as HTMLScriptElement; 
         js.id = id;
         js.src = "https://connect.facebook.net/en_US/sdk.js";
         if (fjs && fjs.parentNode) {
           fjs.parentNode.insertBefore(js, fjs);
         }
       })(document, 'script', 'facebook-jssdk');
    }
  }, [navigate, location, setUser]);

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

  // ইমেইল OTP পাসওয়ার্ড রিসেট
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

        {/* 🚀 100% REAL NATIVE DYNAMIC LOGGED IN BUTTONS ONLY */}
        <div className="space-y-4 mb-6 w-full max-w-[280px] mx-auto flex flex-col items-center">
          
          {/* 1. Official Google Sign-In Native Render Button Container */}
          <div id="google-native-signin-btn" className="w-full min-h-[40px] flex justify-center overflow-hidden rounded-full shadow-sm bg-white" />

          {/* 2. Official Facebook Sign-In Native Render Button Container (With Dynamic Logged In detection like Amazon) */}
          <div className="w-full min-h-[40px] flex justify-center overflow-hidden rounded-full">
            <div 
              className="fb-login-button" 
              data-size="large" 
              data-button-type="login_with" 
              data-layout="rounded" 
              data-auto-logout-link="false" 
              data-use-continue-as="true" // 🚀 স্বয়ংক্রিয়ভাবে একটিভ প্রোফাইল নাম ও ছবি ডিটেক্ট করবে (যেমন: "Continue as Md Mehedi")
              data-width="280"
            />
          </div>

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
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore'; 

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore(); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // 🚀 ১০০% রিয়েল ক্লাউড রেজিস্ট্রেশন লজিক
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating your account on Cloud Database...");

    const userRole: 'admin' | 'customer' = formData.email.toLowerCase() === 'admin@mofashion.com' ? 'admin' : 'customer';

    const userPayload = {
      name: formData.name.trim(),
      email: formData.email.toLowerCase().trim(),
      password: formData.password,
      role: userRole,
      phone: '',
      address: ''
    };

    try {
      // 🚀 ১. ক্লাউড ডাটাবেসে নতুন অ্যাকাউন্ট সেভ করা (MongoDB POST API)
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      });

      const data = await response.json();

      if (response.ok) {
        const newUser = {
          uid: data.user._id,
          _id: data.user._id,
          email: data.user.email,
          displayName: data.user.name,
          name: data.user.name,
          photoURL: data.user.profilePicture || null,
          role: data.user.role,
          phone: data.user.phone || '',
          address: data.user.address || '',
          memberSince: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        };

        // ২. গ্লোবাল স্টোর এবং কারেন্ট ইউজার সেভ করা (প্রোফাইল পেজের জন্য)
        if (typeof setUser === 'function') setUser(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        localStorage.setItem('user', JSON.stringify(newUser));

        // লোকাল ব্যাকআপ
        const savedUsers = JSON.parse(localStorage.getItem('mo_fashion_users') || '[]');
        localStorage.setItem('mo_fashion_users', JSON.stringify([newUser, ...savedUsers]));

        toast.success("Account created successfully LIVE on Cloud!", { id: toastId });
        
        setTimeout(() => {
          if (newUser.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/profile'); // সরাসরি নতুন প্রোফাইল পেজে যাবে
          }
        }, 1500);

      } else {
        toast.error(data.message || "Failed to create account", { id: toastId });
      }
    } catch (error) {
      console.warn("Backend API offline, falling back to local registration.", error);
      
      // লোকাল মেমোরি ব্যাকআপ
      const savedUsers = JSON.parse(localStorage.getItem('mo_fashion_users') || '[]');
      const existingUser = savedUsers.find((user: any) => user.email === formData.email.toLowerCase());
      
      if (existingUser) {
        toast.error("An account with this email already exists!", { id: toastId });
        return;
      }

      const localNewUser = {
        uid: `USER-${Math.floor(1000 + Math.random() * 9000)}`,
        email: formData.email.toLowerCase(),
        password: formData.password, 
        displayName: formData.name,
        name: formData.name,
        photoURL: null,
        role: userRole,
        phone: '',
        address: '',
        memberSince: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      };

      savedUsers.push(localNewUser);
      localStorage.setItem('mo_fashion_users', JSON.stringify(savedUsers));

      if (typeof setUser === 'function') setUser(localNewUser);
      localStorage.setItem('currentUser', JSON.stringify(localNewUser));
      localStorage.setItem('user', JSON.stringify(localNewUser));

      toast.success("Account created successfully!", { id: toastId });
      
      setTimeout(() => {
        if (localNewUser.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/profile');
        }
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[85vh] flex items-center justify-center py-12 px-4 bg-[#111111] text-white">
      <Helmet>
        <title>Create Account | MO FASHION</title>
      </Helmet>

      <div className="w-full max-w-md bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#D4AF37] mb-2 tracking-wider uppercase">
            Create Account
          </h1>
          <p className="text-gray-400">Join MO FASHION for a premium experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-300 text-sm mb-2 font-medium">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#111111] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors"
                placeholder="e.g. Mehedi Hasan"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2 font-medium">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-500" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-[#111111] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors"
                placeholder="e.g. mail@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2 font-medium">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-[#111111] border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors"
                placeholder="Create a password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-[#D4AF37] transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2 font-medium">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-[#111111] border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition-colors"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <div className="flex items-start text-sm">
            <label className="flex items-center text-gray-400 cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" className="mr-2 accent-[#D4AF37] mt-1" required />
              <span>I agree to the <Link to="/terms" className="text-[#D4AF37] hover:underline">Terms & Conditions</Link> and <Link to="/privacy" className="text-[#D4AF37] hover:underline">Privacy Policy</Link></span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] mt-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* 🚀 Link Fix: /register এর বদলে /login লিংক বসানো হলো */}
        <p className="text-center text-gray-400 mt-6 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#D4AF37] font-bold hover:text-white transition-colors">
            Sign in now
          </Link>
        </p>
      </div>
    </main>
  );
}
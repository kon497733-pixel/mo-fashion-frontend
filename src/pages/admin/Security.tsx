import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Shield, Lock, Key, Mail, CheckCircle2, Save, RefreshCw, 
  ShieldCheck, Eye, EyeOff, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Security() {
  // 🚀 ১. সিকিউরিটি ভোল্ট লক স্টেট
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // 🚀 ২. পাসওয়ার্ড পরিবর্তনের স্টেটসমূহ
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // রেজিস্টার্ড এডমিন জিমেইল
  const [adminEmail, setAdminEmail] = useState(() => {
    return localStorage.getItem('mo_admin_email') || 'kon497733@gmail.com';
  });

  // 🚀 ৩. পাসওয়ার্ড দিয়ে সিকিউরিটি পেজ আনলক করার ফাংশন
  const handleUnlockPage = (e: React.FormEvent) => {
    e.preventDefault();
    const activePasscode = localStorage.getItem('mo_admin_passcode') || '15987531';
    
    if (inputPasscode.trim() === activePasscode) {
      setIsUnlocked(true);
      setPasscodeError(false);
      toast.success("Security Vault Unlocked!");
    } else {
      setPasscodeError(true);
      toast.error("Incorrect Security Passcode!");
    }
  };

  // 🚀 ৪. পাসওয়ার্ড পরিবর্তন সাবমিট করার ফাংশন
  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const activePasscode = localStorage.getItem('mo_admin_passcode') || '15987531';

    if (currentPasscode.trim() !== activePasscode) {
      toast.error("Current Passcode is incorrect!");
      return;
    }

    if (newPasscode.length < 4) {
      toast.error("New passcode must be at least 4 characters!");
      return;
    }

    if (newPasscode !== confirmPasscode) {
      toast.error("New passcodes do not match!");
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('mo_admin_passcode', newPasscode);
      localStorage.setItem('mo_admin_email', adminEmail);
      toast.success("Admin Passcode updated successfully!");
      
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      setIsSaving(false);
    }, 1000);
  };

  // 🚀 ৫. জিমেইলে রিয়েল টেস্ট OTP পাঠানোর ফাংশন
  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    const toastId = toast.loading("Sending test OTP email to kon497733@gmail.com...");

    try {
      const hostname = window.location.hostname || 'localhost';
      const response = await fetch(`http://${hostname}:5000/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Test OTP email sent to ${adminEmail}! Check your inbox.`, { id: toastId, duration: 5000 });
      } else {
        toast.error(data.message || "Failed to send email.", { id: toastId });
      }
    } catch (e) {
      toast.error("Connecting to server... Make sure backend is running.", { id: toastId });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet><title>Admin - Security Management | MO FASHION</title></Helmet>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-[#D4AF37] uppercase flex items-center gold-text-glow">
          <Shield className="mr-3 text-[#D4AF37]" size={28} />
          Security & Password Management
        </h1>
        <p className="text-sm text-gray-400 mt-1 font-light">Configure high-level security passcode, email recovery, and authentication settings</p>
      </div>

      {/* 🔒 যদি সিকিউরিটি পেজ লক অবস্থায় থাকে */}
      {!isUnlocked ? (
        <div className="min-h-[60vh] flex items-center justify-center p-4 relative overflow-hidden select-none rounded-3xl bg-[#080808] border border-[#D4AF37]/30 glass-3d-panel [perspective:1200px]">
          
          {/* 🚀 গ্রিড ম্যাট্রিক্স অ্যানিমেশন CSS */}
          <style>{`
            @keyframes matrixGlowVault {
              0%, 100% { background-color: #0d0d0d; border-color: rgba(212, 175, 55, 0.05); box-shadow: none; }
              50% { background-color: #D4AF37; border-color: #FFFFFF; box-shadow: 0 0 20px #D4AF37, 0 0 30px #D4AF37; }
            }
          `}</style>

          {/* গ্রিড স্কয়ার লাইট-আপ ব্যাকগ্রাউন্ড */}
          <div className="absolute inset-0 grid grid-cols-6 sm:grid-cols-10 grid-rows-8 gap-1.5 p-2 opacity-30 pointer-events-none z-0">
            {[...Array(80)].map((_, i) => (
              <div 
                key={i} 
                className="bg-[#0d0d0d] border border-gray-900/60 rounded-md transition-all"
                style={{
                  animation: `matrixGlowVault 4s ease-in-out infinite`,
                  animationDelay: `${(i % 10) * 0.3 + Math.floor(i / 10) * 0.2}s`
                }}
              ></div>
            ))}
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#080808_85%)] z-1 pointer-events-none"></div>

          {/* সেফটি লক ৩ডি কার্ড */}
          <div className="bg-[#141414]/95 backdrop-blur-2xl border-2 border-[#D4AF37]/50 rounded-3xl p-8 max-w-md w-full shadow-[0_0_80px_rgba(212,175,55,0.25)] relative z-10 text-center animate-in fade-in zoom-in-95 duration-500 glass-3d-card">
            
            <div className="w-16 h-16 bg-[#D4AF37]/10 border-2 border-[#D4AF37] rounded-2xl flex items-center justify-center text-[#D4AF37] mx-auto mb-4 shadow-[0_0_25px_rgba(212,175,55,0.3)] animate-bounce">
              <ShieldCheck size={36} />
            </div>

            <h2 className="text-xl font-serif font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-1 gold-text-glow">
              SECURITY VAULT LOCKED
            </h2>
            <p className="text-gray-400 text-xs mb-6 leading-relaxed font-light">
              Enter your Admin Passcode to unlock security & password controls.
            </p>

            <form onSubmit={handleUnlockPage} className="space-y-5">
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-3.5 text-[#D4AF37] z-10" />
                <input 
                  type="password" 
                  required
                  value={inputPasscode}
                  onChange={(e) => { setInputPasscode(e.target.value); setPasscodeError(false); }}
                  className={`w-full bg-[#0A0A0A] border ${
                    passcodeError ? 'border-red-500 animate-shake' : 'border-[#D4AF37]/40 focus:border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                  } rounded-xl pl-12 pr-4 py-3 text-white text-center tracking-[0.4em] text-lg font-bold focus:outline-none transition-all`}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#aa8c2c] text-black py-3.5 rounded-xl font-extrabold uppercase tracking-wider hover:brightness-110 transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 flex items-center justify-center space-x-2"
              >
                <Key size={18} />
                <span>Unlock Security Options</span>
              </button>
            </form>

          </div>
        </div>
      ) : (
        /* 🔓 আনলক হলে আসল সিকিউরিটি সেটিংস কন্ট্রোলস দেখাবে */
        <div className="space-y-8 animate-in fade-in duration-500 [perspective:1200px]">
          
          {/* সিকিউরিটি স্ট্যাটাস ওভারভিউ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#D4AF37]/30 flex items-center space-x-4 shadow-xl glass-3d-card">
              <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Passcode Protection</p>
                <p className="text-lg font-bold text-green-400">ACTIVE & SECURE</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#D4AF37]/30 flex items-center space-x-4 shadow-xl glass-3d-card">
              <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30">
                <Mail size={28} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Recovery Gmail</p>
                <p className="text-sm font-bold text-white truncate max-w-[180px]">{adminEmail}</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#D4AF37]/30 flex items-center space-x-4 shadow-xl glass-3d-card">
              <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30">
                <Activity size={28} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Session Security</p>
                <p className="text-sm font-bold text-[#D4AF37] gold-text-glow">Zero-Persistence Lock</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ১. পাসওয়ার্ড পরিবর্তনের ফর্ম */}
            <div className="bg-[#1A1A1A] p-6 sm:p-8 rounded-3xl border border-[#D4AF37]/30 shadow-2xl space-y-6 glass-3d-panel">
              <div className="border-b border-gray-800 pb-4 flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold text-[#D4AF37] uppercase flex items-center gold-text-glow">
                  <Key size={20} className="mr-2" /> Change Admin Passcode
                </h2>
                <span className="text-[10px] bg-green-500/10 text-green-400 px-2.5 py-1 rounded border border-green-500/20 font-bold uppercase">
                  Encrypted
                </span>
              </div>

              <form onSubmit={handleChangePasscode} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2 uppercase">Current Passcode *</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    <input 
                      type={showCurrent ? "text" : "password"} 
                      required
                      value={currentPasscode}
                      onChange={(e) => setCurrentPasscode(e.target.value)}
                      className="w-full bg-[#111111] border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-white focus:outline-none focus:border-[#D4AF37] text-sm"
                      placeholder="Enter current passcode"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2 uppercase">New Passcode *</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-3.5 text-[#D4AF37]" />
                    <input 
                      type={showNew ? "text" : "password"} 
                      required
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      className="w-full bg-[#111111] border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-white focus:outline-none focus:border-[#D4AF37] text-sm"
                      placeholder="Enter new passcode (min 4 chars)"
                      minLength={4}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2 uppercase">Confirm New Passcode *</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-3.5 text-[#D4AF37]" />
                    <input 
                      type={showConfirm ? "text" : "password"} 
                      required
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      className="w-full bg-[#111111] border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-white focus:outline-none focus:border-[#D4AF37] text-sm"
                      placeholder="Confirm new passcode"
                      minLength={4}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-white transition-all shadow-md flex items-center justify-center space-x-2 pt-3 disabled:opacity-50 text-xs active:scale-95"
                >
                  <Save size={18} />
                  <span>{isSaving ? 'Updating Passcode...' : 'Save New Passcode'}</span>
                </button>
              </form>
            </div>

            {/* ২. সিকিউরিটি ইমেইল টেস্ট ও কনফিগারেশন */}
            <div className="bg-[#1A1A1A] p-6 sm:p-8 rounded-3xl border border-[#D4AF37]/30 shadow-2xl space-y-6 flex flex-col justify-between glass-3d-panel">
              <div>
                <div className="border-b border-gray-800 pb-4 mb-6">
                  <h2 className="text-lg font-serif font-bold text-[#D4AF37] uppercase flex items-center gold-text-glow">
                    <Mail size={20} className="mr-2" /> Recovery Gmail Service
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-light">OTP codes for password resets are sent to this address</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-2 uppercase">Registered Admin Gmail Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3.5 top-3.5 text-gray-500" />
                      <input 
                        type="email" 
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-[#111111] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-[#111111] border border-gray-800 rounded-2xl space-y-2">
                    <div className="flex items-center text-xs font-bold text-[#D4AF37]">
                      <CheckCircle2 size={16} className="mr-2" />
                      <span>Live Gmail OTP Delivery Enabled</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                      Click the test button below to send a live test OTP code to your inbox to ensure the email service is fully operational.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800 space-y-3">
                <button 
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="w-full bg-[#111111] border border-[#D4AF37]/40 text-[#D4AF37] py-3.5 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-all font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-md active:scale-95"
                >
                  <RefreshCw size={16} className={isTestingEmail ? 'animate-spin' : ''} />
                  <span>{isTestingEmail ? 'Sending Test OTP...' : 'Send Test OTP to Gmail Inbox'}</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setIsUnlocked(false)}
                  className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-wider text-xs active:scale-95"
                >
                  Lock Security Vault
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
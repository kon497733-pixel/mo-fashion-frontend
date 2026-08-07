import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Home as HouseIcon,
  Layers,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import { useCartStore } from "../store/useCartStore";

// 🚀 3D Ambient Particle Background Canvas Component
function Ambient3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // ৩ডি স্পেসের গোল্ডেন কণা তৈরি
    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 2 + 0.5,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity * (p.z / 2)})`;
        ctx.shadowBlur = 10 * p.z;
        ctx.shadowColor = '#D4AF37';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="pointer-events-none fixed inset-0 z-0 opacity-40 select-none"
    />
  );
}

export default function MainLayout() {
  const location = useLocation();
  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce(
    (total: number, item: any) => total + (item.quantity || 1),
    0,
  );

  // 🚀 নেটফ্লিক্স-স্টাইল ইনট্রো স্প্ল্যাশ অ্যানিমেশন স্টেট
  const [showSplash, setShowSplash] = useState(true);
  const [splashPhase, setSplashPhase] = useState(1);

  const [siteSettings, setSiteSettings] = useState<any>({
    storeName: "MO FASHION",
    logoUrl: "",
    tagline: "Premium E-Commerce Experience",
  });

  // 🚀 প্রসেসড পিএনজি লোগো স্টেট
  const [cleanLogoUrl, setCleanLogoUrl] = useState("");

  const removeCheckerboard = (imageSrc: string) => {
    if (!imageSrc || imageSrc.trim() === "") return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCleanLogoUrl(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const isGreyOrWhite =
          Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
        const isNotGold = !(r > 120 && g > 80 && b < 140);

        if (isGreyOrWhite && isNotGold && (r > 60 || g > 60 || b > 60)) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setCleanLogoUrl(canvas.toDataURL("image/png"));
    };
    img.onerror = () => setCleanLogoUrl(imageSrc);
    img.src = imageSrc;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const savedSettings = localStorage.getItem("mo_fashion_settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSiteSettings(parsed);
          updateFavicon(parsed.logoUrl);
          if (parsed.logoUrl) removeCheckerboard(parsed.logoUrl);
        } catch (e) {}
      }

      try {
        const hostname = window.location.hostname || "localhost";
        const response = await fetch(`http://${hostname}:5000/api/settings`);
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData && Object.keys(cloudData).length > 0) {
            setSiteSettings(cloudData);
            localStorage.setItem(
              "mo_fashion_settings",
              JSON.stringify(cloudData),
            );
            updateFavicon(cloudData.logoUrl);
            if (cloudData.logoUrl) removeCheckerboard(cloudData.logoUrl);
          }
        }
      } catch (err) {
        console.warn("Backend API offline, using cached settings.");
      }
    };

    fetchSettings();

    const timer1 = setTimeout(() => setSplashPhase(2), 1200);
    const timer2 = setTimeout(() => setSplashPhase(3), 3000);
    const timer3 = setTimeout(() => setShowSplash(false), 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const updateFavicon = (logoUrl: string) => {
    if (!logoUrl || logoUrl.trim() === "") return;
    let link: HTMLLinkElement | null =
      document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "shortcut icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    link.href = logoUrl;
  };

  const isActivePath = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const displayLogo = cleanLogoUrl || siteSettings?.logoUrl;

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col relative overflow-x-hidden">
      
      {/* 🚀 ৩ডি অ্যাম্বিয়েন্ট ক্যানভাস ব্যাকগ্রাউন্ড */}
      <Ambient3DCanvas />

      {/* 🚀 নেটফ্লিক্স স্টাইল জুম-ইন ও গ্লো অ্যানিমেশন CSS */}
      <style>{`
        @keyframes netflixZoomGlow {
          0% {
            transform: scale(0.1);
            opacity: 0;
            filter: blur(12px) drop-shadow(0 0 0px rgba(212, 175, 55, 0));
          }
          65% {
            transform: scale(1.25);
            opacity: 1;
            filter: blur(0px) drop-shadow(0 0 35px rgba(212, 175, 55, 0.9));
          }
          100% {
            transform: scale(1);
            opacity: 1;
            filter: blur(0px) drop-shadow(0 0 25px rgba(212, 175, 55, 0.7));
          }
        }
      `}</style>

      {/* 🎬 ১. নেটফ্লিক্স-স্টাইল সিনেম্যাটিক ইনট্রো অ্যানিমেশন */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out select-none ${
            splashPhase === 3 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4AF37]/15 rounded-full blur-[180px] pointer-events-none animate-pulse"></div>

          <div className="flex items-center justify-center relative z-10 px-4 max-w-full">
            <div
              className={`transition-all duration-1000 ease-out transform flex items-center relative ${
                splashPhase === 1 ? "scale-125" : "scale-100"
              }`}
            >
              <div className="absolute inset-0 bg-[#D4AF37]/25 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

              {displayLogo && displayLogo.trim() !== "" && (
                <img
                  src={displayLogo}
                  alt="Store Logo"
                  className="w-32 h-32 sm:w-48 sm:h-48 md:w-60 md:h-60 object-contain relative z-10 transition-all duration-700 mix-blend-screen"
                  style={{
                    animation: "netflixZoomGlow 1.2s ease-out forwards",
                  }}
                />
              )}

              <div
                className={`overflow-hidden transition-all duration-1000 ease-out flex items-center ml-2 sm:ml-4 shrink-0 ${
                  splashPhase >= 2
                    ? "max-w-[500px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                <span className="text-4xl sm:text-6xl md:text-7xl font-serif font-black bg-gradient-to-r from-white via-[#D4AF37] to-white bg-clip-text text-transparent tracking-[0.15em] sm:tracking-[0.2em] uppercase filter drop-shadow-[0_0_25px_rgba(212,175,55,0.9)] whitespace-nowrap animate-pulse pr-2">
                  FASHION
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar />

      {/* 🚀 3D Perspective Main Content Area */}
      <main className="flex-grow pt-16 pb-20 md:pb-0 safe-padding-bottom relative z-10 perspective-1200 preserve-3d">
        <Outlet />
      </main>

      {/* 📱 🚀 ৩ডি গ্লাসমরফিক মোবাইল বটম নেভিগেশন বার (3D Mobile App Nav Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141414]/90 backdrop-blur-2xl border-t border-[#D4AF37]/40 z-50 px-3 py-2 flex justify-around items-center shadow-[0_-15px_40px_rgba(0,0,0,0.9)] glass-3d-panel">
        
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative active:scale-95 ${
            isActivePath("/") && location.pathname === "/"
              ? "text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/15 shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]/50"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <HouseIcon
            size={20}
            className={
              isActivePath("/") && location.pathname === "/"
                ? "drop-shadow-[0_0_10px_rgba(212,175,55,0.9)]"
                : ""
            }
          />
          <span className="text-[10px] mt-1 font-medium tracking-wide">
            Home
          </span>
        </Link>

        {/* Categories */}
        <Link
          to="/categories"
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative active:scale-95 ${
            isActivePath("/categories") || isActivePath("/category")
              ? "text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/15 shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]/50"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Layers
            size={20}
            className={
              isActivePath("/categories") || isActivePath("/category")
                ? "drop-shadow-[0_0_10px_rgba(212,175,55,0.9)]"
                : ""
            }
          />
          <span className="text-[10px] mt-1 font-medium tracking-wide">
            Categories
          </span>
        </Link>

        {/* Cart */}
        <Link
          to="/cart"
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative active:scale-95 ${
            isActivePath("/cart")
              ? "text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/15 shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]/50"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <ShoppingBag
            size={20}
            className={
              isActivePath("/cart")
                ? "drop-shadow-[0_0_10px_rgba(212,175,55,0.9)]"
                : ""
            }
          />
          {cartCount > 0 && (
            <span className="absolute -top-1 right-1 bg-[#D4AF37] text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-[0_0_12px_#D4AF37] animate-pulse">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] mt-1 font-medium tracking-wide">
            Cart
          </span>
        </Link>

        {/* About */}
        <Link
          to="/about"
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative active:scale-95 ${
            isActivePath("/about")
              ? "text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/15 shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]/50"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Sparkles
            size={20}
            className={
              isActivePath("/about")
                ? "drop-shadow-[0_0_10px_rgba(212,175,55,0.9)]"
                : ""
            }
          />
          <span className="text-[10px] mt-1 font-medium tracking-wide">
            About
          </span>
        </Link>

        {/* Profile */}
        <Link
          to="/profile"
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-300 relative active:scale-95 ${
            isActivePath("/profile")
              ? "text-[#D4AF37] font-bold scale-110 bg-[#D4AF37]/15 shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]/50"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <User
            size={20}
            className={
              isActivePath("/profile")
                ? "drop-shadow-[0_0_10px_rgba(212,175,55,0.9)]"
                : ""
            }
          />
          <span className="text-[10px] mt-1 font-medium tracking-wide">
            Profile
          </span>
        </Link>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
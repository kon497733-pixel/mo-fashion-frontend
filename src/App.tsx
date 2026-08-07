import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import AppRouter from './routes/AppRouter';

// 🚀 3D Interactive Custom Cursor Component (100% Error-Free Native Canvas/DOM)
function Custom3DCursor() {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [trailPos, setTrailingPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      // বাটন বা লিংকে হোভার করলে ৩ডি কার্সার অ্যানিমেশন
      const target = e.target as HTMLElement;
      if (
        target && 
        (target.tagName === 'BUTTON' || 
         target.tagName === 'A' || 
         target.closest('button') || 
         target.closest('a') ||
         target.getAttribute('role') === 'button')
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ৩ডি স্মুথ ট্রেইলিং রিং অ্যানিমেশন
  useEffect(() => {
    let animationFrameId: number;
    const updateTrail = () => {
      setTrailingPos((prev) => {
        const dx = mousePos.x - prev.x;
        const dy = mousePos.y - prev.y;
        return {
          x: prev.x + dx * 0.18,
          y: prev.y + dy * 0.18,
        };
      });
      animationFrameId = requestAnimationFrame(updateTrail);
    };
    animationFrameId = requestAnimationFrame(updateTrail);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mousePos]);

  if (isTouchDevice) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden select-none">
      {/* প্রধান গোল্ডেন কার্সার ডট */}
      <div
        className={`fixed rounded-full bg-[#D4AF37] transition-transform duration-75 ease-out shadow-[0_0_15px_#D4AF37] ${
          isHovered ? 'w-4 h-4 -ml-2 -mt-2 bg-white scale-125' : 'w-2.5 h-2.5 -ml-1.25 -mt-1.25'
        }`}
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
        }}
      />

      {/* ৩ডি ট্রেইলিং গ্লাসমরফিক রিং */}
      <div
        className={`fixed rounded-full border border-[#D4AF37]/60 transition-all duration-300 ease-out backdrop-blur-[1px] ${
          isHovered 
            ? 'w-12 h-12 -ml-6 -mt-6 border-[#FFFFFF] bg-[#D4AF37]/10 scale-110 shadow-[0_0_25px_rgba(212,175,55,0.4)]' 
            : 'w-8 h-8 -ml-4 -mt-4 border-[#D4AF37]/50'
        }`}
        style={{
          left: `${trailPos.x}px`,
          top: `${trailPos.y}px`,
        }}
      />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        
        {/* 🚀 ৩ডি ইন্টারঅ্যাক্টিভ কাস্টম কার্সার */}
        <Custom3DCursor />

        {/* আমাদের তৈরি করা রাউটার (AppRouter) এখানে কাজ করবে, যা Home পেজ এবং Admin পেজ দেখাবে */}
        <AppRouter />
        
        {/* গ্লোবাল নোটিফিকেশন (Toast) সেটআপ */}
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#1A1A1A',
              color: '#fff',
              border: '1px solid #D4AF37',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }} 
        />
        
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
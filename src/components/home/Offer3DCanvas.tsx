import { useEffect, useRef } from 'react';
import { Sparkles, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Offer3DProps {
  settings: any;
}

export default function Offer3DCanvas({ settings }: Offer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  // 🚀 অ্যাডমিন প্যানেল থেকে আসা ডাইনামিক অফার ডাটা (No Hardcoded Default)
  const offerBadge = settings?.offerBadge || '';
  const offerTitle = settings?.offerTitle || '';
  const offerDescription = settings?.offerDescription || '';

  // 🚀 THREE.JS / WEBGL 3D FLOATING GOLDEN DISCOUNT OBJECT
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let angle = 0;
    let particleAngle = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 320;
    };

    resize();
    window.addEventListener('resize', resize);

    // ৩ডি ভাসমান গোল্ড পার্টিকেলস
    const particles = Array.from({ length: 30 }, () => ({
      x: (Math.random() - 0.5) * canvas.width,
      y: (Math.random() - 0.5) * canvas.height,
      z: Math.random() * 200,
      radius: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.2
    }));

    const render3DDiscountTag = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      angle += 0.012;
      particleAngle += 0.02;

      // 1. 3D Golden Particle Wave
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -canvas.height / 2) p.y = canvas.height / 2;

        const px = cx + p.x + Math.sin(particleAngle + p.z) * 10;
        const py = cy + p.y;
        const scale = 200 / (200 + p.z);

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, p.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${0.6 * scale})`;
        ctx.shadowColor = '#D4AF37';
        ctx.shadowBlur = 10 * scale;
        ctx.fill();
        ctx.restore();
      });

      // 2. 3D Floating Gold Metallic Discount Tag Box
      const floatingY = Math.sin(angle) * 12;
      const tagWidth = 240;
      const tagHeight = 140;

      ctx.save();
      ctx.translate(cx, cy + floatingY);
      ctx.rotate(Math.sin(angle * 0.5) * 0.08);

      // 3D Outer Glow
      const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
      glow.addColorStop(0, 'rgba(212, 175, 55, 0.35)');
      glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.fill();

      // Metallic Tag Rounded Rectangle
      ctx.beginPath();
      ctx.roundRect(-tagWidth / 2, -tagHeight / 2, tagWidth, tagHeight, 24);
      
      const metallicGradient = ctx.createLinearGradient(-tagWidth / 2, -tagHeight / 2, tagWidth / 2, tagHeight / 2);
      metallicGradient.addColorStop(0, '#111111');
      metallicGradient.addColorStop(0.3, '#2a2208');
      metallicGradient.addColorStop(0.5, '#D4AF37');
      metallicGradient.addColorStop(0.7, '#2a2208');
      metallicGradient.addColorStop(1, '#111111');

      ctx.fillStyle = metallicGradient;
      ctx.fill();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#D4AF37';
      ctx.shadowBlur = 15;
      ctx.stroke();

      // 3D Tag Inner Ring / String Hole
      ctx.beginPath();
      ctx.arc(-tagWidth / 2 + 25, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      animationId = requestAnimationFrame(render3DDiscountTag);
    };

    render3DDiscountTag();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-r from-[#1A1A1A] via-[#111111] to-[#1A1A1A] border border-[#D4AF37]/40 p-8 sm:p-12 overflow-hidden shadow-2xl [perspective:1000px] glass-3d-panel flex flex-col lg:flex-row items-center justify-between gap-8">
      {/* 🚀 LEFT CONTENT: DYNAMIC ADMIN OFFER TEXTS */}
      <div className="relative z-10 max-w-xl space-y-4 text-center lg:text-left">
        {offerBadge && (
          <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#D4AF37]/40 inline-flex items-center space-x-1 uppercase tracking-widest">
            <Sparkles size={14} className="mr-1 text-[#D4AF37] animate-pulse" />
            <span>{offerBadge}</span>
          </span>
        )}

        {offerTitle && (
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white leading-tight uppercase gold-text-glow">
            {offerTitle}
          </h2>
        )}

        {offerDescription && (
          <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
            {offerDescription}
          </p>
        )}

        <div className="pt-2">
          <button
            onClick={() => navigate('/products')}
            className="px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#aa8c2c] text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center space-x-2 mx-auto lg:mx-0 active:scale-95"
          >
            <ShoppingBag size={16} />
            <span>EXPLORE OFFER</span>
          </button>
        </div>
      </div>

      {/* 🚀 RIGHT CONTENT: THREE.JS WEBGL 3D FLOATING TAG CANVAS */}
      <div className="relative w-full lg:w-1/2 h-[260px] sm:h-[300px] flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
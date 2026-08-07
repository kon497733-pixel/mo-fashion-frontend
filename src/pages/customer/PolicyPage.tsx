import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Truck, FileText } from 'lucide-react';

export default function PolicyPage() {
  const location = useLocation();
  const path = location.pathname;

  // পলিসি ডাটা সেটআপ
  let policyContent = {
    title: "Policy",
    icon: FileText,
    lastUpdated: "July 20, 2026",
    sections: [] as { heading: string, text: string }[]
  };

  // লিংক অনুযায়ী কন্টেন্ট পরিবর্তন হবে
  if (path === '/shipping') {
    policyContent = {
      title: "Shipping & Returns",
      icon: Truck,
      lastUpdated: "July 15, 2026",
      sections: [
        { heading: "1. Shipping Policy", text: "We offer standard and express shipping options. Standard shipping within Bangladesh takes 3-5 business days. International shipping may take 7-14 business days depending on the destination. Free shipping is automatically applied to all orders over $100." },
        { heading: "2. Return Policy", text: "We accept returns within 30 days of delivery. Items must be unworn, unwashed, and have original tags attached. To initiate a return, please contact our support team with your order ID. Please note that sale items are final and cannot be returned." },
        { heading: "3. Refunds Process", text: "Once your return is received and inspected, we will send you an email to notify you of the approval or rejection of your refund. Approved refunds will be processed, and a credit will automatically be applied to your original method of payment within 5-7 business days." }
      ]
    };
  } else if (path === '/privacy') {
    policyContent = {
      title: "Privacy Policy",
      icon: ShieldCheck,
      lastUpdated: "July 10, 2026",
      sections: [
        { heading: "1. Information Collection", text: "We collect information from you when you register on our site, place an order, subscribe to our newsletter, or fill out a form. This includes your name, email address, mailing address, and phone number. We do not store your credit card details on our servers." },
        { heading: "2. Information Usage", text: "Any of the information we collect from you may be used to personalize your experience, improve our website, process transactions securely, or send periodic emails regarding your order or promotional offers." },
        { heading: "3. Data Protection & Cookies", text: "We implement a variety of security measures to maintain the safety of your personal information. We also use cookies to help us remember and process the items in your shopping cart and understand your preferences for future visits." }
      ]
    };
  } else if (path === '/terms') {
    policyContent = {
      title: "Terms & Conditions",
      icon: FileText,
      lastUpdated: "July 01, 2026",
      sections: [
        { heading: "1. General Conditions", text: "We reserve the right to refuse service to anyone for any reason at any time. You understand that your content (not including payment information), may be transferred unencrypted and involve transmissions over various networks." },
        { heading: "2. Products or Services", text: "Certain products or services may be available exclusively online through the website. These products or services may have limited quantities and are subject to return or exchange only according to our Return Policy. We have made every effort to display as accurately as possible the colors and images of our products." },
        { heading: "3. Accuracy of Information", text: "We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions." }
      ]
    };
  }

  const Icon = policyContent.icon;

  return (
    <main className="min-h-screen py-12 text-white bg-[#111111] transition-all duration-300">
      <Helmet>
        <title>MO Fashion | {policyContent.title}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* 🚀 3D Page Header */}
        <div className="text-center mb-12 border-b border-[#D4AF37]/20 pb-10">
          <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.25)] animate-bounce">
            <Icon size={32} className="text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase mb-4 gold-text-glow">
            {policyContent.title}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            Last Updated: <span className="text-[#D4AF37] font-bold">{policyContent.lastUpdated}</span>
          </p>
        </div>

        {/* 🚀 3D GLASSMORPHIC DOCUMENT READER CARD */}
        <div className="bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-3xl p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.9)] glass-3d-panel">
          <div className="space-y-10">
            {policyContent.sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-white mb-4 flex items-center">
                  <span className="text-[#D4AF37] mr-3 font-sans opacity-70 gold-text-glow">0{index + 1}</span>
                  {section.heading}
                </h2>
                <p className="text-gray-300 leading-relaxed text-justify md:text-left font-light text-sm">
                  {section.text}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm font-light">
              If you have any questions regarding our {policyContent.title.toLowerCase()}, please contact us at <a href="mailto:kon497733@gmail.com" className="text-[#D4AF37] hover:underline font-bold">kon497733@gmail.com</a>.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
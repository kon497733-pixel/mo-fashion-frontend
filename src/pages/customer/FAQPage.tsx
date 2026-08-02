import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, ChevronUp, MessageCircle, Mail, Phone } from 'lucide-react';

export default function FAQPage() {
  // কোন প্রশ্নটি ওপেন আছে তা ট্র্যাক করার জন্য স্টেট
  const [openIndex, setOpenIndex] = useState<number | null>(0); // ডিফল্টভাবে প্রথমটি ওপেন থাকবে

  // ডামি FAQ ডাটা
  const faqs = [
    {
      question: "How long does shipping take?",
      answer: "Standard shipping usually takes 3-5 business days within Bangladesh. International shipping takes 7-14 business days depending on the destination. You will receive a tracking link once your order is dispatched."
    },
    {
      question: "What is your return and exchange policy?",
      answer: "We offer a 30-day hassle-free return policy. If you are not completely satisfied with your purchase, you can return unworn and unwashed items with the original tags attached for a full refund or exchange."
    },
    {
      question: "Do you offer Cash on Delivery (COD)?",
      answer: "Yes, we offer Cash on Delivery (COD) for all orders within Bangladesh. For international orders, we accept major Credit/Debit cards and Stripe payments."
    },
    {
      question: "How can I track my order?",
      answer: "Once your order is shipped, you will receive an email and SMS with a tracking number and a link to track your package in real-time."
    },
    {
      question: "Are your products 100% authentic?",
      answer: "Absolutely! At MO FASHION, we pride ourselves on providing only premium, 100% authentic products sourced directly from trusted manufacturers."
    },
    {
      question: "How do I use a discount coupon?",
      answer: "During checkout, you will see a 'Promo Code' or 'Coupon' box. Simply enter your valid coupon code there and click 'Apply' to see the discounted total."
    }
  ];

  // অ্যাকর্ডিয়ন ওপেন/ক্লোজ করার লজিক
  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen py-12 text-white">
      <Helmet>
        <title>MO Fashion | FAQ</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#D4AF37]/30">
            <MessageCircle size={32} className="text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-lg">
            Find answers to the most common questions about our products, shipping, and returns.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4 mb-16">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`bg-[#1A1A1A] border rounded-xl overflow-hidden transition-all duration-300 ${
                openIndex === index ? 'border-[#D4AF37]' : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
              }`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
              >
                <span className={`font-serif font-bold text-lg transition-colors ${openIndex === index ? 'text-[#D4AF37]' : 'text-white'}`}>
                  {faq.question}
                </span>
                <span className="text-gray-400 ml-4 shrink-0">
                  {openIndex === index ? <ChevronUp size={20} className="text-[#D4AF37]" /> : <ChevronDown size={20} />}
                </span>
              </button>
              
              {/* Answer Content with smooth expanding effect */}
              <div 
                className={`transition-all duration-300 ease-in-out px-5 overflow-hidden ${
                  openIndex === index ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-gray-400 leading-relaxed pt-2 border-t border-gray-800">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support Section */}
        <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-2xl p-8 text-center shadow-[0_0_20px_rgba(212,175,55,0.05)]">
          <h2 className="text-2xl font-bold text-white mb-3">Still have questions?</h2>
          <p className="text-gray-400 mb-6">If you cannot find the answer to your question in our FAQ, you can always contact us. We will answer to you shortly!</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:kon497733@gmail.com" className="flex items-center space-x-2 bg-[#D4AF37] text-black px-6 py-3 rounded-lg font-bold hover:bg-white transition-colors w-full sm:w-auto justify-center">
              <Mail size={18} />
              <span>Email Support</span>
            </a>
            <a href="tel:+8801234567890" className="flex items-center space-x-2 border border-[#D4AF37] text-[#D4AF37] px-6 py-3 rounded-lg font-bold hover:bg-[#D4AF37] hover:text-black transition-colors w-full sm:w-auto justify-center">
              <Phone size={18} />
              <span>Call Us</span>
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
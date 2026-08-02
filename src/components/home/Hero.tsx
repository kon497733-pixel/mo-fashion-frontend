import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="bg-white py-20 text-center border-b">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Welcome to <span className="text-[#D4AF37]">MO Fashion</span>
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-lg">
          Discover the latest trends in fashion. Upgrade your style with our premium collection of clothing and accessories.
        </p>
        
        {/* Shop Now বাটনে ক্লিক করলে কাস্টমারকে Categories পেজে নিয়ে যাবে */}
        <Link to="/categories">
          <button className="bg-[#222222] text-white px-8 py-3 rounded-md hover:bg-[#D4AF37] hover:text-black transition duration-300 font-semibold shadow-md">
            Shop Now
          </button>
        </Link>
      </div>
    </section>
  );
}
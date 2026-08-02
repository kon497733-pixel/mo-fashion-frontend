import { Link } from 'react-router-dom';

export default function Categories() {
  // ডামি ক্যাটাগরি ডাটা
  const categories = [
    { id: 1, name: "Men's Collection", link: "/categories" },
    { id: 2, name: "Women's Collection", link: "/categories" },
    { id: 3, name: "Accessories", link: "/categories" },
  ];

  return (
    <section className="py-16 container mx-auto px-4">
      <h2 className="text-3xl font-bold text-gray-800 mb-10 text-center uppercase tracking-wide">
        Shop by Category
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {categories.map((category) => (
          <Link to={category.link} key={category.id}>
            <div className="bg-gray-200 h-72 rounded-lg flex items-center justify-center text-gray-700 font-semibold text-xl shadow-sm hover:shadow-xl hover:text-[#D4AF37] hover:bg-[#222222] transition duration-300 cursor-pointer">
              {category.name}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
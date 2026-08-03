import { useState, useEffect } from 'react';
import { Search, Mail, Phone, Ban, CheckCircle, Trash2, User, RefreshCw, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>(() => {
    const saved = localStorage.getItem('mo_fashion_customers');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 🚀 ১. ক্লাউড ডাটাবেজ (MongoDB API) থেকে রিয়েল-টাইম কাস্টমার ও অর্ডার ডাটা ফেচ করা
  const fetchCustomers = async () => {
    // ১. লোকালস্টোরেজ থেকে ইনস্ট্যান্ট লোড
    const savedLocal = localStorage.getItem('mo_fashion_customers');
    if (savedLocal) {
      try {
        setCustomers(JSON.parse(savedLocal));
      } catch (e) {}
    }

    // ২. ক্লাউড ডাটাবেস থেকে রিয়েল-টাইম সিঙ্ক (ইউজার ও তাদের অর্ডারের হিসাব মার্জ করা)
    try {
      setLoading(true);
      const [usersRes, ordersRes] = await Promise.all([
        fetch('http://localhost:5000/api/users').catch(() => null),
        fetch('http://localhost:5000/api/orders').catch(() => null)
      ]);

      let cloudUsers = usersRes && usersRes.ok ? await usersRes.json() : [];
      let cloudOrders = ordersRes && ordersRes.ok ? await ordersRes.json() : [];

      if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        // শুধুমাত্র কাস্টমারদের ফিল্টার করা
        const customerList = cloudUsers.filter((u: any) => u.role === 'customer' || !u.role);

        // কাস্টমার ডাটার সাথে তাদের মোট কেনাকাটা (Total Spent & Orders) হিসাব করে যোগ করা
        const enriched = customerList.map((user: any) => {
          const userOrders = Array.isArray(cloudOrders) 
            ? cloudOrders.filter((o: any) => 
                (o.email && o.email.toLowerCase() === user.email?.toLowerCase()) || 
                (o.customerInfo?.email && o.customerInfo.email.toLowerCase() === user.email?.toLowerCase())
              )
            : [];
          
          const totalSpent = userOrders.reduce((sum: number, o: any) => 
            sum + (Number(o.total || o.orderSummary?.total) || 0), 0
          );

          return {
            id: user._id || user.id,
            _id: user._id || user.id,
            name: user.name || 'Anonymous Customer',
            email: user.email,
            phone: user.phone || 'Not provided',
            orders: userOrders.length,
            spent: totalSpent,
            status: user.isBlocked ? 'Blocked' : 'Active',
            joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'
          };
        });

        setCustomers(enriched);
        localStorage.setItem('mo_fashion_customers', JSON.stringify(enriched));
      }
    } catch (error) {
      console.warn("Backend API offline, using cached customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 🚀 ২. ক্লাউড ডাটাবেসে কাস্টমার ব্লক/আনব্লক করার API
  const handleToggleStatus = async (customer: any) => {
    const targetId = customer._id || customer.id;
    const isCurrentlyActive = customer.status === 'Active';
    const newBlockedState = isCurrentlyActive; // Active থাকলে ব্লক করবে
    const newStatusText = newBlockedState ? 'Blocked' : 'Active';

    // ১. লোকাল স্টোরেজ ইনস্ট্যান্ট আপডেট
    const updatedList = customers.map(c => 
      (c._id || c.id) === targetId ? { ...c, status: newStatusText } : c
    );
    setCustomers(updatedList);
    localStorage.setItem('mo_fashion_customers', JSON.stringify(updatedList));

    if (newBlockedState) {
      toast.error('Customer has been blocked successfully!');
    } else {
      toast.success('Customer has been unblocked successfully!');
    }

    // ২. ক্লাউড ডাটাবেসে সেভ (PUT Request)
    try {
      await fetch(`http://localhost:5000/api/users/${targetId}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: newBlockedState })
      });
    } catch (e) {
      console.warn("Cloud status update failed, updated locally.");
    }
  };

  // 🚀 ৩. ক্লাউড ডাটাবেস থেকে কাস্টমার মুছে ফেলার API
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
      const updated = customers.filter(c => (c._id || c.id) !== id);
      setCustomers(updated);
      localStorage.setItem('mo_fashion_customers', JSON.stringify(updated));
      toast.success("Customer deleted!");

      try {
        await fetch(`http://localhost:5000/api/users/${id}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.warn("Cloud delete failed, deleted locally.");
      }
    }
  };

  // সার্চ ফিল্টার লজিক
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (customer.name || '').toLowerCase().includes(searchLower) || 
      (customer.email || '').toLowerCase().includes(searchLower) ||
      (customer.phone || '').includes(searchQuery)
    );
  });

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet>
        <title>Admin - Customers | MO FASHION</title>
      </Helmet>

      {/* 🚀 Top-Notch Animated Glassmorphic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-2xl border border-[#D4AF37]/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-[#D4AF37]/40">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
              <User className="mr-3 text-[#D4AF37] animate-pulse" size={28} /> Customers Management
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30 flex items-center">
              Total: {customers.length} Customers
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">View and manage customers who placed orders (Live Cloud Sync)</p>
        </div>

        <button 
          onClick={fetchCustomers}
          className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 flex items-center space-x-2 font-bold text-xs"
          title="Refresh Customer Data"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 🔎 Search Bar with Glow */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#D4AF37]/20 mb-6 shadow-lg transition-all duration-300">
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Search by name, email or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 placeholder-gray-500 transition-all duration-200 text-sm"
          />
          <Search className="absolute left-3.5 top-3 text-gray-500" size={18} />
        </div>
      </div>

      {/* 📦 Customers Table */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Customer Info</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Contact</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-center">Total Orders</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Total Spent</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#D4AF37]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
                      <p className="font-medium animate-pulse">Syncing customer profiles from Cloud DB...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer: any) => (
                  <tr key={customer._id || customer.id || Math.random()} className="hover:bg-[#111111] transition-all duration-200 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold uppercase group-hover:scale-110 transition-transform duration-300 shadow-sm">
                          {customer.name ? customer.name.charAt(0) : '?'}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{customer.name}</p>
                          <p className="text-xs text-gray-500">Joined: {customer.joinDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail size={14} className="text-[#D4AF37] mr-2 shrink-0" />
                          <span>{customer.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-300">
                          <Phone size={14} className="text-[#D4AF37] mr-2 shrink-0" />
                          <span>{customer.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-white text-center">
                      <span className="bg-[#111111] px-3 py-1 rounded-full border border-gray-800 text-xs font-bold shadow-inner">
                        {customer.orders}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#D4AF37]">
                      ৳{Number(customer.spent || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block transition-all duration-300 ${
                        customer.status === 'Active' 
                        ? 'text-green-400 bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/20 animate-pulse' 
                        : 'text-red-400 bg-red-500/10 border-red-500/30 shadow-sm shadow-red-500/20'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Block / Unblock Button */}
                        <button 
                          onClick={() => handleToggleStatus(customer)}
                          className={`p-2.5 rounded-xl transition-all duration-200 border active:scale-95 ${
                            customer.status === 'Active' 
                            ? 'text-yellow-500 border-yellow-500/20 hover:border-yellow-500 hover:bg-yellow-500/10' 
                            : 'text-green-400 border-green-500/20 hover:border-green-500 hover:bg-green-500/10'
                          }`}
                          title={customer.status === 'Active' ? 'Block Customer' : 'Unblock Customer'}
                        >
                          {customer.status === 'Active' ? <Ban size={16} /> : <CheckCircle size={16} />}
                        </button>
                        
                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDelete(customer._id || customer.id, customer.name)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] border border-gray-800 hover:border-red-500/50 rounded-xl active:scale-95"
                          title="Delete Customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {filteredCustomers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User size={36} className="text-gray-600 opacity-40" />
                      <p className="text-base font-semibold text-gray-400">No customers found!</p>
                      <p className="text-xs text-gray-600">When someone places an order, they will automatically appear here live.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
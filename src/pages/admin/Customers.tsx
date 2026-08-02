import { useState, useEffect } from 'react';
import { Search, Mail, Phone, Ban, CheckCircle, Trash2 } from 'lucide-react';
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
    const newBlockedState = isCurrentlyActive; // Active থাকলে বি ব্লক করবে
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
    <div className="text-white pb-10">
      <Helmet>
        <title>Admin - Customers | MO FASHION</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase">Customers Management</h1>
        <p className="text-sm text-gray-400 mt-1">View and manage customers who placed orders (Live Cloud Sync)</p>
      </div>

      {/* Search Bar */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#D4AF37]/20 mb-6 shadow-md">
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Search by name, email or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-lg px-10 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] placeholder-gray-500 transition-colors"
          />
          <Search className="absolute left-3 top-3 text-gray-500" size={18} />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#D4AF37]/20 overflow-hidden shadow-lg">
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
              {filteredCustomers.map((customer: any) => (
                <tr key={customer._id || customer.id || Math.random()} className="hover:bg-[#111111]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold uppercase">
                        {customer.name ? customer.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <p className="font-bold text-white">{customer.name}</p>
                        <p className="text-xs text-gray-500">Joined: {customer.joinDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-300">
                        <Mail size={14} className="text-[#D4AF37] mr-2" />
                        {customer.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-300">
                        <Phone size={14} className="text-[#D4AF37] mr-2" />
                        {customer.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-white text-center">
                    <span className="bg-[#111111] px-3 py-1 rounded-full border border-gray-800">
                      {customer.orders}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#D4AF37]">
                    ৳{Number(customer.spent || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${
                      customer.status === 'Active' 
                      ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                      : 'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Block / Unblock Button */}
                      <button 
                        onClick={() => handleToggleStatus(customer)}
                        className={`p-2 rounded-md transition-colors border ${
                          customer.status === 'Active' 
                          ? 'text-yellow-500 border-transparent hover:border-yellow-500/30 hover:bg-[#111111]' 
                          : 'text-green-400 border-transparent hover:border-green-500/30 hover:bg-[#111111]'
                        }`}
                        title={customer.status === 'Active' ? 'Block Customer' : 'Unblock Customer'}
                      >
                        {customer.status === 'Active' ? <Ban size={18} /> : <CheckCircle size={18} />}
                      </button>
                      
                      {/* Delete Button */}
                      <button 
                        onClick={() => handleDelete(customer._id || customer.id, customer.name)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-[#111111] border border-gray-800 hover:border-red-500/30 rounded-md"
                        title="Delete Customer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No customers found. When someone places an order, they will automatically appear here live!
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
import { useState, useEffect } from 'react';
import { Search, Mail, Phone, Ban, CheckCircle, Trash2, User, RefreshCw, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { 
  supabase, 
  getSupabaseCustomers, 
  saveSupabaseCustomer, 
  getSupabaseOrders 
} from '../../lib/supabase';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>(() => {
    const saved = localStorage.getItem('mo_fashion_customers');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 🚀 ১. সরাসরি Supabase Cloud Database থেকে রিয়েল-টাইম কাস্টমার ও তাদের অর্ডার ডাটা ফেচিং (All-Device Sync)
  const fetchCustomersAndOrders = async () => {
    setLoading(true);

    let localCustomers: any[] = [];
    const savedLocal = localStorage.getItem('mo_fashion_customers');
    if (savedLocal) {
      try { localCustomers = JSON.parse(savedLocal); } catch (e) {}
    }

    try {
      const [cloudCustomers, cloudOrders] = await Promise.all([
        getSupabaseCustomers(),
        getSupabaseOrders()
      ]);

      if (Array.isArray(cloudCustomers) && cloudCustomers.length > 0) {
        // কাস্টমারের মোট কেনাকাটা (Total Spent) এবং মোট অর্ডার সংখ্যা (Total Orders) হিসাব করা
        const enrichedList = cloudCustomers.map((cust: any) => {
          const custEmail = (cust.email || '').toLowerCase().trim();
          const custPhone = (cust.phone || '').trim();

          const userOrders = Array.isArray(cloudOrders) 
            ? cloudOrders.filter((o: any) => {
                const orderEmail = (o.email || o.customerInfo?.email || '').toLowerCase().trim();
                const orderPhone = (o.phone || o.customerInfo?.phone || '').trim();
                return (custEmail && orderEmail === custEmail) || (custPhone && orderPhone === custPhone);
              })
            : [];

          const totalSpent = userOrders.reduce((sum: number, o: any) => 
            sum + (Number(o.total || o.orderSummary?.total) || 0), 0
          );

          return {
            ...cust,
            id: cust.id || cust._id || `CUST-${cust.phone || Date.now()}`,
            name: cust.name || 'Anonymous Customer',
            email: cust.email || 'N/A',
            phone: cust.phone || 'N/A',
            orders: userOrders.length || cust.orders || 0,
            spent: totalSpent || cust.spent || 0,
            status: cust.status || 'Active',
            joinDate: cust.joinDate || (cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent')
          };
        });

        setCustomers(enrichedList);
        localStorage.setItem('mo_fashion_customers', JSON.stringify(enrichedList));
      } else {
        setCustomers(localCustomers);
      }
    } catch (error) {
      console.warn("Supabase Customers Cloud fetch fallback, using local cache.");
      setCustomers(localCustomers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersAndOrders();

    // 🚀 ২. Supabase Realtime WebSocket Listener (সব ডিভাইসে ১ সেকেন্ডে লাইভ সিঙ্ক)
    const channel = supabase
      .channel('public:customers:admin:live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomersAndOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchCustomersAndOrders();
      })
      .subscribe();

    const handleStorageChange = () => fetchCustomersAndOrders();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('orderUpdated', handleStorageChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('orderUpdated', handleStorageChange);
    };
  }, []);

  // 🚀 ৩. কাস্টমার ব্লক / আনব্লক করার লজিক (Supabase Cloud-এ পার্মানেন্ট সেভ)
  const handleToggleStatus = async (customer: any) => {
    const targetId = String(customer.id || customer._id);
    const isCurrentlyActive = customer.status === 'Active';
    const newStatusText = isCurrentlyActive ? 'Blocked' : 'Active';

    const updatedCustomer = { ...customer, status: newStatusText };

    const updatedList = customers.map(c => 
      String(c.id || c._id) === targetId ? updatedCustomer : c
    );
    setCustomers(updatedList);
    localStorage.setItem('mo_fashion_customers', JSON.stringify(updatedList));

    if (newStatusText === 'Blocked') {
      toast.error(`Customer "${customer.name}" has been blocked!`);
    } else {
      toast.success(`Customer "${customer.name}" has been unblocked! 🎉`);
    }

    try {
      await saveSupabaseCustomer(updatedCustomer);
    } catch (e) {
      console.warn("Cloud customer status update fallback.");
    }
  };

  // 🚀 ৪. ডাটাবেস থেকে কাস্টমার মুছে ফেলার লজিক
  const handleDelete = async (id: string, name: string) => {
    const targetId = String(id);
    if (window.confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
      const updated = customers.filter(c => String(c.id || c._id) !== targetId);
      setCustomers(updated);
      localStorage.setItem('mo_fashion_customers', JSON.stringify(updated));

      try {
        await supabase.from('customers').delete().eq('id', targetId);
        toast.success(`Customer "${name}" deleted permanently!`);
      } catch (e) {
        toast.success("Customer deleted locally.");
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

      {/* 🚀 Header Section */}
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
          <p className="text-sm text-gray-400 mt-1">View and manage live customers from Supabase Cloud DB</p>
        </div>

        <button 
          onClick={fetchCustomersAndOrders}
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

      {/* 📦 Customers Table with Live Supabase Sync */}
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
                      <p className="font-medium animate-pulse">Syncing customer profiles live from Supabase Cloud DB...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer: any) => (
                  <tr key={customer.id || customer._id || Math.random()} className="hover:bg-[#111111] transition-all duration-200 group">
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
                          onClick={() => handleDelete(customer.id || customer._id, customer.name)}
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
                      <p className="text-xs text-gray-600">When someone places an order from any device, they will automatically appear here live.</p>
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
import { useState, useEffect } from 'react';
import { Search, Mail, Phone, Ban, CheckCircle, Trash2, User, RefreshCw, CheckSquare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { 
  supabase, 
  getSupabaseCustomers, 
  saveSupabaseCustomer, 
  getSupabaseOrders,
  moveToRecycleBin
} from '../../lib/supabase';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>(() => {
    const saved = localStorage.getItem('mo_fashion_customers');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🚀 ডুপ্লিকেট কাস্টমার মার্জ করার মার্জিং লজিক
  const mergeDuplicateCustomers = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    const mergedMap = new Map<string, any>();

    list.forEach((cust: any) => {
      const email = (cust.email || '').toLowerCase().trim();
      const phone = (cust.phone || '').trim();

      const hasEmail = email && email !== 'n/a' && email !== 'undefined' && email !== 'null';
      const hasPhone = phone && phone !== 'n/a' && phone !== 'undefined' && phone !== 'null';

      let key = '';
      if (hasEmail) {
        key = `email-${email}`;
      } else if (hasPhone) {
        key = `phone-${phone}`;
      } else {
        key = `id-${cust.id || cust._id}`;
      }

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        mergedMap.set(key, {
          ...existing,
          name: (existing.name && existing.name !== 'Anonymous Customer') ? existing.name : (cust.name || 'Anonymous Customer'),
          email: (existing.email && existing.email !== 'N/A') ? existing.email : (cust.email || 'N/A'),
          phone: (existing.phone && existing.phone !== 'N/A') ? existing.phone : (cust.phone || 'N/A'),
          status: existing.status === 'Blocked' || cust.status === 'Blocked' ? 'Blocked' : 'Active'
        });
      } else {
        mergedMap.set(key, { ...cust });
      }
    });

    return Array.from(mergedMap.values());
  };

  // 🚀 ১. কাস্টমার ও অর্ডার ডাটা ফেচিং (ডিলিটেড কাস্টমার ফিল্টার সহ)
  const fetchCustomersAndOrders = async () => {
    setLoading(true);

    let localCustomers: any[] = [];
    const savedLocal = localStorage.getItem('mo_fashion_customers');
    if (savedLocal) {
      try { localCustomers = JSON.parse(savedLocal); } catch (e) {}
    }

    // রিসাইকেল বিনে ডিলিট হওয়া আইডি ফিল্টার
    const recycleBinCats = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_customers') || '[]');
    const deletedIds = recycleBinCats.map((item: any) => String(item.id || item._id || item.itemId));

    try {
      const [cloudCustomers, cloudOrders] = await Promise.all([
        getSupabaseCustomers(),
        getSupabaseOrders()
      ]);

      const customersArray = Array.isArray(cloudCustomers) ? cloudCustomers : [];
      const ordersArray = Array.isArray(cloudOrders) ? cloudOrders : [];

      if (customersArray.length > 0) {
        // ডিলিট হওয়া কাস্টমারদের বাদ দেওয়া
        const activeCloudCustomers = customersArray.filter(
          (c: any) => !deletedIds.includes(String(c.id || c._id))
        );

        const cleanMergedCustomers = mergeDuplicateCustomers(activeCloudCustomers);

        const enrichedList = cleanMergedCustomers.map((cust: any) => {
          const custEmail = (cust.email || '').toLowerCase().trim();
          const custPhone = (cust.phone || '').trim();

          const userOrders = ordersArray.filter((o: any) => {
            const orderEmail = (o.email || o.customerInfo?.email || '').toLowerCase().trim();
            const orderPhone = (o.phone || o.customerInfo?.phone || o.customerInfo?.phoneNo || '').trim();
            return (custEmail && orderEmail === custEmail) || (custPhone && orderPhone === custPhone);
          });

          const totalSpent = userOrders.reduce((sum: number, o: any) => 
            sum + (Number(o.total || o.orderSummary?.total) || 0), 0
          );

          return {
            ...cust,
            id: cust.id || cust._id || `CUST-${cust.phone || Date.now()}`,
            name: cust.name || 'Anonymous Customer',
            email: cust.email || 'N/A',
            phone: cust.phone || 'N/A',
            orders: userOrders.length,
            spent: totalSpent,
            status: cust.status || 'Active',
            joinDate: cust.joinDate || (cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent')
          };
        });

        setCustomers(enrichedList);
        localStorage.setItem('mo_fashion_customers', JSON.stringify(enrichedList));
      } else {
        const activeLocal = localCustomers.filter((c: any) => !deletedIds.includes(String(c.id || c._id)));
        setCustomers(activeLocal);
      }
    } catch (error) {
      console.warn("Supabase Customers Cloud fetch fallback, using local cache.");
      const activeLocal = localCustomers.filter((c: any) => !deletedIds.includes(String(c.id || c._id)));
      setCustomers(activeLocal);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersAndOrders();

    const channel = supabase
      .channel('public:customers:admin:live:guaranteed:v2')
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

  // 🚀 ৩. কাস্টমার ব্লক / আনব্লক
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

  // 🗑️ ৪. পারমানেন্ট কাস্টমার ডিলিট (রিসাইকেল বিনে মুভ ও ক্লাউড ডাটাবেজ থেকে স্থায়ী অপসারণ)
  const handleDelete = async (customer: any) => {
    const targetId = String(customer.id || customer._id);
    const name = customer.name || 'Customer';

    if (window.confirm(`Are you sure you want to PERMANENTLY delete customer "${name}"?`)) {
      // লোকাল স্টেট ও লোকাল স্টোরেজ থেকে রিমুভ
      const updated = customers.filter(c => String(c.id || c._id) !== targetId);
      setCustomers(updated);
      localStorage.setItem('mo_fashion_customers', JSON.stringify(updated));

      // রিসাইকেল বিনে ব্যাকআপ রাখা
      const deletedBin = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_customers') || '[]');
      localStorage.setItem('mo_fashion_recycle_bin_customers', JSON.stringify([{ ...customer, itemId: targetId }, ...deletedBin]));

      try {
        await supabase.from('customers').delete().eq('id', targetId);
        await moveToRecycleBin('customers' as any, customer).catch(() => null);
        toast.success(`Customer "${name}" moved to Recycle Bin! 🗑️`);
      } catch (e) {
        toast.success("Customer deleted.");
      }
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (customer.name || '').toLowerCase().includes(searchLower) || 
      (customer.email || '').toLowerCase().includes(searchLower) ||
      (customer.phone || '').includes(searchQuery)
    );
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = filteredCustomers.map((c: any) => String(c.id || c._id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const targetId = String(id);
    if (selectedIds.includes(targetId)) {
      setSelectedIds(selectedIds.filter(i => i !== targetId));
    } else {
      setSelectedIds([...selectedIds, targetId]);
    }
  };

  // 🗑️ বাল্ক কাস্টমার ডিলিট (রিসাইকেল বিনে প্রেরণ ও সুপাবেস থেকে স্থায়ী মুছে ফেলা)
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (window.confirm(`Are you sure you want to move ${selectedIds.length} selected customer(s) to Recycle Bin?`)) {
      const selectedCustomers = customers.filter((c: any) => selectedIds.includes(String(c.id || c._id)));
      const remaining = customers.filter((c: any) => !selectedIds.includes(String(c.id || c._id)));

      setCustomers(remaining);
      localStorage.setItem('mo_fashion_customers', JSON.stringify(remaining));

      const deletedBin = JSON.parse(localStorage.getItem('mo_fashion_recycle_bin_customers') || '[]');
      const newlyDeletedBin = selectedCustomers.map(c => ({ ...c, itemId: String(c.id || c._id) }));
      localStorage.setItem('mo_fashion_recycle_bin_customers', JSON.stringify([...newlyDeletedBin, ...deletedBin]));

      const toastId = toast.loading(`Moving ${selectedIds.length} customers to Recycle Bin...`);

      for (const custObj of selectedCustomers) {
        const id = String(custObj.id || custObj._id);
        try {
          await supabase.from('customers').delete().eq('id', id);
          await moveToRecycleBin('customers' as any, custObj).catch(() => null);
        } catch (e) {}
      }

      setSelectedIds([]);
      toast.success(`${selectedCustomers.length} customer(s) moved to Recycle Bin! 🗑️`, { id: toastId });
    }
  };

  const handleBulkChangeStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return;

    const updatedList = customers.map((c: any) => {
      const id = String(c.id || c._id);
      return selectedIds.includes(id) ? { ...c, status: newStatus } : c;
    });

    setCustomers(updatedList);
    localStorage.setItem('mo_fashion_customers', JSON.stringify(updatedList));

    const toastId = toast.loading(`Updating status to "${newStatus}"...`);

    for (const id of selectedIds) {
      const found = customers.find((c: any) => String(c.id || c._id) === id);
      if (found) {
        await saveSupabaseCustomer({ ...found, status: newStatus }).catch(() => null);
      }
    }

    setSelectedIds([]);
    toast.success(`Updated ${selectedIds.length} customer(s) to "${newStatus}" LIVE! 🎉`, { id: toastId });
  };

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet>
        <title>Admin - Customers Management | MO FASHION</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-3xl border border-[#D4AF37]/30 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/50 glass-3d-panel">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center gold-text-glow">
              <User className="mr-3 text-[#D4AF37] animate-pulse" size={28} /> Customers Management
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30 flex items-center">
              Total: {customers.length} Customers
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 font-light">View and manage live customers from Supabase Cloud DB</p>
        </div>

        <button 
          onClick={fetchCustomersAndOrders}
          className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 flex items-center space-x-2 font-bold text-xs shadow-md"
          title="Refresh Customer Data"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md glass-3d-panel">
          <div className="flex items-center space-x-2 text-[#D4AF37] font-bold text-sm gold-text-glow">
            <CheckSquare size={18} />
            <span>{selectedIds.length} Customer(s) Selected</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleBulkChangeStatus('Active')}
              className="bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-black border border-green-500/40 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1 active:scale-95"
            >
              <CheckCircle size={14} />
              <span>Unblock Selected</span>
            </button>

            <button
              onClick={() => handleBulkChangeStatus('Blocked')}
              className="bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/40 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1 active:scale-95"
            >
              <Ban size={14} />
              <span>Block Selected</span>
            </button>

            <button
              onClick={handleBulkDelete}
              className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1 active:scale-95 shadow-md"
            >
              <Trash2 size={14} />
              <span>Move Selected to Recycle Bin</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#D4AF37]/20 mb-6 shadow-lg transition-all duration-300 glass-3d-panel">
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Search by name, email or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 placeholder-gray-500 transition-all duration-200 text-sm shadow-inner"
          />
          <Search className="absolute left-3.5 top-3 text-gray-500" size={18} />
        </div>
      </div>

      <div className="bg-[#1A1A1A] rounded-3xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300 glass-3d-panel">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                    title="Select All Customers"
                  />
                </th>
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
                  <td colSpan={7} className="px-6 py-12 text-center text-[#D4AF37]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
                      <p className="font-medium animate-pulse">Syncing customer profiles live from Supabase Cloud DB...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer: any) => {
                  const displayId = String(customer.id || customer._id);
                  const isChecked = selectedIds.includes(displayId);

                  return (
                    <tr key={displayId || Math.random()} className={`hover:bg-[#111111] transition-all duration-200 group ${isChecked ? 'bg-[#D4AF37]/5' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(displayId)}
                          className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold uppercase group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            {customer.name ? customer.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{customer.name}</p>
                            <p className="text-xs text-gray-500 font-light">Joined: {customer.joinDate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-300 font-light">
                            <Mail size={13} className="text-[#D4AF37] mr-2 shrink-0" />
                            <span>{customer.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-300 font-light">
                            <Phone size={13} className="text-[#D4AF37] mr-2 shrink-0" />
                            <span>{customer.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white text-center">
                        <span className="bg-[#111111] px-3 py-1 rounded-full border border-gray-800 text-xs font-bold shadow-inner">
                          {customer.orders}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#D4AF37] gold-text-glow">
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
                          
                          <button 
                            onClick={() => handleDelete(customer)}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] border border-gray-800 hover:border-red-500/50 rounded-xl active:scale-95"
                            title="Move to Recycle Bin"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {filteredCustomers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
import { useState, useEffect } from 'react';
import { 
  Search, X, Package, Clock, CheckCircle, Truck, MapPin, 
  Trash2, Tag, RefreshCw, Sparkles, User, Image as ImageIcon,
  CreditCard, Calendar, Phone, Mail, CheckSquare, Square, Layers
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { 
  supabase, 
  getSupabaseOrders, 
  saveSupabaseOrder, 
  deleteSupabaseOrder 
} from '../../lib/supabase';

export default function Orders() {
  const [orders, setOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem('mo_fashion_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🚀 "Select All" এবং বাল্ক সিলেক্ট স্টেট
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🛡️ সেফ নম্বর পার্সার
  const parseSafeNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // 🛡️ কাস্টমার নাম পার্সার
  const getCustomerFullName = (order: any): string => {
    if (!order) return 'Customer';
    
    if (order.customer && String(order.customer).trim() !== '' && String(order.customer).trim() !== 'Customer') {
      return String(order.customer).trim();
    }

    let info = order.customerInfo;
    if (typeof info === 'string') {
      try { info = JSON.parse(info); } catch (e) {}
    }

    if (info && typeof info === 'object') {
      const name = `${info.firstName || ''} ${info.lastName || ''}`.trim();
      if (name) return name;
    }

    if (order.email && String(order.email).includes('@')) {
      return String(order.email).split('@')[0];
    }
    if (order.phone) {
      return `Customer (${order.phone})`;
    }

    return 'Customer';
  };

  // 🛡️ সেফ ডেলিভারি ঠিকানা পার্সার
  const getFullAddress = (order: any): string => {
    if (!order) return 'Bangladesh';
    
    let addr = order.address || '';
    let info = order.customerInfo;
    if (typeof info === 'string') {
      try { info = JSON.parse(info); } catch(e){}
    }

    if (info && typeof info === 'object') {
      if (info.address || info.city) {
        addr = `${info.address || ''}, ${info.city || ''}`;
      }
    }

    const clean = String(addr).replace(/(,\s*)+/g, ', ').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
    return clean ? (clean.toLowerCase().includes('bangladesh') ? clean : `${clean}, Bangladesh`) : 'Bangladesh';
  };

  // 🛡️ প্রোডাক্ট থাম্বনেইল ফটো এক্সট্রাক্টর (Photo Loader)
  const getItemImage = (item: any): string => {
    if (!item) return '';
    let img = item.image || item.imageUrl || item.productImage;
    if (!img && Array.isArray(item.images) && item.images[0]) {
      img = item.images[0];
    }
    if (typeof img === 'string' && img.trim() !== '' && img !== 'No Image' && !img.includes('via.placeholder')) {
      return img.trim();
    }
    return '';
  };

  // 🚀 ১০০% রিয়েল প্রোডাক্ট আইটেম ডিকোডার (Photo, Name, Qty, Size, Color & Variants Display)
  const getOrderItemsList = (order: any): any[] => {
    if (!order) return [];

    const candidates = [
      order.orderItems, 
      order.order_items, 
      order.cartItems, 
      order.items_data,
      order.items
    ];

    for (let raw of candidates) {
      if (!raw) continue;

      // ১. সরাসরি অ্যারাই হলে
      if (Array.isArray(raw) && raw.length > 0) {
        return raw;
      }

      // ২. জেসন স্ট্রিং হলে
      if (typeof raw === 'string' && raw.trim() !== '' && raw !== '[object Object]') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          if (parsed && typeof parsed === 'object') return [parsed];
        } catch (e) {}
      }

      // ৩. অবজেক্ট হলে
      if (typeof raw === 'object' && !Array.isArray(raw)) {
        return [raw];
      }
    }

    return [];
  };

  // 🛡️ সেফ অর্ডার সমরি পার্সার (Subtotal, Shipping Fee, Tax, Discount)
  const getOrderSummaryObj = (order: any): any => {
    if (!order) return { subtotal: 0, shipping: 60, tax: 0, discount: 0, total: 0 };
    
    let summary = order.orderSummary || order.order_summary;
    if (typeof summary === 'string' && summary !== '[object Object]') {
      try { summary = JSON.parse(summary); } catch (e) {}
    }

    const totalNum = parseSafeNumber(order.total || summary?.total);
    const addrLower = getFullAddress(order).toLowerCase();
    const isInsideCTG = addrLower.includes('chattogram') || addrLower.includes('chittagong');
    const defaultShipping = isInsideCTG ? 60 : 150;

    const shipNum = parseSafeNumber(summary?.shipping !== undefined ? summary.shipping : order.shipping) || (totalNum > 0 ? defaultShipping : 0);
    const subNum = parseSafeNumber(summary?.subtotal !== undefined ? summary.subtotal : order.subtotal) || (totalNum > shipNum ? totalNum - shipNum : totalNum);
    const taxNum = parseSafeNumber(summary?.tax !== undefined ? summary.tax : order.tax);
    const discNum = parseSafeNumber(summary?.discount !== undefined ? summary.discount : order.discount);

    return {
      subtotal: subNum,
      shipping: shipNum,
      tax: taxNum,
      discount: discNum,
      total: totalNum,
      couponCode: summary?.couponCode || order.couponCode
    };
  };

  // 🛡️ অর্ডারের নিখুঁত তারিখ ও সময় (Exact Date & Time)
  const getFormattedDateTime = (order: any): string => {
    if (!order) return 'Recent';
    const rawDate = order.createdAt || order.created_at || order.date;
    if (!rawDate) return 'Recent';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return String(rawDate);
      
      const dateStr = d.toLocaleDateString('en-GB', { 
        day: '2-digit', month: 'short', year: 'numeric' 
      });
      const timeStr = d.toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });

      return `${dateStr} • ${timeStr}`;
    } catch (e) {
      return String(rawDate);
    }
  };

  // 🚀 ১. সরাসরি Supabase Cloud Database থেকে রিয়েল-টাইম ১০০% লাইভ অর্ডার ফেচিং
  const fetchOrders = async (isSilent = false) => {
    if (!isSilent && orders.length === 0) setLoading(true);

    let localOrders: any[] = [];
    const savedLocal = localStorage.getItem('mo_fashion_orders');
    if (savedLocal) {
      try {
        localOrders = JSON.parse(savedLocal);
      } catch (e) {}
    }

    try {
      const cloudData = await getSupabaseOrders();
      if (Array.isArray(cloudData) && cloudData.length > 0) {
        setOrders(cloudData);
        localStorage.setItem('mo_fashion_orders', JSON.stringify(cloudData));
      } else {
        setOrders(localOrders);
      }
    } catch (error) {
      console.warn("Supabase Cloud Orders fetch fallback, using local cache.");
      setOrders(localOrders);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // 🚀 ২. Supabase WebSocket Realtime Listener (সব ডিভাইসে ১ সেকেন্ডে ব্রডকাস্ট হবে)
    const channel = supabase
      .channel('public:orders:admin:live:real:v20')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          fetchOrders(true);
          if (payload.eventType === 'INSERT') {
            toast.success("New Order Received Live! 🛒", { duration: 4000 });
          }
        }
      )
      .subscribe();

    const handleStorageChange = () => fetchOrders(true);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('orderUpdated', handleStorageChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('orderUpdated', handleStorageChange);
    };
  }, []);

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // 🚀 ৩. অর্ডারের স্ট্যাটাস ক্লাউড ডাটাবেসে রিয়েল-টাইম আপডেট করা
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    const orderId = String(selectedOrder._id || selectedOrder.id || selectedOrder.orderId);

    const updatedOrderObj = { ...selectedOrder, status: newStatus };

    const updatedList = orders.map((o: any) => 
      String(o._id || o.id || o.orderId) === orderId ? updatedOrderObj : o
    );
    setOrders(updatedList);
    localStorage.setItem('mo_fashion_orders', JSON.stringify(updatedList));
    setSelectedOrder(updatedOrderObj);

    try {
      await saveSupabaseOrder(updatedOrderObj);
      toast.success(`Order status updated to "${newStatus}" LIVE! 🎉`);
      window.dispatchEvent(new Event('orderUpdated'));
    } catch (error) {
      toast.success(`Status updated to "${newStatus}" locally.`);
    }
  };

  // 🚀 ৪. ডাটাবেস থেকে অর্ডার ডিলিট
  const handleDeleteOrder = async (id: string) => {
    const targetId = String(id);
    if (window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      const remainingOrders = orders.filter((o: any) => String(o._id || o.id || o.orderId) !== targetId);
      setOrders(remainingOrders);
      localStorage.setItem('mo_fashion_orders', JSON.stringify(remainingOrders));
      setIsModalOpen(false);

      try {
        await deleteSupabaseOrder(targetId);
        toast.success("Order deleted successfully!");
        window.dispatchEvent(new Event('orderUpdated'));
      } catch (error) {
        toast.success("Order deleted locally.");
      }
    }
  };

  // 🚀 "Select All" এবং সিঙ্গেল চেকবক্স সিলেক্ট লজিক
  const validOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = validOrders.filter((order: any) => {
    const customerName = getCustomerFullName(order);
    const orderIdStr = String(order.orderId || order.id || order._id || '');
    const phoneStr = String(order.phone || order.customerInfo?.phone || '');

    const matchesSearch = orderIdStr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          phoneStr.includes(searchQuery);
                          
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = filteredOrders.map((o: any) => String(o.orderId || o.id || o._id));
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

  // 🚀 বাল্ক ডিলিট (সব সিলেক্ট করা অর্ডার একসাথে ডিলিট)
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedIds.length} selected order(s)?`)) {
      const remaining = orders.filter((o: any) => !selectedIds.includes(String(o.orderId || o.id || o._id)));
      setOrders(remaining);
      localStorage.setItem('mo_fashion_orders', JSON.stringify(remaining));

      const toastId = toast.loading(`Deleting ${selectedIds.length} orders from Cloud Database...`);

      for (const id of selectedIds) {
        await deleteSupabaseOrder(id).catch(() => null);
      }

      setSelectedIds([]);
      toast.success(`${selectedIds.length} orders deleted LIVE! 🎉`, { id: toastId });
      window.dispatchEvent(new Event('orderUpdated'));
    }
  };

  // 🚀 বাল্ক স্ট্যাটাস আপডেট (সব সিলেক্ট করা অর্ডারের স্ট্যাটাস একসাথে পরিবর্তন)
  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.length === 0 || !newStatus) return;

    const updatedList = orders.map((o: any) => {
      const id = String(o.orderId || o.id || o._id);
      return selectedIds.includes(id) ? { ...o, status: newStatus } : o;
    });

    setOrders(updatedList);
    localStorage.setItem('mo_fashion_orders', JSON.stringify(updatedList));

    const toastId = toast.loading(`Updating status to "${newStatus}" for ${selectedIds.length} orders...`);

    for (const id of selectedIds) {
      const found = orders.find((o: any) => String(o.orderId || o.id || o._id) === id);
      if (found) {
        await saveSupabaseOrder({ ...found, status: newStatus }).catch(() => null);
      }
    }

    setSelectedIds([]);
    toast.success(`Updated ${selectedIds.length} orders to "${newStatus}" LIVE! 🎉`, { id: toastId });
    window.dispatchEvent(new Event('orderUpdated'));
  };

  return (
    <div className="text-white pb-10 transition-all duration-300">
      <Helmet>
        <title>Admin - Orders Management | MO FASHION</title>
      </Helmet>

      {/* 🚀 Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-[#1A1A1A]/80 p-6 rounded-2xl border border-[#D4AF37]/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-[#D4AF37]/40">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center">
              <Package className="mr-3 text-[#D4AF37] animate-bounce" size={28} /> Orders Management
            </h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30 flex items-center animate-pulse shadow-sm">
              Worldwide Cloud Live Sync
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Track, process, and manage live customer orders from Supabase Cloud DB</p>
        </div>

        <button 
          onClick={() => fetchOrders(false)}
          className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 flex items-center space-x-2 font-bold text-xs"
          title="Refresh Live Orders"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* ⚡ Bulk Action Bar (appears when 1 or more orders are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md">
          <div className="flex items-center space-x-2 text-[#D4AF37] font-bold text-sm">
            <CheckSquare size={18} />
            <span>{selectedIds.length} Order(s) Selected</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <select
              onChange={(e) => {
                if (e.target.value) handleBulkUpdateStatus(e.target.value);
                e.target.value = '';
              }}
              className="bg-[#111111] border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="">Bulk Change Status...</option>
              <option value="Pending">Set Pending</option>
              <option value="Processing">Set Processing</option>
              <option value="Shipped">Set Shipped</option>
              <option value="Delivered">Set Delivered</option>
              <option value="Cancelled">Set Cancelled</option>
            </select>

            <button
              onClick={handleBulkDelete}
              className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5 active:scale-95"
            >
              <Trash2 size={14} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* 🔎 Search and Filters Section */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#D4AF37]/20 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg transition-all duration-300">
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Search by Order ID, Name or Phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 placeholder-gray-500 transition-all duration-200 text-sm"
          />
          <Search className="absolute left-3.5 top-3 text-gray-500" size={18} />
        </div>
        <div className="w-full md:w-auto">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer text-sm transition-colors font-semibold"
          >
            <option value="All">All Status ({validOrders.length})</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* 📦 Orders Table */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                    title="Select All Orders"
                  />
                </th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Order ID</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Customer</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Date & Time</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Total Amount</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#D4AF37]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
                      <p className="font-medium animate-pulse">Fetching orders live from Supabase Cloud DB...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => {
                  const customerName = getCustomerFullName(order);
                  const customerEmail = order.customerInfo ? order.customerInfo.email : (order.email || 'N/A');
                  const customerPhone = order.customerInfo ? order.customerInfo.phone : (order.phone || '');
                  const formattedDateTime = getFormattedDateTime(order);

                  const summary = getOrderSummaryObj(order);
                  const orderTotalNum = parseSafeNumber(summary.total || order.total);
                  const displayOrderId = order.orderId || order.id || order._id || '';

                  const isChecked = selectedIds.includes(String(displayOrderId));

                  return (
                    <tr key={displayOrderId || Math.random()} className={`hover:bg-[#111111] transition-all duration-200 group ${isChecked ? 'bg-[#D4AF37]/5' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(String(displayOrderId))}
                          className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-[#D4AF37] uppercase tracking-wider group-hover:scale-105 transition-transform">
                        {String(displayOrderId).startsWith('#') ? displayOrderId : `#ORD-${String(displayOrderId).slice(-6).toUpperCase()}`}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{customerName}</p>
                        <p className="text-xs text-gray-400">{customerPhone ? `Phone: ${customerPhone}` : customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-medium">{formattedDateTime}</td>
                      <td className="px-6 py-4 font-bold text-[#D4AF37]">৳{orderTotalNum.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center w-max border transition-all duration-300 ${
                          order.status === 'Delivered' ? 'text-green-400 bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/20' : 
                          order.status === 'Shipped' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-sm shadow-blue-500/20' : 
                          (order.status === 'Processing' || order.status === 'Pending') ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30 animate-pulse' :
                          order.status === 'Cancelled' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                          'text-orange-400 bg-orange-500/10 border-orange-500/30'
                        }`}>
                          {order.status === 'Delivered' && <CheckCircle size={12} className="mr-1.5" />}
                          {order.status === 'Shipped' && <Truck size={12} className="mr-1.5" />}
                          {(order.status === 'Processing' || order.status === 'Pending') && <Clock size={12} className="mr-1.5" />}
                          {order.status === 'Cancelled' && <X size={12} className="mr-1.5" />}
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleViewOrder(order)}
                            className="px-4 py-1.5 text-xs bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all duration-200 rounded-xl font-bold border border-[#D4AF37]/30 shadow-sm active:scale-95"
                          >
                            View Details
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(displayOrderId)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 bg-[#111111] rounded-xl border border-gray-800 hover:border-red-500/50 active:scale-95"
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {filteredOrders.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Package size={36} className="text-gray-600 opacity-40" />
                      <p className="text-base font-semibold text-gray-400">No orders found in database!</p>
                      <p className="text-xs text-gray-600">When a customer places an order from any device, it will appear here live in real-time.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪟 View Full Order Details Modal (A to Z Product Variants & Image Guarantee) */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#D4AF37]/20 bg-[#111111]">
              <div className="flex items-center space-x-2">
                <Sparkles className="text-[#D4AF37]" size={22} />
                <h2 className="text-xl font-serif font-bold text-[#D4AF37] uppercase tracking-wide">
                  Order Details: {selectedOrder.orderId || selectedOrder.id || selectedOrder._id}
                </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* 1. Customer Bio & Shipping Info */}
              <div className="bg-[#111111] p-5 rounded-2xl border border-gray-800/80 shadow-md space-y-3">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <h3 className="text-[#D4AF37] font-bold uppercase tracking-wider text-xs flex items-center">
                    <User size={16} className="mr-2 text-[#D4AF37]" /> Customer Bio & Shipping Info
                  </h3>
                  <span className="text-[10px] text-gray-400 flex items-center font-bold">
                    <Calendar size={12} className="mr-1 text-[#D4AF37]" />
                    {getFormattedDateTime(selectedOrder)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold">Full Name</p>
                    <p className="text-white font-bold text-sm mt-0.5">
                      {getCustomerFullName(selectedOrder)}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-xs font-semibold">Email Address</p>
                    <p className="text-white font-medium text-sm mt-0.5 flex items-center">
                      <Mail size={12} className="mr-1.5 text-gray-500" />
                      {selectedOrder.customerInfo?.email || selectedOrder.email || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-xs font-semibold">Phone Number</p>
                    <p className="text-[#D4AF37] font-bold text-sm mt-0.5 flex items-center">
                      <Phone size={12} className="mr-1.5 text-[#D4AF37]" />
                      {selectedOrder.customerInfo?.phone || selectedOrder.phone || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-xs font-semibold">Payment Method</p>
                    <p className="text-white font-bold text-sm mt-0.5 flex items-center">
                      <CreditCard size={12} className="mr-1.5 text-[#D4AF37]" />
                      {selectedOrder.paymentDetails?.method || selectedOrder.paymentMethod || 'Cash on Delivery'}
                    </p>
                  </div>

                  <div className="md:col-span-2 bg-[#1A1A1A] p-3.5 rounded-xl border border-gray-800 flex items-start space-x-3 mt-1">
                    <MapPin size={20} className="text-[#D4AF37] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Full Delivery Address</p>
                      <p className="text-white font-medium text-sm mt-1 leading-relaxed">
                        {getFullAddress(selectedOrder)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Itemized Products List (Photo, Real Name, Color, Size, Options) */}
              <div className="bg-[#111111] p-5 rounded-2xl border border-gray-800/80 shadow-md">
                <h3 className="text-[#D4AF37] font-bold mb-4 uppercase tracking-wider text-xs border-b border-gray-800 pb-2 flex items-center">
                  <Package size={16} className="mr-2 text-[#D4AF37]" /> Ordered Items ({getOrderItemsList(selectedOrder).length})
                </h3>
                
                <div className="space-y-3.5 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {getOrderItemsList(selectedOrder).length === 0 ? (
                    <p className="text-gray-500 text-xs italic text-center py-4">No product item details recorded.</p>
                  ) : (
                    getOrderItemsList(selectedOrder).map((item: any, idx: number) => {
                      const itemImg = getItemImage(item);
                      const itemQty = parseSafeNumber(item.quantity) || 1;
                      const itemPrice = parseSafeNumber(item.price);
                      const itemSubtotal = itemQty * itemPrice;

                      return (
                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-[#1A1A1A] rounded-xl border border-gray-800 gap-3">
                          <div className="flex items-center space-x-3.5">
                            <div className="w-14 h-14 rounded-xl bg-[#111111] border border-[#D4AF37]/30 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                              {itemImg ? (
                                <img src={itemImg} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={22} className="text-[#D4AF37]/60" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm line-clamp-1">{item.name || 'Ordered Fashion Item'}</p>
                              
                              {/* 🚀 কাস্টমারের নির্বাচিত রিয়েল ভ্যারিয়েন্ট: Qty, Size, Color, Custom Options */}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                                <span className="text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20 shadow-sm">
                                  Qty: x{itemQty}
                                </span>
                                {item.size && String(item.size).trim() !== '' && (
                                  <span className="bg-[#111111] px-2 py-0.5 rounded text-gray-300 border border-gray-700 shadow-sm">
                                    Size: <strong className="text-white">{item.size}</strong>
                                  </span>
                                )}
                                {item.color && String(item.color).trim() !== '' && (
                                  <span className="bg-[#111111] px-2 py-0.5 rounded text-gray-300 border border-gray-700 shadow-sm">
                                    Color: <strong className="text-white">{item.color}</strong>
                                  </span>
                                )}
                                {item.material && String(item.material).trim() !== '' && (
                                  <span className="bg-[#111111] px-2 py-0.5 rounded text-gray-300 border border-gray-700 shadow-sm">
                                    Material: <strong className="text-white">{item.material}</strong>
                                  </span>
                                )}
                                
                                {/* 🚀 Any Other Dynamic Variant Options */}
                                {Array.isArray(item.selectedVariants) ? (
                                  item.selectedVariants.map((v: any, vIdx: number) => (
                                    <span key={vIdx} className="bg-[#111111] px-2 py-0.5 rounded text-gray-300 border border-gray-700 shadow-sm capitalize">
                                      {v.name || v.label || 'Option'}: <strong className="text-white">{v.value || v.option || v.options || ''}</strong>
                                    </span>
                                  ))
                                ) : typeof item.selectedVariants === 'object' && item.selectedVariants !== null ? (
                                  Object.entries(item.selectedVariants).map(([key, val], vIdx) => (
                                    <span key={vIdx} className="bg-[#111111] px-2 py-0.5 rounded text-gray-300 border border-gray-700 shadow-sm capitalize">
                                      {key}: <strong className="text-white">{String(val)}</strong>
                                    </span>
                                  ))
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="text-right sm:self-center">
                            <p className="font-bold text-[#D4AF37] text-base">৳{itemSubtotal.toFixed(2)}</p>
                            {itemQty > 1 && <p className="text-[10px] text-gray-500">৳{itemPrice.toFixed(2)} each</p>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 3. Cost & Coupon Breakdown */}
                {(() => {
                  const summary = getOrderSummaryObj(selectedOrder);
                  const subtotalNum = parseSafeNumber(summary.subtotal);
                  const shipNum = parseSafeNumber(summary.shipping);
                  const taxNum = parseSafeNumber(summary.tax);
                  const discountNum = parseSafeNumber(summary.discount);
                  const totalNum = parseSafeNumber(summary.total || selectedOrder.total);

                  return (
                    <div className="pt-3 border-t border-gray-800/80 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal:</span>
                        <span className="text-white font-medium">৳{subtotalNum.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-gray-400">
                        <span>Shipping Fee:</span>
                        <span className="text-[#D4AF37] font-bold">৳{shipNum.toFixed(2)}</span>
                      </div>

                      {taxNum > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Tax:</span>
                          <span className="text-white font-medium">৳{taxNum.toFixed(2)}</span>
                        </div>
                      )}

                      {summary.couponCode && (
                        <div className="flex justify-between items-center text-green-400 bg-green-500/10 p-2.5 rounded-xl border border-green-500/20 font-bold">
                          <span className="flex items-center">
                            <Tag size={12} className="mr-1.5" />
                            Coupon Applied ({summary.couponCode}):
                          </span>
                          <span>-৳{discountNum.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2.5 border-t border-gray-800 text-sm">
                        <span className="text-white font-bold">Grand Total Amount:</span>
                        <span className="text-[#D4AF37] font-bold text-2xl tracking-wide">
                          ৳{totalNum.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 4. Order Status Actions */}
              <div className="bg-[#111111] p-5 rounded-2xl border border-gray-800">
                <label className="block text-gray-300 text-xs uppercase tracking-wider mb-3 font-bold">Update Order Status Live</label>
                <div className="flex flex-wrap gap-2.5">
                  {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(status)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${
                        selectedOrder.status === status
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 scale-105'
                        : 'bg-[#1A1A1A] text-gray-400 border-gray-700 hover:border-[#D4AF37] hover:text-[#D4AF37]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
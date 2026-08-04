import { useState, useEffect } from 'react';
import { 
  Search, X, Package, Clock, CheckCircle, Truck, MapPin, 
  Trash2, Tag, RefreshCw, Sparkles, User
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

  // 🚀 ১. সরাসরি Supabase Cloud Database থেকে ১০০% লাইভ অল-ডিভাইস অর্ডার ফেচিং (A to Z Details Sync)
  const fetchOrders = async () => {
    setLoading(true);

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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // 🚀 ২. Supabase WebSocket Realtime Listener (কাস্টমার অন্য যেকোনো ডিভাইস থেকে অর্ডার করলে ১ সেকেন্ডে এডমিন প্যানেলে সিঙ্ক হবে)
    const channel = supabase
      .channel('public:orders:admin:live:guaranteed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const handleStorageChange = () => fetchOrders();
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

  // 🚀 ৩. অর্ডারের স্ট্যাটাস ক্লাউড ডাটাবেসে রিয়েল-টাইম আপডেট করা (Pending, Processing, Shipped, Delivered, Cancelled)
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    const orderId = String(selectedOrder._id || selectedOrder.id || selectedOrder.orderId);

    const updatedOrderObj = { ...selectedOrder, status: newStatus };

    // ১. লোকাল স্টোরেজ ইনস্ট্যান্ট আপডেট
    const updatedList = orders.map((o: any) => 
      String(o._id || o.id || o.orderId) === orderId ? updatedOrderObj : o
    );
    setOrders(updatedList);
    localStorage.setItem('mo_fashion_orders', JSON.stringify(updatedList));
    setSelectedOrder(updatedOrderObj);

    // ২. ক্লাউড ডাটাবেসে পার্মানেন্ট সেভ
    try {
      await saveSupabaseOrder(updatedOrderObj);
      toast.success(`Order status updated to "${newStatus}" LIVE! 🎉`);
      window.dispatchEvent(new Event('orderUpdated'));
    } catch (error) {
      toast.success(`Status updated to "${newStatus}" locally.`);
    }
  };

  // 🚀 ৪. ডাটাবেস থেকে অর্ডার ডিলিট করা
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

  // সার্চ এবং স্ট্যাটাস ফিল্টার লজিক
  const validOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = validOrders.filter((order: any) => {
    const customerName = order.customerInfo 
      ? `${order.customerInfo.firstName || ''} ${order.customerInfo.lastName || ''}` 
      : (order.customer || 'Unknown Customer');
    const orderIdStr = String(order.orderId || order.id || order._id || '');
    const phoneStr = String(order.phone || order.customerInfo?.phone || '');

    const matchesSearch = orderIdStr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          phoneStr.includes(searchQuery);
                          
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

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
              All Devices Cloud Live
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Track, process, and manage live customer orders from Supabase Cloud DB</p>
        </div>

        <button 
          onClick={fetchOrders}
          className="p-2.5 bg-[#111111] hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all duration-200 active:scale-95 flex items-center space-x-2 font-bold text-xs"
          title="Refresh Live Orders"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Orders</span>
        </button>
      </div>

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
            className="w-full bg-[#111111] border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer text-sm transition-colors"
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

      {/* 📦 Orders Table with Live Supabase Sync */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl transition-all duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#111111] border-b border-[#D4AF37]/20">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Order ID</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Customer</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Date</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Total</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-gray-300 uppercase text-xs tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#D4AF37]">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="animate-spin w-8 h-8 text-[#D4AF37]" />
                      <p className="font-medium animate-pulse">Fetching orders live from Supabase Cloud DB...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => {
                  const customerName = order.customerInfo 
                    ? `${order.customerInfo.firstName || ''} ${order.customerInfo.lastName || ''}` 
                    : (order.customer || 'Unknown Customer');
                  const customerEmail = order.customerInfo ? order.customerInfo.email : (order.email || 'N/A');
                  const customerPhone = order.customerInfo ? order.customerInfo.phone : (order.phone || '');
                  
                  let orderDate = 'Recent';
                  if (order.createdAt) orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  else if (order.date) orderDate = order.date;

                  const orderTotal = order.orderSummary ? order.orderSummary.total : (order.total || 0);
                  const displayOrderId = order.orderId || order._id || order.id || '';

                  return (
                    <tr key={displayOrderId || Math.random()} className="hover:bg-[#111111] transition-all duration-200 group">
                      <td className="px-6 py-4 font-bold text-[#D4AF37] uppercase tracking-wider group-hover:scale-105 transition-transform">
                        {String(displayOrderId).startsWith('#') ? displayOrderId : `#ORD-${String(displayOrderId).slice(-6).toUpperCase()}`}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{customerName}</p>
                        <p className="text-xs text-gray-400">{customerPhone ? `Phone: ${customerPhone}` : customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{orderDate}</td>
                      <td className="px-6 py-4 font-bold text-[#D4AF37]">৳{Number(orderTotal).toFixed(2)}</td>
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
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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

      {/* 🪟 View Full Order Details Modal (A to Z Details) */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-[#D4AF37]/20 bg-[#111111]">
              <h2 className="text-xl font-serif font-bold text-[#D4AF37] uppercase flex items-center tracking-wide">
                <Sparkles className="mr-2 text-[#D4AF37]" size={22} />
                Order ID: {selectedOrder.orderId || selectedOrder.id || selectedOrder._id}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Customer Info */}
              <div className="bg-[#111111] p-5 rounded-2xl border border-gray-800/80 shadow-md">
                <h3 className="text-[#D4AF37] font-bold mb-4 uppercase tracking-wider text-xs border-b border-gray-800 pb-2 flex items-center">
                  <User size={16} className="mr-2 text-[#D4AF37]" /> Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Full Name</p>
                    <p className="text-white font-medium text-sm">
                      {selectedOrder.customerInfo ? `${selectedOrder.customerInfo.firstName || ''} ${selectedOrder.customerInfo.lastName || ''}` : selectedOrder.customer}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Email Address</p>
                    <p className="text-white font-medium text-sm">{selectedOrder.customerInfo ? selectedOrder.customerInfo.email : selectedOrder.email}</p>
                  </div>
                  <div className="md:col-span-2 flex items-start space-x-2.5 mt-2 bg-[#1A1A1A] p-3 rounded-xl border border-gray-800">
                    <MapPin size={18} className="text-[#D4AF37] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs font-semibold">Shipping Address</p>
                      <p className="text-white font-medium text-sm mt-0.5">
                        {selectedOrder.customerInfo 
                          ? `${selectedOrder.customerInfo.address || ''}, ${selectedOrder.customerInfo.city || ''} ${selectedOrder.customerInfo.postalCode ? '- ' + selectedOrder.customerInfo.postalCode : ''}` 
                          : selectedOrder.address}
                      </p>
                      <p className="text-[#D4AF37] text-xs font-bold mt-1">Phone Number: {selectedOrder.customerInfo ? selectedOrder.customerInfo.phone : selectedOrder.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items & Breakdown */}
              <div className="bg-[#111111] p-5 rounded-2xl border border-gray-800/80 shadow-md">
                <h3 className="text-[#D4AF37] font-bold mb-4 uppercase tracking-wider text-xs border-b border-gray-800 pb-2 flex items-center">
                  <Package size={16} className="mr-2 text-[#D4AF37]" /> Order Summary
                </h3>
                
                <div className="space-y-3 mb-4">
                  {(selectedOrder.orderItems || selectedOrder.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-800/60 pb-2.5 last:border-0 last:pb-0">
                      <div>
                        <span className="text-white font-medium">{item.name || 'Fashion Item'}</span>
                        <span className="text-[#D4AF37] font-bold text-xs ml-2 bg-[#D4AF37]/10 px-2 py-0.5 rounded-md border border-[#D4AF37]/20">
                          x{item.quantity || 1}
                        </span>
                        {item.size && <span className="text-xs text-gray-500 ml-2">Size: {item.size}</span>}
                      </div>
                      <span className="text-white font-bold">৳{(Number(item.price) * Number(item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mb-2 text-sm pt-2 border-t border-gray-800/60">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-white font-medium bg-gray-800/80 px-2.5 py-1 rounded-md text-xs">{selectedOrder.paymentDetails?.method || selectedOrder.paymentMethod || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center mb-3 text-sm">
                  <span className="text-gray-400">Shipping Charge:</span>
                  <span className="text-white font-medium">৳{Number(selectedOrder.orderSummary?.shipping || 0).toFixed(2)}</span>
                </div>

                {selectedOrder.orderSummary?.couponCode && (
                  <div className="flex justify-between items-center mb-3 text-sm text-green-400 bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">
                    <span className="flex items-center font-bold text-xs">
                      <Tag size={14} className="mr-1.5" />
                      Coupon Applied ({selectedOrder.orderSummary.couponCode})
                    </span>
                    <span className="font-bold">-৳{Number(selectedOrder.orderSummary.discount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <span className="text-white font-bold text-base">Total Amount:</span>
                  <span className="text-[#D4AF37] font-bold text-2xl tracking-wide">
                    ৳{Number(selectedOrder.orderSummary?.total || selectedOrder.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status Update Action */}
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
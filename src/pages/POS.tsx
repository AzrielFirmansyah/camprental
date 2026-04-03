import React, { useEffect, useState, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, Calendar, User, Phone, CheckCircle2, AlertCircle, Printer, X } from 'lucide-react';
import { addDays, format, differenceInDays } from 'date-fns';

export default function POS() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransactionAmount, setLastTransactionAmount] = useState(0);
  const [lastTransactionData, setLastTransactionData] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [isDiscountDropdownOpen, setIsDiscountDropdownOpen] = useState(false);
  const [discountName, setDiscountName] = useState('Tidak Ada Diskon');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const [itemsRes, statusesRes, discountsRes, paymentsRes] = await Promise.allSettled([
          fetchApi('/items'),
          fetchApi('/item_statuses'),
          fetchApi('/discounts'),
          fetchApi('/payment_methods')
        ]);
        
        const itemsData = itemsRes.status === 'fulfilled' ? itemsRes.value : [];
        const statusData = statusesRes.status === 'fulfilled' ? statusesRes.value : [];
        const discountData = discountsRes.status === 'fulfilled' ? discountsRes.value : [];
        const paymentData = paymentsRes.status === 'fulfilled' ? paymentsRes.value : [];
        
        setDiscounts(discountData);
        setPaymentMethods(paymentData);
        if (paymentData.length > 0) setPaymentMethod(paymentData[0].name);
        
        // Find which status is considered 'Available' (can be 'available', 'ada', 'tersedia', 'ready', 'menipis')
        const availableStatusNames = statusData
          .filter((s: any) => ['available', 'ada', 'tersedia', 'ready', 'menipis'].includes(s.name.toLowerCase()))
          .map((s: any) => s.name.toLowerCase());
        
        // If no recognizable available status, we'll allow all statuses as long as they aren't 'maintenance' or 'habis'
        const filteredItems = itemsData.filter((i: any) => {
          const s = i.status?.toLowerCase();
          const hasStock = i.availableStock > 0;
          
          if (availableStatusNames.length > 0) {
            return (availableStatusNames.includes(s) || s === 'ada' || s === 'menipis') && hasStock;
          }
          
          // Fallback: exclude only known bad statuses
          return !['maintenance', 'habis', 'out of stock', 'perbaikan'].includes(s) && hasStock;
        });

        // Sort items: Tenda first, then by category, then by name
        const sortedItems = [...filteredItems].sort((a, b) => {
          const catA = a.categoryName?.toLowerCase() || '';
          const catB = b.categoryName?.toLowerCase() || '';
          
          if (catA === 'tenda' && catB !== 'tenda') return -1;
          if (catA !== 'tenda' && catB === 'tenda') return 1;
          
          if (catA !== catB) return catA.localeCompare(catB);
          return a.name.localeCompare(b.name);
        });

        setItems(sortedItems);
      } catch (error) {
        console.error('Failed to load items', error);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const durationDays = Math.max(1, differenceInDays(new Date(endDate), new Date(startDate)));

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity < item.availableStock) {
        setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQ = c.quantity + delta;
        if (newQ > 0 && newQ <= c.availableStock) {
          return { ...c, quantity: newQ };
        }
      }
      return c;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const calculateItemPrice = (item: any) => {
    const weeks = Math.floor(durationDays / 7);
    const days = durationDays % 7;
    return (weeks * item.weeklyPrice) + (days * item.dailyPrice);
  };

  const subtotal = cart.reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0);
  const discountAmount = Math.round((subtotal * discount) / 100);
  const totalAmount = subtotal - discountAmount;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Cart is empty');
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        customerName,
        customerPhone,
        startDate,
        endDate,
        durationDays,
        paymentMethod,
        discount,
        subtotal,
        discountAmount,
        items: cart.map(c => ({
          itemId: c.id,
          name: c.name,
          quantity: c.quantity,
          price: calculateItemPrice(c)
        })),
        totalAmount: totalAmount,
        date: format(new Date(), 'dd MMM yyyy HH:mm')
      };

      await fetchApi('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setLastTransactionAmount(totalAmount);
      setLastTransactionData(payload);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('Cash');
      setDiscount(0);
      
      // Reload items to update stock
      const data = await fetchApi('/items');
      const statusesRes = await fetchApi('/item_statuses').catch(() => []);
      
      const statusData = statusesRes || [];
      const availableStatusNames = statusData
        .filter((s: any) => ['available', 'ada', 'tersedia', 'ready', 'menipis'].includes(s.name.toLowerCase()))
        .map((s: any) => s.name.toLowerCase());

      const finalItems = data.filter((i: any) => {
        const s = i.status?.toLowerCase();
        const hasStock = i.availableStock > 0;
        if (availableStatusNames.length > 0) return (availableStatusNames.includes(s) || s === 'ada' || s === 'menipis') && hasStock;
        return !['maintenance', 'habis', 'out of stock', 'perbaikan'].includes(s) && hasStock;
      });

      const finalSortedItems = [...finalItems].sort((a, b) => {
        const catA = a.categoryName?.toLowerCase() || '';
        const catB = b.categoryName?.toLowerCase() || '';
        if (catA === 'tenda' && catB !== 'tenda') return -1;
        if (catA !== 'tenda' && catB === 'tenda') return 1;
        if (catA !== catB) return catA.localeCompare(catB);
        return a.name.localeCompare(b.name);
      });
      setItems(finalSortedItems);
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll to top of items container
    const container = document.getElementById('pos-items-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Sewa Outdoor Sameton</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #1c1917; }
            .receipt { max-width: 300px; margin: 0 auto; border: 1px dashed #d6d3d1; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { font-size: 18px; font-weight: 800; color: #059669; margin-bottom: 4px; }
            .address { font-size: 10px; color: #78716c; }
            .divider { border-top: 1px dashed #d6d3d1; margin: 12px 0; }
            .info { font-size: 12px; margin-bottom: 12px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .label { color: #78716c; }
            .items { width: 100%; border-collapse: collapse; font-size: 12px; }
            .items th { text-align: left; border-bottom: 1px solid #e7e5e4; padding-bottom: 8px; color: #78716c; font-weight: 600; }
            .items td { padding: 8px 0; border-bottom: 1px solid #f5f5f4; }
            .total-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; margin-top: 12px; }
            .footer { text-align: center; font-size: 10px; color: #78716c; margin-top: 30px; }
          </style>
        </head>
        <body onload="window.print();window.close()">
          <div class="receipt">
            <div class="header">
              <div class="logo">SEWA OUTDOOR SAMETON</div>
              <div class="address">Penyewaan Alat Camping Terlengkap</div>
            </div>
            <div class="divider"></div>
            <div class="info">
              <div class="info-row"><span class="label">Tanggal:</span> <span>${lastTransactionData?.date}</span></div>
              <div class="info-row"><span class="label">Pelanggan:</span> <span>${lastTransactionData?.customerName}</span></div>
              <div class="info-row"><span class="label">Metode:</span> <span>${lastTransactionData?.paymentMethod}</span></div>
            </div>
            <div class="divider"></div>
            <table class="items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center">Qty</th>
                  <th style="text-align: right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lastTransactionData?.items.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td style="text-align: center">${item.quantity}</td>
                    <td style="text-align: right">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.price * item.quantity)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="divider"></div>
            <div class="info">
              <div class="info-row"><span class="label">Subtotal:</span> <span>${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(lastTransactionData?.subtotal)}</span></div>
              ${lastTransactionData?.discount > 0 ? `
              <div class="info-row"><span class="label">Discount (${lastTransactionData.discount}%):</span> <span style="color: #ef4444">-${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(lastTransactionData.discountAmount)}</span></div>
              ` : ''}
            </div>
            <div class="divider"></div>
            <div class="total-row">
              <span>TOTAL</span>
              <span>${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(lastTransactionAmount)}</span>
            </div>
            <div class="footer">
              Terima kasih telah menyewa di<br/>Sewa Outdoor Sameton!<br/>Semoga petualangan Anda menyenangkan.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full relative">
      {/* Items Selection */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4" id="pos-items-container">
          {loading ? (
            <div className="text-center py-10 text-stone-500">Loading items...</div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                {currentItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => addToCart(item)}
                    className="border border-stone-200 rounded-xl p-4 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex flex-col h-full bg-white group active:scale-95"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-stone-900 line-clamp-1 group-hover:text-emerald-700 transition-colors uppercase text-sm tracking-tight">{item.name}</h3>
                      <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">{item.categoryName}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-end justify-between">
                      <div>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(item.dailyPrice)}<span className="text-[10px] font-normal text-stone-500">/day</span></p>
                        <p className="text-[10px] font-medium text-stone-500">{item.availableStock} available</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {!loading && totalPages > 1 && (
                <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden shrink-0">
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center gap-2">
          <ShoppingCart size={20} className="text-stone-700" />
          <h2 className="text-lg font-bold text-stone-900">Current Rental</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 border border-stone-100 rounded-xl bg-stone-50"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-stone-900 truncate">{item.name}</h4>
                    <p className="text-xs text-stone-500">{formatCurrency(calculateItemPrice(item))} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-md hover:bg-stone-200 text-stone-600">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-md hover:bg-stone-200 text-stone-600">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="p-1 rounded-md hover:bg-red-100 text-red-500 ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50">
          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-stone-400" />
                </div>
                <input required type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={16} className="text-stone-400" />
                </div>
                <input required type="tel" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Start Date</label>
                  <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">End Date</label>
                  <input required type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-stone-500">Duration</span>
                <span className="text-sm font-medium text-stone-900">{durationDays} Days</span>
              </div>
              <div className="flex justify-between items-center mb-4 relative">
                <span className="text-sm text-stone-500">Payment</span>
                <div className="relative w-32">
                  <button
                    type="button"
                    onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                    className="w-full px-2 py-1.5 flex items-center justify-between border border-stone-300 rounded-lg text-sm font-medium text-stone-700 bg-white hover:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-200"
                  >
                    <span className="truncate">{paymentMethod}</span>
                    <Plus size={12} className={`transition-transform ${isPaymentDropdownOpen ? 'rotate-45' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isPaymentDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full right-0 mb-2 w-40 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="max-h-40 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                          {paymentMethods.map((p: any) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setPaymentMethod(p.name); setIsPaymentDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${paymentMethod === p.name ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'}`}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex justify-between items-center mb-4 relative">
                <span className="text-sm text-stone-500">Discount</span>
                <div className="relative w-32">
                  <button
                    type="button"
                    onClick={() => setIsDiscountDropdownOpen(!isDiscountDropdownOpen)}
                    className="w-full px-2 py-1.5 flex items-center justify-between border border-stone-300 rounded-lg text-sm font-medium text-emerald-600 bg-white hover:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-200"
                  >
                    <span className="truncate">{discount > 0 ? `${discount}%` : '0%'}</span>
                    <Plus size={12} className={`transition-transform ${isDiscountDropdownOpen ? 'rotate-45' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isDiscountDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="max-h-40 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                          <button
                            type="button"
                            onClick={() => { setDiscount(0); setDiscountName('Tidak Ada Diskon'); setIsDiscountDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${discount === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'}`}
                          >
                            0% (Tidak Ada)
                          </button>
                          {discounts.map((d: any) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => { setDiscount(d.percentage); setDiscountName(d.name); setIsDiscountDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mt-0.5 ${discount === d.percentage ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="truncate">{d.name}</span>
                                <span className="font-bold">{d.percentage}%</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="space-y-1 pt-2 border-t border-stone-100 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-500">Subtotal</span>
                  <span className="text-xs font-medium text-stone-700">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-500">Diskon ({discount}%)</span>
                  <span className={`text-xs font-medium ${discount > 0 ? 'text-red-500' : 'text-stone-400'}`}>
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-4 pt-4 border-t border-stone-100">
                <span className="text-base font-bold text-stone-900">Total</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(totalAmount)}</span>
              </div>
              <button 
                type="submit" 
                disabled={cart.length === 0 || submitting}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? 'Processing...' : 'Complete Rental'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowConfirmModal(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center gap-3 mb-4 text-amber-600">
                  <AlertCircle size={24} />
                  <h3 className="text-xl font-bold text-stone-900">Confirm Rental</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Customer:</span>
                      <span className="font-bold text-stone-900">{customerName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Phone:</span>
                      <span className="font-medium text-stone-900">{customerPhone}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Duration:</span>
                      <span className="font-medium text-stone-900">{durationDays} Days ({format(new Date(startDate), 'dd MMM')} - {format(new Date(endDate), 'dd MMM')})</span>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-stone-100 rounded-xl">
                    <table className="min-w-full divide-y divide-stone-100">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-bold text-stone-500 uppercase tracking-wider">Item</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold text-stone-500 uppercase tracking-wider">Qty</th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-stone-50">
                        {cart.map(item => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-xs text-stone-700 font-medium truncate max-w-[120px]">{item.name}</td>
                            <td className="px-3 py-2 text-xs text-stone-700 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-xs text-stone-900 font-bold text-right">{formatCurrency(calculateItemPrice(item) * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="text-[10px] text-stone-500">Method: <span className="font-bold text-stone-700 uppercase">{paymentMethod}</span></div>
                      {discount > 0 && <div className="text-[10px] text-red-500 font-medium">Discount: {discount}% (-{formatCurrency(discountAmount)})</div>}
                      <div className="text-[10px] text-stone-500">Subtotal: {formatCurrency(subtotal)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Total Amount</div>
                      <div className="text-xl font-bold text-emerald-600 leading-none mt-1">{formatCurrency(totalAmount)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse gap-3 border-t border-stone-200">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={executeSubmit}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  {submitting ? 'Processing...' : 'Confirm & Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full inline-flex justify-center rounded-xl border border-stone-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Check Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowSuccessModal(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-xl leading-6 font-bold text-stone-900 mb-2">Transaksi Berhasil!</h3>
                <p className="text-sm text-stone-500 mb-4">
                  Penyewaan telah tercatat di sistem. Silakan cetak struk untuk pelanggan.
                </p>
                <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-700 font-medium mb-4 border border-stone-100">
                  Total dibayar: {formatCurrency(lastTransactionAmount)}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors"
                  >
                    <Printer size={18} />
                    Cetak Struk
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors"
                  >
                    Lihat Preview Struk
                  </button>
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 flex justify-center border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full inline-flex justify-center rounded-xl border border-stone-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900 opacity-75" onClick={() => setShowReceiptModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
               <div className="absolute top-4 right-4 print:hidden">
                 <button onClick={() => setShowReceiptModal(false)} className="p-1 hover:bg-stone-100 rounded-full transition-colors text-stone-400">
                   <X size={20} />
                 </button>
               </div>
               
               <div className="p-8" ref={receiptRef}>
                  <div className="text-center mb-6">
                    <div className="text-xl font-black text-emerald-600 tracking-tighter">SEWA OUTDOOR SAMETON</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">Penyewaan Alat Camping & Outdoor</div>
                  </div>

                  <div className="border-t border-dashed border-stone-200 my-4"></div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-stone-400">Tanggal:</span>
                      <span className="text-stone-900 font-medium">{lastTransactionData?.date}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-stone-400">Pelanggan:</span>
                      <span className="text-stone-900 font-medium">{lastTransactionData?.customerName}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-stone-400">Pembayaran:</span>
                      <span className="text-stone-900 font-medium">{lastTransactionData?.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-stone-200 my-4"></div>

                  <table className="w-full text-[11px] mb-4">
                    <thead>
                      <tr className="text-stone-400">
                        <th className="text-left font-normal pb-2">Item</th>
                        <th className="text-center font-normal pb-2">Qty</th>
                        <th className="text-right font-normal pb-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-stone-700">
                      {lastTransactionData?.items.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="py-1.5">{item.name}</td>
                          <td className="py-1.5 text-center">{item.quantity}</td>
                          <td className="py-1.5 text-right font-medium">{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t border-dashed border-stone-200 my-4"></div>

                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-stone-400">Subtotal:</span>
                      <span className="text-stone-900 font-medium">{formatCurrency(lastTransactionData?.subtotal)}</span>
                    </div>
                    {lastTransactionData?.discount > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-stone-400">Discount ({lastTransactionData.discount}%):</span>
                        <span className="text-red-500 font-medium">-{formatCurrency(lastTransactionData.discountAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-stone-200 my-4"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-900">TOTAL</span>
                    <span className="text-base font-black text-emerald-600">{formatCurrency(lastTransactionAmount)}</span>
                  </div>

                  <div className="mt-10 text-center space-y-1">
                    <div className="text-[11px] font-bold text-stone-900">Terima Kasih Telah Menyewa!</div>
                    <div className="text-[10px] text-stone-400">Semoga petualangan Anda menyenangkan bersama Sewa Outdoor Sameton.</div>
                  </div>
               </div>
               
               <div className="bg-stone-50 p-4 border-t border-stone-100 flex gap-3 print:hidden">
                 <button 
                   onClick={handlePrint}
                   className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                 >
                   <Printer size={18} />
                   Cetak Sekarang
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

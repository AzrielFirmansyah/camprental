import { useEffect, useState, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Printer,
  X,
  MessageCircle,
  Search,
  History,
  ShieldCheck,
  Wallet,
  Clock,
  PackageCheck,
  ChevronDown,
  Percent
} from 'lucide-react';
import { addDays, format, differenceInDays } from 'date-fns';
import { useNotifications } from '../components/NotificationContext';

export default function POS() {
  const [activeTab, setActiveTab] = useState<'rental' | 'return'>('rental');
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [guarantee, setGuarantee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [activeTransactions, setActiveTransactions] = useState<any[]>([]);
  const [selectedReturnTx, setSelectedReturnTx] = useState<any>(null);
  const [fineAmount, setFineAmount] = useState<string>('0');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastTransactionAmount, setLastTransactionAmount] = useState(0);
  const [lastTransactionData, setLastTransactionData] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [isDiscountDropdownOpen, setIsDiscountDropdownOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { addNotification } = useNotifications();
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, statusesRes, discountsRes, paymentsRes, catsRes, txRes] = await Promise.allSettled([
        fetchApi('/items'),
        fetchApi('/item_statuses'),
        fetchApi('/discounts'),
        fetchApi('/payment_methods'),
        fetchApi('/categories'),
        fetchApi('/transactions')
      ]);

      const itemsData = itemsRes.status === 'fulfilled' ? itemsRes.value : [];
      const statusData = statusesRes.status === 'fulfilled' ? statusesRes.value : [];
      setDiscounts(discountsRes.status === 'fulfilled' ? discountsRes.value : []);
      const payData = paymentsRes.status === 'fulfilled' ? paymentsRes.value : [];
      setPaymentMethods(payData);
      if (payData.length > 0 && !paymentMethod) setPaymentMethod(payData[0].name);

      const catsData = catsRes.status === 'fulfilled' ? catsRes.value : [];
      setCategories(catsData);

      const txData = txRes.status === 'fulfilled' ? txRes.value : [];
      setActiveTransactions(txData.filter((t: any) => t.status === 'active'));

      const availableStatusNames = statusData
        .filter((s: any) => ['available', 'ada', 'tersedia', 'ready', 'menipis'].includes(s.name.toLowerCase()))
        .map((s: any) => s.name.toLowerCase());

      const filteredItems = itemsData.filter((i: any) => {
        const s = i.status?.toLowerCase();
        const hasStock = i.availableStock > 0;
        return (availableStatusNames.length > 0 ? (availableStatusNames.includes(s) || s === 'ada' || s === 'menipis') : !['maintenance', 'habis'].includes(s)) && hasStock;
      });

      setItems(filteredItems);
    } catch (error) {
      console.error('Failed to load POS data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const durationDays = Math.max(1, differenceInDays(new Date(endDate), new Date(startDate)));

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity < item.availableStock) {
        setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      } else {
        addNotification('warning', 'Stok Habis', `Hanya tersedia ${item.availableStock} untuk ${item.name}`);
      }
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const calculateItemPrice = (item: any) => {
    const weeks = Math.floor(durationDays / 7);
    const days = durationDays % 7;
    return (weeks * item.weeklyPrice) + (days * item.dailyPrice);
  };

  const subtotal = cart.reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0);
  const discountAmount = Math.round((subtotal * discount) / 100);
  const totalAmount = subtotal - discountAmount;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return addNotification('error', 'Keranjang Kosong', 'Pilih minimal 1 barang dahulu.');
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const payloadItems = cart.map(c => ({
        itemId: c.id,
        name: c.name,
        quantity: c.quantity,
        price: calculateItemPrice(c)
      }));

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
        totalAmount,
        guarantee,
        items: payloadItems
      };

      const result = await fetchApi('/transactions', { method: 'POST', body: JSON.stringify(payload) });

      setLastTransactionAmount(totalAmount);
      setLastTransactionData({
        ...payload,
        id: result.id,
        date: format(new Date(), 'dd MMM yyyy HH:mm')
      });
      setShowConfirmModal(false);
      setShowSuccessModal(true);

      // Reset
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setGuarantee('');
      setDiscount(0);
      loadData();
    } catch (error) {
      console.error('Submit Failed', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnAction = async (tx: any) => {
    setSelectedReturnTx(tx);
    setFineAmount('0');
  };

  const executeReturn = async () => {
    if (!selectedReturnTx) return;
    setSubmitting(true);
    try {
      await fetchApi(`/transactions/${selectedReturnTx.id}/return`, {
        method: 'POST',
        body: JSON.stringify({ fineAmount: parseInt(fineAmount) })
      });
      addNotification('success', 'Pengembalian Berhasil', `Pesanan ${selectedReturnTx.customerName} telah dikembalikan.`);
      setSelectedReturnTx(null);
      loadData();
    } catch (err) {
      console.error('Return Failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredItems = items.filter(i => {
    const matchCat = selectedCategory === 'all' || i.categoryId?.toString() === selectedCategory;
    const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const handlePrint = () => {
    const tx = lastTransactionData;
    if (!tx) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk - Sewa Outdoor Sameton</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 300px; margin: 0 auto; }
            .header { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .info { font-size: 12px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .item { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
            .total { font-weight: bold; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { text-align: center; font-size: 10px; margin-top: 15px; }
          </style>
        </head>
        <body onload="window.print();window.close()">
          <div class="header">SEWA OUTDOOR SAMETON</div>
          <div style="text-align:center; font-size:10px; margin-bottom:10px;">Dapatkan Alat Outdoor Berkualitas</div>
          <div class="divider"></div>
          <div class="info">
            <div>ID: TX-${tx.id}</div>
            <div>Tgl: ${tx.date}</div>
            <div>Pelp: ${tx.customerName}</div>
            <div>Durasi: ${tx.durationDays} Hari</div>
          </div>
          <div class="divider"></div>
          ${tx.items.map((i: any) => `
            <div class="item">
              <span>${i.name} x${i.quantity}</span>
              <span>${formatCurrency(i.price * i.quantity)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item"><span>Subtotal</span> <span>${formatCurrency(tx.subtotal)}</span></div>
          ${tx.discount > 0 ? `<div class="item"><span>Diskon (${tx.discount}%)</span> <span>-${formatCurrency(tx.discountAmount)}</span></div>` : ''}
          <div class="item total"><span>TOTAL</span> <span>${formatCurrency(tx.totalAmount)}</span></div>
          <div class="divider"></div>
          <div style="font-size:10px; margin-top:5px;">Jaminan: ${tx.guarantee || '-'}</div>
          <div class="footer">Terima Kasih Telah Bertransaksi<br/>Semoga Menyenangkan!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSendInvoiceWA = () => {
    if (!lastTransactionData) return;
    const tx = lastTransactionData;
    const itemsText = tx.items.map((i: any) => `- ${i.name} (x${i.quantity}) = Rp ${(i.price * i.quantity).toLocaleString('id-ID')}`).join('%0A');
    const discountText = tx.discount > 0 ? `%0ADiskon (${tx.discount}%): -Rp ${tx.discountAmount.toLocaleString('id-ID')}` : '';
    const jaminanText = tx.guarantee ? `%0AJaminan: ${tx.guarantee}` : '';
    const message = `Halo Kak ${tx.customerName},%0A%0ATerima kasih telah menyewa alat camping di *Sewa Outdoor Sameton Tulangan Sidoarjo*.%0A%0A*Rincian Sewa:*%0ATanggal: ${format(new Date(tx.startDate), 'dd MMM yyyy')} s/d ${format(new Date(tx.endDate), 'dd MMM yyyy')} (${tx.durationDays} hari)%0A%0A*Item:*%0A${itemsText}${discountText}${jaminanText}%0A%0A*Total Bayar:* Rp ${tx.totalAmount.toLocaleString('id-ID')}%0AMetode Bayar: ${tx.paymentMethod}%0A%0A_Semoga petualangan Anda menyenangkan!😊_`;
    let phone = tx.customerPhone;
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    phone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="flex flex-col h-auto lg:h-full gap-4">
      {/* Tab Switcher */}
      <div className="flex bg-stone-200/50 p-1 rounded-xl w-fit self-center sm:self-start">
        <button
          onClick={() => setActiveTab('rental')}
          className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[10px] md:text-sm transition-all uppercase tracking-tight ${activeTab === 'rental' ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500 hover:text-stone-700'}`}
        >
          <ShoppingCart size={isMobile ? 14 : 18} />
          <span>Rental POS</span>
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[10px] md:text-sm transition-all uppercase tracking-tight ${activeTab === 'return' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-stone-700'}`}
        >
          <History size={isMobile ? 14 : 18} />
          <span>Pengembalian</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden pb-32 lg:pb-0">
        {activeTab === 'rental' ? (
          <>
            {/* Left Side: Items Catalog */}
            <div className="flex-1 flex flex-col min-w-0 gap-4 lg:overflow-hidden relative">
              <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-stone-200 space-y-3 md:space-y-4 sticky top-0 md:relative z-20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={isMobile ? 16 : 18} />
                  <input
                    type="text"
                    placeholder="Cari alat camping..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 md:py-3 bg-stone-50 border border-stone-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs md:text-sm font-bold uppercase tracking-tight"
                  />
                </div>
                {/* Categories */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-sm font-black whitespace-nowrap transition-all uppercase tracking-widest ${selectedCategory === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                  >
                    Semua
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id.toString())}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-sm font-black whitespace-nowrap transition-all uppercase tracking-widest ${selectedCategory === cat.id.toString() ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Items */}
              <div className="flex-1 lg:overflow-y-auto pr-1 lg:scrollbar-thin lg:scrollbar-thumb-stone-200">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredItems.map(item => (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => addToCart(item)}
                      className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm cursor-pointer group hover:border-emerald-500 transition-all flex flex-col"
                    >
                      <div className="w-full aspect-square bg-stone-50 rounded-lg md:rounded-xl mb-2 md:mb-3 flex items-center justify-center text-stone-300 relative overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <PackageCheck size={isMobile ? 32 : 48} className="transition-transform group-hover:scale-110" />
                        )}
                        <span className="absolute top-1.5 right-1.5 bg-emerald-100 text-emerald-700 text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase">
                          Stok: {item.availableStock}
                        </span>
                      </div>
                      <h3 className="font-black text-stone-900 text-[10px] md:text-sm line-clamp-2 min-h-[30px] md:min-h-[40px] uppercase leading-tight tracking-tight">{item.name}</h3>
                      <div className="mt-auto pt-2 md:pt-3 flex items-end justify-between border-t border-stone-50">
                        <div>
                          <p className="text-[7px] md:text-[10px] text-stone-400 font-bold uppercase tracking-widest">{item.categoryName}</p>
                          <p className="font-black text-emerald-600 text-[10px] md:text-sm mt-0.5">{formatCurrency(item.dailyPrice)}</p>
                        </div>
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Plus size={isMobile ? 14 : 18} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Cart Dashboard */}
            {(!isMobile || showMobileCart) && (
              <div 
                id="cart-panel" 
                className={`${isMobile ? 'fixed inset-0 z-[100] bg-white pt-4' : 'w-full lg:w-[380px] bg-white rounded-3xl shadow-xl border border-stone-200 shrink-0'} flex flex-col h-full overflow-hidden`}
              >
                <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><ShoppingCart size={22} /></div>
                    <h2 className="font-black text-stone-900 tracking-tight text-lg">KERANJANG</h2>
                  </div>
                  {isMobile ? (
                    <button onClick={() => setShowMobileCart(false)} className="p-2 text-stone-400"><X size={24} /></button>
                  ) : (
                    <span className="text-xs font-black px-2 py-1 bg-stone-200 text-stone-600 rounded-lg">{cart.length} ITEM</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-stone-200">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                      <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-4"><ShoppingCart size={32} strokeWidth={1.5} /></div>
                      <p className="font-medium text-sm">Pilih barang untuk<br />memulai penyewaan</p>
                      {isMobile && <button onClick={() => setShowMobileCart(false)} className="mt-4 text-emerald-600 font-bold uppercase text-xs">Kembali Belanja</button>}
                    </div>
                  ) : (
                    <AnimatePresence>
                      {cart.map(item => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-stone-900 text-sm truncate uppercase">{item.name}</h4>
                            <p className="text-xs text-emerald-600 font-black">{formatCurrency(calculateItemPrice(item))} <span className="text-stone-400 font-normal">x {item.quantity}</span></p>
                          </div>
                          <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl border border-stone-200">
                            <button onClick={() => setCart(cart.map(c => c.id === item.id && c.quantity > 1 ? { ...c, quantity: c.quantity - 1 } : c))} className="p-1 hover:text-emerald-600 transition-colors"><Minus size={14} /></button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => addToCart(item)} className="p-1 hover:text-emerald-600 transition-colors"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                <div className="p-5 border-t border-stone-100 bg-stone-50/50 space-y-4">
                  <form onSubmit={handleCheckout} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <input required type="text" placeholder="Nama Pelanggan" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <input required type="tel" placeholder="No. HP" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                      <input required type="text" placeholder="Jaminan (Contoh: KTP / Deposito)" value={guarantee} onChange={e => setGuarantee(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="text-[10px] font-black uppercase text-stone-400 mb-1 ml-1 block">Tgl Selesai</label>
                        <input type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-stone-400 mb-1 ml-1 block">Metode Bayar</label>
                        <div className="relative">
                          <button type="button" onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-left flex items-center justify-between hover:border-emerald-500 transition-all">
                            {paymentMethod} <ChevronDown size={14} className={isPaymentDropdownOpen ? "rotate-180" : ""} />
                          </button>
                          {isPaymentDropdownOpen && (
                            <div className="absolute bottom-full mb-1 left-0 w-full bg-white shadow-xl rounded-xl border border-stone-200 z-50 overflow-hidden py-1">
                              {paymentMethods.map(p => (
                                <button key={p.id} type="button" onClick={() => { setPaymentMethod(p.name); setIsPaymentDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-stone-700">{p.name}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <label className="text-[10px] font-black uppercase text-stone-400 mb-1 ml-1 block">Diskon (%)</label>
                      <button type="button" onClick={() => setIsDiscountDropdownOpen(!isDiscountDropdownOpen)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-left flex items-center justify-between hover:border-emerald-500 transition-all">
                        <div className="flex items-center gap-2 text-emerald-600"><Percent size={14} /> {discount > 0 ? `${discount}%` : 'Tanpa Diskon'}</div>
                        <ChevronDown size={14} className={isDiscountDropdownOpen ? "rotate-180" : ""} />
                      </button>
                      {isDiscountDropdownOpen && (
                        <div className="absolute bottom-full mb-1 left-0 w-full bg-white shadow-xl rounded-xl border border-stone-200 z-50 overflow-hidden py-1 max-h-48 overflow-y-auto">
                          <button type="button" onClick={() => { setDiscount(0); setIsDiscountDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-stone-50">Tanpa Diskon</button>
                          {discounts.map(d => (
                            <button key={d.id} type="button" onClick={() => { setDiscount(d.percentage); setIsDiscountDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-stone-700 flex justify-between">
                              <span>{d.name}</span> <span className="text-emerald-600">{d.percentage}%</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-stone-500 text-[11px] font-bold uppercase mb-1">
                        <span>Subtotal ({durationDays} hari)</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-red-500 text-[11px] font-bold uppercase mb-1">
                          <span>Potongan ({discount}%)</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-stone-900 font-bold uppercase text-xs tracking-widest">Total Bayar</span>
                        <span className="text-xl font-black text-emerald-600 tracking-tight">{formatCurrency(totalAmount)}</span>
                      </div>
                      <button type="submit" disabled={submitting || cart.length === 0} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {submitting ? 'MEMPROSES...' : 'CHECKOUT RENTAL'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}          </>
        ) : (
          /* Return Tab Panel */
          <div className="flex-1 bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-stone-900 tracking-tight">PENGEMBALIAN BARANG</h2>
                <p className="text-xs text-stone-500 mt-1 uppercase font-bold tracking-widest">Mark as return & hitung denda secara otomatis</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">{activeTransactions.length} Sewa Aktif</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-stone-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTransactions.length === 0 ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-stone-400">
                    <PackageCheck size={48} className="opacity-10 mb-2" />
                    <p className="font-bold text-sm">Tidak ada transaksi aktif saat ini</p>
                  </div>
                ) : (
                  activeTransactions.map(tx => {
                    const daysLeft = differenceInDays(new Date(tx.endDate), new Date());
                    return (
                      <motion.div
                        key={tx.id}
                        layoutId={tx.id}
                        className="bg-stone-50 p-5 rounded-3xl border border-stone-100 hover:border-orange-500 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-black text-stone-900 uppercase tracking-tight text-sm truncate w-[70%]">{tx.customerName}</h4>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap ${daysLeft < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {daysLeft < 0 ? `Telat ${Math.abs(daysLeft)} Hari` : daysLeft === 0 ? 'Hari Ini' : `${daysLeft} Hari Lagi`}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs text-stone-500 font-bold uppercase tracking-wider mb-4">
                          <div className="flex items-center gap-2"><Clock size={12} /> {format(new Date(tx.startDate), 'dd MMM')} - {format(new Date(tx.endDate), 'dd MMM')}</div>
                          <div className="flex items-center gap-2"><ShieldCheck size={12} /> Jaminan: {tx.guarantee || '-'}</div>
                          <div className="flex items-center gap-2 font-black text-stone-800"><Wallet size={12} /> Total: {formatCurrency(tx.totalAmount)}</div>
                        </div>
                        <button
                          onClick={() => handleReturnAction(tx)}
                          className="w-full py-3 bg-white border border-stone-200 text-orange-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          Proses Kembali
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Cart Bar */}
      {isMobile && activeTab === 'rental' && cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-stone-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl active:scale-95 transition-all border border-stone-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShoppingCart size={20} />
              </div>
              <div className="text-left">
                <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">{cart.length} Barang Terpilih</p>
                <p className="text-[10px] text-stone-400 font-bold uppercase">Klik untuk checkout</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-emerald-500">{formatCurrency(totalAmount)}</p>
            </div>
          </button>
        </div>
      )}
      <AnimatePresence>
        {/* Confirm Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] md:rounded-[32px] w-full max-w-sm md:max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 md:p-8 pb-4">
                <h2 className="text-xl md:text-2xl font-black text-stone-900 mb-4 md:mb-6 flex items-center gap-2 md:gap-3 tracking-tighter"><AlertCircle className="text-amber-500" size={isMobile ? 20 : 24} /> KONFIRMASI RENTAL</h2>
                <div className="bg-stone-50 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-2 md:space-y-3 mb-4 md:mb-6 border border-stone-200 shadow-inner">
                  <div className="flex justify-between text-[10px] md:text-xs uppercase font-black"><span className="text-stone-400">Penyewa</span> <span className="text-stone-900">{customerName}</span></div>
                  <div className="flex justify-between text-[10px] md:text-xs uppercase font-black"><span className="text-stone-400">No. HP</span> <span className="text-stone-900">{customerPhone}</span></div>
                  <div className="flex justify-between text-[10px] md:text-xs uppercase font-black"><span className="text-stone-400">Jaminan</span> <span className="text-stone-900">{guarantee}</span></div>
                  <div className="flex justify-between text-[10px] md:text-xs uppercase font-black"><span className="text-stone-400">Durasi</span> <span className="text-stone-900">{durationDays} Hari</span></div>
                  <div className="flex justify-between text-[10px] md:text-xs uppercase font-black text-emerald-600 border-t border-stone-200 pt-2 md:pt-3"><span className="text-stone-400">Total Bayar</span> <span className="text-base md:text-lg font-black">{formatCurrency(totalAmount)}</span></div>
                </div>
                <p className="text-[9px] md:text-[10px] text-stone-400 text-center font-black uppercase tracking-widest px-2 md:px-4 leading-relaxed">Setelah dikonfirmasi, stok barang akan otomatis berkurang.</p>
              </div>
              <div className="p-4 md:p-6 bg-stone-50 flex gap-3 md:gap-4 border-t border-stone-100">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 md:py-4 font-black text-stone-400 text-[10px] md:text-xs tracking-widest hover:text-stone-600 transition-colors">BATAL</button>
                <button onClick={executeSubmit} disabled={submitting} className="flex-[2] py-3 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-[10px] md:text-xs uppercase tracking-widest">{submitting ? 'MEMPROSES...' : 'KONFIRMASI'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Success Modal - UPDATED DETAIL */}
        {showSuccessModal && lastTransactionData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur-xl">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[32px] md:rounded-[40px] w-full max-w-sm md:max-w-lg p-0 text-left shadow-2xl overflow-hidden">
              <div className="bg-emerald-600 p-6 md:p-8 text-center text-white relative">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 text-white rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border-2 border-white/50"><CheckCircle2 size={isMobile ? 24 : 32} /></div>
                <h2 className="text-xl md:text-2xl font-black tracking-tighter">DATA TERSIMPAN</h2>
                <p className="text-emerald-100 text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1">Sewa Berhasil Diproses</p>
                <button onClick={() => setShowSuccessModal(false)} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white transition-colors"><X size={16} /></button>
              </div>

              <div className="p-4 md:p-6 max-h-[50vh] md:max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200">
                <div className="grid grid-cols-2 gap-3 mb-4 md:mb-6">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Penyewa</p>
                    <p className="font-black text-stone-900 text-sm md:text-base">{lastTransactionData.customerName}</p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Durasi</p>
                    <p className="text-sm md:text-lg font-black text-emerald-600 leading-none">{lastTransactionData.durationDays} HARI</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-2">Item</p>
                  <div className="space-y-1.5 font-bold">
                    {lastTransactionData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] p-2 bg-stone-50 rounded-xl border border-stone-100">
                        <span className="text-stone-600 truncate w-[60%]">{item.name} <span className="text-stone-400 ml-1">x{item.quantity}</span></span>
                        <span className="text-stone-900">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-stone-200 pt-3 space-y-1.5">
                  <div className="flex justify-between items-end pt-1">
                    <span className="text-[10px] font-black text-stone-900 uppercase">Total Akhir ({lastTransactionData.paymentMethod})</span>
                    <span className="text-lg md:text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(lastTransactionAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 bg-white flex flex-col gap-2 border-t border-stone-100">
                <div className="flex gap-2">
                  <button onClick={handleSendInvoiceWA} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><MessageCircle size={16} /> WA</button>
                  <button onClick={handlePrint} className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Printer size={16} /> CETAK</button>
                </div>
                <button onClick={() => setShowSuccessModal(false)} className="w-full py-2.5 text-stone-400 text-[9px] font-black uppercase tracking-widest">Tutup Jendela</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Return Fine Modal */}
        {selectedReturnTx && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden">
              <div className="p-8">
                <h2 className="text-xl font-black text-stone-900 mb-6 uppercase tracking-tight">Proses Pengembalian</h2>
                <div className="mb-6">
                  <label className="text-[10px] font-black text-stone-400 uppercase mb-2 block tracking-widest">Denda Keterlambatan / Rusak</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-stone-400 text-lg">Rp</span>
                    <input
                      type="number"
                      value={fineAmount}
                      onChange={e => setFineAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-black text-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2 font-black uppercase italic tracking-wider">*Isi 0 jika tidak ada denda</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setSelectedReturnTx(null)} className="flex-1 font-black text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors">BATAL</button>
                  <button onClick={executeReturn} disabled={submitting} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all uppercase tracking-widest">{submitting ? 'MEMPROSES...' : 'KEMBALIKAN BARANG'}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Content HIDDEN */}
      <div style={{ display: 'none' }}>
        <div ref={receiptRef}>
          <div className="header">SEWA OUTDOOR SAMETON</div>
          <div className="divider"></div>
          <div style={{ fontSize: '12px' }}>
            <p>ID: TX-{lastTransactionData?.id}</p>
            <p>Cust: {lastTransactionData?.customerName}</p>
            <p>Jam: {lastTransactionData?.date}</p>
          </div>
          <div className="divider"></div>
          {lastTransactionData?.items.map((i: any, idx: number) => (
            <div key={idx} className="item">
              <span>{i.name} x{i.quantity}</span>
              <span>{formatCurrency(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="divider"></div>
          <p className="total">TOTAL: {formatCurrency(lastTransactionAmount)}</p>
          <div className="divider"></div>
          <p style={{ textAlign: 'center', fontSize: '10px' }}>Jaminan: {lastTransactionData?.guarantee || '-'}</p>
        </div>
      </div>
    </div>
  );
}

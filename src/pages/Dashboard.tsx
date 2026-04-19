import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingDown,
  ShoppingCart,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MessageCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardRes, txRes, expRes] = await Promise.all([
          fetchApi('/dashboard'),
          fetchApi('/transactions'),
          fetchApi('/finance/expenses')
        ]);
        setData(dashboardRes);
        setTransactions(txRes || []);
        setExpenses(expRes || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const stats = [
    {
      title: 'Total Income',
      value: formatCurrency(data?.summary.totalIncome || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      trend: '+12.5%',
      trendIcon: ArrowUpRight,
      trendColor: 'text-emerald-500'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(data?.summary.totalExpenses || 0),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      trend: '-2.4%',
      trendIcon: ArrowDownRight,
      trendColor: 'text-emerald-500'
    },
    {
      title: 'Total Transactions',
      value: data?.summary.totalTransactions || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: '+5.2%',
      trendIcon: ArrowUpRight,
      trendColor: 'text-emerald-500'
    },
    {
      title: 'Items Rented',
      value: `${data?.summary.rentedStock} / ${data?.summary.totalStock}`,
      icon: Package,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      trend: 'Active',
      trendIcon: Package,
      trendColor: 'text-amber-500'
    }
  ];

  const handleSendReminderWA = (tx: any) => {
    if (!tx.customerPhone) {
      alert('Nomor HP pelanggan tidak tersedia');
      return;
    }

    const dueDate = startOfDay(new Date(tx.endDate));
    const today = startOfDay(new Date());
    const daysLate = differenceInDays(today, dueDate);
    const endDateFormatted = tx.endDate ? format(new Date(tx.endDate), 'dd MMM yyyy') : '-';

    let message = '';
    
    if (daysLate > 0) {
      // Late message
      const dailyRate = Math.round(tx.totalAmount / tx.durationDays);
      const estimatedFine = dailyRate * daysLate;
      message = `Halo Kak ${tx.customerName},%0A%0AKami dari *Sewa Outdoor Sameton Tulangan Sidoarjo* ingin memberitahukan bahwa masa sewa alat camping Kakak telah *MELEWATI BATAS WAKTU* selama *${daysLate} HARI*. (Jatuh tempo: ${endDateFormatted})%0A%0AMohon segera mengembalikan alat tersebut ke store kami. Sesuai kesepakatan awal, terdapat denda keterlambatan sebesar:*%0A*Rp ${estimatedFine.toLocaleString('id-ID')}* (${daysLate} hari x ${dailyRate.toLocaleString('id-ID')}/hari)%0A%0ATerima kasih atas kerjasamanya. 🙏`;
    } else {
      // Normal reminder
      message = `Halo Kak ${tx.customerName},%0A%0AMengingatkan bahwa masa sewa alat camping di *Sewa Outdoor Sameton Tulangan Sidoarjo* akan berakhir pada tanggal *${endDateFormatted}*.%0A%0AMohon untuk mengembalikan barang sebelum jam 8 malam ya Kak. Apabila barang dikembalikan terlambat atau dalam keadaan kotor/rusak, maka akan dikenakan denda sesuai dengan ketentuan di awal.%0A%0ATerima kasih banyak atas kerjasamanya! 🙏`;
    }

    let phone = tx.customerPhone;
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    phone = phone.replace(/[^0-9]/g, '');

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const activeRentals = transactions.filter((tx: any) => {
    if (!tx.endDate) return false;

    // Tanggal Jatuh Tempo sesuai dengan End Date dari sistem
    const endDate = new Date(tx.endDate);
    endDate.setHours(23, 59, 59, 999);

    // active jika hari ini <= endDate + 3 hari toleransi (H+3 maksimum tampil)
    const maxDate = new Date(endDate);
    maxDate.setDate(maxDate.getDate() + 3);

    return new Date() <= maxDate;
  }).sort((a: any, b: any) => {
    const dateA = new Date(a.endDate || 0).getTime();
    const dateB = new Date(b.endDate || 0).getTime();
    return dateA - dateB; // asc (closest first)
  });

  const filteredTransactions = transactions.filter(tx => {
    // Gunakan endDate jika ada, jika tidak gunakan createdAt
    const referenceDate = tx.endDate ? new Date(tx.endDate) : (tx.createdAt ? new Date(tx.createdAt) : new Date());
    const maxDate = new Date(referenceDate);
    maxDate.setDate(maxDate.getDate() + 7);
    return new Date() <= maxDate;
  });

  const filteredExpenses = expenses.filter(exp => {
    if (!exp.date) return true;
    const expDate = new Date(exp.date);
    const maxDate = new Date(expDate);
    maxDate.setDate(maxDate.getDate() + 7);
    return new Date() <= maxDate;
  });

  return (
    <div className="space-y-6 relative">
      <div className="sticky -top-6 z-30 bg-stone-100 border-b border-stone-200/80 -mx-6 px-6 -mt-6 pt-6 pb-4">
        <div className="flex flex-col gap-2 md:gap-4">
          <h1 className="text-lg md:text-2xl font-black text-stone-900 tracking-tight uppercase">DASHBOARD</h1>
          <p className="text-[10px] md:text-sm text-stone-500 font-bold uppercase tracking-widest hidden sm:block">Overview Sistem Sewa Outdoor Sameton</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trendIcon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-stone-200"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center ${stat.bgColor} ${stat.color}`}>
                    <Icon size={isMobile ? 16 : 24} />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] md:text-xs font-black ${stat.trendColor} bg-stone-50 px-1.5 py-0.5 rounded-lg uppercase tracking-tighter`}>
                    <span>{stat.trend}</span>
                    <TrendIcon size={isMobile ? 10 : 12} />
                  </div>
                </div>
                <div className="mt-2 md:mt-4">
                  <h3 className="text-stone-500 text-[9px] md:text-sm font-black uppercase tracking-tight">{stat.title}</h3>
                  <p className="text-xs md:text-2xl font-black text-stone-900 mt-0.5">{stat.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Active Rentals / Peringatan WA */}
      <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm md:text-lg font-black text-stone-900 flex items-center gap-2 uppercase tracking-tight">
              <Clock size={isMobile ? 16 : 20} className="text-amber-500" />
              Sewa Berjalan &amp; Reminder
            </h3>
            <p className="text-[10px] md:text-sm text-stone-500 mt-0.5 font-medium hidden sm:block">Daftar pelanggan yang masih dalam masa sewa berjalan.</p>
          </div>
          <span className="text-[9px] md:text-xs font-black px-2 py-1 bg-amber-100 text-amber-700 rounded-lg uppercase">
            {activeRentals.length} Aktif
          </span>
        </div>

        {activeRentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-stone-400">
            <AlertCircle size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada penyewaan berjalan</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card list */}
            <div className="block md:hidden space-y-3">
              {activeRentals.map((tx: any, idx: number) => {
                const dueDate = startOfDay(new Date(tx.endDate));
                const today = startOfDay(new Date());
                const daysLeft = differenceInDays(dueDate, today);
                let tagColor = '';
                let tagText = '';
                if (daysLeft < 0) { tagColor = 'bg-red-100 text-red-700'; tagText = `Terlambat ${Math.abs(daysLeft)} Hari`; }
                else if (daysLeft === 0) { tagColor = 'bg-red-100 text-red-700'; tagText = 'Jatuh Tempo Hari Ini!'; }
                else if (daysLeft === 1) { tagColor = 'bg-orange-100 text-orange-700'; tagText = 'H-1 (Besok)'; }
                else { tagColor = 'bg-emerald-100 text-emerald-700'; tagText = `${daysLeft} Hari Lagi`; }
                return (
                  <div key={tx.id || idx} className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-black text-stone-900 text-xs uppercase tracking-tight">{tx.customerName || '-'}</p>
                        <p className="text-[10px] text-stone-500 font-bold">{tx.customerPhone || 'Tidak ada no. HP'}</p>
                      </div>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${tagColor}`}>{tagText}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/50">
                      <p className="text-[9px] text-stone-400 font-bold uppercase">
                        {tx.startDate ? format(new Date(tx.startDate), 'dd MMM') : '-'} — {tx.endDate ? format(new Date(tx.endDate), 'dd MMM') : '-'}
                      </p>
                      <button
                        onClick={() => handleSendReminderWA(tx)}
                        disabled={!tx.customerPhone}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        <MessageCircle size={10} /> WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="p-3 rounded-tl-xl">Pelanggan</th>
                    <th className="p-3">Periode</th>
                    <th className="p-3">Sisa Waktu</th>
                    <th className="p-3">Jaminan</th>
                    <th className="p-3 text-right rounded-tr-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {activeRentals.map((tx: any, idx: number) => {
                    const dueDate = startOfDay(new Date(tx.endDate));
                    const today = startOfDay(new Date());
                    const daysLeft = differenceInDays(dueDate, today);
                    let tagColor = '';
                    let tagText = '';
                    if (daysLeft < 0) { tagColor = 'bg-red-100 text-red-700'; tagText = `Terlambat ${Math.abs(daysLeft)} Hari`; }
                    else if (daysLeft === 0) { tagColor = 'bg-red-100 text-red-700'; tagText = 'Jatuh Tempo Hari Ini!'; }
                    else if (daysLeft === 1) { tagColor = 'bg-orange-100 text-orange-700'; tagText = 'H-1 (Besok)'; }
                    else { tagColor = 'bg-emerald-100 text-emerald-700'; tagText = `${daysLeft} Hari Lagi`; }
                    return (
                      <tr key={tx.id || idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-stone-800">{tx.customerName || '-'}</div>
                          <div className="text-xs text-stone-500">{tx.customerPhone || 'Tidak ada no. HP'}</div>
                        </td>
                        <td className="p-3 text-stone-600">
                          {tx.startDate ? format(new Date(tx.startDate), 'dd MMM yyyy') : '-'} s/d <br />
                          <span className="font-medium text-stone-800">{tx.endDate ? format(new Date(tx.endDate), 'dd MMM yyyy') : '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${tagColor}`}>{tagText}</span>
                        </td>
                        <td className="p-3 sticky right-0">
                          <span className="text-[11px] font-bold text-stone-500 uppercase bg-stone-100 px-2 py-1 rounded-lg">{tx.guarantee || '-'}</span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleSendReminderWA(tx)}
                            disabled={!tx.customerPhone}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 opacity-90 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <MessageCircle size={14} />
                            Kirim WA
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>


      <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h3 className="text-sm md:text-lg font-black text-stone-900 uppercase tracking-tight">Financial Overview</h3>
            <p className="text-[10px] md:text-sm text-stone-500 mt-0.5 font-medium hidden sm:block">Perbandingan Pemasukan vs Pengeluaran per Bulan</p>
          </div>
          <div className="flex gap-2 md:gap-4">
            <div className="flex items-center gap-1">
              <span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-[9px] md:text-xs font-bold text-stone-600 uppercase tracking-tighter">Income</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-red-400 inline-block"></span>
              <span className="text-[9px] md:text-xs font-bold text-stone-600 uppercase tracking-tighter">Expense</span>
            </div>
          </div>
        </div>

        {(!data?.chartData || data.chartData.length === 0) ? (
          <div className="h-[320px] flex flex-col items-center justify-center text-stone-400">
            <svg className="w-16 h-16 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm font-medium">Belum ada data transaksi</p>
            <p className="text-xs mt-1">Buat transaksi di menu POS untuk mulai melihat grafik</p>
          </div>
        ) : (
          <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                barCategoryGap="30%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#78716c', fontSize: 12, fontWeight: 500 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#78716c', fontSize: 11 }}
                  tickFormatter={(value) => `${value >= 1000000 ? `Rp ${(value / 1000000).toFixed(1)}jt` : `Rp ${value / 1000}k`}`}
                  width={75}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const income = payload.find(p => p.dataKey === 'income')?.value as number || 0;
                      const expense = payload.find(p => p.dataKey === 'expense')?.value as number || 0;
                      const net = income - expense;
                      return (
                        <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-4 min-w-[200px]">
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">{label}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span className="text-sm text-stone-600">Income</span>
                              </div>
                              <span className="text-sm font-bold text-emerald-600">{formatCurrency(income)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                <span className="text-sm text-stone-600">Expense</span>
                              </div>
                              <span className="text-sm font-bold text-red-500">{formatCurrency(expense)}</span>
                            </div>
                            <div className="border-t border-stone-100 pt-2 flex items-center justify-between gap-6">
                              <span className="text-sm font-medium text-stone-700">Net Profit</span>
                              <span className={`text-sm font-bold ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(net)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#d6d3d1" strokeWidth={1} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={52} />
                <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[6, 6, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data?.chartData && data.chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-stone-100">
            <div className="text-center">
              <p className="text-xs text-stone-500 mb-1">Total Income</p>
              <p className="text-sm font-bold text-emerald-600">
                {formatCurrency(data.chartData.reduce((s: number, d: any) => s + (d.income || 0), 0))}
              </p>
            </div>
            <div className="text-center border-x border-stone-100">
              <p className="text-xs text-stone-500 mb-1">Total Expenses</p>
              <p className="text-sm font-bold text-red-500">
                {formatCurrency(data.chartData.reduce((s: number, d: any) => s + (d.expense || 0), 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-stone-500 mb-1">Net Profit</p>
              <p className="text-sm font-bold text-blue-600">
                {formatCurrency(
                  data.chartData.reduce((s: number, d: any) => s + (d.income || 0), 0) -
                  data.chartData.reduce((s: number, d: any) => s + (d.expense || 0), 0)
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-600" />
              Recent Income
            </h3>
            <span className="text-xs text-stone-400">{transactions.length} transactions</span>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-stone-400">
              <DollarSign size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No income data</p>
            </div>
          ) : (
            <div className={`${isMobile ? 'max-h-[300px] overflow-y-auto' : ''}`}>
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs font-semibold text-stone-500 uppercase">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredTransactions.slice(0, 10).map((tx: any, idx: number) => (
                    <tr key={tx.id || idx} className="border-t border-stone-100">
                      <td className="py-2.5 text-stone-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-stone-400" />
                          {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM') : '-'}
                        </div>
                      </td>
                      <td className="py-2.5 font-medium text-stone-800">{tx.customerName || '-'}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">
                        {formatCurrency(tx.totalAmount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <TrendingDown size={20} className="text-red-600" />
              Recent Expenses
            </h3>
            <span className="text-xs text-stone-400">{filteredExpenses.length} items</span>
          </div>
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-stone-400">
              <TrendingDown size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No expense data</p>
            </div>
          ) : (
            <div className={`${isMobile ? 'max-h-[300px] overflow-y-auto' : ''}`}>
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs font-semibold text-stone-500 uppercase">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredExpenses.slice(0, 10).map((exp: any, idx: number) => (
                    <tr key={exp.id || idx} className="border-t border-stone-100">
                      <td className="py-2.5 text-stone-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-stone-400" />
                          {exp.date ? format(new Date(exp.date), 'dd MMM') : '-'}
                        </div>
                      </td>
                      <td className="py-2.5 font-medium text-stone-800">{exp.description || '-'}</td>
                      <td className="py-2.5 text-right font-semibold text-red-500">
                        {formatCurrency(exp.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

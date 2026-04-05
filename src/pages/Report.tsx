import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion } from 'framer-motion';
import { FileText, Filter, Download, Calendar, CreditCard, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const months = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

export default function Report() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [transactionStatuses, setTransactionStatuses] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: '',
    date: '',
    paymentMethod: 'all',
    status: 'all',
  });

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const [pmRes, tsRes] = await Promise.all([
          fetchApi('/payment_methods'),
          fetchApi('/transaction_statuses')
        ]);
        setPaymentMethods(pmRes || []);
        setTransactionStatuses(tsRes || []);
      } catch (error) {
        console.error('Failed to fetch master data', error);
      }
    };
    loadPaymentMethods();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      if (filters.month) params.append('month', filters.month);
      if (filters.date) params.append('date', filters.date);
      if (filters.paymentMethod !== 'all') params.append('paymentMethod', filters.paymentMethod);
      if (filters.status !== 'all') params.append('status', filters.status);

      const result = await fetchApi(`/transactions/report?${params.toString()}`);
      setData(result || []);
    } catch (error) {
      console.error('Failed to fetch report', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExecute = () => {
    fetchReport();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'aktif':
        return <Clock size={14} className="text-amber-500" />;
      case 'dikembalikan':
        return <RotateCcw size={14} className="text-emerald-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'aktif':
        return 'Aktif';
      case 'dikembalikan':
        return 'Dikembalikan';
      default:
        return status;
    }
  };

  const totalAmount = data.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <FileText size={28} className="text-emerald-600" />
          Laporan Transaksi
        </h1>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-stone-500" />
          <h3 className="text-lg font-bold text-stone-900">Filter</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Tahun</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Tahun</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Bulan</label>
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Bulan</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Tanggal</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Metode Pembayaran</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Metode</option>
              {paymentMethods.map((pm: any) => (
                <option key={pm.id} value={pm.name}>{pm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Status</option>
              {transactionStatuses.map((ts: any) => (
                <option key={ts.id} value={ts.name}>{ts.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleExecute}
          disabled={loading}
          className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Download size={18} />
          {loading ? 'Memuat...' : 'Execute'}
        </button>
      </div>

      {data.length > 0 && (
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Total Transaksi: {data.length}</span>
            <span className="text-lg font-bold text-emerald-700">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-stone-400">
            <FileText size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada data</p>
            <p className="text-xs mt-1">Atur filter dan klik Execute untuk mencari</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-stone-500 uppercase border-b border-stone-200">
                  <th className="pb-3">#</th>
                  <th className="pb-3">Tanggal</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Metode</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.map((tx: any, idx: number) => (
                  <motion.tr
                    key={tx.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-stone-100 hover:bg-stone-50"
                  >
                    <td className="py-3 text-stone-500">{idx + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 text-stone-600">
                        <Calendar size={14} className="text-stone-400" />
                        {tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM/yyyy') : '-'}
                      </div>
                    </td>
                    <td className="py-3 font-medium text-stone-800">{tx.customerName || '-'}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={14} className="text-stone-400" />
                        <span className="capitalize">{tx.paymentMethod || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(tx.status)}
                        <span>{getStatusLabel(tx.status)}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(tx.totalAmount || 0)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
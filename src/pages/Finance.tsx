import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingDown, TrendingUp, Plus, Calendar, FileText, ChevronDown, Download, CheckCircle2, Trash2, Eye, ArrowLeft, ArrowRight, User, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Finance() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [isMobile, setIsMobile] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [transactionToReturn, setTransactionToReturn] = useState<number | null>(null);
  const [deleteExpenseModalOpen, setDeleteExpenseModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [currentIncomePage, setCurrentIncomePage] = useState(1);
  const [currentExpensePage, setCurrentExpensePage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const itemsPerPage = 8;

  const [filters, setFilters] = useState({
    year: '',
    month: '',
    date: '',
    paymentMethod: 'all',
    status: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [transactionStatuses, setTransactionStatuses] = useState<any[]>([]);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadData = async () => {
    try {
      const [txRes, expRes, pmRes, tsRes] = await Promise.all([
        fetchApi('/transactions'),
        fetchApi('/finance/expenses'),
        fetchApi('/payment_methods'),
        fetchApi('/transaction_statuses')
      ]);
      setTransactions(txRes);
      setExpenses(expRes);
      setPaymentMethods(pmRes || []);
      setTransactionStatuses(tsRes || []);
    } catch (error) {
      console.error('Failed to load finance data', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data: any[]) => {
    return data.filter((tx: any) => {
      const txDate = new Date(tx.createdAt);
      const txYear = txDate.getFullYear().toString();
      const txMonth = (txDate.getMonth() + 1).toString();
      const txDateStr = txDate.toISOString().split('T')[0];

      if (filters.year && txYear !== filters.year) return false;
      if (filters.month && txMonth !== filters.month) return false;
      if (filters.date && txDateStr !== filters.date) return false;
      if (filters.paymentMethod !== 'all' && tx.paymentMethod !== filters.paymentMethod) return false;
      
      if (filters.status !== 'all') {
        const statusMap: { [key: string]: string } = {
          'Aktif': 'active',
          'Dikembalikan': 'returned',
          'Hilang': 'lost',
          'Rusak': 'damaged'
        };
        const dbStatus = statusMap[filters.status];
        if (dbStatus && tx.status !== dbStatus) return false;
      }

      return true;
    });
  };

  const filteredTransactions = applyFilters(transactions);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleSearchFilter = () => {
      const transactionId = localStorage.getItem('searchTransactionId');
      const transactionName = localStorage.getItem('searchTransactionName');
      
      if (transactionId) {
        localStorage.removeItem('searchTransactionId');
        localStorage.removeItem('searchTransactionName');
        loadData().then(() => {
          setCurrentIncomePage(1);
          setTransactions((prev: any[]) => prev.filter(t => t.id.toString() === transactionId));
        });
      } else if (transactionName) {
        localStorage.removeItem('searchTransactionName');
        loadData().then(() => {
          setCurrentIncomePage(1);
          setTransactions((prev: any[]) => prev.filter((t: any) => 
            t.customerName?.toLowerCase().includes(transactionName.toLowerCase()) ||
            t.id.toString() === transactionName ||
            t.customerPhone?.includes(transactionName)
          ));
        });
      }
    };
    handleSearchFilter();
  }, []);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseForm)
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd') });
      loadData();
    } catch (error) {
      console.error('Failed to add expense', error);
      alert('Failed to add expense');
    }
  };

  const openViewModal = async (id: number) => {
    try {
      const data = await fetchApi(`/transactions/${id}`);
      console.log('Transaction detail response:', JSON.stringify(data));
      if (data && data.items) {
        console.log('Items array:', JSON.stringify(data.items));
        data.items.forEach((item: any, idx: number) => {
          console.log(`Item ${idx}:`, JSON.stringify(item));
        });
      }
      setViewData(data);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load transaction details', error);
      alert('Gagal mengambil data detail transaksi');
    }
  };

  const confirmReturn = (id: number) => {
    setTransactionToReturn(id);
    setReturnModalOpen(true);
  };

  const executeReturn = async () => {
    if (transactionToReturn === null) return;
    setSubmitting(true);
    try {
      await fetchApi(`/transactions/${transactionToReturn}/return`, { method: 'POST' });
      setReturnModalOpen(false);
      setTransactionToReturn(null);
      loadData();
    } catch (error) {
      console.error('Failed to return items', error);
      alert('Failed to return items');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = (id: number) => {
    setExpenseToDelete(id);
    setDeleteExpenseModalOpen(true);
  };

  const executeDeleteExpense = async () => {
    if (expenseToDelete === null) return;
    setSubmitting(true);
    try {
      await fetchApi(`/finance/expenses/${expenseToDelete}`, { method: 'DELETE' });
      setDeleteExpenseModalOpen(false);
      setExpenseToDelete(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete expense', error);
      alert('Gagal menghapus pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const getPaymentStyle = (method: string) => {
    switch (method) {
      case 'QRIS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Transfer': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const totalIncome = filteredTransactions.reduce((sum, tx) => sum + Number(tx.totalAmount || 0) + Number(tx.fineAmount || 0), 0);
  const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const incomeTotalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const incomeIdxLast = currentIncomePage * itemsPerPage;
  const incomeIdxFirst = incomeIdxLast - itemsPerPage;
  const currentIncomeItems = filteredTransactions.slice(incomeIdxFirst, incomeIdxLast);
  const indexOfFirst = incomeIdxFirst;
  const indexOfLast = incomeIdxLast;

  const expenseTotalPages = Math.ceil(expenses.length / itemsPerPage);
  const expenseIdxLast = currentExpensePage * itemsPerPage;
  const expenseIdxFirst = expenseIdxLast - itemsPerPage;
  const currentExpenseItems = expenses.slice(expenseIdxFirst, expenseIdxLast);

  const exportToPDF = () => {
    setIsExportMenuOpen(false);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Income Transactions - Sewa Outdoor Sameton', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${format(new Date(), 'dd MMMM yyyy HH:mm')}`, 14, 30);
    doc.text(`Total Income: ${formatCurrency(totalIncome)}`, 14, 36);
    autoTable(doc, {
      startY: 42,
      head: [['Tanggal', 'Pelanggan', 'Durasi', 'Harga Awal', 'Diskon (%)', 'Potongan', 'Total Bayar', 'Metode', 'Status']],
      body: transactions.map(tx => [
        format(new Date(tx.createdAt), 'dd MMM yyyy'),
        tx.customerName,
        `${tx.durationDays} Hari`,
        formatCurrency(tx.subtotal || tx.totalAmount),
        tx.discount > 0 ? `${tx.discount}%` : '-',
        formatCurrency(tx.discountAmount || 0),
        formatCurrency(tx.totalAmount),
        tx.paymentMethod || 'Cash',
        tx.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });
    doc.save(`Income_Transactions_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportToExcel = () => {
    setIsExportMenuOpen(false);
    const wb = XLSX.utils.book_new();
    const incomeData = [
      ['Tanggal', 'Pelanggan', 'No. HP', 'Durasi (Hari)', 'Metode Bayar', 'Harga Awal', 'Diskon (%)', 'Potongan', 'Total Bayar', 'Status'],
      ...transactions.map(tx => [
        format(new Date(tx.createdAt), 'yyyy-MM-dd'),
        tx.customerName,
        tx.customerPhone,
        tx.durationDays,
        tx.paymentMethod || 'Cash',
        tx.subtotal || tx.totalAmount,
        tx.discount || 0,
        tx.discountAmount || 0,
        tx.totalAmount,
        tx.status
      ]),
      ['Total Pendapatan', '', '', '', '', '', '', '', totalIncome, '']
    ];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Income Transactions');
    XLSX.writeFile(wb, `Income_Transactions_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden">
      <div className="sticky top-0 z-30 bg-stone-100 pt-1 pb-4 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-stone-900">Financial Reports</h1>
          <div className="flex gap-2">
            {isAdmin && (
              <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-200">
                <Plus size={16} /> <span>Add Expense</span>
              </button>
            )}
            <div className="relative">
              <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="flex items-center gap-2 bg-white text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-50 transition-colors font-medium text-sm border border-stone-200 shadow-sm">
                <FileText size={16} /> <span>Export Report</span> <ChevronDown size={16} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-100 z-20 py-1">
                    <button onClick={exportToPDF} className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-3"><Download size={16} className="text-red-500" /> <span>Export to PDF</span></button>
                    <div className="h-px bg-stone-100 mx-2"></div>
                    <button onClick={exportToExcel} className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3"><Download size={16} className="text-emerald-500" /> <span>Export to Excel</span></button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600"><TrendingUp size={20} /></div>
              <span className="text-xs font-medium text-stone-500">Total Income</span>
            </div>
            <h3 className="text-xl font-bold text-stone-900">{formatCurrency(totalIncome)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 text-red-600"><TrendingDown size={20} /></div>
              <span className="text-xs font-medium text-stone-500">Total Expenses</span>
            </div>
            <h3 className="text-xl font-bold text-stone-900">{formatCurrency(totalExpense)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}><DollarSign size={20} /></div>
              <span className="text-xs font-medium text-stone-500">Net Profit</span>
            </div>
            <h3 className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netProfit)}</h3>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            <Filter size={16} />
            Filter {showFilters ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => {
              setFilters({ year: '', month: '', date: '', paymentMethod: 'all', status: 'all' });
              setCurrentIncomePage(1);
            }}
            className="text-xs text-stone-500 hover:text-stone-700"
          >
            Clear Filter
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-2xl border border-stone-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Tahun</label>
                <select
                  value={filters.year}
                  onChange={(e) => { setFilters({ ...filters, year: e.target.value }); setCurrentIncomePage(1); }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="">Semua</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Bulan</label>
                <select
                  value={filters.month}
                  onChange={(e) => { setFilters({ ...filters, month: e.target.value }); setCurrentIncomePage(1); }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="">Semua</option>
                  <option value="1">Januari</option>
                  <option value="2">Februari</option>
                  <option value="3">Maret</option>
                  <option value="4">April</option>
                  <option value="5">Mei</option>
                  <option value="6">Juni</option>
                  <option value="7">Juli</option>
                  <option value="8">Agustus</option>
                  <option value="9">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => { setFilters({ ...filters, date: e.target.value }); setCurrentIncomePage(1); }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Metode</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => { setFilters({ ...filters, paymentMethod: e.target.value }); setCurrentIncomePage(1); }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="all">Semua</option>
                  {paymentMethods.map((pm: any) => (
                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentIncomePage(1); }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="all">Semua</option>
                  {transactionStatuses.map((ts: any) => (
                    <option key={ts.id} value={ts.name}>{ts.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col flex-1 min-h-0">
        {/* Tabs - Desktop & Mobile */}
        <div className="flex border-b border-stone-200 sticky top-0 bg-white z-20">
          <button onClick={() => setActiveTab('income')} className={`flex-1 py-3 md:py-4 px-4 md:px-6 text-sm font-medium text-center transition-colors ${activeTab === 'income' ? 'border-b-2 border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'text-stone-500 hover:text-stone-700'}`}>
            Income
          </button>
          <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 md:py-4 px-4 md:px-6 text-sm font-medium text-center transition-colors ${activeTab === 'expense' ? 'border-b-2 border-red-500 text-red-600 bg-red-50/50' : 'text-stone-500 hover:text-stone-700'}`}>
            Expenses
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Income Table */}
          {activeTab === 'income' && (
            <table className="min-w-full divide-y divide-stone-200 border-separate border-spacing-0">
              <thead className="bg-stone-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Detail</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Tanggal</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Pelanggan</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Harga Awal</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase hidden md:table-cell">Diskon</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Total</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Denda</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase hidden md:table-cell">Metode</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {loading ? (
                  <tr><td colSpan={9} className="px-6 py-4 text-center text-stone-500">Loading...</td></tr>
                ) : currentIncomeItems.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-4 text-center text-stone-500">Belum ada transaksi</td></tr>
                ) : (
                  currentIncomeItems.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <button onClick={() => openViewModal(tx.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Eye size={16} /></button>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-stone-500">{format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm')}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-stone-900">{tx.customerName}</div>
                        <div className="text-xs text-stone-500">{tx.customerPhone}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-700">{formatCurrency(Number(tx.subtotal || tx.totalAmount))}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-stone-500 hidden md:table-cell">{tx.discount > 0 ? `-${tx.discount}%` : '-'}</td>
                       <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">{formatCurrency(Number(tx.totalAmount))}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-600">{tx.fineAmount > 0 ? formatCurrency(Number(tx.fineAmount)) : '-'}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${getPaymentStyle(tx.paymentMethod || 'Cash')}`}>{tx.paymentMethod || 'Cash'}</span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'}`}>{tx.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Expenses Table */}
          {activeTab === 'expense' && (
            <table className="min-w-full divide-y divide-stone-200 border-separate border-spacing-0">
              <thead className="bg-stone-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Date</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Description</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Amount</th>
                  {isAdmin && <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">Action</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-stone-500">Loading...</td></tr>
                ) : currentExpenseItems.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-stone-500">No expenses found</td></tr>
                ) : (
                  currentExpenseItems.map((exp) => (
                    <tr key={exp.id} className="hover:bg-stone-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-stone-500">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{exp.description}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                        {isAdmin && <button onClick={() => handleDeleteExpense(exp.id)} className="text-stone-400 hover:text-red-600"><Trash2 size={16} /></button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && (
          <div className="px-4 md:px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
            <div className="text-sm text-stone-500">
              {activeTab === 'income' ? `Showing ${indexOfFirst + 1}-${Math.min(indexOfLast, transactions.length)} of ${transactions.length}` : `Showing ${expenseIdxFirst + 1}-${Math.min(expenseIdxLast, expenses.length)} of ${expenses.length}`}
            </div>
            <div className="flex gap-2">
              {activeTab === 'income' ? (
                <>
                  <button onClick={() => setCurrentIncomePage(p => Math.max(1, p - 1))} disabled={currentIncomePage === 1} className="px-3 py-1 border border-stone-300 rounded-lg text-sm bg-white disabled:opacity-50">Prev</button>
                  <button onClick={() => setCurrentIncomePage(p => Math.min(incomeTotalPages, p + 1))} disabled={currentIncomePage === incomeTotalPages} className="px-3 py-1 border border-stone-300 rounded-lg text-sm bg-white disabled:opacity-50">Next</button>
                </>
              ) : (
                <>
                  <button onClick={() => setCurrentExpensePage(p => Math.max(1, p - 1))} disabled={currentExpensePage === 1} className="px-3 py-1 border border-stone-300 rounded-lg text-sm bg-white disabled:opacity-50">Prev</button>
                  <button onClick={() => setCurrentExpensePage(p => Math.min(expenseTotalPages, p + 1))} disabled={currentExpensePage === expenseTotalPages} className="px-3 py-1 border border-stone-300 rounded-lg text-sm bg-white disabled:opacity-50">Next</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Improved Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setIsExpenseModalOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full z-10 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-2xl">
                      <DollarSign className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">TAMBAH PENGELUARAN</h3>
                      <p className="text-red-100 text-xs font-medium">Catat pengeluaran operasional</p>
                    </div>
                  </div>
                  <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <form onSubmit={handleExpenseSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Deskripsi</label>
                  <input 
                    type="text" 
                    required 
                    value={expenseForm.description} 
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    placeholder="Contoh: Listrik, Air, Gas"
                    className="w-full border-2 border-stone-200 rounded-2xl py-3 px-4 text-sm font-bold text-stone-700 focus:outline-none focus:border-red-500 focus:bg-red-50/50 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Jumlah</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">Rp</span>
                    <input 
                      type="number" 
                      required 
                      value={expenseForm.amount} 
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      placeholder="50000"
                      className="w-full pl-10 pr-4 py-3 border-2 border-stone-200 rounded-2xl text-sm font-bold text-stone-700 focus:outline-none focus:border-red-500 focus:bg-red-50/50 transition-all" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Tanggal</label>
                  <input 
                    type="date" 
                    required 
                    value={expenseForm.date} 
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full border-2 border-stone-200 rounded-2xl py-3 px-4 text-sm font-bold text-stone-700 focus:outline-none focus:border-red-500 focus:bg-red-50/50 transition-all" 
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsExpenseModalOpen(false)} 
                    className="flex-1 py-3.5 bg-white border-2 border-stone-200 text-stone-500 font-black rounded-2xl hover:bg-stone-50 transition-colors"
                  >
                    BATAL
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                  >
                    SIMPAN
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}

      {/* Improved Return Confirm Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setReturnModalOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full z-10 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-6 py-5 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">KONFIRMASI KEMBALI</h3>
                <p className="text-amber-100 text-xs font-medium mt-1">Stok akan dikembalikan ke inventaris</p>
              </div>
              <div className="p-6">
                <p className="text-stone-600 text-sm text-center mb-6">
                  Apakah Anda menyetujui bahwa barang telah dikembalikan? Stok barang akan otomatis ditambahkan ke inventaris.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setReturnModalOpen(false)} 
                    className="flex-1 py-3.5 bg-white border-2 border-stone-200 text-stone-500 font-black rounded-2xl hover:bg-stone-50 transition-colors"
                  >
                    BATAL
                  </button>
                  <button 
                    onClick={executeReturn} 
                    disabled={submitting} 
                    className="flex-1 py-3.5 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Memproses...' : 'KONFIRMASI'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Improved Delete Expense Modal */}
      {deleteExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setDeleteExpenseModalOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full z-10 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-stone-800 to-stone-900 px-6 py-5 text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">HAPUS PENGELUARAN</h3>
                <p className="text-stone-400 text-xs font-medium mt-1">Data yang dihapus tidak dapat dipulihkan</p>
              </div>
              <div className="p-6">
                <p className="text-stone-600 text-sm text-center mb-6">
                  Apakah Anda yakin ingin menghapus pengeluaran ini? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteExpenseModalOpen(false)} 
                    className="flex-1 py-3.5 bg-white border-2 border-stone-200 text-stone-500 font-black rounded-2xl hover:bg-stone-50 transition-colors"
                  >
                    BATAL
                  </button>
                  <button 
                    onClick={executeDeleteExpense} 
                    disabled={submitting} 
                    className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Menghapus...' : 'HAPUS'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Improved Detail View Modal */}
      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full z-10 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-2xl">
                      <FileText className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">DETAIL TRANSAKSI</h3>
                      <p className="text-emerald-100 text-xs font-medium">Invoice #{viewData.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsViewModalOpen(false)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-100 rounded-xl">
                        <User className="text-emerald-600" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Pelanggan</p>
                        <p className="text-sm font-black text-stone-800">{viewData.customerName}</p>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 font-medium ml-11">{viewData.customerPhone}</p>
                  </div>
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                          <Calendar className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Waktu Sewa</p>
                          <p className="text-sm font-black text-stone-800">{viewData.durationDays} Hari</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${viewData.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                        {viewData.status === 'active' ? 'AKTIF' : 'SELESAI'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 font-medium ml-11">
                      {format(new Date(viewData.startDate), 'dd MMM')} - {format(new Date(viewData.endDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Metode Bayar</p>
                    <span className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg border ${getPaymentStyle(viewData.paymentMethod || 'Cash')}`}>
                      {viewData.paymentMethod || 'Cash'}
                    </span>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Jaminan</p>
                    <p className="text-sm font-black text-stone-800">{viewData.guarantee || '-'}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Rincian Barang</p>
                  <div className="bg-stone-50 rounded-2xl border-2 border-stone-100 max-h-48 overflow-y-auto">
                    {viewData.items && viewData.items.length > 0 ? (
                      <table className="min-w-full">
                        <thead className="bg-stone-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-[10px] font-black text-stone-500 uppercase">Barang</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-black text-stone-500 uppercase">Qty</th>
                            <th className="px-4 py-2.5 text-right text-[10px] font-black text-stone-500 uppercase">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {viewData.items.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-sm font-bold text-stone-800">{item.itemName || item.name || '-'}</td>
                              <td className="px-4 py-3 text-sm font-bold text-stone-600 text-center">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm font-black text-stone-800 text-right">{formatCurrency(item.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-stone-400">
                        <p className="text-sm font-bold">Tidak ada data barang</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-stone-50 rounded-2xl p-4 border-2 border-stone-100">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-stone-500 font-bold">Subtotal</span> 
                    <span className="font-bold text-stone-800">{formatCurrency(viewData.subtotal)}</span>
                  </div>
                  {viewData.discount > 0 && (
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-stone-500 font-bold">Diskon ({viewData.discount}%)</span> 
                      <span className="font-bold text-red-500">-{formatCurrency(viewData.discountAmount || 0)}</span>
                    </div>
                  )}
                  {viewData.fineAmount > 0 && (
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-stone-500 font-bold">Denda</span> 
                      <span className="font-bold text-orange-600">{formatCurrency(viewData.fineAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                    <span className="text-sm font-black text-stone-800 uppercase tracking-wider">Total Akhir</span> 
                    <span className="text-xl font-black text-emerald-600">{formatCurrency(Number(viewData.totalAmount) + Number(viewData.fineAmount || 0))}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
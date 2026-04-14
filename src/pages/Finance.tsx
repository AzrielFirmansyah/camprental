import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingDown, TrendingUp, Plus, Calendar, FileText, ChevronDown, Download, CheckCircle2, Trash2, Eye, User, X } from 'lucide-react';
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
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [transactionStatuses, setTransactionStatuses] = useState<any[]>([]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

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
    <div className="flex flex-col h-auto md:h-full space-y-6 md:overflow-hidden pb-20 md:pb-0">
      <div className="sticky top-0 z-30 bg-stone-100 pt-1 pb-4 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-lg md:text-2xl font-black text-stone-900 tracking-tight uppercase">Finance Reports</h1>
          <div className="flex gap-1.5 md:gap-2">
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600"><TrendingUp size={isMobile ? 16 : 20} /></div>
              <span className="text-[9px] md:text-xs font-black text-stone-400 uppercase tracking-tighter">Income</span>
            </div>
            <h3 className="text-sm md:text-xl font-black text-stone-900 tracking-tight leading-none">{formatCurrency(totalIncome)}</h3>
          </div>
          <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center bg-red-100 text-red-600"><TrendingDown size={isMobile ? 16 : 20} /></div>
              <span className="text-[9px] md:text-xs font-black text-stone-400 uppercase tracking-tighter">Expenses</span>
            </div>
            <h3 className="text-sm md:text-xl font-black text-stone-900 tracking-tight leading-none">{formatCurrency(totalExpense)}</h3>
          </div>
          <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-stone-200 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}><DollarSign size={isMobile ? 16 : 20} /></div>
              <span className="text-[9px] md:text-xs font-black text-stone-400 uppercase tracking-tighter">Net Profit</span>
            </div>
            <h3 className={`text-sm md:text-xl font-black tracking-tight leading-none ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netProfit)}</h3>
          </div>
        </div>

        {/* Compact Filter Bar — POS Discount Style */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

            {/* Tahun */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Tahun</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsYearDropdownOpen(!isYearDropdownOpen); setIsMonthDropdownOpen(false); setIsMethodDropdownOpen(false); setIsStatusDropdownOpen(false); }}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-left flex items-center justify-between hover:border-emerald-500 transition-all"
                >
                  <span className={filters.year ? 'text-emerald-600' : 'text-stone-500'}>
                    {filters.year || 'Semua Tahun'}
                  </span>
                  <ChevronDown size={14} className={`text-stone-400 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isYearDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white shadow-xl rounded-xl border border-stone-200 z-50 overflow-hidden py-1">
                    <button onClick={() => { setFilters({ ...filters, year: '' }); setCurrentIncomePage(1); setIsYearDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-stone-50 text-stone-500">Semua Tahun</button>
                    {['2026', '2025', '2024'].map(y => (
                      <button key={y} onClick={() => { setFilters({ ...filters, year: y }); setCurrentIncomePage(1); setIsYearDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-stone-700">{y}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bulan */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Bulan</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsMonthDropdownOpen(!isMonthDropdownOpen); setIsYearDropdownOpen(false); setIsMethodDropdownOpen(false); setIsStatusDropdownOpen(false); }}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-left flex items-center justify-between hover:border-emerald-500 transition-all"
                >
                  <span className={filters.month ? 'text-emerald-600' : 'text-stone-500'}>
                    {filters.month ? ['', 'Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(filters.month)] : 'Semua Bulan'}
                  </span>
                  <ChevronDown size={14} className={`text-stone-400 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMonthDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white shadow-xl rounded-xl border border-stone-200 z-50 overflow-hidden py-1 max-h-52 overflow-y-auto">
                    <button onClick={() => { setFilters({ ...filters, month: '' }); setCurrentIncomePage(1); setIsMonthDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-stone-50 text-stone-500">Semua Bulan</button>
                    {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                      <button key={i+1} onClick={() => { setFilters({ ...filters, month: String(i+1) }); setCurrentIncomePage(1); setIsMonthDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-stone-700">{m}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Tanggal</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => { setFilters({ ...filters, date: e.target.value }); setCurrentIncomePage(1); }}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:border-emerald-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Metode */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Metode Bayar</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsMethodDropdownOpen(!isMethodDropdownOpen); setIsYearDropdownOpen(false); setIsMonthDropdownOpen(false); setIsStatusDropdownOpen(false); }}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-left flex items-center justify-between hover:border-emerald-500 transition-all"
                >
                  <span className={filters.paymentMethod !== 'all' ? 'text-emerald-600' : 'text-stone-500'}>
                    {filters.paymentMethod !== 'all' ? filters.paymentMethod : 'Semua Metode'}
                  </span>
                  <ChevronDown size={14} className={`text-stone-400 transition-transform ${isMethodDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMethodDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white shadow-xl rounded-xl border border-stone-200 z-50 overflow-hidden py-1">
                    <button onClick={() => { setFilters({ ...filters, paymentMethod: 'all' }); setCurrentIncomePage(1); setIsMethodDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-stone-50 text-stone-500">Semua Metode</button>
                    {paymentMethods.map((pm: any) => (
                      <button key={pm.id} onClick={() => { setFilters({ ...filters, paymentMethod: pm.name }); setCurrentIncomePage(1); setIsMethodDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-stone-700">{pm.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Status</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsYearDropdownOpen(false); setIsMonthDropdownOpen(false); setIsMethodDropdownOpen(false); }}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-left flex items-center justify-between hover:border-emerald-500 transition-all"
                >
                  <span className={filters.status !== 'all' ? 'text-emerald-600' : 'text-stone-500'}>
                    {filters.status !== 'all' ? filters.status : 'Semua Status'}
                  </span>
                  <ChevronDown size={14} className={`text-stone-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isStatusDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white shadow-xl rounded-xl border border-stone-200 z-50 overflow-hidden py-1">
                    <button onClick={() => { setFilters({ ...filters, status: 'all' }); setCurrentIncomePage(1); setIsStatusDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-stone-50 text-stone-500">Semua Status</button>
                    {transactionStatuses.map((ts: any) => (
                      <button key={ts.id} onClick={() => { setFilters({ ...filters, status: ts.name }); setCurrentIncomePage(1); setIsStatusDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-stone-700">{ts.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Reset button - only show when filter active */}
          {(filters.year || filters.month || filters.date || filters.paymentMethod !== 'all' || filters.status !== 'all') && (
            <div className="mt-3 pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => { setFilters({ year: '', month: '', date: '', paymentMethod: 'all', status: 'all' }); setCurrentIncomePage(1); }}
                className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
              >
                <X size={13} /> Reset Filter
              </button>
            </div>
          )}
        </div>
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
      {/* Improved Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] md:rounded-[32px] w-full max-w-sm md:max-w-md shadow-2xl overflow-hidden">
            <div className="bg-red-600 p-5 md:p-6 relative">
              <button onClick={() => setIsExpenseModalOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"><X size={18} /></button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><DollarSign className="text-white" size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase leading-none">TAMBAH BIAYA</h3>
                  <p className="text-red-100 text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">Catat Operasional</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-5 md:p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Deskripsi</label>
                <input type="text" required value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Contoh: Listrik, Air, Gas" className="w-full border border-stone-100 bg-stone-50 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 focus:outline-none focus:border-red-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Jumlah (Rp)</label>
                  <input type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-100 rounded-xl text-sm font-black text-red-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Tanggal</label>
                  <input type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold text-stone-700" />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-3 text-stone-400 font-black text-[10px] uppercase tracking-widest">BATAL</button>
                <button type="submit" className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">SIMPAN BIAYA</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Improved Return Confirm Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter mb-2">KONFIRMASI KEMBALI</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-bold uppercase tracking-wider">Pengecekan selesai? Stok akan dikembalikan ke inventaris.</p>
            </div>
            <div className="p-4 bg-stone-50 flex gap-3 border-t border-stone-100">
              <button onClick={() => setReturnModalOpen(false)} className="flex-1 py-3 text-stone-400 font-black text-[10px] uppercase tracking-widest">BATAL</button>
              <button onClick={executeReturn} disabled={submitting} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">KONFIRMASI</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Improved Delete Expense Modal */}
      {deleteExpenseModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter mb-2">Hapus Biaya?</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-bold uppercase tracking-wider">Tindakan ini permanen. Data pengeluaran akan dihapus dari laporan.</p>
            </div>
            <div className="p-4 bg-stone-50 flex gap-3 border-t border-stone-100">
              <button onClick={() => setDeleteExpenseModalOpen(false)} className="flex-1 py-3 text-stone-400 font-black text-[10px] uppercase tracking-widest">BATAL</button>
              <button onClick={executeDeleteExpense} disabled={submitting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">HAPUS</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Improved Detail View Modal */}
      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[28px] md:rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-stone-900 p-5 md:p-6 relative shrink-0">
              <button onClick={() => setIsViewModalOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X size={18} /></button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl"><FileText className="text-white" size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight leading-none uppercase">DETAIL TRANSAKSI</h3>
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Invoice #{viewData.id}</p>
                </div>
              </div>
            </div>
            <div className="p-5 md:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Pelanggan</p>
                  <p className="text-sm font-black text-stone-900 leading-tight">{viewData.customerName}</p>
                  <p className="text-[10px] font-bold text-stone-500 mt-0.5">{viewData.customerPhone}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Sewa</p>
                  <p className="text-sm font-black text-stone-900 leading-tight">{viewData.durationDays} Hari</p>
                  <p className="text-[10px] font-bold text-blue-600 mt-0.5 uppercase tracking-tighter">{format(new Date(viewData.startDate), 'dd MMM')} - {format(new Date(viewData.endDate), 'dd MMM')}</p>
                </div>
              </div>
              
              <div className="bg-stone-50 rounded-xl border border-stone-100 overflow-hidden">
                <div className="bg-stone-100/50 px-3 py-1.5 flex justify-between items-center">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Item Pesanan</span>
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded-md ${viewData.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{viewData.status.toUpperCase()}</span>
                </div>
                <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {viewData.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center px-1">
                      <div>
                        <p className="text-xs font-black text-stone-800 leading-none">{item.itemName || item.name}</p>
                        <p className="text-[9px] font-bold text-stone-400 mt-1">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs font-black text-stone-900">{formatCurrency(item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex justify-between items-center text-xs font-bold text-stone-500">
                  <span>Subtotal</span> <span>{formatCurrency(viewData.subtotal)}</span>
                </div>
                {viewData.discount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-red-500">
                    <span>Diskon ({viewData.discount}%)</span> <span>-{formatCurrency(viewData.discountAmount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                  <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest">Total Akhir</span>
                  <span className="text-lg font-black text-emerald-600 tracking-tight">{formatCurrency(Number(viewData.totalAmount) + Number(viewData.fineAmount || 0))}</span>
                </div>
              </div>
              
              <button onClick={() => setIsViewModalOpen(false)} className="w-full py-3 bg-stone-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all mt-2">TUTUP</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingDown, TrendingUp, Plus, Calendar, FileText, ChevronDown, Download, CheckCircle2, Trash2, Eye, ArrowLeft, ArrowRight, User } from 'lucide-react';
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
      const [txRes, expRes] = await Promise.all([
        fetchApi('/transactions'),
        fetchApi('/finance/expenses')
      ]);
      setTransactions(txRes);
      setExpenses(expRes);
    } catch (error) {
      console.error('Failed to load finance data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const totalIncome = transactions.reduce((sum, tx) => sum + Number(tx.totalAmount || 0), 0);
  const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const incomeTotalPages = Math.ceil(transactions.length / itemsPerPage);
  const incomeIdxLast = currentIncomePage * itemsPerPage;
  const incomeIdxFirst = incomeIdxLast - itemsPerPage;
  const currentIncomeItems = transactions.slice(incomeIdxFirst, incomeIdxLast);
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
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase hidden md:table-cell">Metode</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Status</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">Aksi</th>
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
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${getPaymentStyle(tx.paymentMethod || 'Cash')}`}>{tx.paymentMethod || 'Cash'}</span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'}`}>{tx.status}</span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                        {tx.status === 'active' ? (
                          <button onClick={() => confirmReturn(tx.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg border border-red-200 text-sm">Mark Returned</button>
                        ) : (
                          <span className="text-red-400 bg-red-50 px-3 py-1 rounded-lg border border-red-200 text-sm opacity-60">Mark Returned</span>
                        )}
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

      {/* Modals */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/75" onClick={() => setIsExpenseModalOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full z-10">
              <form onSubmit={handleExpenseSubmit}>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-stone-900 mb-4">Add Operational Expense</h3>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-stone-700">Description</label><input type="text" required value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="mt-1 block w-full border border-stone-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-emerald-500" placeholder="e.g. Electricity Bill" /></div>
                    <div><label className="block text-sm font-medium text-stone-700">Amount</label><input type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="mt-1 block w-full border border-stone-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-emerald-500" placeholder="50000" /></div>
                    <div><label className="block text-sm font-medium text-stone-700">Date</label><input type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})} className="mt-1 block w-full border border-stone-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-emerald-500" /></div>
                  </div>
                </div>
                <div className="bg-stone-50 px-6 py-3 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-xl">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {returnModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/75" onClick={() => setReturnModalOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full z-10">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full"><CheckCircle2 className="h-6 w-6 text-red-600" /></div>
                  <h3 className="text-lg font-medium text-stone-900">Confirm Return</h3>
                </div>
                <p className="mt-4 text-stone-500">Apakah Anda menyetujui bahwa barang telah dikembalikan? Stok akan otomatis dikembalikan ke inventaris.</p>
              </div>
              <div className="bg-stone-50 px-6 py-3 flex justify-end gap-3">
                <button onClick={() => setReturnModalOpen(false)} className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-xl">Cancel</button>
                <button onClick={executeReturn} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">{submitting ? 'Processing...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/75" onClick={() => setDeleteExpenseModalOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full z-10">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full"><Trash2 className="h-6 w-6 text-red-600" /></div>
                  <h3 className="text-lg font-medium text-stone-900">Delete Expense</h3>
                </div>
                <p className="mt-4 text-stone-500">Apakah Anda yakin ingin menghapus pengeluaran ini?</p>
              </div>
              <div className="bg-stone-50 px-6 py-3 flex justify-end gap-3">
                <button onClick={() => setDeleteExpenseModalOpen(false)} className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-xl">Cancel</button>
                <button onClick={executeDeleteExpense} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">{submitting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full z-10">
              <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-white/20 rounded-xl"><FileText size={20} /></div>
                  <div><h3 className="text-lg font-bold">Detail Transaksi</h3><p className="text-xs text-emerald-100">#INV-{viewData.id}</p></div>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-white"><ArrowLeft size={20} /></button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase mb-1">Pelanggan</p>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-stone-100 rounded-lg"><User size={14} /></div>
                        <div><p className="text-sm font-bold text-stone-800">{viewData.customerName}</p><p className="text-xs text-stone-500">{viewData.customerPhone}</p></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase mb-1">Status Sewa</p>
                      <span className={`px-2 text-xs font-semibold rounded-full ${viewData.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'}`}>{viewData.status}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase mb-1">Waktu Sewa</p>
                      <p className="text-sm font-medium text-stone-700">{format(new Date(viewData.startDate), 'dd MMM')} - {format(new Date(viewData.endDate), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-emerald-600 font-bold">{viewData.durationDays} Hari</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase mb-1">Metode Bayar</p>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${getPaymentStyle(viewData.paymentMethod || 'Cash')}`}>{viewData.paymentMethod || 'Cash'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-stone-50 rounded-2xl border border-stone-200 max-h-64 overflow-y-auto mb-6">
                  {viewData.items && viewData.items.length > 0 ? (
                    <table className="min-w-full divide-y divide-stone-200">
                      <thead className="bg-stone-100 sticky top-0">
                        <tr><th className="px-4 py-2 text-left text-xs font-bold text-stone-500">Barang</th><th className="px-4 py-2 text-center text-xs font-bold text-stone-500">Qty</th><th className="px-4 py-2 text-right text-xs font-bold text-stone-500">Subtotal</th></tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {viewData.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-stone-800">{item.itemName || item.name || '-'}</td>
                            <td className="px-4 py-2 text-sm text-stone-600 text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm font-medium text-stone-800 text-right">{formatCurrency(item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-stone-400">
                      <p className="text-sm">Tidak ada data barang</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm border-t border-stone-200 pt-4">
                  <div><span className="text-stone-500">Subtotal:</span> <span className="font-medium ml-2">{formatCurrency(viewData.subtotal)}</span></div>
                  <div><span className="text-stone-500">Discount:</span> <span className="text-red-600 font-medium ml-2">-{viewData.discount || 0}%</span></div>
                  <div><span className="font-bold text-emerald-600">Total: {formatCurrency(viewData.totalAmount)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
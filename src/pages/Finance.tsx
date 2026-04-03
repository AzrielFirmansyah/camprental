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
      case 'QRIS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Transfer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Cash':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const totalIncome = transactions.reduce((sum, tx) => sum + Number(tx.totalAmount || 0), 0);
  const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  // Pagination logic for Income
  const incomeTotalPages = Math.ceil(transactions.length / itemsPerPage);
  const incomeIdxLast = currentIncomePage * itemsPerPage;
  const incomeIdxFirst = incomeIdxLast - itemsPerPage;
  const currentIncomeItems = transactions.slice(incomeIdxFirst, incomeIdxLast);

  // Pagination logic for Expenses
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
      ['Tanggal', 'Nama Pelanggan', 'Telepon', 'Tgl Mulai', 'Tgl Selesai', 'Durasi (Hari)', 'Metode', 'Harga Awal', 'Diskon (%)', 'Potongan', 'Total Bayar', 'Status'],
      ...transactions.map(tx => [
        format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm'),
        tx.customerName,
        tx.customerPhone,
        format(new Date(tx.startDate), 'yyyy-MM-dd'),
        format(new Date(tx.endDate), 'yyyy-MM-dd'),
        tx.durationDays,
        tx.paymentMethod || 'Cash',
        tx.subtotal || tx.totalAmount,
        tx.discount || 0,
        tx.discountAmount || 0,
        tx.totalAmount,
        tx.status
      ]),
      [],
      ['Total Pendapatan', '', '', '', '', '', '', '', '', '', totalIncome, '']
    ];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Income Transactions');

    XLSX.writeFile(wb, `Income_Transactions_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-stone-100 pt-1 pb-4 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-stone-900">Financial Reports</h1>
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-200"
              >
                <Plus size={16} />
                <span>Add Expense</span>
              </button>
            )}
            <div className="relative">
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-2 bg-white text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-50 transition-colors font-medium text-sm border border-stone-200 shadow-sm"
              >
                <FileText size={16} />
                <span>Export Report</span>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsExportMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden z-20 py-1 origin-top-right transition-all">
                    <button onClick={exportToPDF} className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-3">
                      <Download size={16} className="text-red-500" /> 
                      <span className="font-medium">Export to PDF</span>
                    </button>
                    <div className="h-px bg-stone-100 mx-2"></div>
                    <button onClick={exportToExcel} className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-3">
                      <Download size={16} className="text-emerald-500" /> 
                      <span className="font-medium">Export to Excel</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-medium text-stone-500">Total Income</span>
            </div>
            <h3 className="text-xl font-bold text-stone-900">{formatCurrency(totalIncome)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 text-red-600">
                <TrendingDown size={20} />
              </div>
              <span className="text-xs font-medium text-stone-500">Total Expenses</span>
            </div>
            <h3 className="text-xl font-bold text-stone-900">{formatCurrency(totalExpense)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                <DollarSign size={20} />
              </div>
              <span className="text-xs font-medium text-stone-500">Net Profit</span>
            </div>
            <h3 className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netProfit)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col flex-1 min-h-0">
        <div className="flex border-b border-stone-200 sticky top-0 bg-white z-20">
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors ${
              activeTab === 'income' 
                ? 'border-b-2 border-emerald-500 text-emerald-600 bg-emerald-50/50' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            Income (Transactions)
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors ${
              activeTab === 'expense' 
                ? 'border-b-2 border-red-500 text-red-600 bg-red-50/50' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            Expenses
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === 'income' ? (
            <table className="min-w-full divide-y divide-stone-200 border-separate border-spacing-0">
              <thead className="bg-stone-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Detail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Pelanggan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Harga Awal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Diskon (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Potongan Harga</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Total Dibayar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Metode Bayar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-center text-stone-500">Loading...</td></tr>
                ) : currentIncomeItems.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-4 text-center text-stone-500">Belum ada transaksi</td></tr>
                ) : (
                  currentIncomeItems.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => openViewModal(tx.id)}
                          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Lihat Detail Barang"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-stone-900">{tx.customerName}</div>
                        <div className="text-xs text-stone-500">{tx.customerPhone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-700">
                        {formatCurrency(Number(tx.subtotal || tx.totalAmount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {Number(tx.discount || 0) > 0 ? (
                          <span className="text-red-600 font-medium">-{tx.discount}%</span>
                        ) : '0%'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-medium">
                        {Number(tx.discountAmount || 0) > 0 ? `-${formatCurrency(tx.discountAmount)}` : 'Rp 0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 bg-emerald-50/10">
                        {formatCurrency(Number(tx.totalAmount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${getPaymentStyle(tx.paymentMethod || 'Cash')}`}>
                          {tx.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tx.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {tx.status === 'active' ? (
                          <button 
                            onClick={() => confirmReturn(tx.id)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors border border-red-200"
                          >
                            Mark Returned
                          </button>
                        ) : tx.status === 'returned' ? (
                          <span className="text-red-400 bg-red-50 px-3 py-1 rounded-lg border border-red-200 cursor-not-allowed opacity-60">
                            Mark Returned
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-stone-200 border-separate border-spacing-0">
              <thead className="bg-stone-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-stone-500">Loading...</td></tr>
                ) : currentExpenseItems.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-stone-500">No expenses found</td></tr>
                ) : (
                  currentExpenseItems.map((exp) => (
                    <tr key={exp.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {format(new Date(exp.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                        {exp.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-stone-400 hover:text-red-600 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsExpenseModalOpen(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleExpenseSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-stone-900 mb-4">
                    Add Operational Expense
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700">Description</label>
                      <input type="text" required value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder="e.g. Electricity Bill" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700">Amount</label>
                      <input type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder="50000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700">Date</label>
                      <input type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})} className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                    </div>
                  </div>
                </div>
                <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Save Expense
                  </button>
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-stone-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setReturnModalOpen(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CheckCircle2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-stone-900">Mark Transaction as Returned</h3>
                    <div className="mt-2">
                      <p className="text-sm text-stone-500">
                        Apakah Anda menyetujui bahwa barang pihak penyewa ini telah utuh dikembalikan ke toko? Tindakan ini otomatis akan mengembalikan stok (return) barang-barang bersangkutan ke tabel inventaris.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={executeReturn}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Return'}
                </button>
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-xl border border-stone-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Expense Modal */}
      {deleteExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setDeleteExpenseModalOpen(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-stone-900">Hapus Catatan Pengeluaran</h3>
                    <div className="mt-2">
                      <p className="text-sm text-stone-500">
                        Apakah Anda yakin ingin menghapus pengeluaran ini? Tindakan ini akan secara permanen menghapus data dan memperbarui laporan keuangan Anda.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={executeDeleteExpense}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {submitting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteExpenseModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-xl border border-stone-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail View Modal */}
      <AnimatePresence>
        {isViewModalOpen && viewData && (
          <div className="fixed inset-0 z-[70] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 transition-opacity"
                onClick={() => setIsViewModalOpen(false)}
              >
                <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"></div>
              </motion.div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-10 inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
              >
                <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold leading-none">Detail Transaksi</h3>
                      <p className="text-xs text-emerald-100 mt-1">#INV-{viewData.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>

                <div className="p-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Pelanggan</p>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-stone-100 rounded-lg text-stone-600">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-800">{viewData.customerName}</p>
                            <p className="text-xs text-stone-500">{viewData.customerPhone}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Status Sewa</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          viewData.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'
                        }`}>
                          {viewData.status}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Waktu Sewa</p>
                        <p className="text-sm font-medium text-stone-700">
                          {format(new Date(viewData.startDate), 'dd MMM')} - {format(new Date(viewData.endDate), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs text-emerald-600 font-bold">{viewData.durationDays} Hari</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Metode Bayar</p>
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${getPaymentStyle(viewData.paymentMethod || 'Cash')}`}>
                          {viewData.paymentMethod || 'Cash'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-y-auto max-h-[320px] custom-scrollbar scroll-smooth mb-6">
                    <table className="min-w-full divide-y divide-stone-200">
                      <thead className="bg-stone-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-bold text-stone-500 uppercase">Barang</th>
                          <th className="px-4 py-2 text-center text-[10px] font-bold text-stone-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold text-stone-500 uppercase">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {viewData.items?.map((item: any) => (
                          <tr key={item.id} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-stone-800">{item.itemName}</td>
                            <td className="px-4 py-3 text-sm text-center text-stone-600">{item.quantity}x</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-stone-700">{formatCurrency(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="space-y-2 border-t border-dashed border-stone-300 pt-4">
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>Harga Awal</span>
                      <span>{formatCurrency(viewData.subtotal)}</span>
                    </div>
                    {Number(viewData.discountAmount) > 0 && (
                      <div className="flex justify-between text-xs text-red-500 font-medium">
                        <span>Diskon ({viewData.discount}%)</span>
                        <span>-{formatCurrency(viewData.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                       <span className="text-sm font-bold text-stone-800 uppercase">Total Dibayar</span>
                       <span className="text-xl font-black text-emerald-600">{formatCurrency(viewData.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 px-6 py-4 flex justify-end gap-3 border-t border-stone-200">
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-white text-sm font-bold rounded-xl hover:bg-stone-900 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ArrowLeft size={18} />
                    <span>Kembali</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

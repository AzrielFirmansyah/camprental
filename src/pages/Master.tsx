import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, Database, List, Tag, Percent, CreditCard } from 'lucide-react';

export default function Master() {
  const [activeTab, setActiveTab] = useState<'categories' | 'statuses' | 'discounts' | 'payments'>('categories');
  const [categories, setCategories] = useState<any[]>([]);
  const [itemStatuses, setItemStatuses] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number, type: 'category' | 'status' | 'discount' | 'payment' } | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: 'stone',
    description: '',
    percentage: 0
  });

  const [currentCatPage, setCurrentCatPage] = useState(1);
  const [currentStatusPage, setCurrentStatusPage] = useState(1);
  const [currentDiscountPage, setCurrentDiscountPage] = useState(1);
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const itemsPerPage = 8;

  const loadData = async () => {
    try {
      setLoading(true);
      const [catsRes, statusesRes, discountsRes, paymentsRes] = await Promise.allSettled([
        fetchApi('/categories'),
        fetchApi('/item_statuses'),
        fetchApi('/discounts'),
        fetchApi('/payment_methods')
      ]);
      setCategories(catsRes.status === 'fulfilled' ? catsRes.value : []);
      setItemStatuses(statusesRes.status === 'fulfilled' ? statusesRes.value : []);
      setDiscounts(discountsRes.status === 'fulfilled' ? discountsRes.value : []);
      setPaymentMethods(paymentsRes.status === 'fulfilled' ? paymentsRes.value : []);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let endpoint = '';
    let body: any = {};

    if (activeTab === 'categories') {
      endpoint = '/categories';
      body = { name: formData.name };
    } else if (activeTab === 'statuses') {
      endpoint = '/item_statuses';
      body = { name: formData.name, color: formData.color, description: formData.description };
    } else if (activeTab === 'discounts') {
      endpoint = '/discounts';
      body = { name: formData.name, percentage: Number(formData.percentage) };
    } else {
      endpoint = '/payment_methods';
      body = { name: formData.name };
    }

    try {
      if (editingItem) {
        await fetchApi(`${endpoint}/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        await fetchApi(endpoint, {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error(`Failed to save ${activeTab}`, error);
      const msg = error.message || 'Error tidak diketahui';
      alert(`Gagal menyimpan ${activeTab}: ${msg}`);
    }
  };

  const confirmDelete = (id: number, type: 'category' | 'status' | 'discount' | 'payment') => {
    setItemToDelete({ id, type });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    let endpoint = '';
    if (type === 'category') endpoint = `/categories/${id}`;
    else if (type === 'status') endpoint = `/item_statuses/${id}`;
    else if (type === 'discount') endpoint = `/discounts/${id}`;
    else endpoint = `/payment_methods/${id}`;

    try {
      await fetchApi(endpoint, { method: 'DELETE' });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error: any) {
      console.error(`Failed to delete ${type}`, error);
      alert(error.message || `Failed to delete ${type}. It might be in use.`);
      setDeleteModalOpen(false);
    }
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        color: item.color || 'stone',
        description: item.description || '',
        percentage: item.percentage || 0
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        color: 'stone',
        description: '',
        percentage: 0
      });
    }
    setIsModalOpen(true);
  };

  const getFilteredData = () => {
    if (activeTab === 'categories') return categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeTab === 'statuses') return itemStatuses.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeTab === 'discounts') return discounts.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return paymentMethods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const filteredData = getFilteredData();

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentPage = activeTab === 'categories' ? currentCatPage : activeTab === 'statuses' ? currentStatusPage : activeTab === 'discounts' ? currentDiscountPage : currentPaymentPage;
  const setCurrentPage = activeTab === 'categories' ? setCurrentCatPage : activeTab === 'statuses' ? setCurrentStatusPage : activeTab === 'discounts' ? setCurrentDiscountPage : setCurrentPaymentPage;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald': return { dot: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-500', ring: 'ring-emerald-200', lightBg: 'bg-emerald-50', lightText: 'text-emerald-700 shadow-emerald-100' };
      case 'orange': return { dot: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500', ring: 'ring-orange-200', lightBg: 'bg-orange-50', lightText: 'text-orange-700 shadow-orange-100' };
      case 'stone': return { dot: 'bg-stone-500', light: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-500', ring: 'ring-stone-200', lightBg: 'bg-stone-50', lightText: 'text-stone-700 shadow-stone-100' };
      case 'red': return { dot: 'bg-red-500', light: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', ring: 'ring-red-200', lightBg: 'bg-red-50', lightText: 'text-red-700 shadow-red-100' };
      case 'blue': return { dot: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500', ring: 'ring-blue-200', lightBg: 'bg-blue-50', lightText: 'text-blue-700 shadow-blue-100' };
      case 'purple': return { dot: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500', ring: 'ring-purple-200', lightBg: 'bg-purple-50', lightText: 'text-purple-700 shadow-purple-100' };
      case 'amber': return { dot: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-500', ring: 'ring-amber-200', lightBg: 'bg-amber-50', lightText: 'text-amber-700 shadow-amber-100' };
      default: return { dot: 'bg-stone-500', light: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-500', ring: 'ring-stone-200', lightBg: 'bg-stone-50', lightText: 'text-stone-700 shadow-stone-100' };
    }
  };

  const colors = [
    { value: 'emerald', label: 'Emerald' },
    { value: 'orange', label: 'Orange' },
    { value: 'stone', label: 'Stone' },
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'amber', label: 'Amber' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <Database size={24} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Master Data</h1>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add {activeTab === 'categories' ? 'Category' : activeTab === 'statuses' ? 'Status' : activeTab === 'discounts' ? 'Discount' : 'Payment'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-stone-100 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'categories'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
            }`}
        >
          <Tag size={16} />
          Categories
        </button>
        <button
          onClick={() => { setActiveTab('statuses'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'statuses'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
            }`}
        >
          <List size={16} />
          Item Status
        </button>
        <button
          onClick={() => { setActiveTab('discounts'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'discounts'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
            }`}
        >
          <Percent size={16} />
          Discounts
        </button>
        <button
          onClick={() => { setActiveTab('payments'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'payments'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
            }`}
        >
          <CreditCard size={16} />
          Payments
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
      >
        <div className="p-4 border-b border-stone-200">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-stone-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-stone-50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider w-20">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  {activeTab === 'categories' ? 'Name' : activeTab === 'statuses' ? 'Status' : activeTab === 'discounts' ? 'Promo' : 'Method'}
                </th>
                {activeTab === 'statuses' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Description</th>
                )}
                {activeTab === 'discounts' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Percentage</th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-stone-500">No {activeTab} found</td></tr>
              ) : (
                currentItems.map((item) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {activeTab === 'statuses' ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${getColorClasses(item.color).dot} shadow-sm border border-white`}></span>
                          <span className="text-stone-900">{item.name}</span>
                        </div>
                      ) : (
                        <span className="text-stone-900">{item.name}</span>
                      )}
                    </td>
                    {activeTab === 'statuses' && (
                      <td className="px-6 py-4 text-sm text-stone-500 max-w-md truncate">
                        {item.description || '-'}
                      </td>
                    )}
                    {activeTab === 'discounts' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                        {item.percentage}%
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800 mr-4 transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => confirmDelete(item.id, activeTab === 'categories' ? 'category' : activeTab === 'statuses' ? 'status' : activeTab === 'discounts' ? 'discount' : 'payment')} className="text-red-600 hover:text-red-800 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-widest">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-stone-300 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-stone-300 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-stone-900 mb-4">
                    {editingItem ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700">
                        {activeTab === 'categories' ? 'Category Name' : activeTab === 'statuses' ? 'Status Name' : activeTab === 'discounts' ? 'Discount Name' : 'Payment Method Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        placeholder="Enter name..."
                      />
                    </div>
                    {activeTab === 'statuses' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-stone-700">Display Color</label>
                          <div className="mt-2 grid grid-cols-4 gap-2">
                            {colors.map((c) => {
                              const cls = getColorClasses(c.value);
                              return (
                                <button
                                  key={c.value}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, color: c.value })}
                                  className={`flex items-center justify-center py-2 px-1 rounded-lg border text-xs gap-1.5 transition-all ${formData.color === c.value
                                    ? `${cls.border} ${cls.lightBg} ${cls.lightText} ring-2 ${cls.ring}`
                                    : 'border-stone-200 hover:border-stone-400 text-stone-600'
                                    }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${cls.dot}`}></span>
                                  {c.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700">Description (Optional)</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                    {activeTab === 'discounts' && (
                      <div>
                        <label className="block text-sm font-medium text-stone-700">Percentage (%)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          value={formData.percentage}
                          onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })}
                          className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Save Data
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-stone-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setDeleteModalOpen(false)}>
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
                    <h3 className="text-lg leading-6 font-medium text-stone-900">Delete {itemToDelete?.type}</h3>
                    <div className="mt-2">
                       <p className="text-sm text-stone-500">Yakin ingin menghapus data master ini?</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={executeDelete}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete Data
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-xl border border-stone-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

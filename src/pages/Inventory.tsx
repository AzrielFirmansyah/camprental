import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [itemStatuses, setItemStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [submitting, setSubmitting] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    dailyPrice: '',
    weeklyPrice: '',
    totalStock: ''
  });

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const loadData = async () => {
    try {
      const [itemsRes, catsRes, statusesRes] = await Promise.allSettled([
        fetchApi('/items'),
        fetchApi('/categories'),
        fetchApi('/item_statuses')
      ]);
      const fetchedCategories = (catsRes.status === 'fulfilled' ? catsRes.value : []) as any[];
      const sortedCategories = [...fetchedCategories].sort((a, b) => {
        const catA = a.name?.toLowerCase() || '';
        const catB = b.name?.toLowerCase() || '';

        if (catA === 'tenda' && catB !== 'tenda') return -1;
        if (catA !== 'tenda' && catB === 'tenda') return 1;
        return catA.localeCompare(catB);
      });
      setItems(itemsRes.status === 'fulfilled' ? itemsRes.value : []);
      setCategories(sortedCategories);
      setItemStatuses(statusesRes.status === 'fulfilled' ? statusesRes.value : []);
    } catch (error) {
      console.error('Failed to load inventory', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleSearchFilter = () => {
      const itemId = localStorage.getItem('searchItemId');
      const itemName = localStorage.getItem('searchItemName');
      
      if (itemId) {
        localStorage.removeItem('searchItemId');
        localStorage.removeItem('searchItemName');
        loadData().then(() => {
          setCurrentPage(1);
          setItems((prev: any[]) => prev.filter(i => i.id.toString() === itemId));
        });
      } else if (itemName) {
        localStorage.removeItem('searchItemName');
        setSearchTerm(itemName);
      }
    };
    handleSearchFilter();
  }, []);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModalOpen(true);
  };

  const executeSubmit = async () => {
    setConfirmModalOpen(false);
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        categoryId: parseInt(formData.categoryId) || null
      };
      if (editingItem) {
        await fetchApi(`/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/items', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', categoryId: '', dailyPrice: '', weeklyPrice: '', totalStock: '' });
      loadData();
    } catch (error: any) {
      console.error('Failed to save item', error);
      alert(error.message || 'Failed to save item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (itemToDelete === null) return;
    setLoading(true);
    try {
      await fetchApi(`/items/${itemToDelete}`, { method: 'DELETE' });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to delete item', error);
      const msg = error.message || 'Failed to delete item. It may be in use in a transaction.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        categoryId: item.categoryId?.toString() || '',
        dailyPrice: item.dailyPrice?.toString() || '',
        weeklyPrice: item.weeklyPrice?.toString() || '',
        totalStock: item.totalStock?.toString() || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        categoryId: categories[0]?.id?.toString() || '',
        dailyPrice: '',
        weeklyPrice: '',
        totalStock: ''
      });
    }
    setIsModalOpen(true);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    const catA = a.categoryName?.toLowerCase() || '';
    const catB = b.categoryName?.toLowerCase() || '';

    if (catA === 'tenda' && catB !== 'tenda') return -1;
    if (catA !== 'tenda' && catB === 'tenda') return 1;

    if (catA !== catB) {
      return catA.localeCompare(catB);
    }

    return a.name.localeCompare(b.name);
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald': return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
      case 'orange': return { bg: 'bg-orange-100', text: 'text-orange-800' };
      case 'stone': return { bg: 'bg-stone-100', text: 'text-stone-800' };
      case 'red': return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'blue': return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'purple': return { bg: 'bg-purple-100', text: 'text-purple-800' };
      case 'amber': return { bg: 'bg-amber-100', text: 'text-amber-800' };
      default: return { bg: 'bg-stone-100', text: 'text-stone-800' };
    }
  };

  const getDisplayStatus = (item: any) => {
    const s = item.status?.toLowerCase();

    if (s === 'habis' || item.availableStock <= 0) return { text: 'Habis', colors: 'bg-red-100 text-red-800' };
    if (s === 'menipis' || (item.availableStock >= 1 && item.availableStock <= 3)) return { text: 'Menipis', colors: 'bg-orange-100 text-orange-800' };

    return { text: 'Ada', colors: 'bg-emerald-100 text-emerald-800' };
  };

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-stone-100 pt-1 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-stone-900">Inventory Management</h1>
          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-stone-200 sticky top-0 bg-white z-20">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-stone-50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-stone-200 border-separate border-spacing-0">
            <thead className="bg-stone-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Daily Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Stock (Avail/Total)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-stone-500">Loading...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-stone-500">No items found</td></tr>
              ) : (
                currentItems.map((item) => {
                  const status = getDisplayStatus(item);
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-stone-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-stone-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-stone-500">{item.categoryName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-stone-900">{formatCurrency(item.dailyPrice)}</div>
                        <div className="text-xs text-stone-500">{formatCurrency(item.weeklyPrice)} / week</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${item.availableStock < 3 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {item.availableStock}
                          </span>
                          <span className="text-sm text-stone-500 mx-1">/</span>
                          <span className="text-sm text-stone-500">{item.totalStock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.colors}`}>
                          {status.text}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-900 mr-4">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => confirmDelete(item.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
            <div className="text-sm text-stone-500">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, sortedItems.length)}</span> of <span className="font-medium">{sortedItems.length}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handlePreSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-stone-900 mb-4">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700">Item Name</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 border border-stone-300 rounded-xl bg-white text-sm font-medium text-stone-700 hover:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-200"
                      >
                        <span className="truncate">
                          {categories.find(c => c.id.toString() === formData.categoryId.toString())?.name || 'Select Category'}
                        </span>
                        <ChevronDown size={18} className={`text-stone-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setIsCategoryDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-[70] w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden"
                            >
                              <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-stone-200">
                                {categories.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, categoryId: c.id });
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${formData.categoryId.toString() === c.id.toString() ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                                {categories.length === 0 && (
                                  <div className="px-3 py-2.5 text-sm text-stone-400 italic">No categories found</div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700">Daily Price</label>
                        <input type="number" required value={formData.dailyPrice} onChange={(e) => setFormData({ ...formData, dailyPrice: e.target.value })} className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700">Weekly Price</label>
                        <input type="number" required value={formData.weeklyPrice} onChange={(e) => setFormData({ ...formData, weeklyPrice: e.target.value })} className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700">Total Stock</label>
                        <input type="number" required value={formData.totalStock} onChange={(e) => setFormData({ ...formData, totalStock: e.target.value })} className="mt-1 block w-full border border-stone-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700">Status (Automatic)</label>
                        <div className="mt-1 block w-full border border-stone-200 bg-stone-50 rounded-xl py-2 px-3 text-stone-500 text-sm font-medium">
                          {Number(formData.totalStock) <= 0 ? 'Habis' : Number(formData.totalStock) <= 3 ? 'Menipis' : 'Ada'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" disabled={submitting} className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                    {submitting ? 'Saving...' : 'Save'}
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
                    <h3 className="text-lg leading-6 font-medium text-stone-900">Delete Item</h3>
                    <div className="mt-2">
                      <p className="text-sm text-stone-500">
                        Apakah Anda yakin ingin menghapus item ini dari inventaris? Data yang dihapus tidak dapat dipulihkan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={executeDelete}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
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
      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setConfirmModalOpen(false)}>
              <div className="absolute inset-0 bg-stone-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Edit className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-stone-900">Confirm Changes</h3>
                    <div className="mt-2">
                      <p className="text-sm text-stone-500">
                        Apakah Anda yakin ingin menyimpan perubahan data barang ini?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={executeSubmit}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Yes, Save
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
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

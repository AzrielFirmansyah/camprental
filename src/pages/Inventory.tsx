import React, { useEffect, useState, useRef } from 'react';
import { fetchApi, uploadImage } from '../lib/api';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, ChevronDown, Image as ImageIcon, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [itemStatuses, setItemStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [deleteImage, setDeleteImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    executeSubmit();
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        categoryId: parseInt(formData.categoryId) || null
      };
      
      if (editingItem) {
        if (imageFile) {
          const formDataPayload = new FormData();
          formDataPayload.append('image', imageFile);
          Object.entries(payload).forEach(([key, value]) => {
            formDataPayload.append(key, String(value));
          });
          await fetchApi(`/items/${editingItem.id}`, {
            method: 'PUT',
            body: formDataPayload
          });
        } else {
          const updatePayload = { ...payload, deleteImage: deleteImage ? 'true' : 'false' };
          await fetchApi(`/items/${editingItem.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatePayload)
          });
        }
      } else {
        if (imageFile) {
          const formDataPayload = new FormData();
          formDataPayload.append('image', imageFile);
          Object.entries(payload).forEach(([key, value]) => {
            formDataPayload.append(key, String(value));
          });
          await fetchApi('/items', {
            method: 'POST',
            body: formDataPayload
          });
        } else {
          await fetchApi('/items', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', categoryId: '', dailyPrice: '', weeklyPrice: '', totalStock: '' });
      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);
      setDeleteImage(false);
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
      setExistingImage(item.image || null);
      setImagePreview(null);
      setDeleteImage(false);
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        categoryId: categories[0]?.id?.toString() || '',
        dailyPrice: '',
        weeklyPrice: '',
        totalStock: ''
      });
      setExistingImage(null);
      setImagePreview(null);
      setDeleteImage(false);
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Only jpg, png, gif, and webp files are allowed');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setDeleteImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (existingImage) {
      setDeleteImage(true);
    } else {
      setExistingImage(null);
    }
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
    <div className="flex flex-col h-auto md:h-full space-y-6 md:overflow-hidden pb-20 md:pb-0">
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
          {/* Mobile: Card Grid */}
          {isMobile ? (
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="py-10 text-center text-stone-400 text-sm">Loading...</div>
              ) : currentItems.length === 0 ? (
                <div className="py-10 text-center text-stone-400 text-sm">No items found</div>
              ) : (
                currentItems.map((item) => {
                  const status = getDisplayStatus(item);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-stone-50 rounded-2xl border border-stone-200 p-4 flex gap-3 items-center"
                    >
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl bg-white border border-stone-100 flex items-center justify-center overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center">
                            <span className="text-stone-500 font-black text-sm">{item.name?.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-900 text-sm truncate uppercase">{item.name}</p>
                        <p className="text-xs text-stone-400 truncate">{item.categoryName}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-black text-emerald-600">{formatCurrency(item.dailyPrice)}<span className="font-normal text-stone-400">/hr</span></span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.colors}`}>{status.text}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">Stok: <span className={item.availableStock < 3 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{item.availableStock}</span>/{item.totalStock}</p>
                      </div>
                      {/* Actions */}
                      {isAdmin && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => openModal(item)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => confirmDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          ) : (
            /* Desktop: Table */
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
          )}
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

      {/* Improved Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}>
              <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative z-10 inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full"
            >
              <form onSubmit={handlePreSubmit}>
                <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-2xl">
                      {editingItem ? <Edit className="text-white" size={24} /> : <Plus className="text-white" size={24} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {editingItem ? 'EDIT ITEM' : 'TAMBAH ITEM'}
                      </h3>
                      <p className="text-emerald-100 text-xs font-medium">{editingItem ? 'Perbarui data barang' : 'Tambah barang baru ke inventaris'}</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nama Item</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="Contoh: Tenda 4 Orang"
                        className="w-full border-2 border-stone-200 rounded-2xl py-3 px-4 text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/50 transition-all" 
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Kategori</label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 border-2 border-stone-200 rounded-2xl bg-white text-sm font-bold text-stone-700 hover:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-200"
                      >
                        <span className="truncate">
                          {categories.find(c => c.id.toString() === formData.categoryId.toString())?.name || 'Pilih Kategori'}
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
                              className="absolute z-[70] w-full mt-2 bg-white border-2 border-stone-100 rounded-2xl shadow-2xl overflow-hidden"
                            >
                              <div className="max-h-48 overflow-y-auto p-1">
                                {categories.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, categoryId: c.id });
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors ${formData.categoryId.toString() === c.id.toString() ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'}`}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                                {categories.length === 0 && (
                                  <div className="px-4 py-3 text-sm text-stone-400 italic">Tidak ada kategori</div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Harga Harian</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">Rp</span>
                          <input 
                            type="number" 
                            required 
                            value={formData.dailyPrice} 
                            onChange={(e) => setFormData({ ...formData, dailyPrice: e.target.value })} 
                            className="w-full pl-10 pr-4 py-3 border-2 border-stone-200 rounded-2xl text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/50 transition-all" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Harga Mingguan</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">Rp</span>
                          <input 
                            type="number" 
                            required 
                            value={formData.weeklyPrice} 
                            onChange={(e) => setFormData({ ...formData, weeklyPrice: e.target.value })} 
                            className="w-full pl-10 pr-4 py-3 border-2 border-stone-200 rounded-2xl text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/50 transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Total Stok</label>
                        <input 
                          type="number" 
                          required 
                          value={formData.totalStock} 
                          onChange={(e) => setFormData({ ...formData, totalStock: e.target.value })} 
                          className="w-full border-2 border-stone-200 rounded-2xl py-3 px-4 text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 focus:bg-emerald-50/50 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Status</label>
                        <div className={`w-full border-2 border-stone-100 rounded-2xl py-3 px-4 text-sm font-black uppercase ${Number(formData.totalStock) <= 0 ? 'bg-red-50 text-red-600' : Number(formData.totalStock) <= 3 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {Number(formData.totalStock) <= 0 ? 'Habis' : Number(formData.totalStock) <= 3 ? 'Menipis' : 'Ada'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Gambar Item (JPG/PNG, max 10MB)</label>
                      <div className="flex items-center gap-4">
                        {(imagePreview || existingImage) && !deleteImage ? (
                          <div className="relative">
                            <img 
                              src={imagePreview || existingImage || ''} 
                              alt="Preview" 
                              className="w-24 h-24 object-cover rounded-2xl border-2 border-emerald-200 shadow-lg"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 border-2 border-dashed border-stone-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                          >
                            <ImageIcon size={24} className="text-stone-400" />
                            <span className="text-[10px] text-stone-400 font-bold mt-1">Upload</span>
                          </div>
                        )}
                        {!imagePreview && !existingImage && (
                          <p className="text-xs text-stone-400">Klik kotak di atas untuk upload gambar</p>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-stone-50 flex gap-3 border-t border-stone-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-3.5 bg-white border-2 border-stone-200 text-stone-500 font-black rounded-2xl hover:bg-stone-50 transition-colors"
                  >
                    BATAL
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="flex-1 py-3.5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'MENYIMPAN...' : 'SIMPAN'}
                  </button>
                </div>
              </form>
            </motion.div>
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

    </div>
  );
}

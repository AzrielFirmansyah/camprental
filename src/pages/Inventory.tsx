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
  const itemsPerPage = 9;
  const [submitting, setSubmitting] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    dailyPrice: '',
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
    const itemId = localStorage.getItem('searchItemId');
    const itemName = localStorage.getItem('searchItemName');

    if (itemId) {
      setSearchTerm(itemName || itemId);
      localStorage.removeItem('searchItemId');
      localStorage.removeItem('searchItemName');
      setCurrentPage(1);
    } else if (itemName) {
      setSearchTerm(itemName);
      localStorage.removeItem('searchItemName');
      setCurrentPage(1);
    }
  }, []);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmit();
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        dailyPrice: formData.dailyPrice,
        weeklyPrice: Number(formData.dailyPrice) * 7,
        totalStock: formData.totalStock,
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
      setFormData({ name: '', categoryId: '', dailyPrice: '', totalStock: '' });
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
      <div className="sticky -top-4 z-30 bg-stone-100 flex flex-col gap-4 py-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-lg md:text-2xl font-black text-stone-900 tracking-tight uppercase">Inventory</h1>
          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-emerald-600 text-white px-3 md:px-4 py-2 rounded-lg md:rounded-xl hover:bg-emerald-700 transition-all font-black text-[10px] md:text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20"
            >
              <Plus size={isMobile ? 14 : 20} />
              <span>Tambah Item</span>
            </button>
          )}
        </div>

        <div className="bg-white p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-stone-200">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={isMobile ? 16 : 18} className="text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="Cari barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-stone-100 bg-stone-50 rounded-lg md:rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-xs md:text-sm uppercase font-black"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col flex-1 min-h-0 overflow-hidden">
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
                      className="bg-stone-50 rounded-xl border border-stone-200 p-3 flex gap-3 items-center"
                    >
                      {/* Image */}
                      <div className="w-12 h-12 rounded-lg bg-white border border-stone-100 flex items-center justify-center overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center">
                            <span className="text-stone-500 font-black text-xs">{item.name?.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-stone-900 text-xs truncate uppercase tracking-tight">{item.name}</p>
                        <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">{item.categoryName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-emerald-600">{formatCurrency(item.dailyPrice)}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider ${status.colors}`}>{status.text}</span>
                        </div>
                        <p className="text-[9px] text-stone-500 mt-0.5 font-bold">Stok: <span className={item.availableStock < 3 ? 'text-red-600 font-black' : 'text-emerald-600 font-black'}>{item.availableStock}</span> / {item.totalStock}</p>
                      </div>
                      {/* Actions */}
                      {isAdmin && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => openModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Edit size={12} />
                          </button>
                          <button onClick={() => confirmDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg">
                            <Trash2 size={12} />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Harga / Hari</th>
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
                          <div className="text-sm font-black text-emerald-600">{formatCurrency(item.dailyPrice)}</div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[28px] md:rounded-[32px] w-full max-w-sm md:max-w-md shadow-2xl overflow-hidden"
          >
            <div className="bg-emerald-600 p-5 md:p-6 relative">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {editingItem ? <Edit className="text-white" size={20} /> : <Plus className="text-white" size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase leading-none">
                    {editingItem ? 'EDIT ITEM' : 'TAMBAH ITEM'}
                  </h3>
                  <p className="text-emerald-100 text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">{editingItem ? 'Perbarui data barang' : 'Item Inventaris Baru'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePreSubmit} className="p-5 md:p-6 space-y-4">
              <div className="space-y-4">
                {/* Image Upload Area */}
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Foto Barang</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-stone-50 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden relative group">
                      {(imagePreview || (existingImage && !deleteImage)) ? (
                        <>
                          <img src={imagePreview || existingImage || ''} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute inset-0 bg-stone-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} className="text-white" />
                          </button>
                        </>
                      ) : (
                        <div className="text-stone-300 flex flex-col items-center justify-center">
                          <ImageIcon size={isMobile ? 18 : 20} className="mb-1" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Upload</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-white hover:bg-stone-50 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all w-full border border-stone-200 shadow-sm active:scale-95"
                      >
                        Pilih Gambar Baru
                      </button>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-1.5 ml-1 text-center">JPG/PNG MAKS 10MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Nama Item</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Tenda 4 Orang"
                    className="w-full border border-stone-100 bg-stone-50 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Kategori</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-stone-100 bg-stone-50 rounded-xl text-sm font-bold text-stone-700 hover:border-emerald-500 transition-all"
                  >
                    <span className="truncate">
                      {categories.find(c => c.id.toString() === formData.categoryId.toString())?.name || 'Pilih Kategori'}
                    </span>
                    <ChevronDown size={16} className={`text-stone-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isCategoryDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsCategoryDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-[70] w-full mt-1 bg-white border border-stone-100 shadow-xl rounded-xl overflow-hidden p-1"
                        >
                          <div className="max-h-40 overflow-y-auto">
                            {categories.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, categoryId: c.id });
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${formData.categoryId.toString() === c.id.toString() ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'}`}
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Harga / Hari</label>
                    <input type="number" required value={formData.dailyPrice} onChange={(e) => setFormData({ ...formData, dailyPrice: e.target.value })} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-100 rounded-xl text-sm font-black text-emerald-600 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Stok Total</label>
                    <input type="number" required value={formData.totalStock} onChange={(e) => setFormData({ ...formData, totalStock: e.target.value })} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-100 rounded-xl text-sm font-black text-stone-700 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-stone-400 font-black text-[10px] uppercase tracking-widest">BATAL</button>
                <button type="submit" disabled={submitting} className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                  {submitting ? 'PROSES...' : 'SIMPAN ITEM'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter mb-2">Hapus Item?</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-bold uppercase tracking-wider">Tindakan ini permanen. Item yang dipilih akan dihapus dari sistem.</p>
            </div>
            <div className="p-4 bg-stone-50 flex gap-3 border-t border-stone-100">
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-3 text-stone-400 font-black text-[10px] uppercase tracking-widest">BATAL</button>
              <button onClick={executeDelete} disabled={submitting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">HAPUS</button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

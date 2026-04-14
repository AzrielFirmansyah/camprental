import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, UserPlus, Users as UsersIcon, Mail, Shield, Key, X } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await fetchApi(`/users/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchApi('/users', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Gagal menyimpan user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;
    try {
      await fetchApi(`/users/${id}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      alert('Gagal menghapus user');
    }
  };

  const openModal = (user?: any) => {
    if (user) {
      setEditingItem(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'staff'
      });
    }
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <UsersIcon size={24} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">User Management</h1>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <UserPlus size={20} />
          <span>Add New User</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-stone-50"
            />
          </div>
          <div className="text-sm text-stone-500 font-medium">
            Total Users: {users.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-stone-500">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-stone-500">No users found</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4 truncate max-w-[200px]">
                          <div className="text-sm font-bold text-stone-900">{user.name}</div>
                          <div className="text-[10px] text-stone-400 uppercase tracking-widest">{user.role} Account</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        user.role === 'owner' ? 'bg-amber-100 text-amber-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openModal(user)} className="text-blue-600 hover:text-blue-800 mr-4 transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] md:rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 p-5 relative">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <UserPlus className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase leading-none">
                    {editingItem ? 'EDIT USER' : 'TAMBAH USER'}
                  </h3>
                  <p className="text-emerald-100 text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">{editingItem ? 'Perbarui akses pengguna' : 'Pengguna Sistem Baru'}</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Nama Lengkap</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-stone-100 bg-stone-50 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 transition-all" placeholder="e.g. Budi Santoso" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Alamat Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-stone-100 bg-stone-50 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 transition-all" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">Role & Akses</label>
                  <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border border-stone-100 bg-stone-50 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 transition-all appearance-none">
                    <option value="staff">Staff (Standard)</option>
                    <option value="owner">Owner (View Only)</option>
                    <option value="admin">Admin (System Manager)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase mb-1.5 ml-1 tracking-widest">{editingItem ? 'Password Baru' : 'Buat Password'}</label>
                  <input required={!editingItem} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-stone-100 bg-stone-50 rounded-xl py-2.5 px-3 text-sm font-bold text-stone-700 focus:outline-none focus:border-emerald-500 transition-all" placeholder="••••••••" />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-stone-400 font-black text-[10px] uppercase tracking-widest">BATAL</button>
                <button type="submit" className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                  {editingItem ? 'SIMPAN PERUBAHAN' : 'BUAT AKUN'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

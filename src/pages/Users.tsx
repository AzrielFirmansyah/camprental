import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, UserPlus, Users as UsersIcon, Mail, Shield, Key } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900 opacity-75" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <UserPlus size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900">
                      {editingItem ? 'Edit User' : 'Add New User'}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 px-1">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UsersIcon size={16} className="text-stone-400" />
                        </div>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-stone-50" placeholder="e.g. Budi Santoso" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 px-1">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail size={16} className="text-stone-400" />
                        </div>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="block w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-stone-50" placeholder="email@example.com" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 px-1">Role & Access</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Shield size={16} className="text-stone-400" />
                        </div>
                        <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="block w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-stone-50">
                          <option value="staff">Staff (Standard Access)</option>
                          <option value="owner">Owner (Full View Access)</option>
                          <option value="admin">Admin (System Manager)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 px-1">
                        {editingItem ? 'New Password (Leave blank to keep same)' : 'Create Password'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key size={16} className="text-stone-400" />
                        </div>
                        <input required={!editingItem} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="block w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-stone-50" placeholder="••••••••" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-6 flex flex-col sm:flex-row-reverse gap-3 border-t border-stone-100">
                  <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                    {editingItem ? 'Save Changes' : 'Create Account'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-3 bg-white text-stone-600 border border-stone-200 rounded-xl font-medium hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

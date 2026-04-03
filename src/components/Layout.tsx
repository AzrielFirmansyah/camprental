import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Database,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Key
} from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) return alert('Konfirmasi password baru tidak cocok');

    setSubmitting(true);
    try {
      await fetchApi('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        })
      });
      alert('Password berhasil diperbarui!');
      setShowPasswordModal(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      alert(error.message || 'Gagal mengganti password');
    } finally {
      setSubmitting(false);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'owner'] },
    { path: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'owner'] },
    { path: '/pos', label: 'POS / Rental', icon: ShoppingCart, roles: ['admin', 'owner'] },
    { path: '/finance', label: 'Finance', icon: DollarSign, roles: ['admin', 'owner'] },
    { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
    { path: '/master', label: 'Master', icon: Database, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: isSidebarOpen ? 256 : 0 }}
        animate={{ width: isSidebarOpen ? 256 : 0 }}
        className="bg-stone-900 text-stone-100 flex flex-col overflow-hidden"
      >
        <div className="p-6 flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-emerald-400 whitespace-nowrap">
            Sewa Outdoor Sameton
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                  }`}
              >
                <Icon size={20} />
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* User Menu */}
          <div className="relative z-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsUserMenuOpen(!isUserMenuOpen);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-stone-100 transition-all group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-stone-800 leading-tight">{user?.name}</span>
                <span className="text-xs text-stone-400 capitalize leading-tight">{user?.role}</span>
              </div>
              <ChevronDown size={16} className={`text-stone-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setIsUserMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                      <p className="text-xs text-stone-500">Logged in as</p>
                      <p className="text-sm font-semibold text-stone-800 mt-0.5 truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setShowPasswordModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        <Key size={16} />
                        <span className="font-medium">Change Password</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-stone-100 transition-colors"
                      >
                        <LogOut size={16} />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => !submitting && setShowPasswordModal(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-stone-200">
              <form onSubmit={handleChangePassword}>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
                      <Key size={24} />
                    </div>
                    <h3 className="text-xl font-black text-stone-900 tracking-tight">Security</h3>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 px-1">Current Password</label>
                      <input required type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="block w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" placeholder="••••••••" />
                    </div>

                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 px-1">New Password</label>
                      <input required type="password" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="block w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" placeholder="••••••••" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 px-1">Confirm New Password</label>
                      <input required type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="block w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-6 flex flex-col gap-3 border-t border-stone-100">
                  <button type="submit" disabled={submitting} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                    {submitting ? 'Verifying...' : 'Update Password'}
                  </button>
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="w-full py-3 bg-transparent text-stone-400 text-xs font-bold hover:text-stone-600 transition-colors">
                    Back to Dashboard
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

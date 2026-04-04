import { useState, useEffect } from 'react';
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
  Key,
  Search,
  Bell
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import GlobalSearch from './GlobalSearch';
import { useNotifications } from './NotificationContext';

const LOW_STOCK_THRESHOLD = 3;

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
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { unreadCount, addNotification } = useNotifications();
  const [lowStockChecked, setLowStockChecked] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setMobileMenuOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const checkLowStock = async () => {
      if (lowStockChecked || !user) return;
      try {
        const items = await fetchApi('/items');
        if (items && Array.isArray(items)) {
          const lowStockItems = items.filter((i: any) => i.availableStock <= LOW_STOCK_THRESHOLD);
          if (lowStockItems.length > 0) {
            const itemNames = lowStockItems.slice(0, 3).map((i: any) => i.name).join(', ');
            const more = lowStockItems.length > 3 ? ` dan ${lowStockItems.length - 3} lainnya` : '';
            addNotification('stock_low', 'Stok Menipis!', `${lowStockItems.length} barang hampir habis: ${itemNames}${more}`);
          }
        }
      } catch (err) {
        console.error('Failed to check low stock:', err);
      }
      setLowStockChecked(true);
    };
    checkLowStock();
  }, [addNotification, lowStockChecked, user]);

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
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new })
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

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900">
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <motion.div
          initial={{ x: -280 }}
          animate={{ x: mobileMenuOpen ? 0 : -280 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed left-0 top-0 h-full w-64 bg-stone-900 text-stone-100 z-50 shadow-2xl"
        >
          <div className="p-5 pt-5 border-b border-stone-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-white leading-tight">Sewa Outdoor</h1>
                <p className="text-sm font-medium text-emerald-400">Sameton</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-stone-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
          </div>
          <nav className="p-3 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-800">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-bold text-white">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
              <LogOut size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && isSidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 256, opacity: 1 }}
          className="bg-stone-900 text-stone-100 flex flex-col"
        >
          <div className="p-5 pt-6">
            <div className="mb-2">
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Sewa Outdoor</h1>
              <p className="text-sm font-medium text-emerald-400">Sameton</p>
            </div>
            <div className="h-px bg-gradient-to-r from-emerald-500/60 to-transparent mt-3"></div>
          </div>
          <nav className="flex-1 px-4 space-y-2 mt-2">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-stone-200 h-14 md:h-16 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => isMobile ? setMobileMenuOpen(true) : setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
            >
              {isMobile ? <Menu size={24} /> : (isSidebarOpen ? <X size={20} /> : <Menu size={20} />)}
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-stone-400 hover:text-stone-600"
            >
              <Search size={16} />
              <span className="text-xs">Cari...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-stone-100 rounded border border-stone-200 font-mono">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <div className="relative">
                <button className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>
            )}
            {/* User Menu - Hide on mobile when sidebar is open */}
            {!isMobile && (
              <div className="relative z-50">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsUserMenuOpen(!isUserMenuOpen); }}
                  className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-xl hover:bg-stone-100 transition-all"
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs md:text-sm font-bold text-white">
                    {user?.name?.charAt(0)}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-semibold text-stone-800">{user?.name}</span>
                    <span className="text-xs text-stone-400 capitalize">{user?.role}</span>
                  </div>
                  <ChevronDown size={16} className={`text-stone-400 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50"
                      >
                        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                          <p className="text-xs text-stone-500">Logged in as</p>
                          <p className="text-sm font-semibold text-stone-800 truncate">{user?.email}</p>
                        </div>
                        <div className="py-1">
                          <button onClick={() => { setIsUserMenuOpen(false); setShowPasswordModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50">
                            <Key size={16} /> <span>Change Password</span>
                          </button>
                          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-stone-100">
                            <LogOut size={16} /> <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-3 md:p-6">
          <Outlet />
        </div>
      </main>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => !submitting && setShowPasswordModal(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-stone-200">
              <form onSubmit={handleChangePassword}>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl"><Key size={24} /></div>
                    <h3 className="text-xl font-black text-stone-900">Security</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Current Password</label>
                      <input required type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">New Password</label>
                      <input required type="password" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Confirm New Password</label>
                      <input required type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500" placeholder="••••••••" />
                    </div>
                  </div>
                </div>
                <div className="bg-stone-50 p-6 flex flex-col gap-3 border-t border-stone-100">
                  <button type="submit" disabled={submitting} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 disabled:opacity-50">
                    {submitting ? 'Verifying...' : 'Update Password'}
                  </button>
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="w-full py-3 text-stone-400 text-xs font-bold hover:text-stone-600">
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
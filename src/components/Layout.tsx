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
  Bell,
  FileText,
  MoreHorizontal,
  Settings
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
  const [isTablet, setIsTablet] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { unreadCount, addNotification } = useNotifications();
  const [lowStockChecked, setLowStockChecked] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const w = window.innerWidth;
      const mobile = w < 768;
      const tablet = w >= 768 && w < 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsSidebarOpen(w >= 1024);
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

  const ownerNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner'] },
    { path: '/inventory', label: 'Inventory', icon: Package, roles: ['owner'] },
    { path: '/pos', label: 'POS / Rental', icon: ShoppingCart, roles: ['owner'] },
    { path: '/finance', label: 'Finance', icon: DollarSign, roles: ['owner'] },
  ];

  const adminNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { path: '/inventory', label: 'Inventory', icon: Package, roles: ['admin'] },
    { path: '/pos', label: 'POS / Rental', icon: ShoppingCart, roles: ['admin'] },
    { path: '/finance', label: 'Finance', icon: DollarSign, roles: ['admin'] },
    { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
    { path: '/master', label: 'Master', icon: Database, roles: ['admin'] },
  ];

  const filteredNavItems = user?.role === 'admin' ? adminNavItems.filter(item => user && item.roles.includes(user.role)) : ownerNavItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
      {/* Responsive Sidebar: icon-only for tablet, full for laptop */}
      {!isMobile && (isTablet || isSidebarOpen) && (
        <aside
          className={`bg-stone-900 text-stone-100 flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${
            isTablet ? 'w-16' : 'w-64'
          }`}
        >
          {/* Logo */}
          {isTablet ? (
            <div className="py-5 flex justify-center border-b border-stone-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">S</span>
              </div>
            </div>
          ) : (
            <div className="p-5 pt-6">
              <div className="mb-2">
                <h1 className="text-2xl font-black tracking-wide text-white leading-tight uppercase" style={{ letterSpacing: '0.15em' }}>Sewa Outdoor</h1>
                <p className="text-lg font-bold text-emerald-400 uppercase tracking-widest mt-1">Sameton</p>
              </div>
              <div className="h-px bg-gradient-to-r from-emerald-500/60 to-transparent mt-3"></div>
            </div>
          )}
          {/* Nav Items */}
          <nav className={`flex-1 space-y-1.5 mt-3 ${isTablet ? 'px-2' : 'px-4'}`}>
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isTablet ? item.label : undefined}
                  className={`flex items-center rounded-xl transition-colors ${
                    isTablet ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                  }`}
                >
                  <Icon size={20} />
                  {!isTablet && <span className="font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-stone-200 h-14 md:h-16 flex items-center justify-between px-3 md:px-6 shrink-0 z-50">
          <div className="flex items-center gap-2">
            {!isTablet && (
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 md:w-9 md:h-9 object-contain rounded-lg shadow-sm" />
                <div className="flex flex-col">
                  <p className="text-[9px] font-black text-emerald-600 leading-none uppercase tracking-widest">Sewa Outdoor</p>
                  <h2 className="text-[11px] font-black text-stone-900 uppercase tracking-tight truncate leading-tight">Sameton</h2>
                </div>
              </div>
            )}
            {!isMobile && (
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-stone-400 hover:text-stone-600 ml-4"
              >
                <Search size={16} />
                <span className="text-xs">Cari...</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isMobile ? (
              <div className="relative">
                <button 
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex items-center gap-2 p-1 bg-stone-50 border border-stone-200 rounded-2xl active:scale-95 transition-all"
                >
                  <div className="text-right pr-1">
                    <p className="text-[10px] font-black text-stone-900 uppercase leading-none">{user?.name}</p>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">{user?.role}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
                    {user?.name?.charAt(0)}
                  </div>
                </button>

                <AnimatePresence>
                  {isAccountMenuOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="fixed inset-0 z-40 bg-stone-900/10 backdrop-blur-[1px]"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-52 bg-white rounded-[24px] shadow-2xl border border-stone-200 z-50 overflow-hidden py-2 px-2"
                      >
                        <button 
                          onClick={() => { setShowPasswordModal(true); setIsAccountMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest"
                        >
                          <Settings size={16} />
                          <span>Password</span>
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest border-t border-stone-50 mt-1"
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative z-50">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsUserMenuOpen(!isUserMenuOpen); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-stone-100 transition-all border border-transparent hover:border-stone-200"
                >
                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-800">{user?.name}</p>
                    <p className="text-xs text-emerald-600 font-bold uppercase">{user?.role}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                    {user?.name?.charAt(0)}
                  </div>
                </button>
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 p-2"
                      >
                         <button onClick={() => { setIsUserMenuOpen(false); setShowPasswordModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-stone-600 hover:bg-stone-50 rounded-xl">
                           <Key size={16} /> <span>Ganti Password</span>
                         </button>
                         <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl border-t border-stone-50 mt-1">
                           <LogOut size={16} /> <span>Logout Sesi</span>
                         </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 relative scroll-smooth">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-stone-200 z-[60] flex items-center justify-around px-1 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          {filteredNavItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all ${
                  isActive ? 'text-emerald-600' : 'text-stone-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50' : ''}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tighter leading-none">
                  {item.label === 'POS / Rental' ? 'POS' : item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-stone-400"
          >
            <div className="p-1.5 rounded-xl">
              <MoreHorizontal size={18} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter leading-none">Top</span>
          </button>
        </nav>
      )}

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter">Ganti Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-1.5 text-stone-300 hover:text-stone-900 transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Password Sekarang</label>
                  <input required type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full px-4 py-2.5 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Password Baru</label>
                  <input required type="password" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full px-4 py-2.5 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Konfirmasi Password Baru</label>
                  <input required type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full px-4 py-2.5 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 text-stone-400 font-black text-[10px] uppercase tracking-widest">Batal</button>
                  <button type="submit" disabled={submitting} className="flex-[2] py-3 bg-stone-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    {submitting ? 'PROSES...' : 'GANTI PASSWORD'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
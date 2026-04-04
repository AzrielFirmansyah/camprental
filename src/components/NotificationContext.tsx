import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Package, Search, Bell } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'stock_low' | 'stock_update';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotificationType, title: string, message?: string) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: NotificationType, title: string, message?: string) => {
    const newNotification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, markAsRead, clearAll, unreadCount }}>
      {children}
      <NotificationToast notifications={notifications} removeNotification={removeNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationToast({ notifications, removeNotification }: { notifications: Notification[], removeNotification: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {notifications.slice(0, 5).map((notification, index) => (
          <NotificationItem key={notification.id} notification={notification} index={index} onClose={() => removeNotification(notification.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ notification, index, onClose }: { notification: Notification; index: number; onClose: () => void }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'stock_low': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'stock_update': return <Package className="text-blue-500" size={18} />;
      case 'success': return <Package className="text-emerald-500" size={18} />;
      case 'error': return <AlertTriangle className="text-red-500" size={18} />;
      default: return <Bell className="text-stone-500" size={18} />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'stock_low': return 'border-l-amber-500';
      case 'stock_update': return 'border-l-blue-500';
      case 'success': return 'border-l-emerald-500';
      case 'error': return 'border-l-red-500';
      default: return 'border-l-stone-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-xl shadow-lg border border-stone-200 border-l-4 ${getBorderColor()} overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900">{notification.title}</p>
            {notification.message && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{notification.message}</p>}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
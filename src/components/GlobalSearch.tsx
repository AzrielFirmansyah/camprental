import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Package, Users, ShoppingCart, FileText, DollarSign, Tag } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface SearchResult {
  type: 'transaction' | 'item' | 'category';
  id: number;
  title: string;
  subtitle: string;
  icon?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const searchData = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data: any = await fetchApi(`/search?q=${encodeURIComponent(searchQuery)}`);
      
      const searchResults: SearchResult[] = [];

      if (data.items && data.items.length > 0) {
        data.items.forEach((i: any) => {
          searchResults.push({
            type: 'item',
            id: i.id,
            title: i.name,
            subtitle: `Kategori: ${i.categoryName || '-'} | Stok: ${i.availableStock}/${i.totalStock}`,
            icon: 'package'
          });
        });
      }

      if (data.transactions && data.transactions.length > 0) {
        data.transactions.forEach((t: any) => {
          searchResults.push({
            type: 'transaction',
            id: t.id,
            title: t.customerName || 'Tanpa Nama',
            subtitle: `#${t.id} | ${t.paymentMethod || 'Cash'} | Rp ${Number(t.totalAmount || 0).toLocaleString('id-ID')}`,
            icon: 'shoppingCart'
          });
        });
      }

      if (data.categories && data.categories.length > 0) {
        data.categories.forEach((c: any) => {
          searchResults.push({
            type: 'category',
            id: c.id,
            title: c.name,
            subtitle: 'Kategori',
            icon: 'tag'
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => searchData(query), 300);
    return () => clearTimeout(debounce);
  }, [query, searchData]);

  const handleResultClick = (result: SearchResult) => {
    onClose();
    if (result.type === 'item') {
      localStorage.setItem('searchItemId', result.id.toString());
      localStorage.setItem('searchItemName', result.title);
      navigate('/inventory');
    } else if (result.type === 'transaction') {
      localStorage.setItem('searchTransactionId', result.id.toString());
      localStorage.setItem('searchTransactionName', result.title);
      navigate('/finance');
    } else if (result.type === 'category') {
      localStorage.setItem('searchCategoryId', result.id.toString());
      localStorage.setItem('searchCategoryName', result.title);
      navigate('/master');
    }
  };

  const getIcon = (icon?: string) => {
    switch (icon) {
      case 'shoppingCart': return <ShoppingCart size={14} />;
      case 'package': return <Package size={14} />;
      case 'tag': return <Tag size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transaction': return 'bg-blue-100 text-blue-700';
      case 'item': return 'bg-emerald-100 text-emerald-700';
      case 'category': return 'bg-purple-100 text-purple-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-xl z-[70]"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden mx-4">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
                <Search size={18} className="text-stone-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari barang, transaksi, atau kategori..."
                  className="flex-1 text-sm text-stone-900 placeholder-stone-400 outline-none"
                />
                <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-stone-400">
                    <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Mencari...</p>
                  </div>
                ) : query.length < 2 ? (
                  <div className="p-6 text-center text-stone-400">
                    <Search size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Ketik minimal 2 karakter untuk mencari</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center text-stone-400">
                    <Search size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Tidak ada hasil untuk "{query}"</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500">
                          {getIcon(result.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{result.title}</p>
                          <p className="text-xs text-stone-500">{result.subtitle}</p>
                        </div>
                        <span className={`text-xs text-stone-600 capitalize px-2 py-0.5 rounded ${getTypeColor(result.type)}`}>
                          {result.type === 'transaction' ? 'Transaksi' : result.type === 'item' ? 'Barang' : 'Kategori'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-2 border-t border-stone-100 bg-stone-50 text-xs text-stone-400 flex items-center justify-between">
                <span>Tekan ESC untuk menutup</span>
                <span>{results.length} hasil</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
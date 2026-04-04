import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Package, Users, ShoppingCart, FileText } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface SearchResult {
  type: 'transaction' | 'customer' | 'item';
  id: number;
  title: string;
  subtitle: string;
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
      const [transactions, items] = await Promise.all([
        fetchApi('/transactions'),
        fetchApi('/items')
      ]);

      const searchResults: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();

      if (transactions && Array.isArray(transactions)) {
        transactions
          .filter((t: any) => 
            t.customerName?.toLowerCase().includes(lowerQuery) ||
            t.customerPhone?.includes(lowerQuery) ||
            t.id.toString().includes(lowerQuery)
          )
          .slice(0, 5)
          .forEach((t: any) => {
            searchResults.push({
              type: 'transaction',
              id: t.id,
              title: t.customerName || 'Tanpa Nama',
              subtitle: `#${t.id} - ${t.paymentMethod || 'Cash'}`
            });
          });
      }

      if (items && Array.isArray(items)) {
        items
          .filter((i: any) => i.name?.toLowerCase().includes(lowerQuery))
          .slice(0, 5)
          .forEach((i: any) => {
            searchResults.push({
              type: 'item',
              id: i.id,
              title: i.name,
              subtitle: `Stok: ${i.availableStock}/${i.totalStock}`
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
    switch (result.type) {
      case 'transaction':
        navigate('/finance');
        break;
      case 'item':
        navigate('/inventory');
        break;
      default:
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <ShoppingCart size={14} />;
      case 'customer': return <Users size={14} />;
      case 'item': return <Package size={14} />;
      default: return <FileText size={14} />;
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
                  placeholder="Cari transaksi, customer, atau barang..."
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
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{result.title}</p>
                          <p className="text-xs text-stone-500">{result.subtitle}</p>
                        </div>
                        <span className="text-xs text-stone-400 capitalize px-2 py-0.5 bg-stone-100 rounded">
                          {result.type}
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
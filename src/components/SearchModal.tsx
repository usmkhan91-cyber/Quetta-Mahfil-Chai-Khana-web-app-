import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Plus, Sparkles, Coffee, ArrowRight, Loader2 } from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import { useCart } from '../context/CartContext';
import { MenuItem } from '../types';
import { triggerHaptic } from '../lib/haptics';
import { centralAgent } from '../services/centralAgentService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (item: MenuItem) => void;
}

export default function SearchModal({ isOpen, onClose, onSelectItem }: SearchModalProps) {
  const { items } = useMenu();
  const { addToCart } = useCart();
  const [query, setQuery] = useState('');
  const [geminiResults, setGeminiResults] = useState<MenuItem[] | null>(null);
  const [geminiNote, setGeminiNote] = useState<string | null>(null);
  const [isSearchingGemini, setIsSearchingGemini] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setGeminiResults(null);
      setGeminiNote(null);
    }
  }, [isOpen]);

  const quickPills = [
    'Zafrani Chai',
    'Matka Doodh Patti',
    'Lacha Paratha',
    'Chicken Cheese',
    'Peshawari Kehwa',
    'Nutella Paratha',
    'Dry Fruit Shake'
  ];

  const handleGeminiSearch = async () => {
    if (!query.trim() || isSearchingGemini) return;
    setIsSearchingGemini(true);
    triggerHaptic('light');

    try {
      const data = await centralAgent.getSmartSearch(query.trim());
      if (data && Array.isArray(data.items)) {
        setGeminiResults(data.items);
        setGeminiNote(data.aiNote || null);
      }
    } catch {
      // Fallback handled by local list
    } finally {
      setIsSearchingGemini(false);
    }
  };

  const filteredItems = geminiResults || items.filter(item => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    addToCart(item);
    triggerHaptic('light');
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setGeminiResults(null);
    setGeminiNote(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1300] flex items-start justify-center pt-16 md:pt-24 p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="relative w-full max-w-2xl bg-[#FAF8F5] dark:bg-[#1A1714] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-3 bg-white dark:bg-[#201C18]">
              <Search className="text-[#C85A32] flex-shrink-0" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGeminiSearch();
                }}
                placeholder="Search flavors, cravings, dietary moods..."
                className="w-full bg-transparent text-sm md:text-base font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleGeminiSearch}
                  disabled={isSearchingGemini}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                  title="Search with Gemini Intelligence"
                >
                  {isSearchingGemini ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} className="text-amber-500 animate-pulse" />
                  )}
                  <span className="hidden sm:inline">Gemini AI</span>
                </button>
              )}
              {query && (
                <button
                  onClick={() => handleQueryChange('')}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-xs font-semibold px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              >
                ESC
              </button>
            </div>

            {/* Gemini Sommelier Note Banner */}
            {geminiNote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300"
              >
                <Sparkles size={14} className="text-amber-500 flex-shrink-0 animate-pulse" />
                <span className="font-medium">{geminiNote}</span>
              </motion.div>
            )}

            {/* Quick Filter Tags */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex-shrink-0">
                Popular:
              </span>
              {quickPills.map((pill) => (
                <button
                  key={pill}
                  onClick={() => setQuery(pill)}
                  className="px-2.5 py-1 rounded-full text-xs bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-[#C85A32] hover:text-[#C85A32] transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Results Body */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 no-scrollbar">
              {query.trim() === '' ? (
                <div className="text-center py-12 text-stone-400">
                  <Coffee size={36} className="mx-auto mb-3 opacity-40 text-[#C85A32]" />
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    Search the Quetta Mahfil Menu
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Type an item name or tap a popular suggestion above
                  </p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    No matching items found for "{query}"
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Try searching for "Chai", "Paratha", or "Kehwa"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem && onSelectItem(item)}
                      className="p-3 rounded-xl bg-white dark:bg-[#201C18] border border-stone-200/80 dark:border-stone-800 hover:border-[#C85A32]/40 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center flex-shrink-0">
                            <Coffee size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h5 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate group-hover:text-[#C85A32] transition-colors">
                            {item.name}
                          </h5>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 block truncate">
                            {item.category} • {item.description?.slice(0, 50)}...
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono text-sm font-bold text-[#C85A32] dark:text-[#E5A84B]">
                          Rs. {item.price}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleAdd(e, item)}
                          className="px-3 py-1.5 rounded-lg bg-[#C85A32] hover:bg-[#b04a25] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

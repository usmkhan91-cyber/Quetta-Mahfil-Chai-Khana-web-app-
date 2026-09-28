import React, { useState, useMemo } from 'react';
import { useMenu } from '../context/MenuContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  SlidersHorizontal, 
  Info, 
  Coffee, 
  Flame, 
  Sparkles, 
  Check, 
  Heart,
  X
} from 'lucide-react';
import { Category, MenuItem } from '../types';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import ItemDetailModal from '../components/ItemDetailModal';

export default function Menu() {
  const { items, loading } = useMenu();
  const { addToCart } = useCart();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const categories: { label: Category | 'All'; urdu: string; icon: string }[] = [
    { label: 'All', urdu: 'تمام پکوان', icon: '✨' },
    { label: 'Tea & Kehwa', urdu: 'چائے و قہوہ', icon: '🫖' },
    { label: 'Chat Pata Paratha', urdu: 'چٹ پٹا پراٹھا', icon: '🫓' },
    { label: 'Meetha Paratha', urdu: 'میٹھا پراٹھا', icon: '🍯' },
    { label: 'Fresh Juices', urdu: 'تازہ جوسز', icon: '🍊' },
    { label: 'Milk Shakes', urdu: 'ملک شیکس', icon: '🥤' },
    { label: 'Dry Fruit Shakes', urdu: 'ڈرائی فروٹ شیک', icon: '🌰' },
    { label: 'Juices & Drinks', urdu: 'مشروبات', icon: '🍹' }
  ];

  // Real-time category count map
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { All: items.length };
    for (const item of items) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || 
        item.name.toLowerCase().includes(q) || 
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    addToCart(item);
    triggerHaptic('medium');

    setAddedItemIds(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [item.id]: false }));
    }, 1200);
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveCategory('All');
    triggerHaptic('light');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-3 border-[#C85A32] border-t-transparent rounded-full animate-spin" />
        <p className="font-display font-medium text-stone-600 dark:text-stone-400 animate-pulse text-sm">
          Preparing the Quetta Mahfil Menu...
        </p>
      </div>
    );
  }

  return (
    <div id="menu" className="p-4 md:p-10 max-w-7xl mx-auto scroll-mt-24">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
            <span className="text-xs uppercase tracking-widest font-bold text-[#C85A32] dark:text-[#E5A84B]">
              Authentic Baloch & Pashtun Flavors
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            The Mahfil <span className="text-[#C85A32] dark:text-[#E5A84B]">Menu</span>
          </h2>
          <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-lg font-urdu text-base">
            کوئٹہ کی اصل کڑک دودھ پتی، گرما گرم خستہ پراٹھے اور خالص قہوہ
          </p>
        </div>

        {/* Search Input Bar with Clear Button */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search tea, paratha, shakes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#1E1B17] rounded-xl border border-stone-200 dark:border-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-[#C85A32] transition-all shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Slider with Count Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {categories.map((cat) => {
          const count = categoryCounts[cat.label] || 0;
          return (
            <button
              key={cat.label}
              onClick={() => {
                setActiveCategory(cat.label);
                triggerHaptic('light');
              }}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 shrink-0",
                activeCategory === cat.label
                  ? "bg-[#C85A32] text-white border-[#C85A32] shadow-sm"
                  : "bg-white dark:bg-[#1E1B17] text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-stone-300"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                activeCategory === cat.label
                  ? "bg-white/20 text-white"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-500"
              )}>
                {count}
              </span>
              <span className="text-[10px] opacity-70 font-urdu hidden sm:inline">({cat.urdu})</span>
            </button>
          );
        })}
      </div>

      {/* Filter status / result summary */}
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-6">
        <span>
          Showing <strong className="text-stone-800 dark:text-stone-200">{filteredItems.length}</strong> of {items.length} items
          {activeCategory !== 'All' && <span> in <strong className="text-[#C85A32]">{activeCategory}</strong></span>}
          {search && <span> matching "<strong className="text-stone-800 dark:text-stone-200">{search}</strong>"</span>}
        </span>
        {(search || activeCategory !== 'All') && (
          <button
            onClick={handleClearFilters}
            className="text-[#C85A32] hover:underline font-medium text-xs cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <AnimatePresence>
          {filteredItems.map((item) => {
            const isAdded = addedItemIds[item.id];

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onClick={() => setSelectedItem(item)}
                className="group bg-white dark:bg-[#1E1B17] rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md hover:border-[#C85A32]/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative h-48 overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1594631252845-29fc458695d1?q=0.8&w=800"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      alt={item.name}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    {/* Category Tag */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide uppercase">
                      {item.category}
                    </div>

                    {/* Price Tag */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-[#C85A32] text-white font-mono font-bold text-xs shadow-md">
                      Rs. {item.price}
                    </div>

                    {/* Sold out badge */}
                    {item.isAvailable === false && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center">
                        <span className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg text-xs tracking-wider">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-4">
                    <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-[#C85A32] dark:group-hover:text-[#E5A84B] transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed h-8">
                      {item.description || "Prepared with pure ingredients on slow coal fire at Quetta Mahfil."}
                    </p>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleQuickAdd(e, item)}
                    disabled={item.isAvailable === false}
                    className={cn(
                      "flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5",
                      isAdded
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-[#C85A32] hover:text-white dark:hover:bg-[#C85A32] dark:hover:text-white"
                    )}
                  >
                    {isAdded ? (
                      <>
                        <Check size={14} /> Added
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Quick Add
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-300 transition-colors"
                    title="Customize item"
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
            <Search size={28} />
          </div>
          <h4 className="text-lg font-display font-bold text-stone-800 dark:text-stone-200 mb-1">
            No items matched "{search}"
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-4">
            Try searching for Zafrani Chai, Cheese Paratha, or reset the active filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#a84824] transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Item Customization Modal */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Coffee, Sparkles, Check, BookOpen, Loader2 } from 'lucide-react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { getHeritageLore } from '../services/aiService';

interface ItemDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSweetness, setSelectedSweetness] = useState('Standard Sweet');
  const [extraMalai, setExtraMalai] = useState(false);
  const [specialNote, setSpecialNote] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  const [lore, setLore] = useState<string | null>(null);
  const [loadingLore, setLoadingLore] = useState(false);

  if (!item) return null;

  const isTea = item.category === 'Tea & Kehwa';
  const isParatha = item.category.includes('Paratha');

  const sweetnessOptions = ['Sugar-Free / Gur', 'Less Sweet', 'Standard Sweet', 'Kandhari Sweet (Karak)'];

  const handleFetchLore = async () => {
    if (lore || loadingLore) return;
    setLoadingLore(true);
    triggerHaptic('light');
    try {
      const story = await getHeritageLore(item.name, item.category);
      setLore(story || "Crafted following timeless Quetta recipes and centuries of Pashtun culinary hospitality.");
    } catch {
      setLore("Handcrafted fresh using pure ingredients following traditional tea khana brewing methods.");
    } finally {
      setLoadingLore(false);
    }
  };

  const handleAdd = () => {
    let customVariant = '';
    if (isTea) {
      customVariant = `${selectedSweetness}${extraMalai ? ' + Extra Malai' : ''}`;
    }
    addToCart(item, quantity, customVariant || undefined);
    triggerHaptic('medium');
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#FAF8F5] dark:bg-[#1A1714] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Item Image Header */}
          <div className="relative h-60 w-full bg-stone-900 overflow-hidden flex-shrink-0">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-600">
                <Coffee size={48} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="absolute bottom-4 left-6 right-6 text-white">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#C85A32] text-white inline-block mb-2">
                {item.category}
              </span>
              <h3 className="font-display font-bold text-2xl leading-tight drop-shadow-sm">
                {item.name}
              </h3>
            </div>
          </div>

          {/* Body & Customizer */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5 no-scrollbar text-stone-900 dark:text-stone-100">
            <div>
              <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {item.description || "Handcrafted fresh to order at Quetta Mahfil Chai Khana using authentic ingredients."}
              </p>
            </div>

            {/* Gemini Culinary Lore Card */}
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 text-xs text-stone-700 dark:text-stone-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Sparkles size={14} className="text-amber-500 animate-pulse" />
                  Gemini Heritage Lore
                </span>
                {!lore && (
                  <button
                    type="button"
                    onClick={handleFetchLore}
                    disabled={loadingLore}
                    className="text-[11px] font-semibold text-[#C85A32] dark:text-amber-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {loadingLore ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Consulting Gemini...
                      </>
                    ) : (
                      <>
                        <BookOpen size={12} />
                        Discover Story
                      </>
                    )}
                  </button>
                )}
              </div>
              {lore ? (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="italic text-stone-700 dark:text-stone-300 leading-relaxed font-serif"
                >
                  "{lore}"
                </motion.p>
              ) : (
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Tap to unveil the Pashtun & Balochi culinary folklore, iron tawa craft, and traditional preparation behind this dish.
                </p>
              )}
            </div>

            {/* Chai Sweetness selector */}
            {isTea && (
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Select Sweetness Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {sweetnessOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedSweetness(opt)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-medium text-left transition-all",
                        selectedSweetness === opt
                          ? "border-[#C85A32] bg-[#C85A32]/10 text-[#C85A32] font-semibold"
                          : "border-stone-200 dark:border-stone-800 hover:border-stone-300"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label
                    onClick={() => setExtraMalai(!extraMalai)}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <span className="text-xs font-medium">Add Pure Buffalo Milk Extra Malai</span>
                    <input
                      type="checkbox"
                      checked={extraMalai}
                      onChange={(e) => setExtraMalai(e.target.checked)}
                      className="accent-[#C85A32] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Paratha notes */}
            {isParatha && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                ⭐ Fried fresh in pure desi ghee with multiple crisp layers. Best enjoyed piping hot with Zafrani Chai!
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
              <span className="text-xs font-semibold">Quantity</span>
              <div className="flex items-center gap-3 bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="font-mono text-sm font-bold w-6 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Add to Bag Footer */}
          <div className="p-5 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-[#201C18] flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                Total Price
              </span>
              <span className="font-mono text-lg font-bold text-[#C85A32] dark:text-[#E5A84B]">
                Rs. {item.price * quantity}
              </span>
            </div>

            <button
              onClick={handleAdd}
              disabled={isAdded}
              className={cn(
                "px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center gap-2",
                isAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-[#C85A32] hover:bg-[#b04a25] text-white active:scale-95"
              )}
            >
              {isAdded ? (
                <>
                  <Check size={16} /> Added to Bag
                </>
              ) : (
                <>
                  <Plus size={16} /> Add to Bag
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

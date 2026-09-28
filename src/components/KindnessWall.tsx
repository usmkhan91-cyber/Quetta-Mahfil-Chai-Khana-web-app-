import React, { useState, useEffect } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { donateToWall, claimFromWall, subscribeToWall, KindnessToken } from '../services/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Gift, Coffee, Plus, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

export default function KindnessWall() {
  const { user } = useFirebase();
  const [tokens, setTokens] = useState<KindnessToken[]>([]);
  const [showDonate, setShowDonate] = useState(false);
  const [itemName, setItemName] = useState('Matka Zafrani Chai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToWall(setTokens);
    return () => unsubscribe();
  }, []);

  const handleDonate = async () => {
    if (!itemName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      await donateToWall({
        donorId: user?.uid || 'guest_kindness',
        donorName: user?.displayName || 'Kind Guest of Mahfil',
        itemName: itemName.trim(),
        status: 'available',
        createdAt: new Date().toISOString()
      });
      setItemName('Matka Zafrani Chai');
      setShowDonate(false);
      triggerHaptic('heavy');
    } catch (e) {
      console.warn('Donation error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async (tokenId: string) => {
    triggerHaptic('medium');
    await claimFromWall(tokenId, user?.uid || 'guest_recipient');
  };

  const giftSuggestions = [
    'Matka Zafrani Chai',
    'Desi Ghee Lacha Paratha',
    'Hot Doodh Patti',
    'Peshawari Kehwa',
    'Aloo Cheese Paratha'
  ];

  return (
    <div id="heritage" className="py-16 px-4 md:px-8 max-w-6xl mx-auto scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="text-[#C85A32]" size={18} />
            <span className="text-xs uppercase tracking-widest font-bold text-[#C85A32] dark:text-[#E5A84B]">
              Pay It Forward • صدقہ جاریہ
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Wall of Kindness <span className="font-urdu text-2xl md:text-4xl text-[#C85A32]">دیوارِ مہربانی</span>
          </h2>
          <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-xl leading-relaxed">
            In our Pashtun and Baloch tradition of Hujra hospitality, no traveler or guest leaves empty-handed. Pre-pay a hot cup of tea or a fresh paratha for someone in need.
          </p>
        </div>

        <button
          onClick={() => setShowDonate(true)}
          className="px-6 py-3.5 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all self-start md:self-end"
        >
          <Plus size={16} /> Gift a Tea or Meal
        </button>
      </div>

      {/* Available Tokens Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence>
          {tokens.map((token) => (
            <motion.div
              key={token.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="p-5 bg-white dark:bg-[#1E1B17] rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between text-left relative overflow-hidden"
            >
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center shrink-0">
                  <Coffee size={20} />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-stone-900 dark:text-stone-100">
                    {token.itemName}
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Gifted by: <span className="text-stone-600 dark:text-stone-300 font-medium">{token.donorName}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Available at Counter
                </span>

                <button
                  onClick={() => handleClaim(token.id!)}
                  className="px-4 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-[#C85A32] hover:text-white dark:hover:bg-[#C85A32] text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
                >
                  Claim Gift
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {tokens.length === 0 && (
          <div className="col-span-full text-center py-12 p-8 rounded-2xl bg-white dark:bg-[#1E1B17] border border-stone-200 dark:border-stone-800">
            <Heart size={32} className="text-[#C85A32] mx-auto mb-2 opacity-60" />
            <h4 className="font-display font-semibold text-base text-stone-800 dark:text-stone-200">
              Be the first to share a warm cup today
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-4">
              All previous gifts have been claimed by thankful guests!
            </p>
            <button
              onClick={() => setShowDonate(true)}
              className="px-5 py-2 rounded-xl bg-[#C85A32] text-white text-xs font-semibold hover:bg-[#b04a25] transition-colors"
            >
              Donate a Token
            </button>
          </div>
        )}
      </div>

      {/* Donation Modal */}
      <AnimatePresence>
        {showDonate && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDonate(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#FAF8F5] dark:bg-[#1A1714] border border-stone-200 dark:border-stone-800 p-6 rounded-2xl shadow-2xl z-10 text-stone-900 dark:text-stone-100"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center">
                    <Gift size={16} />
                  </div>
                  <h3 className="font-display font-bold text-lg">Gift to the Wall</h3>
                </div>
                <button
                  onClick={() => setShowDonate(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-800 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                Choose an item to pre-pay. Our staff will prepare it fresh when someone asks for the Wall of Kindness.
              </p>

              <div className="space-y-2 mb-5">
                <label className="text-xs font-semibold block">Select or Type Item</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32]"
                />

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {giftSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setItemName(sug)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] border transition-all",
                        itemName === sug
                          ? "bg-[#C85A32] text-white border-[#C85A32]"
                          : "bg-white dark:bg-[#221E1A] border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300"
                      )}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDonate}
                  disabled={!itemName.trim() || isSubmitting}
                  className="w-full py-3.5 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Posting Gift...' : 'Confirm & Post Gift to Wall'}
                </button>
                <button
                  onClick={() => setShowDonate(false)}
                  className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

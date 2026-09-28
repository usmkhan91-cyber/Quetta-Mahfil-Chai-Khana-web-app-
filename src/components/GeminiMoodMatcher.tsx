import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Coffee, 
  Plus, 
  Volume2, 
  Loader2, 
  Flame, 
  Compass, 
  ChevronRight,
  Check
} from 'lucide-react';
import { centralAgent } from '../services/centralAgentService';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import { MenuItem } from '../types';

interface GeminiMoodMatcherProps {
  onSelectItem?: (item: MenuItem) => void;
  className?: string;
}

export default function GeminiMoodMatcher({ onSelectItem, className }: GeminiMoodMatcherProps) {
  const { addToCart } = useCart();
  const { setCartOpen } = useNavigation();
  const [customMood, setCustomMood] = useState('');
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [recommendation, setRecommendation] = useState<{
    recommendedItemName: string;
    pairingChaiName: string;
    moodTag: string;
    urduPoeticReason: string;
    flavorExplanation: string;
    chefSecret?: string;
    item?: any;
    pairingChai?: any;
  } | null>(null);

  const moodChips = [
    { label: '🌧️ Chilly Lahore Weather', query: 'Chilly winter evening in Lahore, craving something warm and deep' },
    { label: '⚡ Late Night Work/Study', query: 'Tired and working late night in Bahria Town, need high caffeine and energy' },
    { label: '🍯 Sweet Tooth Fix', query: 'Intense midnight craving for warm sweetness and melted butter' },
    { label: '🌿 Light & Digestive', query: 'Feeling full or heavy, need something soothing and herbal' },
    { label: '🔥 Crispy & Spicy', query: 'Craving bold chatpata flavors, melted cheese, and juicy chicken' },
    { label: '👑 Royal Royal Treat', query: 'Celebratory gathering with friends in Hujra, wanting the richest saffron specialties' },
  ];

  const handleMatch = async (vibeText: string) => {
    if (!vibeText.trim() || isLoading) return;
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const now = new Date();
      const hours = now.getHours();
      const timeOfDay = hours >= 18 || hours < 5 ? 'Midnight/Night' : (hours < 12 ? 'Morning' : 'Afternoon');

      const result = await centralAgent.getMoodMatch(vibeText, 'Lahore Evening', timeOfDay);
      if (result && result.recommendation) {
        setRecommendation(result.recommendation);
        triggerHaptic('success');
      }
    } catch (err) {
      console.warn('Gemini mood match error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!recommendation || isPlayingAudio) return;
    setIsPlayingAudio(true);
    triggerHaptic('light');

    const spokenText = `${recommendation.urduPoeticReason}. For your mood, I recommend ${recommendation.recommendedItemName} with ${recommendation.pairingChaiName}.`;
    try {
      await centralAgent.speak(spokenText, 'ur');
    } finally {
      setTimeout(() => setIsPlayingAudio(false), 3000);
    }
  };

  const handleAddDish = (dish: any) => {
    if (!dish) return;
    addToCart(dish);
    triggerHaptic('medium');
    setAddedItems(prev => ({ ...prev, [dish.id || dish.name]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [dish.id || dish.name]: false }));
    }, 1500);
  };

  const handleAddPairingCombo = () => {
    if (recommendation?.item) {
      addToCart(recommendation.item);
    }
    if (recommendation?.pairingChai) {
      addToCart(recommendation.pairingChai);
    }
    triggerHaptic('success');
    setCartOpen(true);
  };

  return (
    <section className={cn(
      "w-full rounded-3xl p-6 md:p-8 bg-gradient-to-br from-amber-500/10 via-[#FAF8F5] to-orange-500/5 dark:from-[#251E17] dark:via-[#1B1713] dark:to-[#14110E] border border-amber-500/20 dark:border-amber-500/10 shadow-xl overflow-hidden relative",
      className
    )}>
      {/* Background Ambience Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold tracking-wider uppercase mb-2">
            <Sparkles size={13} className="text-amber-500 animate-pulse" />
            Gemini 3.8 Intelligence Engine
          </div>
          <h3 className="font-display font-bold text-2xl md:text-3xl text-stone-900 dark:text-stone-100 tracking-tight">
            AI Palate & Mood Matcher
          </h3>
          <p className="text-xs md:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-xl">
            Tell Saki your craving, current vibe, or weather. Gemini cognitive intelligence analyzes traditional flavors and pairs the perfect meal for your soul.
          </p>
        </div>
      </div>

      {/* Quick Mood Chips */}
      <div className="relative z-10 flex flex-wrap gap-2 mb-4">
        {moodChips.map((chip) => {
          const isSelected = selectedChip === chip.label;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setSelectedChip(chip.label);
                setCustomMood(chip.query);
                handleMatch(chip.query);
              }}
              disabled={isLoading}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border flex items-center gap-1.5 shadow-sm",
                isSelected
                  ? "bg-[#C85A32] text-white border-[#C85A32] shadow-md scale-105"
                  : "bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-stone-800"
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Custom Input */}
      <div className="relative z-10 flex gap-2 mb-6">
        <input
          type="text"
          value={customMood}
          onChange={(e) => setCustomMood(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleMatch(customMood);
          }}
          placeholder="e.g. Feeling exhausted after midnight shift, need something spicy with hot tea..."
          className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 text-xs md:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-inner"
        />
        <button
          type="button"
          onClick={() => handleMatch(customMood)}
          disabled={!customMood.trim() || isLoading}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#C85A32] to-[#D9943B] hover:opacity-95 text-white text-xs md:text-sm font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Match Vibe</span>
            </>
          )}
        </button>
      </div>

      {/* Recommendation Display Result */}
      <AnimatePresence>
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 p-5 md:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-amber-500/30 shadow-xl space-y-4"
          >
            {/* Tag & Audio Button */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Flame size={13} className="text-[#C85A32]" />
                {recommendation.moodTag}
              </span>

              <button
                type="button"
                onClick={handleSpeak}
                disabled={isPlayingAudio}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold transition-colors"
                title="Hear Saki Voice Greeting"
              >
                <Volume2 size={14} className={cn(isPlayingAudio && "text-amber-500 animate-pulse")} />
                <span>{isPlayingAudio ? "Speaking..." : "Listen to Saki"}</span>
              </button>
            </div>

            {/* Urdu Poetry / Greeting */}
            {recommendation.urduPoeticReason && (
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/60 dark:border-stone-800 text-right">
                <p className="font-serif text-sm md:text-base text-[#6E1A24] dark:text-[#E5A84B] font-medium leading-relaxed" dir="rtl">
                  "{recommendation.urduPoeticReason}"
                </p>
              </div>
            )}

            {/* Flavor Explanation */}
            <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {recommendation.flavorExplanation}
            </p>

            {/* Chef Secret */}
            {recommendation.chefSecret && (
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 italic">
                💡 <span className="font-semibold">Culinary Note:</span> {recommendation.chefSecret}
              </p>
            )}

            {/* Recommended Pairing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* Main Dish */}
              {recommendation.item && (
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {recommendation.item.image ? (
                      <img 
                        src={recommendation.item.image} 
                        alt={recommendation.item.name} 
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Coffee size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Recommended Dish</span>
                      <h4 className="font-bold text-xs md:text-sm text-stone-900 dark:text-stone-100 truncate">
                        {recommendation.item.name}
                      </h4>
                      <span className="font-mono text-xs font-bold text-[#C85A32] dark:text-amber-400">
                        Rs. {recommendation.item.price}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddDish(recommendation.item)}
                    className="p-2 rounded-lg bg-[#C85A32] hover:bg-[#b04a25] text-white transition-colors flex-shrink-0"
                    title="Add to cart"
                  >
                    {addedItems[recommendation.item.id || recommendation.item.name] ? (
                      <Check size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>
                </div>
              )}

              {/* Pairing Tea */}
              {recommendation.pairingChai && (
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {recommendation.pairingChai.image ? (
                      <img 
                        src={recommendation.pairingChai.image} 
                        alt={recommendation.pairingChai.name} 
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Coffee size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Ideal Tea Pairing</span>
                      <h4 className="font-bold text-xs md:text-sm text-stone-900 dark:text-stone-100 truncate">
                        {recommendation.pairingChai.name}
                      </h4>
                      <span className="font-mono text-xs font-bold text-[#C85A32] dark:text-amber-400">
                        Rs. {recommendation.pairingChai.price}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddDish(recommendation.pairingChai)}
                    className="p-2 rounded-lg bg-[#C85A32] hover:bg-[#b04a25] text-white transition-colors flex-shrink-0"
                    title="Add to cart"
                  >
                    {addedItems[recommendation.pairingChai.id || recommendation.pairingChai.name] ? (
                      <Check size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Combo Order Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddPairingCombo}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C85A32] to-[#D9943B] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all"
              >
                <span>Add Curated Combo to Bag</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

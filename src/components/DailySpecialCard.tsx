import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  Plus, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Star,
  UtensilsCrossed
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { triggerHaptic } from '../lib/haptics';
import { MenuItem } from '../types';

interface DailySpecialItem {
  id: string;
  name: string;
  urduName: string;
  category: string;
  price: number;
  originalPrice: number;
  image: string;
  description: string;
  prepTime: string;
  chefNote: string;
  highlightBadge: string;
}

const DAILY_SPECIALS: DailySpecialItem[] = [
  {
    id: 'special-zafrani-combo',
    name: 'Shahi Zafrani Matka & Lacha Feast',
    urduName: 'شاہی زعفرانی مٹکا چائے مع دیسی گھی لچھا پراٹھا',
    category: 'Tea & Kehwa',
    price: 340,
    originalPrice: 420,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=0.8&w=900',
    description: 'Slow-simmered saffron claypot tea infused with green cardamom and thick clotted buffalo malai, served with golden crisp multi-layered desi ghee lacha paratha.',
    prepTime: '12-15 mins',
    chefNote: 'Steeped over slow charcoal heat with pure Iranian saffron filaments.',
    highlightBadge: "Today's Signature Special"
  },
  {
    id: 'special-arabic-cheese',
    name: 'Arabic Stuffed Mozzarella Paratha',
    urduName: 'عربک چکن پنیر بھرپور پراٹھا',
    category: 'Chat Pata Paratha',
    price: 980,
    originalPrice: 1150,
    image: 'https://images.unsplash.com/photo-1601050690597-df056fb47091?q=0.8&w=900',
    description: 'Crispy golden flatbread overflowing with spiced chicken chunks, bell peppers, sliced black olives, oregano, and molten stretch mozzarella cheese.',
    prepTime: '18-20 mins',
    chefNote: 'Chef’s fusion classic roasted fresh on double iron tawa.',
    highlightBadge: 'Chef’s Recommendation'
  },
  {
    id: 'special-khoya-khajor',
    name: 'Royal Khoya Khajor Shahi Milkshake',
    urduName: 'شاہی کھویا کھجور ڈرائی فروٹ شیک',
    category: 'Milk Shakes',
    price: 420,
    originalPrice: 490,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=0.8&w=900',
    description: 'Velvety power blend of authentic soft Irani dates, slow-reduced artisanal khoya, roasted almonds, pure wild honey, and rich chilled buffalo milk.',
    prepTime: '5-8 mins',
    chefNote: 'Naturally sweetened with zero artificial syrups or sugars.',
    highlightBadge: 'Sweet Heritage Indulgence'
  },
  {
    id: 'special-kandahari-anaar',
    name: 'Cold-Pressed Kandahari Anaar Nectar',
    urduName: 'قندھاری انار تازہ نچوڑا رس',
    category: 'Fresh Juices',
    price: 490,
    originalPrice: 580,
    image: 'https://images.unsplash.com/photo-1471350321752-3093947b4d37?q=0.8&w=900',
    description: '100% pure cold-pressed ruby pomegranate seeds, seasoned with Himalayan pink black salt and a touch of fresh mountain garden mint.',
    prepTime: '5-7 mins',
    chefNote: 'Freshly extracted to order; rich in antioxidants and refreshing vitality.',
    highlightBadge: 'Pure Cold-Pressed'
  }
];

export default function DailySpecialCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isPaused, setIsPaused] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const { addToCart } = useCart();
  const { setCartOpen } = useNavigation();

  const currentSpecial = DAILY_SPECIALS[currentIndex];
  const ROTATION_DURATION_SEC = 6;

  // Auto-slide effect with pause on hover/touch
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setDirection('right');
      setCurrentIndex((prev) => (prev + 1) % DAILY_SPECIALS.length);
      setImageError(false);
      setProgressKey((k) => k + 1);
    }, ROTATION_DURATION_SEC * 1000);

    return () => clearInterval(interval);
  }, [isPaused, currentIndex]);

  const handlePrev = () => {
    setDirection('left');
    setCurrentIndex((prev) => (prev - 1 + DAILY_SPECIALS.length) % DAILY_SPECIALS.length);
    setImageError(false);
    setProgressKey((k) => k + 1);
    triggerHaptic('light');
  };

  const handleNext = () => {
    setDirection('right');
    setCurrentIndex((prev) => (prev + 1) % DAILY_SPECIALS.length);
    setImageError(false);
    setProgressKey((k) => k + 1);
    triggerHaptic('light');
  };

  const handleSelectIndex = (idx: number) => {
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 'right' : 'left');
    setCurrentIndex(idx);
    setImageError(false);
    setProgressKey((k) => k + 1);
    triggerHaptic('light');
  };

  const handleAddToCart = () => {
    const menuItem: MenuItem = {
      id: currentSpecial.id,
      name: currentSpecial.name,
      category: currentSpecial.category as any,
      description: currentSpecial.description,
      price: currentSpecial.price,
      image: currentSpecial.image,
      isAvailable: true
    };

    addToCart(menuItem);
    triggerHaptic('medium');
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 1600);
    setCartOpen(true);
  };

  // Staggered layout variants for smooth transition
  const cardContainerVariants = {
    enter: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? 28 : -28,
      filter: 'blur(3px)',
    }),
    center: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1] as const,
        when: 'beforeChildren',
        staggerChildren: 0.05
      }
    },
    exit: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? -28 : 28,
      filter: 'blur(3px)',
      transition: {
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1] as const
      }
    })
  };

  const childFadeVariants = {
    enter: { opacity: 0, y: 12 },
    center: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } 
    },
    exit: { opacity: 0, y: -6, transition: { duration: 0.2 } }
  };

  return (
    <motion.section 
      aria-label="Daily Special Featured Menu Item"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="py-10 px-4 md:px-8 max-w-7xl mx-auto w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Outer Featured Container with Subtle Luminous Aura */}
      <div className="relative rounded-[2.25rem] bg-gradient-to-b from-stone-900 via-[#181512] to-stone-950 border border-amber-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.36),0_0_28px_rgba(229,168,75,0.08)] overflow-hidden">
        
        {/* Animated Amber Warm Embers Backlight */}
        <motion.div 
          animate={{ opacity: isPaused ? 0.9 : [0.55, 0.9, 0.55], scale: [1, 1.04, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/15 rounded-full blur-[90px] pointer-events-none" 
        />
        <motion.div 
          animate={{ opacity: isPaused ? 0.8 : [0.45, 0.8, 0.45], scale: [1, 1.03, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#C85A32]/15 rounded-full blur-[90px] pointer-events-none" 
        />

        {/* Dynamic Rotation Progress Bar */}
        <div className="w-full h-1 bg-white/5 relative overflow-hidden">
          <motion.div
            key={progressKey}
            initial={{ width: '0%' }}
            animate={{ width: isPaused ? undefined : '100%' }}
            transition={{ duration: ROTATION_DURATION_SEC, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-amber-400 via-[#E5A84B] to-[#C85A32]"
          />
        </div>

        {/* Header Ribbon / Navigation Bar */}
        <div className="px-6 md:px-10 pt-6 pb-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-[#C85A32] flex items-center justify-center text-stone-950 shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-amber-400 block">
                Aaj Ki Khaas Peshkash
              </span>
              <h2 className="text-sm md:text-base font-display font-extrabold text-white tracking-wide">
                Chef's Daily Special Spotlight
              </h2>
            </div>
          </div>

          {/* Interactive Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Select Daily Special">
              {DAILY_SPECIALS.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectIndex(idx)}
                  role="tab"
                  aria-selected={currentIndex === idx}
                  aria-label={`View ${item.name}`}
                  className="h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{
                    width: currentIndex === idx ? 28 : 8,
                    backgroundColor: currentIndex === idx ? '#E5A84B' : 'rgba(255,255,255,0.2)'
                  }}
                />
              ))}
            </div>

            {/* Prev / Next Buttons */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handlePrev}
                aria-label="Previous Daily Special"
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next Daily Special"
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area with Smooth Cross-fading Transition */}
        <div className="relative min-h-[420px] md:min-h-[340px] p-6 md:p-10 flex items-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSpecial.id}
              custom={direction}
              variants={cardContainerVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              {/* Left Column: Visual Showcase Frame with Ken Burns transition */}
              <motion.div variants={childFadeVariants} className="lg:col-span-5 relative group">
                <div className="relative h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden border border-white/10 bg-stone-950 shadow-xl">
                  {!imageError ? (
                    <motion.img
                      initial={{ scale: 1.06, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      src={currentSpecial.image}
                      alt={currentSpecial.name}
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-900 text-stone-300">
                      <UtensilsCrossed size={36} className="text-amber-400 mb-2 opacity-80" />
                      <span className="font-display font-bold text-sm text-stone-200">{currentSpecial.name}</span>
                      <span className="font-urdu text-amber-300/80 text-xs mt-1">{currentSpecial.urduName}</span>
                    </div>
                  )}

                  {/* Subtle Gradient Scrim for Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-black/25 pointer-events-none" />

                  {/* Highlight Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                    <Flame size={13} className="text-[#C85A32] animate-pulse" />
                    <span>{currentSpecial.highlightBadge}</span>
                  </div>

                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-stone-950/90 backdrop-blur-md border border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg md:text-xl font-display font-black text-amber-400">
                        Rs. {currentSpecial.price}
                      </span>
                      <span className="text-xs text-stone-400 line-through font-mono">
                        Rs. {currentSpecial.originalPrice}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Save {Math.round(((currentSpecial.originalPrice - currentSpecial.price) / currentSpecial.originalPrice) * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Culinary Details & Action with Staggered Entrance */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-5 text-left">
                {/* Category & Timing Metadata */}
                <motion.div variants={childFadeVariants}>
                  <div className="flex items-center gap-2 text-xs text-stone-400 font-mono mb-2">
                    <span className="text-[#E5A84B] font-semibold">{currentSpecial.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-stone-400" />
                      {currentSpecial.prepTime}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">Live Kitchen Active</span>
                  </div>

                  {/* Title & Urdu Calligraphy */}
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-white tracking-tight leading-tight">
                    {currentSpecial.name}
                  </h3>

                  <div className="font-urdu text-amber-200/90 text-lg md:text-xl mt-1 tracking-wide leading-relaxed">
                    {currentSpecial.urduName}
                  </div>
                </motion.div>

                {/* Description */}
                <motion.p variants={childFadeVariants} className="text-sm md:text-base text-stone-300 font-light leading-relaxed">
                  {currentSpecial.description}
                </motion.p>

                {/* Chef's Tasting Note */}
                <motion.div variants={childFadeVariants} className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                  <Star size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-stone-300 font-mono leading-relaxed">
                    <strong className="text-amber-300 font-semibold uppercase tracking-wider">Ustādkār Note: </strong>
                    {currentSpecial.chefNote}
                  </p>
                </motion.div>

                {/* Action Buttons */}
                <motion.div variants={childFadeVariants} className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={handleAddToCart}
                    className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#C85A32] to-[#b04a25] hover:brightness-110 active:scale-95 text-white font-semibold text-xs tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {addedSuccess ? (
                      <>
                        <Check size={16} className="text-emerald-300" />
                        <span>Added to Bag!</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Order Daily Special • Rs. {currentSpecial.price}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const el = document.getElementById('menu');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-stone-200 hover:text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Full Menu Catalog</span>
                    <ArrowRight size={14} />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}

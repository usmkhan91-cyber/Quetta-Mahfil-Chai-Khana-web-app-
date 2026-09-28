import React from 'react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { 
  ArrowRight, 
  Coffee, 
  Flame, 
  Calendar, 
  Clock, 
  MapPin, 
  Heart, 
  Sparkles, 
  ShieldCheck, 
  Truck,
  Plus,
  Check
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import DailySpecialCard from '../components/DailySpecialCard';
import GeminiMoodMatcher from '../components/GeminiMoodMatcher';

export default function Home() {
  const { setActiveSection, setReservationOpen, setCartOpen } = useNavigation();
  const { t, language } = useLanguage();
  const { addToCart } = useCart();

  const signatureItems = [
    {
      id: 'sig-zafrani',
      name: 'Matka Zafrani Chai',
      category: 'Tea & Kehwa' as const,
      price: 220,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=0.8&w=800',
      description: 'Slow simmered buffalo milk tea infused with saffron threads, cardamom, and thick clotted malai in clay cups.',
      tag: 'Iconic Signature'
    },
    {
      id: 'sig-lacha',
      name: 'Desi Ghee Lacha Paratha',
      category: 'Chat Pata Paratha' as const,
      price: 160,
      image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=0.8&w=800',
      description: 'Crisp spiral multi-layered flaky flatbread kneaded with milk and roasted over iron tawa in pure desi ghee.',
      tag: 'Crispy & Flaky'
    },
    {
      id: 'sig-kehwa',
      name: 'Peshawari Green Kehwa',
      category: 'Tea & Kehwa' as const,
      price: 140,
      image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=0.8&w=800',
      description: 'Authentic mountain green tea infused with crushed green cardamom, saffron strands, and crystallized rock sugar (Nabaat).',
      tag: 'Digestive & Pure'
    },
    {
      id: 'sig-chicken-cheese',
      name: 'Chicken Cheese Paratha',
      category: 'Chat Pata Paratha' as const,
      price: 360,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=0.8&w=800',
      description: 'Generously stuffed with spiced shredded tandoori chicken, mozzarella, green chillies, and melted butter.',
      tag: 'Customer Favorite'
    }
  ];

  const handleQuickAdd = (item: any) => {
    addToCart(item);
    triggerHaptic('medium');
    setCartOpen(true);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section id="hero" className="relative min-h-[82vh] flex items-center justify-center overflow-hidden">
        {/* Background Image & Tone Overlays */}
        <div className="absolute inset-0 bg-stone-950">
          <img
            src="https://images.unsplash.com/photo-1544787210-2211d7c928c7?q=0.85&w=2200"
            className="w-full h-full object-cover opacity-35 scale-105"
            alt="Quetta Mahfil Chai Khana Ambiance"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/60 to-transparent" />
          <div className="absolute inset-0 bg-radial from-transparent via-[#141210]/40 to-[#141210]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Pashto greeting badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C85A32]/20 border border-[#C85A32]/30 backdrop-blur-md mb-6 text-amber-200 text-xs font-semibold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#E5A84B] animate-pulse" />
              <span>پخیر راغلے • PAKHAIR RAGHLAY • WELCOME</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white tracking-tight mb-4 leading-[1.1]">
              Quetta <span className="text-[#E5A84B]">Mahfil</span> <br className="hidden sm:inline" />
              <span className="font-light italic text-stone-300">Chai Khana & Hujra</span>
            </h1>

            <p className="text-sm md:text-lg text-stone-300 mb-8 max-w-2xl mx-auto font-light leading-relaxed">
              Bahria Town’s authentic 24/7 tea house. Slow-cooked over red-hot coals, served with handcrafted parathas and genuine hospitality.
            </p>

            {/* Urdu Couplet */}
            <div className="mb-10 text-stone-300 font-urdu text-base md:text-lg tracking-wide opacity-90">
              {t('poetry_tea')}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <button
                onClick={() => {
                  const el = document.getElementById('menu');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-xl font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>Explore Full Menu</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => setReservationOpen(true)}
                className="w-full sm:w-auto px-7 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={16} className="text-[#E5A84B]" />
                <span>Reserve a Table</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Hospitality Banner */}
      <section className="bg-white dark:bg-[#1C1814] border-y border-stone-200/80 dark:border-stone-800/80 py-6 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <span className="font-display font-bold text-lg md:text-xl text-[#C85A32] dark:text-[#E5A84B]">
              24 / 7
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400 font-medium mt-0.5">
              Always Open & Hot
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-display font-bold text-lg md:text-xl text-stone-900 dark:text-stone-100">
              100% Buffalo Milk
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400 font-medium mt-0.5">
              No Artificial Powders
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-display font-bold text-lg md:text-xl text-[#C85A32] dark:text-[#E5A84B]">
              20-30 Mins
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400 font-medium mt-0.5">
              Bahria Town Delivery
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-display font-bold text-lg md:text-xl text-stone-900 dark:text-stone-100">
              Open Chaarpai
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400 font-medium mt-0.5">
              Courtyard Seating
            </span>
          </div>
        </div>
      </section>

      {/* Daily Special Spotlight with Smooth Transition Animation */}
      <DailySpecialCard />

      {/* Gemini 3.8 Intelligence Palate & Mood Matcher */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto w-full pt-8">
        <GeminiMoodMatcher />
      </div>

      {/* Signature Specialties Spotlight */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-[#C85A32] dark:text-[#E5A84B] block mb-1">
              Crafted with Tradition
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Quetta Mahfil Highlights
            </h2>
            <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Handpicked customer favorites prepared over coal flame daily.
            </p>
          </div>

          <button
            onClick={() => {
              const el = document.getElementById('menu');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-xs font-semibold text-[#C85A32] hover:text-[#b04a25] flex items-center gap-1 self-start md:self-end"
          >
            <span>View All Items</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {signatureItems.map((item) => (
            <div
              key={item.id}
              className="group bg-white dark:bg-[#1E1B17] rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold">
                    {item.tag}
                  </div>
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-[#C85A32] text-white font-mono font-bold text-xs shadow-md">
                    Rs. {item.price}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-[#C85A32] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() => handleQuickAdd(item)}
                  className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-[#C85A32] hover:text-white dark:hover:bg-[#C85A32] dark:hover:text-white text-stone-800 dark:text-stone-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Add to Bag
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Traditional Hujra & Location Experience */}
      <section id="contact" className="py-16 md:py-20 px-4 md:px-8 bg-stone-100/60 dark:bg-[#181512] border-t border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-[#C85A32] dark:text-[#E5A84B] block mb-2">
              Our Courtyard & Location
            </span>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-stone-900 dark:text-stone-100 tracking-tight mb-4">
              Gather Around the Coals in Bahria Town
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-6">
              A true Mahfil is more than a tea shop; it is where friends unite, poetry echoes, and the fragrance of cardamom and roasting parathas warms the night air. Join us in our outdoor chaarpai seating or climate-controlled family hall.
            </p>

            <div className="space-y-3.5 mb-8">
              <div className="flex items-start gap-3">
                <MapPin className="text-[#C85A32] mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                    Location
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Commercial Area, Sector C / D, Bahria Town, Lahore, Pakistan
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-[#C85A32] mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                    Timings
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Open 24 Hours • 7 Days a Week • Live Coal Tea Never Stops
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setReservationOpen(true)}
                className="px-6 py-3 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-xl font-semibold text-xs transition-colors shadow-sm"
              >
                Reserve a Chaarpai
              </button>
              <a
                href="https://maps.google.com/?q=Bahria+Town+Lahore"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 rounded-xl font-semibold text-xs hover:border-stone-300 transition-colors"
              >
                Get Directions
              </a>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-lg h-80 lg:h-96 relative">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=0.85&w=1200"
              alt="Quetta Mahfil Courtyard Seating"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#C85A32] mb-1 inline-block">
                Open Air Baithak
              </span>
              <h4 className="font-display font-bold text-xl">The Traditional Hujra</h4>
              <p className="text-xs text-stone-200 opacity-90">
                Experience winter bonfires and summer breeze with fresh matka tea.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

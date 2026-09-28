import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useFirebase } from '../context/FirebaseContext';
import { useNavigation } from '../context/NavigationContext';
import { 
  Coffee, 
  MapPin, 
  Clock, 
  Phone, 
  Shield, 
  Lock, 
  Flame, 
  Sparkles,
  Heart,
  Calendar,
  Truck,
  ArrowRight
} from 'lucide-react';

// Components
import Home from './Home';
import Menu from './Menu';
import OrderTracker from '../components/OrderTracker';
import KindnessWall from '../components/KindnessWall';
import HeritageDiary from '../components/HeritageDiary';
import Admin from './Admin';
import AIChatSurface from '../components/AIChatSurface';
import AppSettings from '../components/AppSettings';

export default function SuperPage() {
  const { t } = useLanguage();
  const { isAdmin, user } = useFirebase();
  const { activeSection, setActiveSection, setReservationOpen } = useNavigation();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] dark:bg-[#141210] text-stone-900 dark:text-stone-100 selection:bg-[#C85A32] selection:text-white transition-colors">
      {/* Admin Mode Overlay when explicitly enabled */}
      {showAdminPanel ? (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C85A32] text-white flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl">
                  Restaurant Operations & KDS
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Kitchen Display, Live Orders, Menu Editor, and Guest Management
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAdminPanel(false)}
              className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold transition-colors"
            >
              Return to Customer View
            </button>
          </div>

          <Admin />
        </div>
      ) : activeSection === 'chat' ? (
        /* Focused First-Class AI Chat Surface */
        <motion.div
          key="chat-surface"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="w-full min-h-[calc(100dvh-5rem)] flex items-center justify-center p-2 sm:p-4"
        >
          <AIChatSurface />
        </motion.div>
      ) : activeSection === 'settings' ? (
        /* Focused Native-Style App Settings Center */
        <motion.div
          key="settings-surface"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="w-full"
        >
          <AppSettings />
        </motion.div>
      ) : activeSection === 'orders' ? (
        /* Dedicated Live Orders Screen */
        <motion.div
          key="orders-surface"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h2 className="font-display font-bold text-2xl text-stone-900 dark:text-stone-100">
                Live Kitchen & Delivery Tracker
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Real-time updates straight from Bahria Town wood-fire stoves
              </p>
            </div>
            <button
              onClick={() => setActiveSection('menu')}
              className="px-3.5 py-1.5 rounded-xl bg-[#C85A32] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <span>Order More</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <OrderTracker />
        </motion.div>
      ) : activeSection === 'menu' ? (
        /* Dedicated Menu Catalog */
        <motion.div
          key="menu-surface"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="w-full"
        >
          <Menu />
        </motion.div>
      ) : (
        <>
          {/* Main User-Facing Journey */}
          <Home />

          {/* Menu Catalog Section */}
          <div className="border-t border-stone-200/80 dark:border-stone-800/80">
            <Menu />
          </div>

          {/* Live Order Tracker Section */}
          <div className="border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#181512]/50 py-4">
            <OrderTracker />
          </div>

          {/* Wall of Kindness */}
          <div className="border-t border-stone-200/80 dark:border-stone-800/80">
            <KindnessWall />
          </div>

          {/* Heritage Guestbook & Reflections */}
          <div className="border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#181512]/50">
            <HeritageDiary />
          </div>

          {/* Footer */}
          <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181512] py-14 px-4 md:px-8 text-stone-700 dark:text-stone-300">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
              {/* Brand Col */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C85A32] text-white flex items-center justify-center">
                    <Coffee size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-900 dark:text-stone-100 uppercase tracking-tight">
                      Quetta <span className="text-[#C85A32] dark:text-[#E5A84B]">Mahfil</span>
                    </h3>
                    <p className="text-xs text-stone-500 font-urdu text-sm">
                      چائے خانہ و روایتی حجرہ • کوئٹہ کے اصل ذائقے
                    </p>
                  </div>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed">
                  Serving authentic slow-simmered Zafrani Chai, freshly rolled desi ghee parathas, and traditional Hujra courtyard hospitality 24 hours a day in Bahria Town, Lahore.
                </p>
              </div>

              {/* Hours & Location */}
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px]">
                  Hours & Delivery
                </h4>
                <p className="text-stone-500 dark:text-stone-400 flex items-center gap-2">
                  <Clock size={14} className="text-[#C85A32]" />
                  <span>Open 24/7 (Never Closed)</span>
                </p>
                <p className="text-stone-500 dark:text-stone-400 flex items-center gap-2">
                  <Truck size={14} className="text-[#C85A32]" />
                  <span>Delivery across Bahria Town (20-30m)</span>
                </p>
                <p className="text-stone-500 dark:text-stone-400 flex items-center gap-2">
                  <MapPin size={14} className="text-[#C85A32]" />
                  <span>Sector C Commercial, Bahria Town Lahore</span>
                </p>
              </div>

              {/* Staff & Quick Links */}
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px]">
                  Hospitality & Staff
                </h4>
                <button
                  onClick={() => setReservationOpen(true)}
                  className="text-stone-500 hover:text-[#C85A32] transition-colors block"
                >
                  Table & Chaarpai Reservation
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('heritage');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-stone-500 hover:text-[#C85A32] transition-colors block"
                >
                  Wall of Kindness
                </button>
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors flex items-center gap-1.5 pt-2"
                >
                  <Lock size={12} />
                  <span>Operations / Staff Portal</span>
                </button>
              </div>
            </div>

            <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-stone-100 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-400">
              <p>© {new Date().getFullYear()} Quetta Mahfil Chai Khana. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span>Bahria Town, Lahore</span>
                <span>•</span>
                <span className="font-urdu">خوش آمدید و پخیر راغلے</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

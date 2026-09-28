import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  Search, 
  ShoppingBag, 
  Calendar, 
  Moon, 
  Sun, 
  Languages, 
  User as UserIcon, 
  Truck, 
  Heart, 
  Menu as MenuIcon, 
  Sparkles,
  BookOpen,
  MapPin,
  Flame,
  Settings2,
  QrCode
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

import { signInWithGoogleWorkspace } from '../services/googleWorkspaceAuth';

// Modals & Drawers
import CartDrawer from './CartDrawer';
import ReservationModal from './ReservationModal';
import SearchModal from './SearchModal';
import QRCheckInScanner from './QRCheckInScanner';
import ActiveOrderFloatingBar from './ActiveOrderFloatingBar';

export function Layout({ children }: { children: React.ReactNode }) {
  const { 
    activeSection, 
    setActiveSection, 
    isCartOpen, 
    setCartOpen,
    isReservationOpen,
    setReservationOpen,
    isSearchOpen,
    setSearchOpen,
    isQRScannerOpen,
    setQRScannerOpen
  } = useNavigation();

  const { itemCount, total } = useCart();
  const { user, profile } = useFirebase();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleNavigate = (id: string) => {
    triggerHaptic('light');
    setActiveSection(id as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogleWorkspace();
    } catch (err: any) {
      console.warn('Workspace login attempt fallback:', err?.message || err);
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (fallbackErr) {
        console.error('Login error:', fallbackErr);
      }
    }
  };

  const navLinks = [
    { id: 'home', label: 'Explore' },
    { id: 'menu', label: 'Menu Catalog' },
    { id: 'chat', label: 'Saki AI Host' },
    { id: 'orders', label: 'Live Orders' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className={cn("min-h-screen flex flex-col selection:bg-[#D9943B] selection:text-[#141210] overflow-x-hidden", theme === 'dark' ? 'dark' : '')}>
      {/* Top Navbar with Safe-Area padding */}
      <header className="sticky top-0 left-0 right-0 z-[1000] mahfil-nav border-b border-stone-200/80 dark:border-stone-800/80 transition-colors safe-top-padding">
        <div className="max-w-7xl mx-auto px-3.5 md:px-8 h-16 md:h-20 flex items-center justify-between gap-2 md:gap-4">
          {/* Brand Emblem */}
          <div 
            onClick={() => handleNavigate('home')}
            className="flex items-center gap-2.5 md:gap-3.5 cursor-pointer group select-none flex-shrink-0"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Coffee size={20} className="group-hover:rotate-6 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="font-display font-bold text-base md:text-xl tracking-tight text-stone-900 dark:text-stone-100 uppercase">
                  Quetta <span className="text-[#C85A32] dark:text-[#E5A84B]">Mahfil</span>
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  24/7
                </span>
              </div>
              <p className="hidden sm:block text-[11px] font-urdu text-stone-500 dark:text-stone-400 leading-tight">
                چائے خانہ و روایتی حجرہ • کوئٹہ کے اصل ذائقے
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-stone-100/70 dark:bg-stone-800/50 p-1.5 rounded-full border border-stone-200/60 dark:border-stone-700/60">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                  activeSection === item.id || (item.id === 'home' && activeSection === 'hero')
                    ? "bg-white dark:bg-stone-900 text-[#C85A32] dark:text-[#E5A84B] shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                )}
              >
                {item.id === 'chat' && <Sparkles size={13} className="text-[#C85A32]" />}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            {/* Guest Check-in & Loyalty QR Scanner Button */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setQRScannerOpen(true);
              }}
              className="p-2 sm:p-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:text-[#C85A32] dark:hover:text-[#E5A84B] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors relative"
              title="Guest Check-in & QR Pass Scanner"
            >
              <QrCode size={19} />
              <span className="sr-only">Guest QR Scanner</span>
            </button>

            {/* Quick Search Button */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setSearchOpen(true);
              }}
              className="p-2 sm:p-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Search Menu (Cmd+K)"
            >
              <Search size={18} />
            </button>

            {/* Reserve Table Button (Desktop) */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setReservationOpen(true);
              }}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <Calendar size={15} className="text-[#C85A32]" />
              <span>Reserve Table</span>
            </button>

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setCartOpen(true);
              }}
              className="relative p-2 sm:p-2.5 rounded-xl bg-[#C85A32]/10 dark:bg-[#C85A32]/20 text-[#C85A32] dark:text-[#E5A84B] hover:bg-[#C85A32]/20 transition-colors flex items-center justify-center min-w-[40px] min-h-[40px]"
              title="View Bag"
            >
              <ShoppingBag size={19} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C85A32] text-white text-[10px] font-bold font-mono w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Profile / Settings Shortcut */}
            {user ? (
              <button
                onClick={() => handleNavigate('settings')}
                className="w-9 h-9 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 flex-shrink-0"
                title="Settings & Profile"
              >
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Guest')}&background=C85A32&color=fff`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="hidden sm:block px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#b04a25] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main App Page Surface */}
      <main className="flex-1 w-full pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (44px+ touch targets, safe-area-aware) */}
      <nav className="fixed md:hidden bottom-0 left-0 right-0 z-[1000] bg-white/95 dark:bg-[#181512]/95 backdrop-blur-xl border-t border-stone-200/90 dark:border-stone-800/90 px-2 py-1.5 safe-bottom-nav flex items-center justify-around shadow-lg">
        {/* 1. Home */}
        <button
          onClick={() => handleNavigate('home')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 rounded-2xl transition-all min-w-[60px] min-h-[46px] justify-center relative",
            activeSection === 'hero' || activeSection === 'home'
              ? "text-[#C85A32]"
              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          )}
        >
          <Coffee size={20} />
          <span className="text-[10px] font-semibold tracking-tight">Explore</span>
          {(activeSection === 'hero' || activeSection === 'home') && (
            <span className="w-1 h-1 rounded-full bg-[#C85A32] absolute bottom-0.5" />
          )}
        </button>

        {/* 2. Menu */}
        <button
          onClick={() => handleNavigate('menu')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 rounded-2xl transition-all min-w-[60px] min-h-[46px] justify-center relative",
            activeSection === 'menu'
              ? "text-[#C85A32]"
              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          )}
        >
          <MenuIcon size={20} />
          <span className="text-[10px] font-semibold tracking-tight">Menu</span>
          {activeSection === 'menu' && (
            <span className="w-1 h-1 rounded-full bg-[#C85A32] absolute bottom-0.5" />
          )}
        </button>

        {/* 3. Saki AI Host (Focused First-Class Surface) */}
        <button
          onClick={() => handleNavigate('chat')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 rounded-2xl transition-all min-w-[64px] min-h-[46px] justify-center relative",
            activeSection === 'chat'
              ? "text-[#C85A32]"
              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          )}
        >
          <div className="relative">
            <Sparkles size={20} className={activeSection === 'chat' ? "text-[#C85A32]" : ""} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C85A32] animate-ping opacity-75" />
          </div>
          <span className="text-[10px] font-semibold tracking-tight">Saki AI</span>
          {activeSection === 'chat' && (
            <span className="w-1 h-1 rounded-full bg-[#C85A32] absolute bottom-0.5" />
          )}
        </button>

        {/* 4. Orders */}
        <button
          onClick={() => handleNavigate('orders')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 rounded-2xl transition-all min-w-[60px] min-h-[46px] justify-center relative",
            activeSection === 'orders'
              ? "text-[#C85A32]"
              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          )}
        >
          <Truck size={20} />
          <span className="text-[10px] font-semibold tracking-tight">Orders</span>
          {activeSection === 'orders' && (
            <span className="w-1 h-1 rounded-full bg-[#C85A32] absolute bottom-0.5" />
          )}
        </button>

        {/* 5. Settings */}
        <button
          onClick={() => handleNavigate('settings')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 rounded-2xl transition-all min-w-[60px] min-h-[46px] justify-center relative",
            activeSection === 'settings'
              ? "text-[#C85A32]"
              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          )}
        >
          <Settings2 size={20} />
          <span className="text-[10px] font-semibold tracking-tight">Settings</span>
          {activeSection === 'settings' && (
            <span className="w-1 h-1 rounded-full bg-[#C85A32] absolute bottom-0.5" />
          )}
        </button>
      </nav>

      {/* Live Active Order Floating Bar for Native App Feel */}
      <ActiveOrderFloatingBar />

      {/* Global Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        onOrderPlaced={(orderId) => {
          handleNavigate('orders');
        }}
      />

      <ReservationModal
        isOpen={isReservationOpen}
        onClose={() => setReservationOpen(false)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectItem={(item) => {
          setSearchOpen(false);
          handleNavigate('menu');
        }}
      />

      {/* Global QR Check-In & Loyalty Scanner Modal */}
      <AnimatePresence>
        {isQRScannerOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl max-h-[92vh] flex flex-col"
            >
              <QRCheckInScanner
                onClose={() => setQRScannerOpen(false)}
                staffName={profile?.displayName || user?.displayName || 'Mahfil Front Host'}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

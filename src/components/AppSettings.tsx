import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Sun, 
  Moon, 
  Laptop, 
  Languages, 
  Bell, 
  Vibrate, 
  Volume2, 
  VolumeX,
  Bot, 
  Mic, 
  Shield, 
  Lock, 
  Smartphone, 
  MapPin, 
  ShoppingBag, 
  Calendar, 
  Award, 
  HelpCircle, 
  Info, 
  FileText, 
  ChevronRight, 
  LogOut, 
  LogIn, 
  Check, 
  ExternalLink, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Phone,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useLanguage, LanguageMode } from '../context/LanguageContext';
import { useNavigation } from '../context/NavigationContext';
import { 
  isHapticsEnabled, 
  setHapticsEnabled, 
  isAudioEnabled, 
  setAudioEnabled, 
  triggerHaptic 
} from '../lib/haptics';
import { voiceCore } from '../services/voiceService';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { cn } from '../lib/utils';

export default function AppSettings() {
  const { user, profile, isAdmin } = useFirebase();
  const { themeMode, setThemeMode, theme } = useTheme();
  const { languageMode, setLanguageMode, language, t } = useLanguage();
  const { setActiveSection, setReservationOpen } = useNavigation();

  // Settings states with real backing persistence
  const [hapticsOn, setHapticsOn] = useState<boolean>(isHapticsEnabled());
  const [audioOn, setAudioOn] = useState<boolean>(isAudioEnabled());
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const [orderAlerts, setOrderAlerts] = useState<boolean>(() => {
    return localStorage.getItem('mahfil_order_alerts') !== 'false';
  });
  const [aiSpeechOn, setAiSpeechOn] = useState<boolean>(() => {
    return localStorage.getItem('mahfil_ai_speech') !== 'false';
  });
  const [aiPersona, setAiPersona] = useState<string>(() => {
    return localStorage.getItem('mahfil_ai_persona') || 'warm';
  });
  const [defaultAddress, setDefaultAddress] = useState<string>(() => {
    return localStorage.getItem('mahfil_delivery_address') || '';
  });
  const [preferredSeating, setPreferredSeating] = useState<string>(() => {
    return localStorage.getItem('mahfil_pref_seating') || 'chaarpai';
  });
  const [defaultPartySize, setDefaultPartySize] = useState<number>(() => {
    const val = localStorage.getItem('mahfil_default_party');
    return val ? parseInt(val, 10) : 4;
  });

  const [isStandalone, setIsStandalone] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    }
  }, []);

  const showFeedback = (msg: string) => {
    setSaveToast(msg);
    triggerHaptic('light');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleToggleHaptics = () => {
    const next = !hapticsOn;
    setHapticsOn(next);
    setHapticsEnabled(next);
    if (next) triggerHaptic('medium');
    showFeedback(next ? 'Haptic feedback enabled' : 'Haptic feedback muted');
  };

  const handleToggleAudio = () => {
    const next = !audioOn;
    setAudioOn(next);
    setAudioEnabled(next);
    showFeedback(next ? 'Sound effects enabled' : 'Sound effects muted');
  };

  const handleRequestNotif = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
        if (perm === 'granted') {
          showFeedback('Notification access granted');
          new Notification('Quetta Mahfil Chai Khana', {
            body: 'Order alerts and chai specials are now active on your device!',
            icon: '/icon.png'
          });
        } else {
          showFeedback('Notification access denied');
        }
      } catch (err) {
        console.warn('Notif request error:', err);
      }
    }
  };

  const handleSaveAddress = (val: string) => {
    setDefaultAddress(val);
    localStorage.setItem('mahfil_delivery_address', val);
  };

  const handleSaveSeating = (val: string) => {
    setPreferredSeating(val);
    localStorage.setItem('mahfil_pref_seating', val);
    showFeedback(`Preferred seating: ${val}`);
  };

  const handleSavePartySize = (size: number) => {
    setDefaultPartySize(size);
    localStorage.setItem('mahfil_default_party', String(size));
    showFeedback(`Default booking: ${size} guests`);
  };

  const handleClearCache = () => {
    if (window.confirm('Clear cached preferences and local app storage?')) {
      const preserveTheme = localStorage.getItem('mahfil_theme_mode');
      localStorage.clear();
      if (preserveTheme) localStorage.setItem('mahfil_theme_mode', preserveTheme);
      showFeedback('Local app cache cleared successfully');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showFeedback('Signed in successfully');
    } catch (err) {
      console.error('Sign in error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showFeedback('Signed out');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleTestVoice = () => {
    triggerHaptic('light');
    const msg = language === 'ur' 
      ? 'السلام علیکم! کوئٹہ محفل چائے خانہ میں خوش آمدید۔' 
      : 'Assalamu Alaikum! Welcome to Quetta Mahfil Chai Khana.';
    voiceCore.speak(msg, language === 'ur' ? 'ur-PK' : 'en-US');
    showFeedback('Playing voice audio sample...');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-8 safe-bottom-padding pb-28">
      {/* Settings Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="font-display font-bold text-2xl text-stone-900 dark:text-stone-100">
            Settings Center
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            App preferences, account security, device sensors & offline sync
          </p>
        </div>
        <div className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80">
          v2.4.0 PWA
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveToast && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold shadow-xl flex items-center gap-2"
        >
          <Check size={14} className="text-emerald-400 dark:text-emerald-600" />
          <span>{saveToast}</span>
        </motion.div>
      )}

      {/* 1. Account Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <User size={14} />
          <span>Account & Identity</span>
        </div>
        <div className="mahfil-card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#C85A32]/10 dark:bg-[#C85A32]/20 border border-[#C85A32]/30 overflow-hidden flex items-center justify-center flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-[#C85A32]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                  {user ? (user.displayName || 'Verified Guest') : 'Guest Diner'}
                </h4>
                {profile?.role && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/20">
                    {profile.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {user ? user.email : 'Sign in to sync your order history and loyalty'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1.5"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#b04a25] text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Appearance Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Sun size={14} />
          <span>Appearance</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Laptop },
          ].map((opt) => {
            const Icon = opt.icon;
            const isSelected = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setThemeMode(opt.id as ThemeMode);
                  showFeedback(`Appearance set to ${opt.label}`);
                }}
                className={cn(
                  "p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2",
                  isSelected
                    ? "bg-white dark:bg-stone-800 border-[#C85A32] shadow-sm text-stone-900 dark:text-stone-100 ring-2 ring-[#C85A32]/20"
                    : "bg-stone-50 dark:bg-[#1A1714] border-stone-200/80 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:border-stone-300"
                )}
              >
                <Icon size={18} className={isSelected ? "text-[#C85A32]" : ""} />
                <span className="text-xs font-semibold">{opt.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Language Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Languages size={14} />
          <span>Language & Typography</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'ur', label: 'اردو (Urdu)', sub: 'RTL Nastaliq' },
            { id: 'en', label: 'English', sub: 'LTR Latin' },
            { id: 'auto', label: 'Automatic', sub: 'Device Locale' },
          ].map((opt) => {
            const isSelected = languageMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setLanguageMode(opt.id as LanguageMode);
                  showFeedback(`Language set to ${opt.label}`);
                }}
                className={cn(
                  "p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1",
                  isSelected
                    ? "bg-white dark:bg-stone-800 border-[#C85A32] shadow-sm text-stone-900 dark:text-stone-100 ring-2 ring-[#C85A32]/20"
                    : "bg-stone-50 dark:bg-[#1A1714] border-stone-200/80 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:border-stone-300"
                )}
              >
                <span className={cn("text-xs font-bold", opt.id === 'ur' ? "font-urdu text-sm" : "")}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-stone-400">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Notifications Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Bell size={14} />
          <span>Notifications</span>
        </div>
        <div className="mahfil-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Push Notifications
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                System permission: {notifPermission}
              </p>
            </div>
            {notifPermission === 'granted' ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                <Check size={12} /> Enabled
              </span>
            ) : (
              <button
                onClick={handleRequestNotif}
                className="px-3 py-1.5 rounded-xl bg-[#C85A32] text-white text-xs font-semibold shadow-xs"
              >
                Enable
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Order Status Alerts
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Notify when chai is simmering or rider departs
              </p>
            </div>
            <button
              onClick={() => {
                const next = !orderAlerts;
                setOrderAlerts(next);
                localStorage.setItem('mahfil_order_alerts', String(next));
                showFeedback(next ? 'Order alerts enabled' : 'Order alerts muted');
              }}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative p-1",
                orderAlerts ? "bg-[#C85A32]" : "bg-stone-300 dark:bg-stone-700"
              )}
            >
              <div 
                className={cn(
                  "w-5 h-5 rounded-full bg-white transition-transform",
                  orderAlerts ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Sound & Haptics */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Vibrate size={14} />
          <span>Sound & Haptics</span>
        </div>
        <div className="mahfil-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Haptic Vibration Feedback
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Physical click sensation for buttons and cart adds
              </p>
            </div>
            <button
              onClick={handleToggleHaptics}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative p-1",
                hapticsOn ? "bg-[#C85A32]" : "bg-stone-300 dark:bg-stone-700"
              )}
            >
              <div 
                className={cn(
                  "w-5 h-5 rounded-full bg-white transition-transform",
                  hapticsOn ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Audio Chimes
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Subtle kitchen bell when orders update
              </p>
            </div>
            <button
              onClick={handleToggleAudio}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative p-1",
                audioOn ? "bg-[#C85A32]" : "bg-stone-300 dark:bg-stone-700"
              )}
            >
              <div 
                className={cn(
                  "w-5 h-5 rounded-full bg-white transition-transform",
                  audioOn ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 6. AI Assistant & Voice */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Bot size={14} />
          <span>AI Assistant & Voice (Saki)</span>
        </div>
        <div className="mahfil-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Auto-Speak Saki Audio Responses
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Reads recommendations aloud via Web Speech API
              </p>
            </div>
            <button
              onClick={() => {
                const next = !aiSpeechOn;
                setAiSpeechOn(next);
                localStorage.setItem('mahfil_ai_speech', String(next));
                showFeedback(next ? 'AI speech audio enabled' : 'AI speech audio muted');
              }}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative p-1",
                aiSpeechOn ? "bg-[#C85A32]" : "bg-stone-300 dark:bg-stone-700"
              )}
            >
              <div 
                className={cn(
                  "w-5 h-5 rounded-full bg-white transition-transform",
                  aiSpeechOn ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
            <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
              Host Conversation Style
            </h5>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'warm', label: 'Warm Host', desc: 'Courteous & Traditional' },
                { id: 'concise', label: 'Fast Order', desc: 'Direct & Brief' },
                { id: 'poetic', label: 'Mahfil Adab', desc: 'Rich Urdu Nuance' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setAiPersona(p.id);
                    localStorage.setItem('mahfil_ai_persona', p.id);
                    showFeedback(`Saki tone: ${p.label}`);
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    aiPersona === p.id
                      ? "bg-[#C85A32]/10 border-[#C85A32] text-[#C85A32]"
                      : "bg-stone-50 dark:bg-[#1A1714] border-stone-200/80 dark:border-stone-800 text-stone-600 dark:text-stone-300"
                  )}
                >
                  <p className="text-xs font-semibold">{p.label}</p>
                  <p className="text-[9px] text-stone-400 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Voice Engine Calibration
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Test speaker hardware and speech synthesis
              </p>
            </div>
            <button
              onClick={handleTestVoice}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-700 dark:text-stone-200 transition-colors flex items-center gap-1.5"
            >
              <Volume2 size={13} className="text-[#C85A32]" />
              <span>Test Voice</span>
            </button>
          </div>
        </div>
      </section>

      {/* 7. Orders & Delivery Defaults */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <ShoppingBag size={14} />
          <span>Orders & Delivery Defaults</span>
        </div>
        <div className="mahfil-card p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Default Delivery Address
            </label>
            <input
              type="text"
              value={defaultAddress}
              onChange={(e) => handleSaveAddress(e.target.value)}
              placeholder="e.g. Villa 14, Sector C, Bahria Town, Lahore"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#1A1714] border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#C85A32]"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Auto-fills your address during checkout for 1-tap ordering.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Reservations Defaults */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Calendar size={14} />
          <span>Reservations Preferences</span>
        </div>
        <div className="mahfil-card p-4 space-y-4">
          <div>
            <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100 mb-2">
              Preferred Seating Style
            </h5>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'chaarpai', label: 'Outdoor Chaarpai' },
                { id: 'takht', label: 'Traditional Takht' },
                { id: 'hall', label: 'Family AC Hall' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSaveSeating(s.id)}
                  className={cn(
                    "p-2.5 rounded-xl border text-center text-xs font-semibold transition-all",
                    preferredSeating === s.id
                      ? "bg-[#C85A32]/10 border-[#C85A32] text-[#C85A32]"
                      : "bg-stone-50 dark:bg-[#1A1714] border-stone-200/80 dark:border-stone-800 text-stone-600 dark:text-stone-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Default Party Size
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Initial guest count when opening reservation modal
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[2, 4, 6, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => handleSavePartySize(num)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center",
                    defaultPartySize === num
                      ? "bg-[#C85A32] text-white"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. Location & Hours */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <MapPin size={14} />
          <span>Location & Flagship Branch</span>
        </div>
        <div className="mahfil-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Bahria Town Flagship Khana
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Commercial Sector C (Near Grand Jamia Mosque), Bahria Town, Lahore
              </p>
              <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open 24 Hours • Wood-fire & Chai
              </span>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Quetta+Mahfil+Chai+Khana+Bahria+Town+Lahore"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[#C85A32]/10 text-[#C85A32] hover:bg-[#C85A32]/20 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <span>Maps</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* 10. Login & Devices / PWA */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Smartphone size={14} />
          <span>Login & Devices</span>
        </div>
        <div className="mahfil-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                App Runtime Platform
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isStandalone ? 'Installed Native PWA (Standalone Shell)' : 'Mobile Browser Web Environment'}
              </p>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
              isStandalone 
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
            )}>
              {isStandalone ? 'Installed App' : 'Browser Mode'}
            </span>
          </div>
        </div>
      </section>

      {/* 11. Privacy & Local Storage */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Lock size={14} />
          <span>Privacy & Storage</span>
        </div>
        <div className="mahfil-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Reset App Data & Cache
              </h5>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Purges local preferences and uncommitted cart state
              </p>
            </div>
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-red-500/10 hover:text-red-600 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      </section>

      {/* 12. Help & Support */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <HelpCircle size={14} />
          <span>Help & Concierge Support</span>
        </div>
        <div className="mahfil-card p-4 grid grid-cols-2 gap-3">
          <a
            href="https://wa.me/923000000000?text=Assalamu%20Alaikum%20Quetta%20Mahfil%20Support"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-2.5 transition-colors text-xs font-semibold"
          >
            <MessageCircle size={16} />
            <span>WhatsApp Concierge</span>
          </a>

          <a
            href="tel:+923001234567"
            className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80 flex items-center gap-2.5 transition-colors text-xs font-semibold"
          >
            <Phone size={16} className="text-[#C85A32]" />
            <span>Direct Kitchen Line</span>
          </a>
        </div>
      </section>

      {/* 13. About & Legal */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
          <Info size={14} />
          <span>About & Certification</span>
        </div>
        <div className="mahfil-card p-4 space-y-3 text-xs text-stone-600 dark:text-stone-400">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <span className="font-semibold text-stone-900 dark:text-stone-100">Platform Version</span>
            <span className="font-mono text-stone-500">v2.4.0 Production</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <span className="font-semibold text-stone-900 dark:text-stone-100">Halal Certification</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Certified Desi Ghee</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-900 dark:text-stone-100">Security Architecture</span>
            <span>Server-Authoritative Tokens</span>
          </div>
        </div>
      </section>
    </div>
  );
}

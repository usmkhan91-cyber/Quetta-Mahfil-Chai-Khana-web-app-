import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc,
  limit 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Flame, 
  CheckCircle2, 
  Truck, 
  Coffee, 
  MapPin, 
  Phone, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  Search, 
  ShoppingBag,
  BellRing,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/FirebaseContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '../context/NavigationContext';
import { triggerHaptic } from '../lib/haptics';

export interface OrderItem {
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  selectedVariant?: string | null;
}

export interface ActiveOrderData {
  id: string;
  userId?: string;
  customerName?: string;
  phone?: string;
  orderType?: 'delivery' | 'dine-in' | 'takeaway';
  destination?: string;
  items?: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status: 'pending' | 'preparing' | 'ready' | 'on-the-way' | 'delivering' | 'delivered' | 'completed' | 'cancelled';
  instructions?: string | null;
  createdAt?: any;
  source?: string;
}

interface OrderStatusTrackerProps {
  orderId?: string;
  userId?: string;
  onOrderChange?: (order: ActiveOrderData | null) => void;
  compact?: boolean;
}

export default function OrderStatusTracker({
  orderId: propOrderId,
  userId: propUserId,
  onOrderChange,
  compact = false
}: OrderStatusTrackerProps) {
  const { user } = useFirebase();
  const { t, language } = useLanguage();
  const { setActiveSection } = useNavigation();

  const [activeOrder, setActiveOrder] = useState<ActiveOrderData | null>(null);
  const [recentOrders, setRecentOrders] = useState<ActiveOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(!compact);
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);

  // Effective order ID to track: prop > localStorage
  const currentOrderId = useMemo(() => {
    if (propOrderId) return propOrderId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mahfil_active_order_id') || undefined;
    }
    return undefined;
  }, [propOrderId]);

  // Track active order in real-time via Firestore snapshot
  useEffect(() => {
    let unsubscribeOrder: (() => void) | null = null;
    let unsubscribeUserOrders: (() => void) | null = null;
    setLoading(true);

    const effectiveUserId = propUserId || user?.uid;

    // 1. If explicit orderId or localStorage orderId exists, listen to that document
    if (currentOrderId) {
      try {
        const orderRef = doc(db, 'mahfil_orders', currentOrderId);
        unsubscribeOrder = onSnapshot(
          orderRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() } as ActiveOrderData;
              setActiveOrder(data);
              onOrderChange?.(data);
              setLoading(false);
              return;
            } else {
              // Try local demo order check if doc doesn't exist
              checkLocalOrUserOrders();
            }
          },
          (err) => {
            console.warn('Real-time order snapshot notice:', err);
            checkLocalOrUserOrders();
          }
        );
      } catch (err) {
        checkLocalOrUserOrders();
      }
    } else {
      checkLocalOrUserOrders();
    }

    function checkLocalOrUserOrders() {
      // 2. Query orders for authenticated user
      if (effectiveUserId) {
        try {
          const ordersRef = collection(db, 'mahfil_orders');
          const q = query(
            ordersRef,
            where('userId', '==', effectiveUserId),
            limit(10)
          );

          unsubscribeUserOrders = onSnapshot(
            q,
            (snapshot) => {
              const docs = snapshot.docs.map(
                d => ({ id: d.id, ...d.data() }) as ActiveOrderData
              );
              setRecentOrders(docs);

              // Find most recent active order (not cancelled, prefer active states)
              const latestActive = docs.find(
                o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'delivering'
              ) || docs[0] || null;

              if (latestActive) {
                setActiveOrder(latestActive);
                onOrderChange?.(latestActive);
                localStorage.setItem('mahfil_active_order_id', latestActive.id);
              } else if (!activeOrder) {
                setActiveOrder(null);
                onOrderChange?.(null);
              }
              setLoading(false);
            },
            (err) => {
              console.warn('User orders query warning:', err);
              loadFallbackOrder();
            }
          );
        } catch (e) {
          loadFallbackOrder();
        }
      } else {
        loadFallbackOrder();
      }
    }

    function loadFallbackOrder() {
      // Check local sample order in localStorage for offline / guest experience
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('mahfil_cached_active_order');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setActiveOrder(parsed);
            onOrderChange?.(parsed);
            setLoading(false);
            return;
          } catch (e) {}
        }
      }
      setLoading(false);
    }

    // Listen for custom order placed event anywhere in the app
    const handleOrderPlaced = (e: any) => {
      const newId = e.detail?.orderId;
      if (newId) {
        triggerHaptic('success');
        setLoading(true);
      }
    };
    window.addEventListener('mahfil_active_order_updated', handleOrderPlaced);

    return () => {
      if (unsubscribeOrder) unsubscribeOrder();
      if (unsubscribeUserOrders) unsubscribeUserOrders();
      window.removeEventListener('mahfil_active_order_updated', handleOrderPlaced);
    };
  }, [currentOrderId, propUserId, user?.uid]);

  // Dynamic ETA countdown calculation based on status and creation time
  useEffect(() => {
    if (!activeOrder) return;
    switch (activeOrder.status) {
      case 'pending':
        setEtaMinutes(25);
        break;
      case 'preparing':
        setEtaMinutes(15);
        break;
      case 'ready':
        setEtaMinutes(5);
        break;
      case 'on-the-way':
      case 'delivering':
        setEtaMinutes(10);
        break;
      case 'delivered':
      case 'completed':
        setEtaMinutes(0);
        break;
      default:
        setEtaMinutes(20);
    }
  }, [activeOrder?.status]);

  // Copy order reference to clipboard
  const handleCopyId = (id: string) => {
    triggerHaptic('light');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Manual refresh trigger
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    triggerHaptic('light');
    setTimeout(() => {
      setIsRefreshing(false);
      triggerHaptic('success');
    }, 600);
  };

  // Search order by manual ID input
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = searchOrderId.trim().replace(/^#/, '');
    if (!cleanId) return;

    setIsSearching(true);
    setSearchError(null);
    triggerHaptic('medium');

    try {
      const orderRef = doc(db, 'mahfil_orders', cleanId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const found = { id: snap.id, ...snap.data() } as ActiveOrderData;
        setActiveOrder(found);
        localStorage.setItem('mahfil_active_order_id', found.id);
        triggerHaptic('success');
        setSearchOrderId('');
      } else {
        setSearchError('Order not found. Please verify the Reference ID.');
        triggerHaptic('warning');
      }
    } catch (err: any) {
      setSearchError('Could not retrieve order. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Demo status switcher for staff, test review, or live preview
  const handleDemoStatusChange = async (newStatus: ActiveOrderData['status']) => {
    triggerHaptic('medium');
    if (!activeOrder) return;

    // Optimistically update local activeOrder
    const updated: ActiveOrderData = { ...activeOrder, status: newStatus };
    setActiveOrder(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mahfil_cached_active_order', JSON.stringify(updated));
    }

    // Try updating in Firestore
    try {
      const orderRef = doc(db, 'mahfil_orders', activeOrder.id);
      await updateDoc(orderRef, { status: newStatus });
      triggerHaptic('success');
    } catch (err) {
      // Local state is already updated for test presentation
      console.log('Local status simulated:', newStatus);
    }
  };

  // Create a sample demo order if user has none, allowing instant review of the tracking UI
  const handleCreateSampleOrder = () => {
    triggerHaptic('heavy');
    const demoId = `ORD-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    const sample: ActiveOrderData = {
      id: demoId,
      userId: user?.uid || 'guest_demo',
      customerName: user?.displayName || 'Mahfil Guest',
      phone: '0300 8472910',
      orderType: 'delivery',
      destination: 'Villa 42, Sector C, Bahria Town, Lahore',
      items: [
        { name: 'Matka Zafrani Chai', price: 220, quantity: 2, selectedVariant: 'Clay Matka (Extra Malai)' },
        { name: 'Desi Ghee Lacha Paratha', price: 160, quantity: 2, selectedVariant: 'Crisp Spiral' },
        { name: 'Chicken Cheese Paratha', price: 360, quantity: 1, selectedVariant: 'Tandoori Spiced' }
      ],
      subtotal: 1120,
      deliveryFee: 0,
      total: 1120,
      paymentMethod: 'cash',
      paymentStatus: 'unpaid',
      status: 'preparing',
      instructions: 'Please send piping hot with green cardamom garnish.',
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 300 },
      source: 'web_app'
    };

    setActiveOrder(sample);
    localStorage.setItem('mahfil_active_order_id', sample.id);
    localStorage.setItem('mahfil_cached_active_order', JSON.stringify(sample));
  };

  // Stepper milestones: Pending -> Preparing -> Ready -> Delivered
  const steps = [
    {
      id: 'pending',
      title: 'Pending',
      urdu: 'آرڈر موصول ہوا',
      desc: 'Logged in coal kitchen queue',
      icon: Clock,
      color: 'amber'
    },
    {
      id: 'preparing',
      title: 'Preparing',
      urdu: 'کوئلوں پر دم',
      desc: 'Tea brewing & paratha on iron tawa',
      icon: Flame,
      color: 'orange'
    },
    {
      id: 'ready',
      title: 'Ready for Pickup',
      urdu: 'تازہ اور تیار',
      desc: 'Piping hot & packed at counter',
      icon: CheckCircle2,
      color: 'emerald'
    },
    {
      id: 'delivering',
      title: activeOrder?.orderType === 'dine-in' ? 'Served' : 'Out for Delivery',
      urdu: activeOrder?.orderType === 'dine-in' ? 'پیش کر دیا' : 'راستے میں ہے',
      desc: activeOrder?.orderType === 'dine-in' ? 'At your table' : 'Mahfil rider en route',
      icon: Truck,
      color: 'sky'
    }
  ];

  // Helper to map order status to step index (0: Pending, 1: Preparing, 2: Ready, 3: Delivered)
  const getStepProgress = (status: string) => {
    switch (status) {
      case 'pending':
        return { index: 0, percent: 18 };
      case 'preparing':
        return { index: 1, percent: 50 };
      case 'ready':
        return { index: 2, percent: 80 };
      case 'on-the-way':
      case 'delivering':
        return { index: 3, percent: 92 };
      case 'delivered':
      case 'completed':
        return { index: 3, percent: 100 };
      case 'cancelled':
        return { index: -1, percent: 0 };
      default:
        return { index: 0, percent: 18 };
    }
  };

  const progressInfo = activeOrder ? getStepProgress(activeOrder.status) : { index: 0, percent: 0 };

  // ==========================================
  // RENDER: Loading State
  // ==========================================
  if (loading) {
    return (
      <div className="w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1C1815] border border-stone-200/80 dark:border-stone-800/80 shadow-sm animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-200 dark:bg-stone-800" />
            <div className="space-y-1.5">
              <div className="w-32 h-4 rounded-md bg-stone-200 dark:bg-stone-800" />
              <div className="w-20 h-3 rounded-md bg-stone-200 dark:bg-stone-800" />
            </div>
          </div>
          <div className="w-24 h-7 rounded-full bg-stone-200 dark:bg-stone-800" />
        </div>
        <div className="w-full h-16 rounded-2xl bg-stone-100 dark:bg-stone-800/50 mt-6" />
      </div>
    );
  }

  // ==========================================
  // RENDER: No Active Order
  // ==========================================
  if (!activeOrder) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1C1815] border border-stone-200/80 dark:border-stone-800/80 shadow-md text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Truck size={28} />
        </div>
        <h4 className="font-display font-bold text-xl text-stone-900 dark:text-stone-100 mb-1">
          No Active Order in Transit
        </h4>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6 leading-relaxed">
          When you order our signature Matka Zafrani Chai, fresh Parathas, or Desi Ghee delights, your live coal-kitchen status will stream here.
        </p>

        {/* Search Order ID Input for Guests */}
        <form onSubmit={handleSearchOrder} className="max-w-md mx-auto mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Track by Reference (e.g. ORD-123456)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#C85A32]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchOrderId.trim()}
              className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSearching ? 'Tracking...' : 'Track'}
            </button>
          </div>
          {searchError && (
            <p className="text-[11px] text-rose-500 mt-2 text-left">{searchError}</p>
          )}
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setActiveSection('menu')}
            className="px-6 py-3 rounded-2xl bg-[#C85A32] hover:bg-[#b04a25] text-white text-xs sm:text-sm font-semibold shadow-md transition-all flex items-center gap-2"
          >
            <Coffee size={16} />
            <span>Explore Quetta Menu</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={handleCreateSampleOrder}
            className="px-4 py-3 rounded-2xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60 text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Preview live order tracking with a sample order"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Preview Live Tracker Demo</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Active Order Live Lifecycle View
  // ==========================================
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Main Order Card */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-white dark:bg-[#1C1815] border border-stone-200/90 dark:border-stone-800/90 shadow-lg overflow-hidden transition-all"
      >
        {/* Top App-Bar Header */}
        <div className="p-4 sm:p-6 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/60 dark:bg-stone-900/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#C85A32]/10 dark:bg-[#C85A32]/20 text-[#C85A32] dark:text-[#E5A84B] flex items-center justify-center shadow-xs">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Active Order Ref
                </span>
                <button
                  onClick={() => handleCopyId(activeOrder.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-stone-800 dark:text-stone-200 hover:text-[#C85A32] dark:hover:text-[#E5A84B] transition-colors"
                  title="Click to copy Order ID"
                >
                  <span>#{activeOrder.id.slice(0, 10).toUpperCase()}</span>
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-stone-400" />}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="capitalize font-medium text-stone-700 dark:text-stone-300">
                  {activeOrder.orderType === 'delivery' ? '🛵 Bahria Delivery' : activeOrder.orderType === 'dine-in' ? '☕ Courtyard Dine-In' : '🛍️ Counter Takeaway'}
                </span>
                <span>•</span>
                <span>{activeOrder.customerName || 'Mahfil Guest'}</span>
              </div>
            </div>
          </div>

          {/* Real-time Live Badge & Refresh */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Kitchen Sync</span>
            </div>

            <button
              onClick={handleManualRefresh}
              className={cn(
                "p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all",
                isRefreshing && "animate-spin text-[#C85A32]"
              )}
              title="Refresh order status"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Status Callout Banner */}
        <div className="px-4 sm:px-6 pt-5 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                  activeOrder.status === 'pending'
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    : activeOrder.status === 'preparing'
                    ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30"
                    : activeOrder.status === 'ready'
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30"
                )}>
                  {activeOrder.status === 'pending' && <Clock size={12} className="animate-spin text-amber-500" />}
                  {activeOrder.status === 'preparing' && <Flame size={12} className="animate-pulse text-orange-500" />}
                  {activeOrder.status === 'ready' && <CheckCircle2 size={12} className="text-emerald-500" />}
                  {activeOrder.status === 'delivering' && <Truck size={12} className="text-sky-500" />}
                  <span>{activeOrder.status.toUpperCase()}</span>
                </span>

                <span className="text-xs font-urdu text-stone-500 dark:text-stone-400">
                  {activeOrder.status === 'pending' && 'آرڈر موصول ہو گیا'}
                  {activeOrder.status === 'preparing' && 'کوئلوں پر دم لگ رہا ہے'}
                  {activeOrder.status === 'ready' && 'حجرہ سے روانگی کے لیے تیار'}
                  {activeOrder.status === 'delivering' && 'رائڈر راستے میں ہے'}
                  {(activeOrder.status === 'delivered' || activeOrder.status === 'completed') && 'نوش جان'}
                </span>
              </div>

              <h5 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 mt-1">
                {activeOrder.status === 'pending' && 'Order Received & Kitchen Queued'}
                {activeOrder.status === 'preparing' && 'Zafrani Tea & Lacha Parathas Simmering on Coals'}
                {activeOrder.status === 'ready' && 'Order Fresh & Ready at Counter'}
                {activeOrder.status === 'delivering' && 'Mahfil Rider Dispatched to Bahria Town'}
                {(activeOrder.status === 'delivered' || activeOrder.status === 'completed') && 'Order Delivered Successfully'}
              </h5>
            </div>

            {/* Estimated Countdown Timer */}
            <div className="flex-shrink-0 text-left sm:text-right pl-1 sm:pl-0 border-l sm:border-l-0 sm:border-r-0 border-stone-200 dark:border-stone-700">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Estimated Time
              </span>
              <div className="flex items-center sm:justify-end gap-1.5 font-mono font-bold text-base sm:text-lg text-[#C85A32] dark:text-[#E5A84B]">
                <Clock size={16} />
                <span>{etaMinutes > 0 ? `~${etaMinutes} mins` : 'Ready Now!'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Stepper Progress Indicators (Pending -> Preparing -> Ready -> Delivered) */}
        <div className="p-4 sm:p-6">
          <div className="relative mb-2">
            {/* Background connecting bar */}
            <div className="absolute top-5 left-6 right-6 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full z-0" />
            
            {/* Animated active progress bar */}
            <motion.div
              className="absolute top-5 left-6 h-1.5 bg-gradient-to-r from-amber-500 via-[#C85A32] to-emerald-500 rounded-full z-0"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(8, Math.min(100, progressInfo.percent))}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Step Nodes Grid */}
            <div className="grid grid-cols-4 gap-1 relative z-10">
              {steps.map((step, idx) => {
                const isCompleted = progressInfo.index > idx;
                const isCurrent = progressInfo.index === idx;
                const isUpcoming = progressInfo.index < idx;
                const StepIcon = step.icon;

                return (
                  <div key={step.id} className="flex flex-col items-center text-center px-1">
                    {/* Circle Node */}
                    <motion.div
                      animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                      transition={{ repeat: Infinity, duration: 2.2 }}
                      className={cn(
                        "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 relative",
                        isCompleted
                          ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-500/20"
                          : isCurrent
                          ? "bg-[#C85A32] text-white shadow-lg ring-4 ring-[#C85A32]/30 scale-105"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-400 border border-stone-200 dark:border-stone-700"
                      )}
                    >
                      {isCompleted ? (
                        <Check size={18} className="stroke-[3]" />
                      ) : (
                        <StepIcon size={18} className={isCurrent ? "animate-pulse" : ""} />
                      )}

                      {/* Glowing Ring for Current Node */}
                      {isCurrent && (
                        <span className="absolute -inset-1 rounded-full border-2 border-[#C85A32] animate-ping opacity-60" />
                      )}
                    </motion.div>

                    {/* Step Title & Urdu Subtitle */}
                    <div className="mt-2.5 space-y-0.5">
                      <span className={cn(
                        "text-[11px] sm:text-xs font-bold block leading-tight",
                        isCurrent
                          ? "text-[#C85A32] dark:text-[#E5A84B]"
                          : isCompleted
                          ? "text-stone-900 dark:text-stone-100 font-semibold"
                          : "text-stone-400 dark:text-stone-500 font-medium"
                      )}>
                        {step.title}
                      </span>
                      <span className="hidden sm:block text-[10px] font-urdu text-stone-400 leading-tight">
                        {step.urdu}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Collapsible Order Items & Details */}
        <div className="border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/40 dark:bg-stone-900/20">
          <button
            onClick={() => setShowItemDetails(!showItemDetails)}
            className="w-full px-4 sm:px-6 py-3 flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <Coffee size={15} className="text-[#C85A32]" />
              <span>
                {activeOrder.items?.length || 0} Items in Order • Rs. {activeOrder.total || activeOrder.subtotal || 0}
              </span>
            </div>
            <div className="flex items-center gap-1 text-stone-400">
              <span className="text-[11px]">{showItemDetails ? 'Hide Details' : 'View Receipt'}</span>
              {showItemDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {showItemDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-4 sm:px-6 pb-6 pt-1 space-y-4"
              >
                {/* Destination & Contact Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#181512] border border-stone-200/80 dark:border-stone-800 text-xs">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-[#C85A32] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Destination
                      </span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {activeOrder.destination || 'Bahria Town, Lahore'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone size={16} className="text-[#C85A32] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Rider Contact Phone
                      </span>
                      <span className="font-semibold font-mono text-stone-800 dark:text-stone-200">
                        {activeOrder.phone || '0300 0000000'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Itemized List */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block">
                    Ordered Dishes & Teas
                  </span>
                  <div className="divide-y divide-stone-100 dark:divide-stone-800/80 bg-white dark:bg-[#181512] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-1">
                    {activeOrder.items?.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 font-bold text-stone-700 dark:text-stone-300 flex items-center justify-center text-[11px]">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="font-semibold text-stone-800 dark:text-stone-200 block">
                              {item.name}
                            </span>
                            {item.selectedVariant && (
                              <span className="text-[10px] text-stone-400 block">
                                {item.selectedVariant}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                          Rs. {item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Instructions if any */}
                {activeOrder.instructions && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                      Kitchen Special Instructions:
                    </span>
                    <p className="italic">{activeOrder.instructions}</p>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#181512] border border-stone-200/80 dark:border-stone-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-500 dark:text-stone-400">
                    <span>Subtotal</span>
                    <span className="font-mono">Rs. {activeOrder.subtotal || activeOrder.total || 0}</span>
                  </div>
                  <div className="flex justify-between text-stone-500 dark:text-stone-400">
                    <span>Delivery in Bahria Town</span>
                    <span className="text-emerald-600 font-medium">FREE</span>
                  </div>
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-sm font-bold text-stone-900 dark:text-stone-100">
                    <span>Total Amount</span>
                    <span className="font-mono text-base text-[#C85A32] dark:text-[#E5A84B]">
                      Rs. {activeOrder.total || activeOrder.subtotal || 0}
                    </span>
                  </div>
                  <div className="pt-1 text-[11px] text-stone-400 flex items-center justify-between">
                    <span>Payment: <strong className="text-stone-600 dark:text-stone-300 capitalize">{activeOrder.paymentMethod === 'cash' ? 'Cash on Delivery' : 'SadaPay / NayaPay'}</strong></span>
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      {activeOrder.paymentStatus || 'Pay on Delivery'}
                    </span>
                  </div>
                </div>

                {/* Quick Action Contacts */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href="tel:04235889000"
                    onClick={() => triggerHaptic('light')}
                    className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone size={14} className="text-[#C85A32]" />
                    <span>Call Kitchen</span>
                  </a>

                  <a
                    href={`https://wa.me/923000000000?text=Assalamu%20Alaikum,%20inquiry%20regarding%20my%20Quetta%20Mahfil%20Order%20${activeOrder.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerHaptic('light')}
                    className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-emerald-500/20"
                  >
                    <Sparkles size={14} />
                    <span>WhatsApp Saki</span>
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Discrete Staff & Review Demo Status Controller */}
        <div className="p-3 bg-stone-100/60 dark:bg-stone-900/60 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <button
            onClick={() => setShowDemoControls(!showDemoControls)}
            className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 font-medium flex items-center gap-1"
          >
            <Sparkles size={12} className="text-amber-500" />
            <span>Staff / Preview Demo Controller</span>
            <ChevronDown size={12} className={cn("transition-transform", showDemoControls && "rotate-180")} />
          </button>

          {recentOrders.length > 1 && (
            <span className="text-stone-400">
              {recentOrders.length} orders on file
            </span>
          )}

          {showDemoControls && (
            <div className="w-full pt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-stone-400 mr-1 text-[10px] uppercase font-bold">Simulate State:</span>
              <button
                onClick={() => handleDemoStatusChange('pending')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold transition-all text-[10px]",
                  activeOrder.status === 'pending'
                    ? "bg-amber-500 text-white"
                    : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                )}
              >
                1. Pending
              </button>
              <button
                onClick={() => handleDemoStatusChange('preparing')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold transition-all text-[10px]",
                  activeOrder.status === 'preparing'
                    ? "bg-orange-500 text-white"
                    : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                )}
              >
                2. Preparing
              </button>
              <button
                onClick={() => handleDemoStatusChange('ready')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold transition-all text-[10px]",
                  activeOrder.status === 'ready'
                    ? "bg-emerald-500 text-white"
                    : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                )}
              >
                3. Ready
              </button>
              <button
                onClick={() => handleDemoStatusChange('delivering')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold transition-all text-[10px]",
                  activeOrder.status === 'delivering'
                    ? "bg-sky-500 text-white"
                    : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                )}
              >
                4. Delivered
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

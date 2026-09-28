import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { Clock, Flame, CheckCircle2, Truck, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigation } from '../context/NavigationContext';
import { useFirebase } from '../context/FirebaseContext';
import { triggerHaptic } from '../lib/haptics';

export default function ActiveOrderFloatingBar() {
  const { activeSection, setActiveSection } = useNavigation();
  const { user } = useFirebase();

  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // If user is already on the orders page, don't overlap with floating bar
    if (activeSection === 'orders') {
      return;
    }

    let unsubscribe: (() => void) | null = null;
    const activeOrderId = typeof window !== 'undefined' ? localStorage.getItem('mahfil_active_order_id') : null;

    if (activeOrderId) {
      try {
        const orderRef = doc(db, 'mahfil_orders', activeOrderId);
        unsubscribe = onSnapshot(orderRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as any;
            // Only show for active lifecycle states
            if (data.status === 'pending' || data.status === 'preparing' || data.status === 'ready' || data.status === 'delivering') {
              setActiveOrder(data);
              setDismissed(false);
            } else {
              setActiveOrder(null);
            }
          }
        }, (err) => {
          checkLocalOrder();
        });
      } catch (e) {
        checkLocalOrder();
      }
    } else if (user?.uid) {
      try {
        const q = query(
          collection(db, 'mahfil_orders'),
          where('userId', '==', user.uid),
          limit(1)
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const docData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
            if (docData.status === 'pending' || docData.status === 'preparing' || docData.status === 'ready' || docData.status === 'delivering') {
              setActiveOrder(docData);
              setDismissed(false);
            } else {
              setActiveOrder(null);
            }
          }
        }, (err) => {
          checkLocalOrder();
        });
      } catch (e) {
        checkLocalOrder();
      }
    } else {
      checkLocalOrder();
    }

    function checkLocalOrder() {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('mahfil_cached_active_order');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.status === 'pending' || data.status === 'preparing' || data.status === 'ready') {
              setActiveOrder(data);
              setDismissed(false);
            }
          } catch (e) {}
        }
      }
    }

    const handleUpdate = () => {
      checkLocalOrder();
    };
    window.addEventListener('mahfil_active_order_updated', handleUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('mahfil_active_order_updated', handleUpdate);
    };
  }, [activeSection, user?.uid]);

  if (!activeOrder || dismissed || activeSection === 'orders') {
    return null;
  }

  const getStatusBadge = () => {
    switch (activeOrder.status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-500 bg-amber-500/15 border-amber-500/30',
          title: 'Order Queued',
          detail: 'Pending kitchen fireup'
        };
      case 'preparing':
        return {
          icon: Flame,
          color: 'text-orange-500 bg-orange-500/15 border-orange-500/30',
          title: 'Preparing on Coals',
          detail: 'Chai & Paratha simmering'
        };
      case 'ready':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30',
          title: 'Fresh & Ready',
          detail: 'Packed & ready at counter'
        };
      case 'delivering':
      case 'on-the-way':
        return {
          icon: Truck,
          color: 'text-sky-500 bg-sky-500/15 border-sky-500/30',
          title: 'On the Way',
          detail: 'Rider en route'
        };
      default:
        return {
          icon: Clock,
          color: 'text-amber-500 bg-amber-500/15 border-amber-500/30',
          title: 'In Progress',
          detail: 'Live tracking active'
        };
    }
  };

  const badge = getStatusBadge();
  const Icon = badge.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-16 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[950] pointer-events-auto"
      >
        <div 
          onClick={() => {
            triggerHaptic('medium');
            setActiveSection('orders');
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-[#1C1815]/95 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800/90 shadow-xl flex items-center justify-between gap-3 cursor-pointer group hover:border-[#C85A32]/50 transition-all select-none"
        >
          {/* Status Indicator Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 relative", badge.color)}>
              <Icon size={19} className="animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-current absolute -top-0.5 -right-0.5 animate-ping" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                  {badge.title}
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#C85A32] dark:text-[#E5A84B]">
                  #{activeOrder.id.slice(0, 6).toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {badge.detail}
              </p>
            </div>
          </div>

          {/* Action Link & Dismiss */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs font-semibold text-[#C85A32] dark:text-[#E5A84B] flex items-center group-hover:translate-x-0.5 transition-transform">
              <span>Track</span>
              <ChevronRight size={14} />
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setDismissed(true);
              }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors ml-1"
              title="Dismiss banner"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

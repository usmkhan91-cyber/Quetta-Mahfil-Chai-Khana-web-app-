
import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Clock, CheckCircle, XCircle, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function OrderManager() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "mahfil_orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "mahfil_orders", id), { status });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-display font-black uppercase italic">Live Order Stream</h2>
        <div className="flex gap-2">
           <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-[10px] font-black uppercase">Active: {orders.filter(o => o.status !== 'delivered' && o.status !== 'completed').length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.map((order) => (
          <motion.div 
            key={order.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200 dark:border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-sm group"
          >
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-maroon/10 flex items-center justify-center text-primary-maroon">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-none mb-1">#{order.id.slice(0, 6)}</h4>
                    <p className="text-[10px] opacity-40 uppercase font-black">{order.createdAt?.seconds ? formatDistanceToNow(order.createdAt.seconds * 1000) : 'Just now'} ago</p>
                  </div>
                </div>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  order.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                  order.status === 'preparing' ? "bg-blue-500/10 text-blue-500" :
                  order.status === 'ready' ? "bg-emerald-500/10 text-emerald-500" :
                  order.status === 'delivering' ? "bg-purple-500/10 text-purple-500" :
                  "bg-green-500/10 text-green-500"
                )}>
                  {order.status}
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="opacity-60">{item.quantity}x {item.name}</span>
                    <span className="font-bold font-mono">Rs. {item.price * item.quantity}</span>
                  </div>
                ))}
                {order.total > 0 && (
                  <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex justify-between font-black">
                    <span>TOTAL</span>
                    <span>Rs. {order.total}</span>
                  </div>
                )}
                {order.note && <p className="text-xs italic bg-stone-50 dark:bg-black/40 p-3 rounded-xl border border-stone-100 dark:border-white/5">Note: {order.note}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:w-56 justify-end">
              <button 
                onClick={() => updateStatus(order.id, 'preparing')}
                className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                title="Start Preparing"
              >
                <Clock size={20} />
              </button>
              <button 
                onClick={() => updateStatus(order.id, 'ready')}
                className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                title="Mark Ready for Pickup/Dispatch"
              >
                <CheckCircle2 size={20} />
              </button>
              <button 
                onClick={() => updateStatus(order.id, 'delivering')}
                className="p-3 bg-purple-500/10 text-purple-500 rounded-xl hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                title="Send for Delivery"
              >
                <Truck size={20} />
              </button>
              <button 
                onClick={() => updateStatus(order.id, 'delivered')}
                className="p-3 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                title="Mark Delivered"
              >
                <CheckCircle size={20} />
              </button>
              <button 
                onClick={() => updateStatus(order.id, 'cancelled')}
                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                title="Cancel Order"
              >
                <XCircle size={20} />
              </button>
            </div>
          </motion.div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <ShoppingBag size={48} className="mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">No pending orders in the Mahfil stream</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning';
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleEvent = (e: any) => {
      const { title, body, type = 'info' } = e.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, title, body, type }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };

    window.addEventListener('show-notification', handleEvent);
    return () => window.removeEventListener('show-notification', handleEvent);
  }, []);

  return (
    <div className="fixed top-20 right-6 z-[1000] w-full max-w-sm pointer-events-none">
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto p-5 bg-white dark:bg-stone-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-stone-200 dark:border-white/5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-maroon/10 flex items-center justify-center text-primary-maroon">
                 {n.type === 'success' ? <CheckCircle size={20} /> : n.type === 'warning' ? <AlertTriangle size={20} /> : <Info size={20} />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm tracking-tight leading-none mb-1 uppercase italic">{n.title}</h4>
                <p className="text-xs opacity-60 leading-normal">{n.body}</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="opacity-20 hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

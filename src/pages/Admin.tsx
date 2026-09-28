import React, { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Settings, 
  Users, 
  ShoppingBag, 
  BarChart, 
  Database, 
  Terminal, 
  Cpu,
  LayoutGrid,
  ClipboardList,
  Bot,
  QrCode,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import OrderManager from '../components/admin/OrderManager';
import CatalogManager from '../components/admin/CatalogManager';
import AdminAIControl from '../components/admin/AdminAIControl';
import QRCheckInScanner from '../components/QRCheckInScanner';
import GoogleChatHub from '../components/admin/GoogleChatHub';

type AdminTab = 'ai-control' | 'google-chat' | 'dashboard' | 'orders' | 'catalog' | 'users' | 'systems' | 'checkin';

export default function Admin() {
  const { profile, isAdmin } = useFirebase();
  const [activeTab, setActiveTab] = useState<AdminTab>('ai-control');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6">
           <Shield size={40} />
        </div>
        <h1 className="text-3xl font-display font-black mb-4">RESTRICTED ZONE</h1>
        <p className="opacity-60 max-w-md">Only the Legacy Administrators of Quetta Mahfil can access this node. Identity validation failed.</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Revenue', value: '452k', icon: BarChart, color: 'text-green-500' },
    { label: 'Active Orders', value: '12', icon: ShoppingBag, color: 'text-primary-maroon' },
    { label: 'Members', value: '1.2k', icon: Users, color: 'text-blue-500' },
    { label: 'AI Tokens', value: '8.4k', icon: Cpu, color: 'text-purple-500' },
  ];

  const tabs = [
    { id: 'ai-control', label: 'AI Control Center', icon: Bot },
    { id: 'google-chat', label: 'Google Chat', icon: MessageSquare },
    { id: 'checkin', label: 'Guest Check-In', icon: QrCode },
    { id: 'dashboard', label: 'Nodes', icon: LayoutGrid },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'catalog', label: 'Catalog', icon: Database },
    { id: 'systems', label: 'Systems', icon: Terminal },
  ];

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-16">
        <div>
          <h1 className="text-4xl md:text-7xl font-display font-black uppercase tracking-tighter mb-2 italic">
            Admin <span className="text-primary-maroon dark:text-primary-gold">Node</span>
          </h1>
          <p className="opacity-60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 
            Mahfil Intelligence Online • Genesis v1.5.0
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex p-2 bg-stone-100 dark:bg-white/5 rounded-3xl border border-stone-200 dark:border-white/5 overflow-x-auto no-scrollbar">
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as AdminTab)}
               className={cn(
                 "flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                 activeTab === tab.id 
                  ? "bg-white dark:bg-stone-800 text-primary-maroon dark:text-primary-gold shadow-lg" 
                  : "opacity-40 hover:opacity-100"
               )}
             >
               <tab.icon size={16} /> {tab.label}
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ai-control' && (
          <motion.div
            key="ai-control"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AdminAIControl />
          </motion.div>
        )}

        {activeTab === 'google-chat' && (
          <motion.div
            key="google-chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GoogleChatHub />
          </motion.div>
        )}

        {activeTab === 'checkin' && (
          <motion.div
            key="checkin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center"
          >
            <QRCheckInScanner
              staffName={profile?.displayName || 'Mahfil Admin Host'}
              defaultTable="Main Hujra Lounge"
            />
          </motion.div>
        )}

        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
               {stats.map((s, i) => (
                 <div key={i} className="p-8 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-shadow">
                    <div className={cn("w-12 h-12 rounded-2xl bg-stone-50 dark:bg-white/5 flex items-center justify-center mb-6", s.color)}>
                       <s.icon size={24} />
                    </div>
                    <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest">{s.label}</p>
                    <p className="text-4xl font-display font-black tracking-tighter">{s.value}</p>
                 </div>
               ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-10 bg-stone-100 dark:bg-white/5 rounded-[3.5rem] border border-stone-200 dark:border-white/5">
                  <h3 className="text-2xl font-display font-black mb-8 flex items-center gap-4">
                     <Database size={28} className="text-primary-maroon" /> DATA CORE
                  </h3>
                  <div className="space-y-4">
                     {[
                       { name: 'Menu Inventory', count: 124, trend: '+2 this week' },
                       { name: 'Heritage Diary', count: 890, trend: '42 new marks' },
                       { name: 'Wall of Kindness', count: 45, trend: '12 active gifts' },
                       { name: 'Neural Memory Shards', count: '1.2k', trend: 'Optimized' }
                     ].map((mod, i) => (
                       <div key={i} className="flex items-center justify-between p-6 bg-white dark:bg-stone-900/50 rounded-3xl border border-white/5">
                          <div>
                            <span className="font-bold block mb-1">{mod.name}</span>
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">{mod.trend}</span>
                          </div>
                          <span className="px-4 py-2 bg-stone-100 dark:bg-white/10 rounded-xl text-xs font-black">{mod.count}</span>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="p-10 bg-stone-100 dark:bg-white/5 rounded-[3.5rem] border border-stone-200 dark:border-white/5">
                  <h3 className="text-2xl font-display font-black mb-8 flex items-center gap-4 italic uppercase">
                     <Cpu size={28} className="text-primary-gold" /> Neural Status
                  </h3>
                  <div className="p-8 bg-black text-green-500 font-mono text-xs rounded-3xl h-[400px] overflow-y-auto leading-relaxed border border-green-500/20 shadow-2xl relative">
                     <div className="sticky top-0 right-0 left-0 bg-black/80 backdrop-blur-md pb-4 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> SAKI_OS_V1.5.0</span>
                        <span>02:34:10 UTC</span>
                     </div>
                     <div className="space-y-1">
                        <p>[SYSTEM] Saki Neural Core initialized...</p>
                        <p>[AUTH] Admin Usama Khan signature validated.</p>
                        <p>[MODEL] DeepSeek R1 online via Genesis Proxy.</p>
                        <p>[VOICE] Neural Lexicon Ur-PK / En-US loaded.</p>
                        <p>[SPATIAL] Geofence set to 15km Radius.</p>
                        <p>[MEMORY] 1.2k User preference shards loaded.</p>
                        <p>[GUARD] Autonomous security shield at 100%.</p>
                        <p className="text-amber-500">[WARN] High demand for Zafrani Tea detected.</p>
                        <p>[INFO] Automated banner rotation: Heritage Summer.</p>
                        <p className="animate-pulse">_</p>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
             <OrderManager />
          </motion.div>
        )}

        {activeTab === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
             <CatalogManager />
          </motion.div>
        )}

        {activeTab === 'systems' && (
          <div className="text-center py-40 opacity-20 italic font-display font-black text-4xl">
             System Terminal Restricted
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

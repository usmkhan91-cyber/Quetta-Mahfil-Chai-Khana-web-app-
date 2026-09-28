
import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit3, Image as ImageIcon, Save, X } from 'lucide-react';
import { Category, MenuItem } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from '../../lib/utils';
import { upsertMenuItem, removeMenuItem, uploadFile } from '../../services/firestore';

export default function CatalogManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isEditing, setIsEditing] = useState<Partial<MenuItem> | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "menu"), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[]);
    });
  }, []);

  const categories: Category[] = [
    'Tea & Kehwa',
    'Chat Pata Paratha',
    'Meetha Paratha',
    'Juices & Drinks',
    'Fresh Juices',
    'Milk Shakes',
    'Dry Fruit Shakes'
  ];

  const handleSave = async () => {
    if (!isEditing?.name || !isEditing?.category) {
      toast("Incomplete Data", "Sahib, please provide all required details.");
      return;
    }
    await upsertMenuItem(isEditing);
    setIsEditing(null);
    toast("Success", "Catalog entry updated in the local reality.");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, 'menu_images');
      setIsEditing(prev =>prev ? { ...prev, image: url } : null);
    } catch (error) {
      toast("Error", "Image upload failed. Neural link too weak.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-display font-black uppercase italic">Menu Architect</h2>
        <button 
          onClick={() => setIsEditing({ 
            name: '', 
            price: 0, 
            category: 'Tea & Kehwa', 
            description: '',
            isAvailable: true 
          })}
          className="px-6 py-3 bg-primary-gold text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl"
        >
          <Plus size={18} /> NEW HERITAGE ITEM
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="p-6 bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200 dark:border-white/5 flex flex-col gap-4 group">
            <div className="h-40 rounded-2xl overflow-hidden bg-stone-100 dark:bg-black/40">
              <img src={item.image || 'https://via.placeholder.com/300'} className="w-full h-full object-cover opacity-80" alt={item.name} />
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">{item.name}</h4>
              <p className="text-xs opacity-40 uppercase font-black mb-4">{item.category} • Rs. {item.price}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(item)}
                  className="flex-1 py-3 bg-stone-100 dark:bg-white/5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary-gold hover:text-black transition-all"
                >
                  <Edit3 size={14} /> EDIT
                </button>
                <button 
                  onClick={() => removeMenuItem(item.id)}
                  className="px-4 py-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative w-full max-w-2xl bg-white dark:bg-stone-900 p-8 rounded-[3rem] shadow-4xl overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-display font-black italic uppercase">Construct Entity</h3>
                  <button onClick={() => setIsEditing(null)}><X /></button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase opacity-40 ml-2">Display Name</label>
                      <input 
                        className="w-full p-4 bg-stone-100 dark:bg-black rounded-2xl border-none outline-none focus:ring-1 focus:ring-primary-gold"
                        value={isEditing.name}
                        onChange={(e) => setIsEditing({...isEditing, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase opacity-40 ml-2">Category</label>
                      <select 
                        className="w-full p-4 bg-stone-100 dark:bg-black rounded-2xl border-none outline-none focus:ring-1 focus:ring-primary-gold"
                        value={isEditing.category}
                        onChange={(e) => setIsEditing({...isEditing, category: e.target.value as any})}
                      >
                         {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase opacity-40 ml-2">Heritage Price (Rs)</label>
                      <input 
                        type="number"
                        className="w-full p-4 bg-stone-100 dark:bg-black rounded-2xl border-none outline-none focus:ring-1 focus:ring-primary-gold"
                        value={isEditing.price}
                        onChange={(e) => setIsEditing({...isEditing, price: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="h-44 rounded-2xl bg-stone-100 dark:bg-black relative overflow-hidden group">
                       {isEditing.image ? (
                         <img src={isEditing.image} className="w-full h-full object-cover" alt="Preview" />
                       ) : (
                         <div className="flex items-center justify-center h-full opacity-20"><ImageIcon size={48} /></div>
                       )}
                       <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">{uploading ? 'Processing...' : 'Neural Upload'}</span>
                          <input type="file" hidden onChange={handleImageUpload} disabled={uploading} />
                       </label>
                    </div>
                    <textarea 
                      placeholder="Legacy description..."
                      className="w-full h-24 p-4 bg-stone-100 dark:bg-black rounded-2xl border-none outline-none focus:ring-1 focus:ring-primary-gold resize-none"
                      value={isEditing.description}
                      onChange={(e) => setIsEditing({...isEditing, description: e.target.value})}
                    />
                  </div>
               </div>

               <button 
                  onClick={handleSave}
                  className="w-full py-5 bg-primary-maroon text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 luxury-gradient"
               >
                  <Save size={20} /> SYNCHRONIZE CORE
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

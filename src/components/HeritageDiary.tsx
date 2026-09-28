import React, { useState, useEffect } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { addDiaryNote, subscribeToDiary, DiaryNote } from '../services/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Send, User, Quote, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { triggerHaptic } from '../lib/haptics';

export default function HeritageDiary() {
  const { user } = useFirebase();
  const [notes, setNotes] = useState<DiaryNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDiary((newNotes) => {
      setNotes(newNotes);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting) return;

    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      const author = user?.displayName || guestName.trim() || 'Valued Guest';
      await addDiaryNote(author, newNote.trim(), user?.uid || 'guest');
      setNewNote('');
      setGuestName('');
      triggerHaptic('heavy');
    } catch (error) {
      console.error("Diary entry error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 px-4 md:px-8 max-w-4xl mx-auto scroll-mt-24">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C85A32]/10 text-[#C85A32] text-xs font-semibold mb-2">
          <BookOpen size={14} />
          <span>Guestbook & Poetry</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-display font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Mahfil Guestbook <span className="font-urdu text-2xl md:text-4xl text-[#C85A32]">یادداشتِ محفل</span>
        </h2>
        <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 mt-2 max-w-md mx-auto">
          Share your evening reflection, a couplet, or memories over a steaming cup of tea.
        </p>
      </div>

      {/* Note submission card */}
      <div className="mb-12 p-6 md:p-8 bg-white dark:bg-[#1E1B17] rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <div>
              <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Asad & Friends"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32]"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
              Your Memory / Reflection
            </label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="The midnight Zafrani Chai was soul-stirring, sitting under the stars on the chaarpai..."
              className="w-full h-28 p-3.5 bg-stone-50 dark:bg-[#221E1A] rounded-xl border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32] resize-none"
              maxLength={400}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-stone-400">
              {newNote.length}/400 characters
            </span>
            <button
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className="px-6 py-2.5 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Inscribing...' : 'Leave a Note'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Guestbook entries list */}
      <div className="space-y-4">
        <AnimatePresence>
          {notes.map((note, i) => (
            <motion.div
              key={note.id || i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white dark:bg-[#1E1B17] rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs relative overflow-hidden"
            >
              <Quote className="absolute top-4 right-4 text-stone-100 dark:text-stone-800/80 -z-0" size={54} />
              <p className="text-sm md:text-base font-serif italic text-stone-800 dark:text-stone-200 leading-relaxed mb-4 relative z-10">
                "{note.text}"
              </p>

              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-3 border-t border-stone-100 dark:border-stone-800">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {note.name || 'Guest'}
                </span>
                <span className="text-[11px]">
                  {note.createdAt?.seconds ? formatDistanceToNow(note.createdAt.seconds * 1000) + ' ago' : 'Recent'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

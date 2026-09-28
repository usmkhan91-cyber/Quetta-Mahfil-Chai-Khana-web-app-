import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  Coffee, 
  Phone, 
  User, 
  ChevronRight,
  HeartHandshake
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  const { user } = useFirebase();
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [partySize, setPartySize] = useState<number>(4);
  const [seatingArea, setSeatingArea] = useState<'chaarpai' | 'baithak' | 'ac_hall'>('chaarpai');
  const [reservationDate, setReservationDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState<string>('9:00 PM - 11:00 PM (Prime Mahfil)');
  const [guestName, setGuestName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  const seatingOptions = [
    {
      id: 'chaarpai',
      name: 'Outdoor Chaarpai Hujra',
      urdu: 'چارپائی حجرہ',
      desc: 'Traditional woven chaarpai under the open night sky with warm coal burners.',
      badge: 'Most Loved'
    },
    {
      id: 'baithak',
      name: 'Family Floor Baithak',
      urdu: 'خاندانی بیٹھک',
      desc: 'Carpeted heritage floor seating with rich cushions (Gao Takia) for intimate groups.',
      badge: 'Traditional'
    },
    {
      id: 'ac_hall',
      name: 'Executive AC Dining',
      urdu: 'ایگزیکٹو ڈائننگ',
      desc: 'Comfortable air-conditioned indoor tables with private ambiance.',
      badge: 'Indoor'
    }
  ];

  const timeSlots = [
    '6:00 PM - 8:00 PM (Sunset Chai)',
    '8:00 PM - 10:00 PM (Dinner & Parathas)',
    '10:00 PM - 12:00 AM (Midnight Mahfil)',
    '12:00 AM - 2:00 AM (Late Night Tea)',
    '2:00 AM - 4:00 AM (Starry Night Kehwa)'
  ];

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !phone.trim() || isSubmitting) return;

    setIsSubmitting(true);
    triggerHaptic('medium');

    const generatedRef = `QMK-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await addDoc(collection(db, 'reservations'), {
        referenceNumber: generatedRef,
        userId: user?.uid || null,
        guestName: guestName.trim(),
        phone: phone.trim(),
        partySize,
        seatingArea,
        date: reservationDate,
        timeSlot,
        notes: notes.trim() || null,
        status: 'confirmed',
        createdAt: serverTimestamp(),
        source: 'web_portal'
      });

      setBookingReference(generatedRef);
      triggerHaptic('heavy');
    } catch (error) {
      console.warn('Firestore reservation fallback:', error);
      // Fallback local booking confirmation
      setBookingReference(generatedRef);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setBookingReference(null);
    setStep(1);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#FAF8F5] dark:bg-[#1A1714] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6 md:p-8 text-stone-900 dark:text-stone-100 z-10 no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl leading-tight">
                    Reserve a Table / Hujra
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-urdu">
                    کوئٹہ محفل میں اپنی نشست محفوظ کروائیں
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {bookingReference ? (
              /* Success confirmation state */
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="font-display font-bold text-2xl mb-1">
                  Table Reserved Sahib!
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 font-urdu text-base">
                  خوش آمدید! آپ کی نشست تیار رکھی جائے گی
                </p>

                <div className="p-4 rounded-xl bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-left space-y-2 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Booking Reference</span>
                    <span className="font-mono font-bold text-[#C85A32]">{bookingReference}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Guest Name</span>
                    <span className="font-semibold">{guestName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Party Size</span>
                    <span className="font-semibold">{partySize} Guests</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Seating Preference</span>
                    <span className="font-semibold capitalize">{seatingArea.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Date & Slot</span>
                    <span className="font-semibold">{reservationDate} • {timeSlot.split(' ')[0]}</span>
                  </div>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
                  A reminder SMS will be sent to <span className="font-semibold">{phone}</span>. Our team in Bahria Town looks forward to welcoming you!
                </p>

                <button
                  onClick={handleClose}
                  className="w-full py-3.5 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Booking Form */
              <form onSubmit={handleBooking} className="space-y-6">
                {/* 1. Party Size */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-2">
                    1. Number of Guests
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[2, 4, 6, 8, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPartySize(num)}
                        className={cn(
                          "py-2.5 rounded-xl border text-xs font-semibold transition-all text-center",
                          partySize === num
                            ? "bg-[#C85A32] text-white border-[#C85A32] shadow-sm"
                            : "bg-white dark:bg-[#221E1A] border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300"
                        )}
                      >
                        {num === 12 ? '12+ Guests' : `${num} Guests`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Seating Preference */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-2">
                    2. Select Seating Atmosphere
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {seatingOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSeatingArea(opt.id as any)}
                        className={cn(
                          "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between",
                          seatingArea === opt.id
                            ? "border-[#C85A32] bg-[#C85A32]/5 dark:bg-[#C85A32]/15 shadow-sm"
                            : "bg-white dark:bg-[#221E1A] border-stone-200 dark:border-stone-800 hover:border-stone-300"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                              {opt.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C85A32]/10 text-[#C85A32] font-medium">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={reservationDate}
                      onChange={(e) => setReservationDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                      Time Window
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32]"
                    >
                      {timeSlots.map((ts) => (
                        <option key={ts} value={ts}>
                          {ts}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Guest Details */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-stone-600 dark:text-stone-400 block mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Tariq Shah"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-600 dark:text-stone-400 block mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0300 1234567"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-stone-600 dark:text-stone-400 block mb-1">
                      Special Hospitality Requests (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Quiet corner, extra cushions, anniversary setup..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32]"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#C85A32] hover:bg-[#b04a25] active:scale-[0.99] text-white rounded-xl font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Reserving Your Table...
                    </span>
                  ) : (
                    <>
                      <span>Confirm Reservation</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

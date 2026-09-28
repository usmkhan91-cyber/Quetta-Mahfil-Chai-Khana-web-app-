import React from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { useNavigation } from '../context/NavigationContext';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogOut, User, Mail, Phone, MapPin, Award, Star, History, Shield, QrCode } from 'lucide-react';
import { cn } from '../lib/utils';
import OrderTracker from '../components/OrderTracker';

export default function Profile() {
  const { user, profile, loading } = useFirebase();
  const { setQRScannerOpen } = useNavigation();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-10 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-white/5 shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-primary-maroon rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl">
             <User size={40} />
          </div>
          <h1 className="text-3xl font-display font-black mb-4 uppercase tracking-tighter italic">Join the <span className="text-primary-maroon">Mahfil</span></h1>
          <p className="opacity-60 mb-10 leading-relaxed font-medium">Unlock heritage rewards, persistent AI memory, and direct access to Usama's personal reservations.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg flex items-center justify-center gap-4 hover:opacity-90 transition-all shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>
          
          <p className="mt-8 text-xs opacity-40">By signing in, you agree to our Heritage Terms & Privacy Protocols.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto">
      {/* Active Orders Section */}
      {user && <OrderTracker userId={user.uid} />}

      {/* Profile Header */}
      <div className="relative mb-10 p-8 rounded-[3rem] bg-white dark:bg-stone-900 border border-stone-200 dark:border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-maroon/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="relative">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] overflow-hidden border-4 border-stone-100 dark:border-stone-800 shadow-2xl">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-full h-full object-cover" alt={user.displayName || ""} />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary-gold text-black px-4 py-1 rounded-full font-black text-xs shadow-lg">
              LEVEL {profile?.level || 1}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter uppercase italic mb-2">
              {user.displayName || "GUEST"}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 opacity-60 font-bold text-sm">
              <div className="flex items-center gap-2"><Mail size={16} /> {user.email}</div>
              {profile?.phoneNumber && <div className="flex items-center gap-2"><Phone size={16} /> {profile.phoneNumber}</div>}
              {profile?.isAdmin && <div className="flex items-center gap-2 text-primary-maroon dark:text-primary-gold"><Shield size={16} /> ADMIN STATUS</div>}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-4">
               <div className="px-6 py-3 bg-stone-100 dark:bg-white/5 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-gold/10 flex items-center justify-center text-primary-gold">
                     <Award size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-40 leading-none mb-1">Points</p>
                    <p className="text-xl font-display font-black leading-none">{profile?.points || 0}</p>
                  </div>
               </div>
               
               <div className="px-6 py-3 bg-stone-100 dark:bg-white/5 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-maroon/10 flex items-center justify-center text-primary-maroon">
                     <Star size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-40 leading-none mb-1">Rank</p>
                    <p className="text-xl font-display font-black leading-none">{profile?.level === 1 ? 'Regular' : 'Legacy Guest'}</p>
                  </div>
               </div>

               <button
                  onClick={() => setQRScannerOpen(true)}
                  className="px-6 py-3.5 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-2xl flex items-center gap-3 font-bold text-xs shadow-md transition-all active:scale-95"
               >
                  <QrCode size={20} />
                  <span>My QR Pass & Check-In</span>
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        {/* Memory Box */}
        <div className="p-8 bg-stone-100 dark:bg-white/5 rounded-[2.5rem] border border-stone-200 dark:border-white/5">
          <h3 className="text-2xl font-display font-black italic mb-6 flex items-center gap-3">
            <History size={24} className="text-primary-maroon" /> AI MEMORY
          </h3>
          <p className="text-stone-500 italic leading-relaxed">
            "Saki remembers your preference for Extra Strong Zafrani Tea and your interest in Balochi Folklore. Your last visit was highly respectful, Sahib."
          </p>
        </div>

        {/* Badges */}
        <div className="p-8 bg-stone-100 dark:bg-white/5 rounded-[2.5rem] border border-stone-200 dark:border-white/5">
          <h3 className="text-2xl font-display font-black italic mb-6">HERITAGE BADGES</h3>
          <div className="flex flex-wrap gap-3">
             {profile?.badges?.length ? profile.badges.map(b => (
                <span key={b} className="px-4 py-2 bg-white dark:bg-stone-800 rounded-xl text-xs font-black border border-primary-gold/20 shadow-sm">
                  {b}
                </span>
             )) : (
               <p className="text-stone-400 text-sm italic">Complete your first order to unlock badges.</p>
             )}
          </div>
        </div>
      </div>

      <button 
        onClick={() => auth.signOut()}
        className="w-full py-5 border-2 border-red-500/20 text-red-500 rounded-3xl font-black text-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-4"
      >
        <LogOut size={24} /> SIGN OUT FROM ALL DEVICES
      </button>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 800);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[999]">
      {/* Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-primary-maroon/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        <div className="w-24 h-24 md:w-32 md:h-32 bg-primary-maroon rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-[0_0_50px_rgba(139,0,0,0.5)] border-2 border-primary-gold/20">
          <span className="text-5xl md:text-6xl font-display font-black">Q</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-display font-black text-white uppercase tracking-tighter italic mb-2">
          {t('title')}
        </h1>
        <p className="text-primary-gold font-bold tracking-[0.4em] text-[10px] md:text-xs uppercase">{t('subtitle')}</p>
      </motion.div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 md:w-80">
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary-gold shadow-[0_0_10px_#D4AF37]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-[10px] font-black tracking-widest text-white/40 uppercase">
          <span>{t('loading')}</span>
          <span>{progress}%</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20 text-[8px] font-bold tracking-tighter uppercase whitespace-nowrap">
        Neural Core v1.5.0 • Developed for Usama Khan • Bahria Town Lahore
      </div>
    </div>
  );
}

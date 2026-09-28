import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  X, 
  Send, 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  Calendar, 
  MapPin, 
  ArrowRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import { voiceCore } from '../services/voiceService';
import { centralAgent } from '../services/centralAgentService';
import { useFirebase } from '../context/FirebaseContext';
import { triggerHaptic } from '../lib/haptics';

export default function AISaki() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: "Assalamu Alaikum! I am Saki, your AI host at Quetta Mahfil. How may I serve you today, Sahib? Ask me for chai recommendations, midnight parathas, or table bookings."
    }
  ]);

  const { setActiveSection, setReservationOpen } = useNavigation();
  const { language } = useLanguage();
  const { user, profile } = useFirebase();

  const handleVoiceToggle = () => {
    if (isListening) {
      voiceCore.stopListening();
      setIsListening(false);
      if (transcript.trim()) {
        handleProcessMessage(transcript, 'voice');
      }
    } else {
      setTranscript('');
      setIsListening(true);
      triggerHaptic('medium');
      voiceCore.startListening({
        language: language === 'ur' ? 'ur-PK' : 'en-US',
        onTranscript: (text, isFinal) => {
          setTranscript(text);
          if (isFinal) {
            voiceCore.stopListening();
            setIsListening(false);
            handleProcessMessage(text, 'voice');
          }
        },
        onError: () => {
          setIsListening(false);
        }
      });
    }
  };

  const handleProcessMessage = async (text: string, modality: 'text' | 'voice' = 'text') => {
    if (!text.trim() || isThinking) return;

    const userText = text.trim();
    setTextInput('');
    setTranscript('');
    setChatLog(prev => [...prev, { role: 'user', text: userText }]);
    setIsThinking(true);
    triggerHaptic('light');

    const lower = userText.toLowerCase();
    if (lower.includes('reserve') || lower.includes('booking') || lower.includes('table')) {
      setTimeout(() => setReservationOpen(true), 800);
    } else if (lower.includes('menu') || lower.includes('tea') || lower.includes('paratha')) {
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    }

    try {
      const token = user ? await user.getIdToken() : undefined;
      const agentRes = await centralAgent.interact({
        message: userText,
        modality,
        context: {
          userName: user?.displayName || 'Mahfil Guest',
          userEmail: user?.email || undefined,
          userRole: profile?.role || 'customer'
        },
        authToken: token
      });

      const reply = agentRes.reply || "Assalamu Alaikum Sahib! Saki is always ready to serve you at Quetta Mahfil.";
      setChatLog(prev => [...prev, { role: 'assistant', text: reply }]);

      // Speech synthesis
      const speechText = agentRes.audioText || reply;
      centralAgent.speak(speechText, language === 'ur' ? 'ur' : 'en');
    } catch (e) {
      console.error('Saki interaction error:', e);
      setChatLog(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "Sahib, our kitchen queue is bustling! Would you like to try our Zafrani Doodh Patti or reserve a traditional chaarpai?"
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const quickPrompts = [
    "Recommend our signature tea",
    "Best parathas for hunger",
    "Reserve a table for 4",
    "Bahria delivery time"
  ];

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[1050] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            className="w-[calc(100vw-2rem)] sm:w-96 mb-3 bg-[#FAF8F5] dark:bg-[#1A1714] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[560px]"
          >
            {/* Header */}
            <div className="p-4 bg-white dark:bg-[#201C18] border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C85A32] text-white flex items-center justify-center shadow-sm">
                  <Coffee size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
                      Saki • AI Khidmatgar
                    </h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[11px] font-urdu text-stone-500 dark:text-stone-400">
                    کوئٹہ محفل کا ذہین میزبان
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar text-xs">
              {chatLog.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2.5 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto justify-end" : "mr-auto"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Coffee size={13} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "p-3 rounded-2xl leading-relaxed",
                      msg.role === 'user'
                        ? "bg-[#C85A32] text-white rounded-tr-xs"
                        : "bg-white dark:bg-[#221E1A] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-800 rounded-tl-xs shadow-xs"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 text-stone-400 text-xs italic pl-8">
                  <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce [animation-delay:0.4s]" />
                  <span>Saki is thinking...</span>
                </div>
              )}
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-4 py-2 border-t border-stone-100 dark:border-stone-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleProcessMessage(prompt, 'text')}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:border-[#C85A32] hover:text-[#C85A32] transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Composer */}
            <div className="p-3 bg-white dark:bg-[#201C18] border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2 bg-stone-100 dark:bg-[#181512] rounded-xl p-1.5 border border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex-shrink-0",
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-stone-500 dark:text-stone-400 hover:text-[#C85A32]"
                  )}
                  title={isListening ? "Listening..." : "Tap to Speak"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleProcessMessage(textInput, 'text')}
                  placeholder={isListening ? "Listening..." : "Ask Saki anything..."}
                  className="w-full bg-transparent text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none px-1"
                />

                <button
                  type="button"
                  onClick={() => handleProcessMessage(textInput, 'text')}
                  disabled={!textInput.trim() || isThinking}
                  className="p-2 rounded-lg bg-[#C85A32] hover:bg-[#b04a25] text-white disabled:opacity-30 transition-all flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 rounded-full bg-[#C85A32] hover:bg-[#b04a25] text-white shadow-xl flex items-center gap-2.5 transition-colors border border-white/20"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <Coffee size={14} />
        </div>
        <span className="text-xs font-semibold tracking-wide">
          {isOpen ? 'Close Concierge' : 'Ask Saki AI'}
        </span>
        {!isOpen && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </motion.button>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Calendar, 
  ShoppingBag, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  User, 
  Flame, 
  Clock, 
  MapPin, 
  Check, 
  AlertCircle
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useFirebase } from '../context/FirebaseContext';
import { voiceCore } from '../services/voiceService';
import { centralAgent } from '../services/centralAgentService';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'add_to_cart' | 'reserve' | 'view_menu';
    label: string;
    item?: any;
  };
}

export default function AIChatSurface() {
  const { setActiveSection, setReservationOpen, setCartOpen } = useNavigation();
  const { language, t } = useLanguage();
  const { addToCart } = useCart();
  const { user, profile } = useFirebase();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: language === 'ur'
        ? "السلام علیکم صاحب! میں ساقی ہوں، کوئٹہ محفل چائے خانہ کا اے آئی میزبان۔ آپ کے لیے گرما گرم کڑک چائے لائیں یا لچھا پراٹھا؟"
        : "Assalamu Alaikum! I am Saki, your AI host at Quetta Mahfil Chai Khana. How may I serve you today? Ask me for slow-simmered chai, tawa parathas, or table bookings.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [audioSpeechMuted, setAudioSpeechMuted] = useState<boolean>(() => {
    return localStorage.getItem('mahfil_ai_speech') === 'false';
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isThinking, voiceTranscript]);

  const quickPrompts = [
    { label: "🍵 Matka Zafrani Chai", prompt: "Tell me about your Matka Zafrani Chai and add one to my bag" },
    { label: "🫓 Desi Ghee Parathas", prompt: "What are your top crispy parathas right now?" },
    { label: "🪑 Book a Chaarpai", prompt: "I would like to book a traditional outdoor chaarpai for tonight" },
    { label: "📍 Bahria Delivery Time", prompt: "How fast is delivery to Sector C Bahria Town?" },
  ];

  const handleVoiceToggle = () => {
    if (isListening) {
      voiceCore.stopListening();
      setIsListening(false);
      if (voiceTranscript.trim()) {
        handleSubmitMessage(voiceTranscript);
      }
    } else {
      setVoiceTranscript('');
      setIsListening(true);
      triggerHaptic('medium');
      voiceCore.startListening({
        language: language === 'ur' ? 'ur-PK' : 'en-US',
        onTranscript: (text, isFinal) => {
          setVoiceTranscript(text);
          if (isFinal) {
            voiceCore.stopListening();
            setIsListening(false);
            handleSubmitMessage(text);
          }
        },
        onError: () => {
          setIsListening(false);
          setErrorState('Microphone connection interrupted. Tap to retry.');
        }
      });
    }
  };

  const handleSubmitMessage = async (rawText?: string) => {
    const textToSend = (rawText || inputVal).trim();
    if (!textToSend || isThinking) return;

    setInputVal('');
    setVoiceTranscript('');
    setErrorState(null);
    triggerHaptic('light');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    // Contextual triggers
    const lower = textToSend.toLowerCase();
    let suggestedAction: ChatMessage['suggestedAction'] = undefined;

    if (lower.includes('zafrani') || lower.includes('chai') || lower.includes('tea')) {
      suggestedAction = {
        type: 'add_to_cart',
        label: 'Add Matka Zafrani Chai (PKR 220)',
        item: {
          id: 'sig-zafrani',
          name: 'Matka Zafrani Chai',
          category: 'Tea & Kehwa',
          price: 220,
          image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=0.8&w=800'
        }
      };
    } else if (lower.includes('paratha') || lower.includes('lacha')) {
      suggestedAction = {
        type: 'add_to_cart',
        label: 'Add Desi Ghee Lacha Paratha (PKR 160)',
        item: {
          id: 'sig-lacha',
          name: 'Desi Ghee Lacha Paratha',
          category: 'Chat Pata Paratha',
          price: 160,
          image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=0.8&w=800'
        }
      };
    } else if (lower.includes('reserve') || lower.includes('booking') || lower.includes('table') || lower.includes('chaarpai')) {
      suggestedAction = {
        type: 'reserve',
        label: 'Open Table Reservation Form'
      };
    }

    try {
      const token = user ? await user.getIdToken() : undefined;
      const agentRes = await centralAgent.interact({
        message: textToSend,
        modality: rawText ? 'voice' : 'text',
        context: {
          userName: user?.displayName || 'Mahfil Guest',
          userEmail: user?.email || undefined,
          userRole: profile?.role || 'customer'
        },
        authToken: token
      });

      const replyText = agentRes.reply || "Assalamu Alaikum Sahib! Saki is always honored to host you at Quetta Mahfil.";
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Voice Audio Response if enabled
      if (!audioSpeechMuted) {
        const speechContent = agentRes.audioText || replyText;
        centralAgent.speak(speechContent, language === 'ur' ? 'ur' : 'en');
      }
    } catch (err) {
      console.warn('Saki communication error:', err);
      const fallbackMsg: ChatMessage = {
        id: `asst-fallback-${Date.now()}`,
        role: 'assistant',
        text: "Sahib, our clay tandoor is running at full flame! Our signature Zafrani Doodh Patti and freshly turned Desi Ghee Parathas are ready to order.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: {
          type: 'view_menu',
          label: 'Explore Full Menu Catalog'
        }
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleActionClick = (action: ChatMessage['suggestedAction']) => {
    if (!action) return;
    triggerHaptic('medium');
    if (action.type === 'add_to_cart' && action.item) {
      addToCart(action.item);
      setCartOpen(true);
    } else if (action.type === 'reserve') {
      setReservationOpen(true);
    } else if (action.type === 'view_menu') {
      setActiveSection('menu');
    }
  };

  const handlePlaySpeech = (text: string) => {
    triggerHaptic('light');
    centralAgent.speak(text, language === 'ur' ? 'ur' : 'en');
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-6rem)] bg-[#FAF8F5] dark:bg-[#141210] border-x border-stone-200/60 dark:border-stone-800/60 shadow-xs overflow-hidden">
      {/* 1. App-Style Focused Header */}
      <header className="p-3.5 md:p-4 bg-white dark:bg-[#1A1714] border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shadow-sm">
            <Coffee size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100">
                Saki • AI Khidmatgar
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Live Kitchen Sync
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-urdu leading-none mt-0.5">
              کوئٹہ محفل کا ہمہ وقت حاضر میزبان
            </p>
          </div>
        </div>

        {/* Audio Mute Toggle & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !audioSpeechMuted;
              setAudioSpeechMuted(next);
              localStorage.setItem('mahfil_ai_speech', String(!next));
              triggerHaptic('light');
            }}
            className={cn(
              "p-2 rounded-xl border text-xs transition-colors flex items-center gap-1.5",
              !audioSpeechMuted
                ? "bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/30"
                : "bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700"
            )}
            title={audioSpeechMuted ? "Enable voice audio playback" : "Mute voice playback"}
          >
            {audioSpeechMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span className="text-[11px] font-medium hidden sm:inline">
              {audioSpeechMuted ? "Audio Muted" : "Audio On"}
            </span>
          </button>

          <button
            onClick={() => {
              setMessages([messages[0]]);
              triggerHaptic('light');
            }}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-500 dark:text-stone-400 transition-colors"
            title="Reset Chat Session"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* 2. Message Stream Surface */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar overscroll-contain"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col gap-1 max-w-[88%] sm:max-w-[80%]",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className="flex items-end gap-2">
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/20 flex items-center justify-center flex-shrink-0 mb-1">
                  <Coffee size={14} />
                </div>
              )}

              <div
                className={cn(
                  "p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-xs",
                  msg.role === 'user'
                    ? "bg-[#C85A32] text-white rounded-br-xs font-medium"
                    : "bg-white dark:bg-[#1F1B17] text-stone-800 dark:text-stone-100 border border-stone-200/80 dark:border-stone-800/80 rounded-bl-xs"
                )}
              >
                {msg.text}

                {/* Suggested Action Card inside Assistant Bubble */}
                {msg.suggestedAction && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-stone-700/60">
                    <button
                      onClick={() => handleActionClick(msg.suggestedAction)}
                      className="w-full px-3 py-2 rounded-xl bg-[#C85A32] hover:bg-[#b04a25] text-white text-xs font-semibold shadow-xs flex items-center justify-between gap-2 transition-all"
                    >
                      <span className="truncate">{msg.suggestedAction.label}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Message Meta / Audio replay */}
            <div className="flex items-center gap-2 px-1 text-[10px] text-stone-400 font-mono">
              <span>{msg.timestamp}</span>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handlePlaySpeech(msg.text)}
                  className="hover:text-[#C85A32] transition-colors flex items-center gap-0.5"
                  title="Replay Voice"
                >
                  <Volume2 size={11} />
                  <span>Listen</span>
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {/* Live Voice Recording Status */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 flex items-center gap-3 text-xs"
          >
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <div className="flex-1">
              <p className="font-semibold">Listening to your voice...</p>
              <p className="text-[11px] italic text-red-600/80 dark:text-red-300">
                {voiceTranscript || "Speak Urdu or English (e.g., 'Do Zafrani chai bhej dein')..."}
              </p>
            </div>
            <button
              onClick={handleVoiceToggle}
              className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px]"
            >
              Done
            </button>
          </motion.div>
        )}

        {/* Saki Thinking Indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-3 text-stone-400 text-xs italic"
          >
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>Saki is crafting your recommendation...</span>
          </motion.div>
        )}

        {/* Error / Retry Bar */}
        {errorState && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{errorState}</span>
            </div>
            <button
              onClick={() => handleSubmitMessage(inputVal)}
              className="font-bold underline text-xs ml-2"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* 3. Quick Action Chips Carousel */}
      <div className="px-3 py-2 bg-stone-100/70 dark:bg-[#181512] border-t border-stone-200/70 dark:border-stone-800 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSubmitMessage(q.prompt)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#221E1A] border border-stone-200 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:border-[#C85A32] hover:text-[#C85A32] transition-colors whitespace-nowrap flex-shrink-0 shadow-2xs"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* 4. Keyboard & Safe-Area Aware Composer */}
      <div className="p-3 bg-white dark:bg-[#1A1714] border-t border-stone-200 dark:border-stone-800 flex-shrink-0 safe-bottom-nav">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitMessage();
          }}
          className="flex items-center gap-2 bg-stone-100 dark:bg-[#12100E] rounded-2xl p-1.5 border border-stone-200 dark:border-stone-800 focus-within:border-[#C85A32] transition-colors"
        >
          {/* Voice Switch Button */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "text-stone-500 hover:text-[#C85A32] hover:bg-stone-200/60 dark:hover:bg-stone-800"
            )}
            title={isListening ? "Stop Listening" : "Tap to Speak (Urdu or English)"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={isListening ? "Listening to your voice..." : "Ask Saki (e.g. 'What is special today?')..."}
            className="flex-1 bg-transparent text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none px-2"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputVal.trim() || isThinking}
            className="w-10 h-10 rounded-xl bg-[#C85A32] hover:bg-[#b04a25] disabled:opacity-30 text-white flex items-center justify-center transition-all flex-shrink-0 shadow-xs"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

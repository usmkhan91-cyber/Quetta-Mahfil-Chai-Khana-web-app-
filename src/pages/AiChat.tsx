import React, { useState, useEffect, useRef } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { centralAgent } from '../services/centralAgentService';
import { useMenu } from '../context/MenuContext';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Zap, User, Cpu, Sparkles, MessageSquare, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

export default function AiChat() {
  const { user, profile } = useFirebase();
  const { items } = useMenu();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, provider?: string }[]>([
    { 
      role: 'assistant', 
      content: "Assalamu Alaikum! I am Saki, your authoritative host at Quetta Mahfil Chai Khana. Powered by Google Gemini 3.8 intelligence, I can recommend custom tea blends, arrange private Hujra bookings, or assist with live orders. How can I serve you today, Sahib?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const quickPrompts = [
    "Recommend the best tea for a cold night",
    "What goes best with Desi Ghee Lacha Paratha?",
    "Book a traditional family Hujra for 6 guests tonight",
    "Tell me the story behind Peshawari Kehwa"
  ];

  const handleSpeak = async (text: string, index: number) => {
    if (speakingIndex !== null) return;
    setSpeakingIndex(index);
    triggerHaptic('light');
    try {
      await centralAgent.speak(text, 'ur');
    } finally {
      setTimeout(() => setSpeakingIndex(null), 3000);
    }
  };

  const handleSend = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMessage = (customMsg || input).trim();
    if (!userMessage || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    triggerHaptic('light');

    try {
      const response = await centralAgent.interact({
        message: userMessage,
        modality: 'text',
        history: messages.map(m => ({ role: m.role, content: m.content })),
        context: {
          userName: user?.displayName || 'Mahfil Guest',
          userEmail: user?.email || undefined,
          userRole: profile?.role || 'customer'
        }
      });

      if (response && response.reply) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.reply,
          provider: response.provider || 'gemini-3.8-flash'
        }]);
        triggerHaptic('medium');
      }
    } catch (error) {
       setMessages(prev => [...prev, { role: 'assistant', content: "Sahib, my neural connection is momentarily adjusting. Our Zafrani Chai is always brewing hot in Bahria Town." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-950">
      {/* Chat Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 p-0.5 shadow-[0_0_20px_#D4AF3744]">
               <div className="w-full h-full bg-black rounded-[calc(1rem-0.5px)] flex items-center justify-center">
                  <Sparkles size={24} className="text-amber-400 animate-pulse" />
               </div>
            </div>
            <div>
               <h2 className="text-xl font-display font-black italic tracking-tight uppercase text-white">Saki Cognitive Concierge</h2>
               <p className="text-[10px] uppercase font-black text-amber-400 tracking-[0.2em] flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" /> Powered by Google Gemini 3.8 Intelligence
               </p>
            </div>
         </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 no-scrollbar scroll-smooth"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex items-start gap-4 max-w-3xl",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1",
                m.role === 'assistant' ? "bg-[#C85A32] text-white" : "bg-white/10 text-white"
              )}>
                {m.role === 'assistant' ? <Sparkles size={18} /> : <User size={18} />}
              </div>
              <div className={cn(
                "p-5 rounded-3xl text-sm md:text-base leading-relaxed relative group",
                m.role === 'assistant' 
                  ? "bg-stone-900 border border-white/5 text-stone-100" 
                  : "bg-[#C85A32] text-white font-medium shadow-lg"
              )}>
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-stone-400">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400/80">
                      {m.provider ? `Engine: ${m.provider}` : 'Google Gemini 3.8'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSpeak(m.content, i)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-stone-400 hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px]"
                      title="Speak with Gemini TTS"
                    >
                      <Volume2 size={14} className={cn(speakingIndex === i && "text-amber-400 animate-pulse")} />
                      <span>{speakingIndex === i ? "Speaking..." : "Listen"}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 mr-auto"
            >
               <div className="w-10 h-10 rounded-xl bg-[#C85A32] text-white flex items-center justify-center">
                  <Sparkles size={18} className="animate-spin" />
               </div>
               <div className="flex gap-1.5 p-4 bg-stone-900 rounded-2xl border border-white/5">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-6 md:px-10 pb-2 overflow-x-auto no-scrollbar flex items-center gap-2">
        {quickPrompts.map((qp) => (
          <button
            key={qp}
            type="button"
            onClick={() => handleSend(undefined, qp)}
            disabled={isTyping}
            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles size={11} className="text-amber-400" />
            <span>{qp}</span>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-6 md:p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
           <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
           <input 
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder="Discuss flavors, poetry, custom orders, or table bookings..."
             className="w-full pl-6 pr-16 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all font-medium text-sm md:text-base text-white placeholder-stone-400"
           />
           <button 
             type="submit"
             disabled={!input.trim() || isTyping}
             className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-[#C85A32] to-[#D9943B] text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
           >
              <Send size={18} />
           </button>
        </form>
        <div className="mt-3 flex items-center justify-center gap-6 opacity-30 text-[10px] font-black uppercase tracking-widest text-stone-400">
           <span className="flex items-center gap-1.5 font-bold"><Sparkles size={11} className="text-amber-400" /> Multi-Step Tool Pipeline Active</span>
           <span className="flex items-center gap-1.5 font-bold"><Zap size={11} className="text-amber-400" /> Server-Authoritative Reasoning</span>
        </div>
      </div>
    </div>
  );
}

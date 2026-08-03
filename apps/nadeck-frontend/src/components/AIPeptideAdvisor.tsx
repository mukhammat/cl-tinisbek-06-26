import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { Bot, X, Send, Sparkles, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MARKET } from '../market';

// Same manager number the cart hands the order template to (see CartView).
const WHATSAPP_NUMBER = '+77070222312';

interface AIPeptideAdvisorProps {
  currentLang: Language;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AIPeptideAdvisor({ currentLang }: AIPeptideAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const welcomeMsgs: Record<Language, string> = {
      ru: 'Привет! Я ваш персональный AI-консультант Nadeck. Я могу помочь вам рассчитать дозировку, подсказать схемы разведения (разбавления) пептидов или порекомендовать препараты для восстановления, суставов или контроля веса. О чем вы хотите узнать?',
      en: 'Hello! I am your Nadeck AI Consultant. I can help you calculate dosages, understand reconstitution patterns, or recommend the best peptides for healing, weight loss, or anti-aging. What would you like to discuss?',
      ar: 'مرحباً! أنا مستشارك الطبي الذكي لشركة Nadeck. يمكنني مساعدتك في حساب الجرعات، وتوضيح كيفية تمديد الببتيدات، أو تقديم توصيات حول الببتيدات المناسبة للاستشفاء، فقدان الوزن، أو تجديد الخلايا. كيف يمكنني مساعدتك اليوم؟'
    };
    return [
      {
        role: 'assistant',
        text: welcomeMsgs[currentLang] || welcomeMsgs['en']
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const russianSuggestions = [
    'Как разводить Semaglutide?',
    'Пептиды для суставов и связок',
    'Как правильно дозировать Melanotan II?',
    'Какая дозировка у BPC-157?'
  ];

  const englishSuggestions = [
    'How to dilute Semaglutide?',
    'Best peptides for joint repair',
    'Melanotan II correct dosage guide',
    'BPC-157 daily reconstitution'
  ];

  const arabicSuggestions = [
    'كيف يتم تمديد السيماجلوتايد؟',
    'أفضل الببتيدات لإصلاح المفاصل والأربطة',
    'ما هي الجرعة الصحيحة لميلانوتان ٢؟',
    'كيفية استخدام ببتيد BPC-157 يومياً؟'
  ];

  const suggestions = currentLang === 'ru' 
    ? russianSuggestions 
    : currentLang === 'ar' 
    ? arabicSuggestions 
    : englishSuggestions;

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages
        })
      });

      if (!res.ok) {
        throw new Error('Chat API returned an error');
      }

      const data = await res.json();
      const reply = data.reply?.trim();
      // No reliable answer - stay silent instead of showing an "I don't know" message.
      if (!reply) return;

      const assistantMsg: ChatMessage = { role: 'assistant', text: reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errMsgs: Record<Language, string> = {
        ru: 'Извините, не удалось подключиться к AI-консультанту. Пожалуйста, попробуйте позже.',
        en: 'Apologies, failed to connect to the AI Consultant. Please try again soon.',
        ar: 'معذرة، فشل الاتصال بمستشار الذكاء الاصطناعي. يرجى المحاولة لاحقاً.'
      };
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: errMsgs[currentLang] || errMsgs['en'] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="ai-advisor-root">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-advisor-window"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 sm:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-nadeck-700 to-slate-900 text-white flex items-center justify-between shadow-md relative shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-nadeck-500/10 border border-nadeck-400/25 rounded-xl flex items-center justify-center text-nadeck-300">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold tracking-tight">
                    {currentLang === 'ru' ? 'AI Пептидный Помощник' : currentLang === 'ar' ? 'مستشار الببتيد الذكي' : 'AI Peptide Advisor'}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-nadeck-300 font-bold uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <button
                id="btn-close-ai-chat"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60" id="ai-chat-body">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  id={`chat-msg-row-${idx}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-nadeck-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start" id="ai-chat-loader">
                  <div className="bg-white text-slate-500 border border-slate-100 rounded-2xl rounded-bl-none px-4 py-2.5 shadow-sm text-xs flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-nadeck-500" />
                    <span>{currentLang === 'ru' ? 'AI печатает...' : currentLang === 'ar' ? 'المستشار يكتب...' : 'AI is thinking...'}</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0 max-h-24 overflow-y-auto" id="chat-suggestions">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 transition truncate max-w-[240px]"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center shrink-0"
              id="ai-chat-footer"
            >
              <input
                id="ai-chat-input-text"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  currentLang === 'ru' 
                    ? 'Спросить у AI-помощника...' 
                    : currentLang === 'ar' 
                    ? 'اسأل المستشار الذكي...' 
                    : 'Ask our AI Peptide Advisor...'
                }
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-nadeck-500 focus:bg-white text-slate-800"
              />
              <button
                id="btn-send-ai-chat"
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-nadeck-600 hover:bg-nadeck-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Button - nadeck.net only; the 'ar' market has its own manager line */}
      {MARKET === 'main' && (
        <motion.a
          id="btn-whatsapp-launcher"
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 mb-4 bg-gradient-to-tr from-[#25D366] to-[#5BF07F] text-white rounded-full shadow-2xl border border-white/20 flex items-center justify-center relative cursor-pointer"
          aria-label="WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24Zm-3.2 4.4c-.15 0-.4.06-.6.29-.21.22-.8.78-.8 1.9s.82 2.2.93 2.35c.12.15 1.6 2.44 3.88 3.42.54.24.96.38 1.29.48.54.17 1.04.15 1.43.09.43-.06 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.06-.09-.21-.15-.44-.26-.22-.12-1.34-.66-1.55-.74-.21-.07-.36-.11-.51.12-.15.22-.58.73-.71.88-.13.15-.26.17-.49.06-.22-.12-.95-.35-1.81-1.12a6.8 6.8 0 0 1-1.25-1.56c-.13-.22-.02-.34.1-.46.1-.1.22-.26.33-.4.11-.14.15-.23.22-.38.08-.15.04-.29-.02-.4-.06-.12-.51-1.24-.7-1.69-.18-.44-.37-.38-.51-.39l-.44-.01Z" />
          </svg>
        </motion.a>
      )}

      {/* Telegram Button */}
      <motion.a
        id="btn-telegram-launcher"
        href="https://t.me/+iN29UxUYCsM4ZTNk"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 mb-4 bg-gradient-to-tr from-[#229ED9] to-[#2AABEE] text-white rounded-full shadow-2xl border border-white/20 flex items-center justify-center relative cursor-pointer"
        aria-label="Telegram"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M21.94 4.6 18.68 20.1c-.24 1.1-.9 1.37-1.82.85l-5.03-3.71-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.16 9.4-8.5c.41-.36-.09-.56-.63-.2L6.7 12.62l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6L20.6 3.36c.9-.33 1.69.22 1.34 1.24Z" />
        </svg>
      </motion.a>

      {/* Launcher Button */}
      <motion.button
        id="btn-ai-chat-launcher"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-nadeck-600 to-slate-900 hover:from-nadeck-500 hover:to-slate-800 text-white rounded-full shadow-2xl border border-nadeck-500/20 flex items-center justify-center relative cursor-pointer"
      >
        <div className="absolute inset-0 rounded-full bg-nadeck-400/10 animate-ping pointer-events-none" />
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}


import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../translations';

export type LanguageMode = 'en' | 'ur' | 'auto';

interface LanguageContextType {
  language: Language;
  languageMode: LanguageMode;
  setLanguage: (lang: Language) => void;
  setLanguageMode: (mode: LanguageMode) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [languageMode, setLanguageModeState] = useState<LanguageMode>(() => {
    const saved = localStorage.getItem('mahfil_language_mode');
    return (saved as LanguageMode) || 'auto';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const savedMode = localStorage.getItem('mahfil_language_mode') as LanguageMode;
    if (savedMode === 'ur' || savedMode === 'en') return savedMode;
    if (typeof window !== 'undefined' && navigator.language) {
      const userLang = navigator.language.toLowerCase();
      if (userLang.startsWith('ur') || userLang.includes('pk')) return 'ur';
    }
    const saved = localStorage.getItem('mahfil-lang') as Language;
    return saved || 'en';
  });

  useEffect(() => {
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('mahfil-lang', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageModeState(lang);
    localStorage.setItem('mahfil_language_mode', lang);
    setLanguageState(lang);
  };

  const setLanguageMode = (mode: LanguageMode) => {
    setLanguageModeState(mode);
    localStorage.setItem('mahfil_language_mode', mode);
    if (mode === 'auto') {
      const userLang = (typeof window !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : 'en';
      const resolved = (userLang.startsWith('ur') || userLang.includes('pk')) ? 'ur' : 'en';
      setLanguageState(resolved);
    } else {
      setLanguageState(mode);
    }
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, languageMode, setLanguage, setLanguageMode, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

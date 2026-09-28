import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome to Mahfil",
      "slogan": "Where Heritage Meets the Future",
      "order_online": "Order Online",
      "explore_menu": "Explore Menu",
      "recommended": "Recommended for You",
      "search_placeholder": "Search for your favorite flavors...",
      "chatbot_greeting": "Asalam-o-Alaikum! How can I help you tonight?",
      "voice_listening": "Listening...",
      "profile": "Profile",
      "logout": "Sign Out",
      "auth_google": "Google Access"
    }
  },
  ur: {
    translation: {
      "welcome": "محفل میں خوش آمدید",
      "slogan": "جہاں روایت مستقبل سے ملتی ہے",
      "order_online": "آن لائن آرڈر کریں",
      "explore_menu": "مینو دیکھیں",
      "recommended": "آپ کے لیے بہترین",
      "search_placeholder": "اپنے پسندیدہ ذائقے تلاش کریں...",
      "chatbot_greeting": "اسلام علیکم! میں آج آپ کی کیا مدد کر سکتا ہوں؟",
      "voice_listening": "سن رہا ہوں...",
      "profile": "پروفائل",
      "logout": "لاگ آؤٹ",
      "auth_google": "گوگل سے لاگ ان"
    }
  },
  bh: { // Bhojpuri (Sample)
    translation: {
      "welcome": "محفل میں استقبال کا",
      "slogan": "جاہاں ورثہ بھویشیہ سے ملاقات کرے لا",
      "order_online": "آن لائن آرڈر کرو",
      "explore_menu": "مینو دیکھی",
      "recommended": "توہر خاطر خاص",
      "search_placeholder": "کچھؤ کھوجی...",
      "chatbot_greeting": "پرنام! ہم توہر کا مدد کر سکب؟",
      "voice_listening": "سن تانی...",
      "profile": "پروفائل",
      "logout": "باہر نکلی",
      "auth_google": "گوگل پہنچ"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

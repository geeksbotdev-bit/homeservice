import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ur' | 'roman';

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
  { code: 'roman', label: 'Roman Urdu', native: 'Roman Urdu' },
];

const KEY = 'hs_lang';

// English string → its Urdu / Roman-Urdu translations. Missing entries fall
// back to the English key, so new UI keeps working before it's translated.
const DICT: Record<string, { ur?: string; roman?: string }> = {
  // Tabs
  'Home': { ur: 'ہوم', roman: 'Home' },
  'Bookings': { ur: 'بکنگز', roman: 'Bookings' },
  'Messages': { ur: 'پیغامات', roman: 'Messages' },
  'Profile': { ur: 'پروفائل', roman: 'Profile' },
  // Profile sections & settings
  'Saved Addresses': { ur: 'محفوظ پتے', roman: 'Saved Addresses' },
  'Payment Methods': { ur: 'ادائیگی کے طریقے', roman: 'Payment Methods' },
  'Preferred Cleaners': { ur: 'پسندیدہ کلینرز', roman: 'Pasandeeda Cleaners' },
  'Notifications': { ur: 'اطلاعات', roman: 'Notifications' },
  'Language': { ur: 'زبان', roman: 'Zaban' },
  'Help & Support': { ur: 'مدد و معاونت', roman: 'Madad o Muawanat' },
  'Terms & Privacy': { ur: 'شرائط و رازداری', roman: 'Terms & Privacy' },
  'Add': { ur: 'شامل کریں', roman: 'Add' },
  'Switch to Cleaner mode': { ur: 'کلینر موڈ پر جائیں', roman: 'Cleaner mode par jayen' },
  'Switch to Customer mode': { ur: 'کسٹمر موڈ پر جائیں', roman: 'Customer mode par jayen' },
  'Log Out': { ur: 'لاگ آؤٹ', roman: 'Log Out' },
  'Switching…': { ur: 'تبدیل ہو رہا ہے…', roman: 'Switch ho raha hai…' },
  // Common actions
  'Book Now': { ur: 'ابھی بک کریں', roman: 'Abhi Book Karein' },
  'Choose Language': { ur: 'زبان منتخب کریں', roman: 'Zaban Muntakhib Karein' },
  'Select your preferred language': { ur: 'اپنی پسندیدہ زبان منتخب کریں', roman: 'Apni pasandeeda zaban chunein' },
};

function loadInitial(): Lang {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(KEY) as Lang | null;
      if (v === 'en' || v === 'ur' || v === 'roman') return v;
    }
  } catch { /* ignore */ }
  return 'en';
}

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }
const LangContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadInitial);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, l); } catch { /* ignore */ }
  };

  useEffect(() => { /* lang persisted in setLang */ }, [lang]);

  const t = (key: string) => {
    if (lang === 'en') return key;
    return DICT[key]?.[lang] ?? key;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }

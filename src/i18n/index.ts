import { create } from 'zustand';
import { translations, SupportedLocale, TranslationKey } from './translations';

interface I18nState {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: TranslationKey) => string;
}

const getInitialLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') return 'uz';
  const saved = localStorage.getItem('ilmhub_locale') as SupportedLocale;
  if (saved && (saved === 'en' || saved === 'ru' || saved === 'uz')) {
    return saved;
  }
  const browserLang = navigator.language?.toLowerCase() || '';
  if (browserLang.startsWith('uz')) return 'uz';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('en')) return 'en';
  return 'uz';
};

export const useI18n = create<I18nState>((set, get) => ({
  locale: getInitialLocale(),
  setLocale: (locale: SupportedLocale) => {
    try {
      localStorage.setItem('ilmhub_locale', locale);
    } catch {}
    set({ locale });
  },
  t: (key: TranslationKey): string => {
    const locale = get().locale;
    const localized = translations[locale]?.[key];
    if (localized) return localized;
    return translations.en[key] || key;
  },
}));

// Dev-time check ensuring all three languages have 100% key parity
if (process.env.NODE_ENV !== 'production') {
  const enKeys = Object.keys(translations.en) as TranslationKey[];
  const ruKeys = Object.keys(translations.ru) as TranslationKey[];
  const uzKeys = Object.keys(translations.uz) as TranslationKey[];

  const missingRu = enKeys.filter((k) => !ruKeys.includes(k));
  const missingUz = enKeys.filter((k) => !uzKeys.includes(k));

  if (missingRu.length > 0) {
    console.warn('[i18n] Missing keys in RU:', missingRu);
  }
  if (missingUz.length > 0) {
    console.warn('[i18n] Missing keys in UZ:', missingUz);
  }
}

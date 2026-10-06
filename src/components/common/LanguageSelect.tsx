import React from 'react';
import { useI18n } from '../../i18n';
import { SupportedLocale } from '../../i18n/translations';
import { Globe } from 'lucide-react';

export const LanguageSelect: React.FC = () => {
  const { locale, setLocale } = useI18n();

  const options: { code: SupportedLocale; label: string }[] = [
    { code: 'uz', label: 'UZ' },
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-full border border-slate-200 dark:border-slate-700/60 shadow-xs text-xs font-semibold">
      <div className="pl-2 pr-1 text-slate-400">
        <Globe className="w-3.5 h-3.5" />
      </div>
      {options.map((opt) => (
        <button
          key={opt.code}
          onClick={() => setLocale(opt.code)}
          aria-label={`Select ${opt.label} language`}
          className={`px-2.5 py-1 rounded-full transition-all duration-200 ${
            locale === opt.code
              ? 'bg-amber-400 dark:bg-yellow-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

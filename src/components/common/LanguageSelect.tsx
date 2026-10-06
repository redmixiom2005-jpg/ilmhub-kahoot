import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { SupportedLocale } from '../../i18n/translations';
import { Globe, Check, ChevronDown } from 'lucide-react';

export const LanguageSelect: React.FC = () => {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { code: SupportedLocale; shortLabel: string; fullLabel: string }[] = [
    { code: 'uz', shortLabel: 'UZ', fullLabel: 'O‘zbekcha' },
    { code: 'uz-cyr', shortLabel: 'ЎЗ', fullLabel: 'Ўзбекча' },
    { code: 'ru', shortLabel: 'RU', fullLabel: 'Русский' },
    { code: 'en', shortLabel: 'EN', fullLabel: 'English' },
  ];

  const currentOpt = options.find((o) => o.code === locale) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-[#0B1730]/90 hover:bg-slate-100 dark:hover:bg-[#102044] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#FFC928]"
      >
        <Globe className="w-3.5 h-3.5 text-[#0757D9] dark:text-[#FFC928]" />
        <span>{currentOpt.shortLabel}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-2xl bg-white dark:bg-[#0B1730] border border-slate-200 dark:border-white/10 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Til / Язык / Language
          </div>
          {options.map((opt) => {
            const isSelected = locale === opt.code;
            return (
              <button
                key={opt.code}
                onClick={() => {
                  setLocale(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors ${
                  isSelected
                    ? 'bg-[#0757D9]/10 text-[#0757D9] dark:bg-[#FFC928]/15 dark:text-[#FFC928] font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 font-bold text-[11px] opacity-75">{opt.shortLabel}</span>
                  <span>{opt.fullLabel}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#0757D9] dark:text-[#FFC928]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { useI18n } from '../../i18n';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#071A3D]/70 py-8 px-4 text-xs text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Logo size="sm" showTagline={false} />
          <span className="hidden sm:inline text-slate-300 dark:text-white/20">|</span>
          <span className="font-semibold text-[#0757D9] dark:text-[#FFC928]">
            {t('brandSlogan')}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>&copy; {new Date().getFullYear()} ILMHUB KAHOOT.</span>
          <span>•</span>
          <span>{t('brandTagline')}</span>
        </div>
      </div>
    </footer>
  );
};

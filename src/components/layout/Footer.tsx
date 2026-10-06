import React from 'react';
import { useI18n } from '../../i18n';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 font-medium">
          <span>Ilmhub Kahoot</span>
          <span>•</span>
          <span>{t('brandTagline')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Crafted with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>for educators and students</span>
        </div>
      </div>
    </footer>
  );
};

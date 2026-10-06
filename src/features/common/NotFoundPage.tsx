import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Logo } from '../../components/common/Logo';
import { Home, Sparkles } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center p-6 text-center selection:bg-[#FFC928]">
      <div className="mb-6">
        <Logo size="lg" showTagline={false} />
      </div>
      <span className="text-8xl font-black text-[#0757D9] dark:text-[#FFC928] mb-2 drop-shadow-sm">
        404
      </span>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
        Sahifa topilmadi
      </h1>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
        Siz qidirayotgan sahifa yoki viktorina mavjud emas yoki boshqa manzilga ko‘chirilgan.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-black text-sm shadow-lg shadow-[#0757D9]/25 transition-all active:scale-95"
      >
        <Home className="w-4 h-4" />
        <span>{t('navHome')}</span>
      </Link>
    </div>
  );
};

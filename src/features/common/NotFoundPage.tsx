import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Logo } from '../../components/common/Logo';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <span className="text-7xl font-black text-amber-500 dark:text-yellow-400 mb-2">
        404
      </span>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        The page or quiz you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95"
      >
        <Home className="w-4 h-4" />
        <span>{t('home')}</span>
      </Link>
    </div>
  );
};

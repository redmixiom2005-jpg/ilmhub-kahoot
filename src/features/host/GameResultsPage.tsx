import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { ArrowLeft, Trophy, Download, Home } from 'lucide-react';

export const GameResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 selection:bg-[#FFC928]">
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/host"
          className="p-2.5 rounded-2xl bg-white dark:bg-[#0B1730] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#102044] border border-slate-200 dark:border-white/10 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {t('fullLeaderboard')}
        </h1>
      </div>

      <div className="bg-white dark:bg-[#0B1730] rounded-3xl p-8 sm:p-12 border border-slate-200/90 dark:border-white/10 shadow-xl text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#FFC928]/20 text-[#071A3D] dark:text-[#FFC928] mx-auto flex items-center justify-center mb-6">
          <Trophy className="w-10 h-10" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          Game Session #{id}
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          {t('taglineSub')}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/host"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-black text-sm shadow-md transition-all active:scale-95"
          >
            <span>{t('returnToDashboard')}</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>{t('navHome')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

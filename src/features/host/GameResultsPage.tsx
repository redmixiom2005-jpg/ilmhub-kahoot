import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { ArrowLeft, Download, Trophy, Clock } from 'lucide-react';

export const GameResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/host"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {t('fullLeaderboard')}
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Game Session #{id}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Detailed player analytics and downloadable CSV reports are stored in this section.
        </p>
        <Link
          to="/host"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm shadow-sm"
        >
          <span>{t('returnToDashboard')}</span>
        </Link>
      </div>
    </div>
  );
};

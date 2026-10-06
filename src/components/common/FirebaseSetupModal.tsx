import React from 'react';
import { useI18n } from '../../i18n';
import { isFirebaseConfigured } from '../../lib/firebase';
import { Database, CheckCircle, ExternalLink, X, Info } from 'lucide-react';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 dark:bg-yellow-950/60 rounded-xl text-amber-600 dark:text-yellow-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('firebaseSetupTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('firebaseSetupDesc')}
            </p>
          </div>
        </div>

        {isFirebaseConfigured ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm mb-6">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{t('firebaseConfigured')}</span>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3 text-blue-900 dark:text-blue-300 text-sm mb-6">
            <Info className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">{t('demoMode')}</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                {t('firebaseMissingWarning')}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            {t('setupInstructions')}
          </h4>
          <ol className="list-decimal list-inside space-y-2 leading-relaxed">
            <li>{t('setupStep1')}</li>
            <li>{t('setupStep2')}</li>
            <li>{t('setupStep3')}</li>
          </ol>
          <div className="pt-2">
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-yellow-400 font-semibold hover:underline"
            >
              <span>Firebase Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 dark:bg-yellow-400 dark:hover:bg-yellow-300 text-slate-950 font-bold shadow-md transition-all active:scale-98"
          >
            {t('useDemoMode')}
          </button>
        </div>
      </div>
    </div>
  );
};

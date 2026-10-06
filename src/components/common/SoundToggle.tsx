import React from 'react';
import { useSoundStore } from '../../lib/audio';
import { Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '../../i18n';

export const SoundToggle: React.FC = () => {
  const { muted, toggleMuted } = useSoundStore();
  const { t } = useI18n();

  return (
    <button
      onClick={toggleMuted}
      aria-label={muted ? t('soundOff') : t('soundOn')}
      title={muted ? t('soundOff') : t('soundOn')}
      className={`p-2 rounded-full border shadow-xs transition-all hover:scale-105 active:scale-95 ${
        muted
          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border-rose-200 dark:border-rose-800'
          : 'bg-slate-100 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700/60'
      }`}
    >
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
};

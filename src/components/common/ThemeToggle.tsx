import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../../i18n';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useGameStore();
  const { t } = useI18n();

  return (
    <button
      onClick={toggleTheme}
      aria-label={t('theme')}
      title={t('theme')}
      className="p-2 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-yellow-400 border border-slate-200 dark:border-slate-700/60 hover:scale-105 active:scale-95 transition-all shadow-xs"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 fill-yellow-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-800 fill-slate-800" />
      )}
    </button>
  );
};

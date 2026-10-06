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
      className="p-2 rounded-xl bg-white/80 dark:bg-[#0B1730]/90 text-slate-700 dark:text-[#FFC928] border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#102044] transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FFC928]"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 fill-[#FFC928]" />
      ) : (
        <Moon className="w-4 h-4 text-[#071A3D] fill-[#071A3D]" />
      )}
    </button>
  );
};

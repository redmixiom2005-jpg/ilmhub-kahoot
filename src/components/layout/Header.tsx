import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { LanguageSelect } from '../common/LanguageSelect';
import { ThemeToggle } from '../common/ThemeToggle';
import { SoundToggle } from '../common/SoundToggle';
import { FirebaseSetupModal } from '../common/FirebaseSetupModal';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { isFirebaseConfigured, logoutUser } from '../../lib/firebase';
import { Database, LogOut, User, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { hostUser, setHostUser } = useGameStore();
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  const handleSignOut = async () => {
    await logoutUser();
    setHostUser(null);
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo size="md" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Database status indicator */}
            <button
              onClick={() => setShowFirebaseModal(true)}
              title={isFirebaseConfigured ? 'Firebase Active' : 'Demo / Local Mode'}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                isFirebaseConfigured
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-yellow-400 border-amber-200 dark:border-yellow-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isFirebaseConfigured ? 'Firebase' : 'Demo Mode'}</span>
            </button>

            {/* Host Dashboard Link / Host Auth */}
            {hostUser ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/host"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{hostUser.displayName || t('hostGame')}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  title={t('signOut')}
                  className="p-2 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/host"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{t('hostGame')}</span>
              </Link>
            )}

            <SoundToggle />
            <ThemeToggle />
            <LanguageSelect />
          </div>
        </div>
      </header>

      <FirebaseSetupModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
      />
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { LanguageSelect } from '../common/LanguageSelect';
import { ThemeToggle } from '../common/ThemeToggle';
import { SoundToggle } from '../common/SoundToggle';
import { FirebaseSetupModal } from '../common/FirebaseSetupModal';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import {
  logoutUser,
  subscribeConnectionStatus,
  ConnectionBadgeStatus,
} from '../../lib/firebase';
import {
  LogOut,
  User,
  Sparkles,
  Activity,
  Menu,
  X,
  Compass,
  Trophy,
  HelpCircle,
  Gamepad2,
  BookOpen,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { hostUser, setHostUser } = useGameStore();
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionBadgeStatus>('connecting');

  useEffect(() => {
    const unsub = subscribeConnectionStatus((status) => {
      setConnectionStatus(status);
    });
    return () => unsub();
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await logoutUser();
    setHostUser(null);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          label: t('connected'),
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
          dotClass: 'bg-emerald-500 animate-pulse',
        };
      case 'connecting':
        return {
          label: 'Connecting',
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',
          dotClass: 'bg-amber-500 animate-ping',
        };
      case 'offline':
        return {
          label: 'Offline',
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800',
          dotClass: 'bg-rose-500',
        };
      case 'missing-config':
        return {
          label: 'Setup',
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800',
          dotClass: 'bg-rose-500 animate-bounce',
        };
      default:
        return {
          label: 'Demo',
          badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800',
          dotClass: 'bg-blue-500',
        };
    }
  };

  const statusConfig = getStatusBadge();

  const navLinks = [
    { to: '/', label: t('navHome'), icon: Compass },
    { to: '/host', label: t('navQuizzes'), icon: BookOpen },
    { to: '/join', label: t('navGames'), icon: Gamepad2 },
    { to: '/host', label: t('navLeaderboard'), icon: Trophy },
    { to: '/#how-it-works', label: t('navHowItWorks'), icon: HelpCircle },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-white/10 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Logo size="md" showTagline={false} />

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'text-[#0757D9] dark:text-[#FFC928] bg-[#0757D9]/10 dark:bg-white/5'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#0757D9] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connection badge */}
            <button
              onClick={() => setShowFirebaseModal(true)}
              title="Firebase RTDB Connection Status"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all hover:scale-105 ${statusConfig.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
              <span>{statusConfig.label}</span>
              <Activity className="w-3 h-3 opacity-60" />
            </button>

            {/* Desktop Auth Controls */}
            {hostUser ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/host"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0757D9]/10 dark:bg-[#102044] text-[#0757D9] dark:text-[#FFC928] font-bold text-xs border border-[#0757D9]/20 dark:border-white/10 hover:bg-[#0757D9]/20 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{hostUser.displayName || t('navDashboard')}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  title={t('navLogout')}
                  className="p-2 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/host"
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#0757D9] dark:hover:text-white transition-colors"
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/host"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC928]" />
                  <span>{t('navGetStarted')}</span>
                </Link>
              </div>
            )}

            {/* Sound, Theme, Language Controls */}
            <SoundToggle />
            <ThemeToggle />
            <LanguageSelect />

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#071A3D]/95 backdrop-blur-xl px-4 py-5 shadow-2xl animate-in slide-in-from-top-3 duration-200">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-[#0757D9]/10 hover:text-[#0757D9] dark:hover:bg-white/5 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#0757D9] dark:text-[#FFC928]" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <div className="my-2 border-t border-slate-200 dark:border-white/10 pt-3">
                {hostUser ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/host"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0757D9]/10 dark:bg-white/5 text-sm font-bold text-[#0757D9] dark:text-[#FFC928]"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{hostUser.displayName || t('navDashboard')}</span>
                      </div>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('navLogout')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/host"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 rounded-xl bg-[#0757D9] text-white text-center font-bold text-sm shadow-md"
                    >
                      {t('navGetStarted')}
                    </Link>
                    <Link
                      to="/host"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2 rounded-xl text-center text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10"
                    >
                      {t('navLogin')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <FirebaseSetupModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
      />
    </>
  );
};

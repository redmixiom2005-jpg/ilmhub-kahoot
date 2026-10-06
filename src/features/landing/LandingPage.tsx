import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Logo } from '../../components/common/Logo';
import {
  Gamepad2,
  Sparkles,
  Zap,
  Globe2,
  Smartphone,
  Trophy,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { SAMPLE_QUIZZES } from '../../data/sampleQuizzes';
import { sound } from '../../lib/audio';

export const LandingPage: React.FC = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const cleanPin = pinInput.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setPinError(t('invalidPinError'));
      return;
    }
    setPinError('');
    navigate(`/join/${cleanPin}`);
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-10 sm:py-16 px-4 sm:px-6">
        {/* Soft Background Blur Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-yellow-400/10 dark:bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            <Logo size="xl" showTagline={false} clickable={false} />
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
            {t('brandTagline')}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-10">
            {t('taglineSub')}
          </p>

          {/* MAIN HERO ACTION: PIN INPUT (FIRST THING AS REQUESTED) */}
          <div className="max-w-md mx-auto mb-10">
            <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800/90 transform transition-all hover:shadow-2xl">
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 text-left">
                  {t('enterPin')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    placeholder={t('enterPinPlaceholder')}
                    className="w-full px-5 py-4 text-center text-3xl sm:text-4xl tracking-widest font-black rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 focus:border-amber-400 dark:focus:border-yellow-400 focus:outline-none transition-all placeholder:text-slate-400 placeholder:text-xl placeholder:font-normal"
                    autoFocus
                  />
                  {pinInput.length === 6 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {pinError && (
                  <p className="text-sm font-medium text-rose-500 dark:text-rose-400 text-left">
                    {pinError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg sm:text-xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="w-6 h-6" />
                  <span>{t('joinButton')}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Host CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('createOwnQuiz')}
            </span>
            <Link
              to="/host"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>{t('hostCTA')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-900 dark:text-white mb-8">
          {t('featuresTitle')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature1Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature1Desc')}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 hover:border-yellow-400/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-yellow-950/60 text-amber-600 dark:text-yellow-400 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature2Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature2Desc')}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-400/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature3Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature3Desc')}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature4Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature4Desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

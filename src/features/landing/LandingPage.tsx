import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Logo } from '../../components/common/Logo';
import {
  Gamepad2,
  Sparkles,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  Flame,
  HelpCircle,
  Zap,
  Globe2,
  Smartphone,
  Play,
  QrCode,
} from 'lucide-react';
import { sound } from '../../lib/audio';

export const LandingPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [selectedMockAnswer, setSelectedMockAnswer] = useState<number | null>(0);

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
    <div className="min-h-[calc(100dvh-5rem)] flex flex-col justify-between selection:bg-[#FFC928] selection:text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:py-20 px-4 sm:px-6">
        {/* Soft Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-[#0757D9]/15 dark:bg-[#1769FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-[#FFC928]/15 dark:bg-[#FFC928]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          {/* Top Brand Slogan Pill */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0757D9]/10 dark:bg-[#102044] border border-[#0757D9]/20 dark:border-white/10 text-xs font-bold text-[#0757D9] dark:text-[#FFC928] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC928]" />
              <span>{t('brandSlogan')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading, Subtitle, CTAs & Quick PIN */}
            <div className="lg:col-span-6 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6">
                <span>{t('heroHeading')}</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                {t('heroSubtitle')}
              </p>

              {/* Main CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
                <Link
                  to="/host"
                  onClick={() => sound.playClick()}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-black text-base shadow-lg shadow-[#0757D9]/25 hover:shadow-xl hover:shadow-[#0757D9]/35 active:scale-98 transition-all flex items-center justify-center gap-2.5"
                >
                  <Sparkles className="w-5 h-5 text-[#FFC928]" />
                  <span>{t('createQuizCTA')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/join"
                  onClick={() => sound.playClick()}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-[#0B1730] hover:bg-slate-50 dark:hover:bg-[#102044] text-[#071A3D] dark:text-white font-extrabold text-base border-2 border-slate-200 dark:border-white/10 shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="w-5 h-5 text-[#0757D9] dark:text-[#FFC928]" />
                  <span>{t('joinGameCTA')}</span>
                </Link>
              </div>

              {/* Quick PIN Input Card on Landing */}
              <div className="max-w-md mx-auto lg:mx-0 bg-white/90 dark:bg-[#0B1730]/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-xl border border-slate-200/90 dark:border-white/10">
                <form onSubmit={handleJoinSubmit} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {t('enterPin')}
                    </label>
                    <Link
                      to="/join"
                      className="text-xs font-bold text-[#0757D9] dark:text-[#FFC928] hover:underline flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{t('scanQrCodeButton')}</span>
                    </Link>
                  </div>

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
                      placeholder="728 491"
                      className="w-full px-4 py-3 text-center text-2xl sm:text-3xl tracking-[0.25em] font-black rounded-xl bg-slate-50 dark:bg-[#050B18] text-slate-900 dark:text-white border-2 border-slate-300 dark:border-white/15 focus:border-[#0757D9] dark:focus:border-[#FFC928] focus:outline-none transition-all placeholder:text-slate-400 placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
                    />
                    {pinInput.length === 6 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {pinError && (
                    <p className="text-xs font-semibold text-rose-500 text-left">
                      {pinError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#FFC928] to-[#FFD43B] hover:brightness-105 text-[#071A3D] font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>{t('joinButton')}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Hero Visual - Live Quiz Dashboard Mockup */}
            <div className="lg:col-span-6 relative">
              {/* Outer Glow frame */}
              <div className="relative rounded-3xl bg-gradient-to-br from-[#0757D9] via-[#071A3D] to-[#050B18] p-1 shadow-2xl">
                <div className="rounded-[22px] bg-[#071A3D] text-white p-5 sm:p-7 overflow-hidden relative">
                  {/* Mockup Header: PIN + Players + Timer */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20">
                        <img src="/ilmhub-logo.svg" alt="IlmHub" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-white/60 tracking-wider uppercase">
                          {t('gamePinLabel')}
                        </div>
                        <div className="text-lg font-black tracking-widest text-[#FFC928]">
                          728 491
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold">
                        <Users className="w-3.5 h-3.5 text-blue-300" />
                        <span>24 {t('playersCount')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC928]/20 text-[#FFC928] text-xs font-black border border-[#FFC928]/30">
                        <Clock className="w-3.5 h-3.5" />
                        <span>00:12</span>
                      </div>
                    </div>
                  </div>

                  {/* Mockup Question */}
                  <div className="text-center mb-6">
                    <div className="inline-block text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
                      {t('questionLabel')} 4 / 20
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                      "What is the capital of Uzbekistan?"
                    </h2>
                  </div>

                  {/* Mockup 4 Answer Buttons with IlmHub style */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* A: Tashkent */}
                    <button
                      type="button"
                      onClick={() => setSelectedMockAnswer(0)}
                      className={`p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-left transition-all font-bold text-sm sm:text-base border ${
                        selectedMockAnswer === 0
                          ? 'bg-[#E11D48] text-white border-white ring-2 ring-[#FFC928]'
                          : 'bg-[#E11D48]/85 text-white/90 border-transparent hover:brightness-110'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-black text-xs shrink-0">
                        ▲ A
                      </div>
                      <span className="truncate">Tashkent</span>
                      {selectedMockAnswer === 0 && <CheckCircle2 className="w-4 h-4 ml-auto text-white shrink-0" />}
                    </button>

                    {/* B: Samarkand */}
                    <button
                      type="button"
                      onClick={() => setSelectedMockAnswer(1)}
                      className={`p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-left transition-all font-bold text-sm sm:text-base border ${
                        selectedMockAnswer === 1
                          ? 'bg-[#0757D9] text-white border-white ring-2 ring-[#FFC928]'
                          : 'bg-[#0757D9]/85 text-white/90 border-transparent hover:brightness-110'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-black text-xs shrink-0">
                        ◆ B
                      </div>
                      <span className="truncate">Samarkand</span>
                      {selectedMockAnswer === 1 && <CheckCircle2 className="w-4 h-4 ml-auto text-white shrink-0" />}
                    </button>

                    {/* C: Bukhara */}
                    <button
                      type="button"
                      onClick={() => setSelectedMockAnswer(2)}
                      className={`p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-left transition-all font-bold text-sm sm:text-base border ${
                        selectedMockAnswer === 2
                          ? 'bg-[#D97706] text-white border-white ring-2 ring-[#FFC928]'
                          : 'bg-[#D97706]/85 text-white/90 border-transparent hover:brightness-110'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-black text-xs shrink-0">
                        ● C
                      </div>
                      <span className="truncate">Bukhara</span>
                      {selectedMockAnswer === 2 && <CheckCircle2 className="w-4 h-4 ml-auto text-white shrink-0" />}
                    </button>

                    {/* D: Khiva */}
                    <button
                      type="button"
                      onClick={() => setSelectedMockAnswer(3)}
                      className={`p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-left transition-all font-bold text-sm sm:text-base border ${
                        selectedMockAnswer === 3
                          ? 'bg-[#059669] text-white border-white ring-2 ring-[#FFC928]'
                          : 'bg-[#059669]/85 text-white/90 border-transparent hover:brightness-110'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-black text-xs shrink-0">
                        ■ D
                      </div>
                      <span className="truncate">Khiva</span>
                      {selectedMockAnswer === 3 && <CheckCircle2 className="w-4 h-4 ml-auto text-white shrink-0" />}
                    </button>
                  </div>

                  {/* Mockup Bottom Live Leaderboard Preview */}
                  <div className="bg-black/30 rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/70 mb-2">
                      <span className="font-bold flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-[#FFC928]" />
                        <span>Live Top 3</span>
                      </span>
                      <span className="text-[#FFC928] font-bold">Top Score: 9,840 pts</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white/10 rounded-xl p-2 border border-[#FFC928]/40 bg-[#FFC928]/10">
                        <div className="font-black text-[#FFC928]">🥇 1. Azizbek</div>
                        <div className="text-[11px] font-bold text-white/90">9,840</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                        <div className="font-bold text-slate-300">🥈 2. Madina</div>
                        <div className="text-[11px] text-white/70">9,420</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                        <div className="font-bold text-amber-200">🥉 3. Jasur</div>
                        <div className="text-[11px] text-white/70">8,900</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Pill Micro Animation */}
              <div className="hidden sm:flex absolute -bottom-5 -left-5 bg-white dark:bg-[#0B1730] text-slate-900 dark:text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200 dark:border-white/15 items-center gap-2.5 text-xs font-black animate-bounce duration-1000">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span>+950 pts • 4x Streak!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "How It Works" Section */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 bg-[#F5F8FF] dark:bg-[#071A3D]/40 border-y border-slate-200/80 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
              {t('navHowItWorks')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {t('taglineSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white dark:bg-[#0B1730] p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm relative group hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0757D9]/10 text-[#0757D9] dark:text-[#FFC928] flex items-center justify-center font-black text-xl mb-4 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('howItWorksStep1Title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('howItWorksStep1Desc')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-[#0B1730] p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm relative group hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FFC928]/20 text-[#071A3D] dark:text-[#FFC928] flex items-center justify-center font-black text-xl mb-4 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('howItWorksStep2Title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('howItWorksStep2Desc')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-[#0B1730] p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm relative group hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl mb-4 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('howItWorksStep3Title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('howItWorksStep3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-black text-center text-slate-900 dark:text-white mb-10">
          {t('featuresTitle')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1730] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#0757D9]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#0757D9] dark:text-[#1769FF] flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature1Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature1Desc')}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1730] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#FFC928]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-yellow-950/60 text-[#FFC928] flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature2Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature2Desc')}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1730] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature3Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature3Desc')}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1730] border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              {t('feature4Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('feature4Desc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

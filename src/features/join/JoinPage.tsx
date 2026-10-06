import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { joinGameAsStudent, extractFirebaseError } from '../../lib/firebase';
import { sound } from '../../lib/audio';
import { Logo } from '../../components/common/Logo';
import {
  Gamepad2,
  ArrowLeft,
  ArrowRight,
  User,
  AlertCircle,
  Loader2,
  QrCode,
  Camera,
  X,
  Sparkles,
} from 'lucide-react';

export const JoinPage: React.FC = () => {
  const { pin: urlPin } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { setPlayerSession, showToast } = useGameStore();

  const [step, setStep] = useState<1 | 2>(urlPin && urlPin.length === 6 ? 2 : 1);
  const [pinDigits, setPinDigits] = useState<string[]>(() => {
    if (urlPin && urlPin.length === 6) {
      return urlPin.split('').slice(0, 6);
    }
    return ['', '', '', '', '', ''];
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Input refs for 6 digits
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate full pin
  const fullPin = pinDigits.join('');

  // Handle digit typing
  const handleDigitChange = (index: number, val: string) => {
    setErrorMessage('');
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const next = [...pinDigits];
      next[index] = '';
      setPinDigits(next);
      return;
    }

    // If pasted multiple digits
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const next = [...pinDigits];
      for (let i = 0; i < 6; i++) {
        if (chars[i]) next[i] = chars[i];
      }
      setPinDigits(next);
      const focusIndex = Math.min(chars.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    // Single digit
    const next = [...pinDigits];
    next[index] = clean[clean.length - 1];
    setPinDigits(next);

    // Auto advance
    if (index < 5 && clean) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const chars = pasted.split('');
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        if (chars[i]) next[i] = chars[i];
      }
      setPinDigits(next);
      inputRefs.current[Math.min(chars.length, 5)]?.focus();
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (fullPin.length !== 6) {
      setErrorMessage(t('invalidPinError'));
      return;
    }
    setErrorMessage('');
    setStep(2);
  };

  const handleJoinGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setErrorMessage('');

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (trimmedFirst.length < 2) {
      setErrorMessage(`${t('firstNameLabel')}: ${t('nameMinLengthError')}`);
      return;
    }
    if (trimmedFirst.length > 30) {
      setErrorMessage(`${t('firstNameLabel')}: ${t('nameMaxLengthError')}`);
      return;
    }
    if (trimmedLast.length < 2) {
      setErrorMessage(`${t('lastNameLabel')}: ${t('nameMinLengthError')}`);
      return;
    }
    if (trimmedLast.length > 30) {
      setErrorMessage(`${t('lastNameLabel')}: ${t('nameMaxLengthError')}`);
      return;
    }

    setLoading(true);

    try {
      // 1. Call existing student join function
      const registeredPlayer = await joinGameAsStudent(fullPin, trimmedFirst, trimmedLast);

      // 2. Persist session
      setPlayerSession({
        pin: fullPin,
        uid: registeredPlayer.uid,
        firstName: registeredPlayer.firstName,
        lastName: registeredPlayer.lastName,
        score: registeredPlayer.score,
        streak: registeredPlayer.streak,
      });

      sound.playCorrect();
      showToast(`${t('toastGameJoined')} ${registeredPlayer.firstName}!`);
      navigate(`/play/${fullPin}`);
    } catch (err: unknown) {
      console.error('[JoinPage] Join error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);

      if (errMsg === 'GAME_NOT_FOUND') {
        setErrorMessage(t('errPinNotFound'));
      } else if (errMsg === 'GAME_ALREADY_STARTED') {
        setErrorMessage(t('gameAlreadyStartedError'));
      } else {
        const { code, message } = extractFirebaseError(err);
        setErrorMessage(`Join failed [${code}]: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center p-4 selection:bg-[#FFC928]">
      <div className="w-full max-w-lg bg-white/95 dark:bg-[#0B1730]/95 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-white/10 relative">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="lg" showTagline={false} />
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {step === 1 ? (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {t('enterPinHeading')}
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
                {t('enterPinSubtitle')}
              </p>
            </div>

            <form onSubmit={handleStep1Next} className="space-y-6">
              {/* 6 Digit Inputs */}
              <div>
                <div
                  className="flex items-center justify-center gap-2 sm:gap-3"
                  onPaste={handlePaste}
                >
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`w-11 h-14 sm:w-14 sm:h-18 text-center text-2xl sm:text-3xl font-black rounded-2xl border-2 transition-all shadow-xs ${
                        digit
                          ? 'border-[#0757D9] dark:border-[#FFC928] bg-[#0757D9]/5 dark:bg-[#102044] text-[#0757D9] dark:text-[#FFC928]'
                          : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#050B18] text-slate-900 dark:text-white'
                      } focus:border-[#0757D9] dark:focus:border-[#FFC928] focus:ring-4 focus:ring-[#0757D9]/15 dark:focus:ring-[#FFC928]/20 focus:outline-none`}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* JOIN GAME Button */}
              <button
                type="submit"
                disabled={fullPin.length !== 6}
                className="w-full py-4 px-6 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] disabled:opacity-50 text-white font-black text-lg shadow-lg shadow-[#0757D9]/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5 text-[#FFC928]" />
                <span>{t('joinGameCTA')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Or divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t('or')}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
              </div>

              {/* QR Scanner button */}
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full py-3.5 px-5 rounded-2xl bg-white dark:bg-[#102044] hover:bg-slate-50 dark:hover:bg-[#162a56] text-[#071A3D] dark:text-white font-extrabold text-sm border-2 border-slate-200 dark:border-white/10 shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4 text-[#0757D9] dark:text-[#FFC928]" />
                <span>{t('scanQrCodeButton')}</span>
              </button>

              <p className="text-center text-xs text-slate-400">
                {t('scanQrCodePrompt')}
              </p>
            </form>
          </div>
        ) : (
          <div>
            {/* Step 2: Name Input */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('back')}</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-[#0757D9]/10 text-xs font-black text-[#0757D9] dark:text-[#FFC928] tracking-widest">
                PIN: {fullPin}
              </span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {t('step2Title')}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {t('step2Desc')}
              </p>
            </div>

            <form onSubmit={handleJoinGameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  {t('firstNameLabel')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={30}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('firstNamePlaceholder')}
                    className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-slate-50 dark:bg-[#050B18] border-2 border-slate-300 dark:border-white/15 focus:border-[#0757D9] dark:focus:border-[#FFC928] focus:outline-none text-slate-900 dark:text-white font-bold text-base"
                    autoFocus
                  />
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  {t('lastNameLabel')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={30}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('lastNamePlaceholder')}
                    className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-slate-50 dark:bg-[#050B18] border-2 border-slate-300 dark:border-white/15 focus:border-[#0757D9] dark:focus:border-[#FFC928] focus:outline-none text-slate-900 dark:text-white font-bold text-base"
                  />
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FFC928] to-[#FFD43B] hover:brightness-105 text-[#071A3D] font-black text-lg shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Gamepad2 className="w-6 h-6" />
                    <span>{t('joinButton')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0B1730] p-6 shadow-2xl border border-slate-200 dark:border-white/10 text-center relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-[#0757D9]/10 text-[#0757D9] dark:text-[#FFC928] mx-auto flex items-center justify-center mb-4">
              <Camera className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              {t('scanQrCodeButton')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {t('scanQrCodePrompt')}
            </p>

            <div className="aspect-square rounded-2xl bg-slate-900 border-2 border-dashed border-[#FFC928]/50 flex flex-col items-center justify-center p-6 text-white text-xs mb-6 relative overflow-hidden">
              <div className="absolute inset-x-4 h-0.5 bg-[#FFC928] top-1/2 -translate-y-1/2 animate-pulse" />
              <QrCode className="w-20 h-20 text-white/40 mb-2" />
              <span className="text-white/70 font-semibold">Camera scanner viewport</span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

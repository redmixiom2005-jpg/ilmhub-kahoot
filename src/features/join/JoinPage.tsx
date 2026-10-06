import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import {
  loginAnonymously,
  subscribeGameMeta,
  subscribePlayers,
  registerPlayer,
} from '../../lib/firebase';
import { GameMeta, Player } from '../../types/quiz';
import { sound } from '../../lib/audio';
import { Logo } from '../../components/common/Logo';
import { Gamepad2, ArrowLeft, ArrowRight, User, AlertCircle } from 'lucide-react';

export const JoinPage: React.FC = () => {
  const { pin: urlPin } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { setPlayerSession } = useGameStore();

  const [step, setStep] = useState<1 | 2>(urlPin && urlPin.length === 6 ? 2 : 1);
  const [pin, setPin] = useState(urlPin || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [gameMeta, setGameMeta] = useState<GameMeta | null>(null);
  const [existingPlayers, setExistingPlayers] = useState<Record<string, Player>>({});

  // Auto-listen to the game if PIN is entered
  useEffect(() => {
    if (pin.length === 6) {
      const unsubMeta = subscribeGameMeta(pin, (meta) => {
        setGameMeta(meta);
      });
      const unsubPlayers = subscribePlayers(pin, (players) => {
        setExistingPlayers(players || {});
      });

      return () => {
        unsubMeta();
        unsubPlayers();
      };
    }
  }, [pin]);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const cleanPin = pin.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
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
      // Check game availability
      if (gameMeta && gameMeta.status !== 'lobby' && gameMeta.status !== 'countdown') {
        setErrorMessage(t('gameAlreadyStartedError'));
        setLoading(false);
        return;
      }

      // Check name uniqueness in the room
      const fullName = `${trimmedFirst} ${trimmedLast}`.toLowerCase();
      const duplicateFound = Object.values(existingPlayers).some(
        (p) => `${p.firstName} ${p.lastName}`.toLowerCase() === fullName
      );

      let finalFirstName = trimmedFirst;
      if (duplicateFound) {
        finalFirstName = `${trimmedFirst} (${Math.floor(Math.random() * 89 + 10)})`;
      }

      // Anonymous authentication for student
      const authUser = await loginAnonymously();

      const newPlayer: Player = {
        uid: authUser.uid,
        firstName: finalFirstName,
        lastName: trimmedLast,
        nickname: `${finalFirstName} ${trimmedLast}`,
        score: 0,
        streak: 0,
        joinedAt: Date.now(),
        connected: true,
        avatarSeed: authUser.uid.slice(-4),
      };

      await registerPlayer(pin, newPlayer);

      setPlayerSession({
        pin,
        uid: authUser.uid,
        firstName: finalFirstName,
        lastName: trimmedLast,
        score: 0,
        streak: 0,
      });

      sound.playCorrect();
      navigate(`/play/${pin}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('error');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800/90">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {step === 1 ? (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {t('step1Title')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('step1Desc')}
              </p>
            </div>

            <form onSubmit={handleStep1Next} className="space-y-5">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''));
                    setErrorMessage('');
                  }}
                  placeholder={t('enterPinPlaceholder')}
                  className="w-full px-4 py-4 text-center text-3xl font-black tracking-widest rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-amber-400 dark:focus:border-yellow-400 focus:outline-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 dark:bg-yellow-400 dark:hover:bg-yellow-300 text-slate-950 font-black text-lg shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{t('confirm')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('back')}</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                PIN: {pin}
              </span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {t('step2Title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                    className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-amber-400 dark:focus:border-yellow-400 focus:outline-none text-slate-900 dark:text-white font-semibold text-base"
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
                    className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-amber-400 dark:focus:border-yellow-400 focus:outline-none text-slate-900 dark:text-white font-semibold text-base"
                  />
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Gamepad2 className="w-6 h-6" />
                <span>{loading ? t('loading') : t('joinButton')}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

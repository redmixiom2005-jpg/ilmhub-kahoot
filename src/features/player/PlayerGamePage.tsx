import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import {
  subscribeGameMeta,
  subscribePublicQuestions,
  subscribeQuestionResult,
  subscribePlayers,
  submitPlayerAnswer,
  loginAnonymously,
} from '../../lib/firebase';
import {
  GameMeta,
  PublicQuestion,
  QuestionResult,
  Player,
  AnswerSubmission,
} from '../../types/quiz';
import { sound } from '../../lib/audio';
import {
  Flame,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Loader2,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PlayerGamePage: React.FC = () => {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { playerSession, setPlayerSession } = useGameStore();

  const [gameMeta, setGameMeta] = useState<GameMeta | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(null);
  const [allPlayers, setAllPlayers] = useState<Record<string, Player>>({});
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [isDisconnected, setIsDisconnected] = useState(false);

  // Sync session from storage if refreshed
  useEffect(() => {
    if (!playerSession && pin) {
      const saved = localStorage.getItem('ilmhub_player_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.pin === pin) {
            setPlayerSession(parsed);
          } else {
            navigate(`/join/${pin}`);
          }
        } catch {
          navigate(`/join/${pin}`);
        }
      } else {
        navigate(`/join/${pin}`);
      }
    }
  }, [pin, playerSession, navigate, setPlayerSession]);

  // Subscribe to real-time game state
  useEffect(() => {
    if (!pin) return;

    const unsubMeta = subscribeGameMeta(pin, (meta) => {
      if (!meta) {
        setIsDisconnected(true);
      } else {
        setIsDisconnected(false);
        setGameMeta(meta);
      }
    });

    const unsubQuestions = subscribePublicQuestions(pin, (qList) => {
      setQuestions(qList);
    });

    const unsubPlayers = subscribePlayers(pin, (players) => {
      setAllPlayers(players || {});
    });

    return () => {
      unsubMeta();
      unsubQuestions();
      unsubPlayers();
    };
  }, [pin]);

  // Reset answer selection when new question begins
  useEffect(() => {
    if (gameMeta?.status === 'question') {
      setHasAnswered(false);
      setSelectedChoices([]);
      setRoundStartTime(Date.now());
    }
  }, [gameMeta?.currentIndex, gameMeta?.status]);

  // Listen to results when reveal status occurs
  useEffect(() => {
    if (pin && gameMeta && (gameMeta.status === 'reveal' || gameMeta.status === 'leaderboard')) {
      const unsub = subscribeQuestionResult(pin, gameMeta.currentIndex, (res) => {
        setCurrentResult(res);
      });
      return () => unsub();
    }
  }, [pin, gameMeta?.currentIndex, gameMeta?.status]);

  // Trigger sounds & confetti
  const lastStatusRef = useRef<string>('');
  useEffect(() => {
    if (!gameMeta) return;

    if (gameMeta.status !== lastStatusRef.current) {
      lastStatusRef.current = gameMeta.status;

      if (gameMeta.status === 'countdown') {
        sound.playTick();
      } else if (gameMeta.status === 'reveal' && currentResult && playerSession) {
        const isCorrect = currentResult.correctAnswers.some((ans) => selectedChoices.includes(ans));
        if (isCorrect) {
          sound.playCorrect();
        } else {
          sound.playWrong();
        }
      } else if (gameMeta.status === 'finished') {
        sound.playWin();
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    }
  }, [gameMeta?.status, currentResult, playerSession, selectedChoices]);

  // Handle player answer click
  const handleAnswerClick = async (choiceIndex: number) => {
    if (hasAnswered || !pin || !playerSession || !gameMeta || gameMeta.status !== 'question') {
      return;
    }

    sound.playClick();
    const timeMs = Math.max(100, Date.now() - roundStartTime);
    const choices = [choiceIndex];

    setSelectedChoices(choices);
    setHasAnswered(true);

    const submission: AnswerSubmission = {
      choice: choices,
      submittedAt: Date.now(),
      timeMs,
    };

    await submitPlayerAnswer(pin, gameMeta.currentIndex, playerSession.uid, submission);
  };

  const currentPlayer = playerSession ? allPlayers[playerSession.uid] : null;
  const currentQuestion =
    questions && gameMeta && questions[gameMeta.currentIndex]
      ? questions[gameMeta.currentIndex]
      : null;

  // Shapes & Colors for Accessible Kahoot styling
  const optionThemes = [
    {
      bg: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white',
      shape: (
        <svg className="w-8 h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <polygon points="12,3 22,21 2,21" />
        </svg>
      ),
      letter: 'A',
    },
    {
      bg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
      shape: (
        <svg className="w-8 h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      ),
      letter: 'B',
    },
    {
      bg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white',
      shape: (
        <svg className="w-8 h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      letter: 'C',
    },
    {
      bg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
      shape: (
        <svg className="w-8 h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
      letter: 'D',
    },
  ];

  // Disconnection Banner
  if (isDisconnected) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
        <WifiOff className="w-16 h-16 text-amber-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black mb-2">{t('disconnected')}</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          {t('gameNotFoundError')}
        </p>
      </div>
    );
  }

  // 1. LOBBY STATE
  if (!gameMeta || gameMeta.status === 'lobby') {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white">
        <div className="flex justify-between items-center pt-2">
          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold tracking-widest">
            PIN: {pin}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{t('connected')}</span>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-4xl font-black shadow-2xl mb-6 shadow-yellow-500/20 animate-pulse">
            {playerSession?.firstName?.[0] || '★'}
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">
            {t('playerLobbyTitle')}
          </h2>
          <p className="text-xl font-bold text-yellow-400 mb-4">
            {playerSession?.firstName} {playerSession?.lastName}
          </p>
          <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
            {t('playerLobbySubtitle')}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            {gameMeta?.quizTitle || 'Ilmhub Live Game'}
          </span>
        </div>
      </div>
    );
  }

  // 2. COUNTDOWN STATE
  if (gameMeta.status === 'countdown') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-900 to-slate-950 text-white text-center">
        <Sparkles className="w-12 h-12 text-yellow-400 mb-4 animate-spin" />
        <h2 className="text-4xl font-black tracking-tight mb-2">
          {t('getReadyTitle')}
        </h2>
        <p className="text-lg text-slate-300">
          Question {(gameMeta.currentIndex || 0) + 1} of {gameMeta.totalQuestions}
        </p>
      </div>
    );
  }

  // 3. QUESTION STATE (BIG TOUCH ANSWER BUTTONS)
  if (gameMeta.status === 'question' && currentQuestion) {
    if (hasAnswered) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
          <div className="w-20 h-20 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-3">{t('answerLocked')}</h2>
          <p className="text-base text-slate-300 max-w-xs">
            {t('waitingForOthers')}
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-yellow-400 font-bold bg-yellow-400/10 px-4 py-2 rounded-full border border-yellow-400/20">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Look at the host screen</span>
          </div>
        </div>
      );
    }

    const isTrueFalse = currentQuestion.type === 'truefalse';

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-3 sm:p-4 bg-slate-950 safe-area-inset">
        {/* Top Mini Bar */}
        <div className="flex items-center justify-between text-white text-xs font-bold px-2 py-1">
          <span className="text-slate-400">
            Q {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}
          </span>
          <span className="text-yellow-400">
            {currentPlayer?.score || 0} pts
          </span>
        </div>

        {/* 2x2 Grid or 2-Button Grid */}
        <div
          className={`grid gap-3 sm:gap-4 flex-1 my-2 ${
            isTrueFalse ? 'grid-rows-2 grid-cols-1' : 'grid-cols-2 grid-rows-2'
          }`}
        >
          {isTrueFalse ? (
            <>
              {/* True Button */}
              <button
                onClick={() => handleAnswerClick(0)}
                className="w-full h-full rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 transition-all p-4 flex flex-col items-center justify-center text-white shadow-lg border-2 border-blue-400/40"
              >
                <div className="p-3 bg-white/20 rounded-full mb-2">
                  <svg className="w-10 h-10 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,2 22,12 12,22 2,12" />
                  </svg>
                </div>
                <span className="text-2xl sm:text-3xl font-black uppercase tracking-wider">
                  {t('trueOption')}
                </span>
              </button>

              {/* False Button */}
              <button
                onClick={() => handleAnswerClick(1)}
                className="w-full h-full rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 transition-all p-4 flex flex-col items-center justify-center text-white shadow-lg border-2 border-rose-400/40"
              >
                <div className="p-3 bg-white/20 rounded-full mb-2">
                  <svg className="w-10 h-10 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,3 22,21 2,21" />
                  </svg>
                </div>
                <span className="text-2xl sm:text-3xl font-black uppercase tracking-wider">
                  {t('falseOption')}
                </span>
              </button>
            </>
          ) : (
            currentQuestion.options.map((optText, idx) => {
              const theme = optionThemes[idx] || optionThemes[0];
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerClick(idx)}
                  className={`w-full h-full rounded-2xl ${theme.bg} active:scale-95 transition-all p-3 sm:p-4 flex flex-col items-center justify-center shadow-lg border-2 border-white/20 select-none`}
                >
                  <div className="mb-2 p-2 bg-white/10 rounded-xl">
                    {theme.shape}
                  </div>
                  {optText && optText.length <= 30 && (
                    <span className="text-sm sm:text-base font-bold text-center line-clamp-2 px-1">
                      {optText}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 4. REVEAL / LEADERBOARD STATE
  if (gameMeta.status === 'reveal' || gameMeta.status === 'leaderboard') {
    const isCorrect =
      currentResult &&
      currentResult.correctAnswers.some((ans) => selectedChoices.includes(ans));

    return (
      <div
        className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center text-white transition-colors ${
          isCorrect ? 'bg-emerald-900' : 'bg-rose-950'
        }`}
      >
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
            isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {isCorrect ? (
            <CheckCircle className="w-14 h-14" />
          ) : (
            <XCircle className="w-14 h-14" />
          )}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black mb-3">
          {isCorrect ? t('correctMessage') : t('wrongMessage')}
        </h2>

        {/* Player Stats */}
        <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs border border-white/10 space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300">{t('pointsEarned')}</span>
            <span className="font-extrabold text-xl text-yellow-300">
              {currentPlayer?.score || 0} pts
            </span>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2">
            <span className="text-slate-300 flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{t('streak')}</span>
            </span>
            <span className="font-bold text-orange-400">
              {currentPlayer?.streak || 0} 🔥
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-300 font-medium">
          Look at the main screen for rankings
        </p>
      </div>
    );
  }

  // 5. FINISHED PODIUM SCREEN
  if (gameMeta.status === 'finished') {
    // Sort all players to find personal rank
    const sorted = Object.values(allPlayers).sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((p) => p.uid === playerSession?.uid) + 1;
    const isTopThree = myRank <= 3 && myRank > 0;

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 bg-gradient-to-b from-blue-950 via-slate-900 to-indigo-950 text-white text-center">
        <div className="pt-4">
          <span className="text-xs uppercase font-extrabold tracking-widest text-yellow-400">
            {t('finalPodiumHeader')}
          </span>
        </div>

        <div className="py-8">
          <div
            className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center text-4xl font-black shadow-2xl mb-6 border-4 ${
              isTopThree
                ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-yellow-200'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {isTopThree ? <Trophy className="w-14 h-14" /> : `#${myRank}`}
          </div>

          <h2 className="text-3xl sm:text-4xl font-black mb-2">
            {playerSession?.firstName} {playerSession?.lastName}
          </h2>

          <div className="text-2xl font-black text-yellow-400 mb-4">
            {currentPlayer?.score || 0} pts
          </div>

          <div className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-md text-sm font-bold border border-white/10">
            {t('yourFinalRank')}: #{myRank} {t('outOf')} {sorted.length} {t('players')}
          </div>
        </div>

        <div className="pb-4">
          <button
            onClick={() => {
              localStorage.removeItem('ilmhub_player_session');
              setPlayerSession(null);
              navigate('/');
            }}
            className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-lg active:scale-98 transition-all"
          >
            {t('playAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-950 text-white">
      <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
    </div>
  );
};

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
  Check,
  RotateCcw,
  Home,
  Share2,
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
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
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

  const showQuestionOnPlayer = gameMeta?.showQuestionOnPlayers !== false;

  const optionThemes = [
    {
      bg: 'bg-[#E11D48] hover:bg-rose-700 active:bg-rose-800 text-white border-rose-400/30',
      shape: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <polygon points="12,3 22,21 2,21" />
        </svg>
      ),
      letter: 'A',
    },
    {
      bg: 'bg-[#0757D9] hover:bg-blue-700 active:bg-blue-800 text-white border-blue-400/30',
      shape: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      ),
      letter: 'B',
    },
    {
      bg: 'bg-[#D97706] hover:bg-amber-600 active:bg-amber-700 text-white border-amber-400/30',
      shape: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      letter: 'C',
    },
    {
      bg: 'bg-[#059669] hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-400/30',
      shape: (
        <svg className="w-6 h-6 sm:w-8 sm:h-8 fill-white shrink-0" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
      letter: 'D',
    },
  ];

  // Disconnection Banner
  if (isDisconnected) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-[#050B18] text-white">
        <WifiOff className="w-16 h-16 text-[#FFC928] mb-4 animate-bounce" />
        <h2 className="text-2xl font-black mb-2">{t('errConnectionLost')}</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          {t('errPinNotFound')}
        </p>
      </div>
    );
  }

  // ==========================================
  // 1. LOBBY WAITING SCREEN
  // ==========================================
  if (!gameMeta || gameMeta.status === 'lobby') {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 bg-[#050B18] text-white select-none">
        <div className="flex justify-between items-center pt-2">
          <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-black tracking-widest text-[#FFC928]">
            PIN: {pin}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{t('connected')}</span>
          </div>
        </div>

        <div className="text-center py-10">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-[#0757D9] to-[#1769FF] text-white flex items-center justify-center text-4xl font-black shadow-2xl mb-6 border-2 border-white/20 animate-pulse">
            {playerSession?.firstName?.[0] || '★'}
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">
            {t('playerLobbyTitle')}
          </h2>
          <p className="text-2xl font-black text-[#FFC928] mb-4">
            {playerSession?.firstName} {playerSession?.lastName}
          </p>
          <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
            {t('playerLobbySubtitle')}
          </p>
        </div>

        <div className="bg-[#0B1730] border border-white/10 p-4 rounded-2xl text-center shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {gameMeta?.quizTitle || 'ILMHUB KAHOOT'}
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. COUNTDOWN SCREEN
  // ==========================================
  if (gameMeta.status === 'countdown') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[#050B18] text-white text-center">
        <Sparkles className="w-12 h-12 text-[#FFC928] mb-4 animate-spin" />
        <h2 className="text-4xl font-black tracking-tight mb-2">
          {t('getReadyTitle')}
        </h2>
        <p className="text-lg font-bold text-[#FFC928]">
          {t('questionLabel')} {(gameMeta.currentIndex || 0) + 1} of {gameMeta.totalQuestions}
        </p>
      </div>
    );
  }

  // ==========================================
  // 3. QUESTION STATE (MOBILE TOUCH INTERFACE)
  // ==========================================
  if (gameMeta.status === 'question' && currentQuestion) {
    if (hasAnswered) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[#050B18] text-white text-center">
          <div className="w-20 h-20 rounded-full bg-[#0757D9] text-white flex items-center justify-center mb-6 shadow-xl border-4 border-[#FFC928]">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          <h2 className="text-3xl font-black mb-3 text-white">
            {t('answerLocked')}
          </h2>
          <p className="text-base text-slate-300 max-w-xs">
            {t('waitingForOthers')}
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-[#FFC928] font-bold bg-[#0B1730] px-5 py-2.5 rounded-full border border-white/10">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Look at the host screen</span>
          </div>
        </div>
      );
    }

    const isTrueFalse = currentQuestion.type === 'truefalse';

    return (
      <div className="min-h-[100dvh] h-[100dvh] max-h-[100dvh] flex flex-col justify-between p-2 sm:p-4 bg-[#050B18] safe-area-inset overflow-hidden">
        {/* Top Mini Bar */}
        <div className="flex items-center justify-between text-white text-xs font-black px-2 py-1 shrink-0">
          <span className="text-slate-400">
            {t('questionLabel')} {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}
          </span>
          <span className="text-[#FFC928] bg-white/5 px-2.5 py-1 rounded-lg">
            {currentPlayer?.score || 0} pts
          </span>
        </div>

        {/* Top Question Card (Respects showQuestionOnPlayers) */}
        {showQuestionOnPlayer && (
          <div className="shrink-0 max-h-[28dvh] sm:max-h-[34dvh] overflow-y-auto px-4 py-3 my-1 rounded-2xl bg-[#0B1730] border border-white/15 flex flex-col items-center justify-center text-center shadow-lg">
            {currentQuestion.imageUrl && (
              <img
                src={currentQuestion.imageUrl}
                alt="Question media"
                className="max-h-20 sm:max-h-24 rounded-xl object-contain mb-1.5 shadow-md border border-white/10"
              />
            )}
            <h2 className="text-white font-extrabold text-[clamp(1.05rem,4.2vw,1.4rem)] leading-snug break-words max-w-full">
              {currentQuestion.text}
            </h2>
          </div>
        )}

        {/* 4 Huge Touch-Friendly Answer Buttons */}
        <div
          className={`grid gap-2 sm:gap-3 flex-1 my-1 min-h-0 ${
            isTrueFalse ? 'grid-rows-2 grid-cols-1' : 'grid-cols-2 grid-rows-2'
          }`}
        >
          {isTrueFalse ? (
            <>
              {/* True Button: Royal Blue */}
              <button
                onClick={() => handleAnswerClick(0)}
                className="w-full h-full rounded-2xl bg-[#0757D9] hover:bg-blue-600 active:scale-95 transition-all p-3 sm:p-4 flex items-center justify-center gap-3 text-white shadow-xl border-2 border-blue-400/40 select-none min-h-[54px]"
              >
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl shrink-0">
                  <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,2 22,12 12,22 2,12" />
                  </svg>
                </div>
                <span className="text-[clamp(1.15rem,4.8vw,1.65rem)] font-black uppercase tracking-wider">
                  {t('trueOption')}
                </span>
              </button>

              {/* False Button: Rose Red */}
              <button
                onClick={() => handleAnswerClick(1)}
                className="w-full h-full rounded-2xl bg-[#E11D48] hover:bg-rose-700 active:scale-95 transition-all p-3 sm:p-4 flex items-center justify-center gap-3 text-white shadow-xl border-2 border-rose-400/40 select-none min-h-[54px]"
              >
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl shrink-0">
                  <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,3 22,21 2,21" />
                  </svg>
                </div>
                <span className="text-[clamp(1.15rem,4.8vw,1.65rem)] font-black uppercase tracking-wider">
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
                  className={`w-full h-full rounded-2xl ${theme.bg} active:scale-95 transition-all p-3 sm:p-4 flex items-center ${
                    showQuestionOnPlayer ? 'justify-start' : 'justify-center'
                  } gap-3 shadow-xl border-2 select-none min-h-[54px] overflow-hidden`}
                >
                  <div className="p-2 sm:p-2.5 bg-black/20 rounded-xl shrink-0 flex items-center justify-center font-black">
                    {theme.shape}
                  </div>
                  {showQuestionOnPlayer ? (
                    <div className="flex-1 min-w-0 text-left overflow-y-auto max-h-full pr-1">
                      <span className="text-[clamp(1rem,3.6vw,1.3rem)] font-extrabold leading-snug break-words block text-white drop-shadow-xs">
                        {optText}
                      </span>
                    </div>
                  ) : (
                    optText && (
                      <span className="text-sm sm:text-base font-bold text-center line-clamp-2 px-1">
                        {optText}
                      </span>
                    )
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. REVEAL / CORRECT ANSWER STATE
  // ==========================================
  if (gameMeta.status === 'reveal' || gameMeta.status === 'leaderboard') {
    const isCorrect =
      currentResult &&
      currentResult.correctAnswers.some((ans) => selectedChoices.includes(ans));

    return (
      <div
        className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center text-white transition-colors ${
          isCorrect ? 'bg-gradient-to-b from-emerald-950 via-[#050B18] to-emerald-950' : 'bg-gradient-to-b from-rose-950 via-[#050B18] to-rose-950'
        }`}
      >
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 ${
            isCorrect ? 'bg-emerald-500 text-white border-emerald-300' : 'bg-rose-600 text-white border-rose-300'
          }`}
        >
          {isCorrect ? (
            <Check className="w-14 h-14 stroke-[3]" />
          ) : (
            <XCircle className="w-14 h-14" />
          )}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black mb-3 text-white">
          {isCorrect ? t('correctMessage') : t('wrongMessage')}
        </h2>

        {/* Player Stats Card */}
        <div className="bg-[#0B1730]/90 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs border border-white/10 space-y-3 mb-6 shadow-2xl">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-bold">{t('pointsEarned')}</span>
            <span className="font-black text-2xl text-[#FFC928]">
              {currentPlayer?.score || 0} pts
            </span>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-white/10 pt-3">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{t('streak')}</span>
            </span>
            <span className="font-black text-orange-400 text-lg">
              {currentPlayer?.streak || 0} 🔥
            </span>
          </div>
        </div>

        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Look at the main projector screen
        </p>
      </div>
    );
  }

  // ==========================================
  // 5. WOW FINAL PODIUM RESULTS SCREEN
  // ==========================================
  if (gameMeta.status === 'finished') {
    const sorted = Object.values(allPlayers).sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((p) => p.uid === playerSession?.uid) + 1;
    const winner = sorted[0];
    const isWinner = myRank === 1;

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 bg-gradient-to-b from-[#071A3D] via-[#050B18] to-[#071A3D] text-white text-center select-none">
        <div className="pt-4">
          <span className="text-xs uppercase font-black tracking-widest text-[#FFC928]">
            {t('gameComplete')}
          </span>
        </div>

        <div className="py-6 max-w-sm mx-auto w-full">
          {/* Winner Crown / Trophy */}
          <div
            className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl mb-4 border-4 ${
              isWinner
                ? 'bg-gradient-to-tr from-[#FFC928] to-[#FFD43B] text-[#071A3D] border-yellow-200'
                : 'bg-[#0B1730] text-white border-white/10'
            }`}
          >
            {isWinner ? <Trophy className="w-14 h-14" /> : `#${myRank}`}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
            {playerSession?.firstName} {playerSession?.lastName}
          </h1>

          <div className="text-3xl font-black text-[#FFC928] mb-4">
            {currentPlayer?.score || 0} pts
          </div>

          {/* Winner highlight if someone else won */}
          {!isWinner && winner && (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 text-xs font-bold text-slate-300">
              🏆 {t('winner')}: <span className="text-[#FFC928]">{winner.firstName} {winner.lastName}</span> ({winner.score} pts)
            </div>
          )}

          {/* Rank Pill */}
          <div className="inline-block px-5 py-2.5 rounded-full bg-[#0B1730] backdrop-blur-md text-sm font-black border border-white/15 text-white shadow-md">
            {t('yourFinalRank')}: #{myRank} {t('outOf')} {sorted.length} {t('players')}
          </div>
        </div>

        {/* Actions */}
        <div className="pb-4 space-y-3 max-w-sm mx-auto w-full">
          <button
            onClick={() => {
              localStorage.removeItem('ilmhub_player_session');
              setPlayerSession(null);
              navigate('/join');
            }}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FFC928] to-[#FFD43B] text-[#071A3D] font-black text-lg shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{t('playAgain')}</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('ilmhub_player_session');
              setPlayerSession(null);
              navigate('/');
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/10 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>{t('navHome')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-[#050B18] text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#FFC928]" />
    </div>
  );
};

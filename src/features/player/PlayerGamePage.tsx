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
  subscribeStandings,
  getEstimatedServerTime,
} from '../../lib/firebase';
import {
  GameMeta,
  PublicQuestion,
  QuestionResult,
  Player,
  AnswerSubmission,
  PlayerStanding,
} from '../../types/quiz';
import { sound } from '../../lib/audio';
import { ThemeToggle } from '../../components/common/ThemeToggle';
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
  ArrowUp,
  ArrowDown,
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
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [remainingSec, setRemainingSec] = useState<number>(20);
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

    const unsubStandings = subscribeStandings(pin, (s) => {
      if (s && Array.isArray(s)) {
        setStandings(s);
      }
    });

    return () => {
      unsubMeta();
      unsubQuestions();
      unsubPlayers();
      unsubStandings();
    };
  }, [pin]);

  // Console.debug logs for synchronization audit
  useEffect(() => {
    if (gameMeta) {
      console.debug('[Player Game State]', {
        roundId: gameMeta.roundId,
        currentIndex: gameMeta.currentIndex,
        status: gameMeta.status,
        endsAt: gameMeta.endsAt,
        now: Date.now(),
      });
    }
  }, [gameMeta]);

  // Reset answer selection whenever roundId changes
  useEffect(() => {
    if (gameMeta?.status === 'question') {
      setHasAnswered(false);
      setIsTimeUp(false);
      setSelectedChoices([]);
      setCurrentResult(null);
      setRoundStartTime(gameMeta.startedAt || getEstimatedServerTime());
    }
  }, [gameMeta?.roundId, gameMeta?.currentIndex, gameMeta?.status]);

  // Server-offset synchronized timer countdown
  useEffect(() => {
    if (gameMeta?.status === 'question' && gameMeta.endsAt) {
      const updateCountdown = () => {
        const nowEst = getEstimatedServerTime();
        const diff = Math.max(0, Math.ceil((gameMeta.endsAt! - nowEst) / 1000));
        setRemainingSec(diff);
        if (diff <= 0) {
          setIsTimeUp(true);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 500);
      return () => clearInterval(interval);
    }
  }, [gameMeta?.status, gameMeta?.endsAt, gameMeta?.roundId]);

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
  const lastSoundRoundRef = useRef<string>('');
  useEffect(() => {
    if (!gameMeta) return;

    if (gameMeta.status === 'countdown') {
      sound.playTick();
    } else if ((gameMeta.status === 'reveal' || gameMeta.status === 'leaderboard') && currentResult && playerSession) {
      const roundKey = `${currentResult.questionIndex}-${currentResult.roundId || 'r'}`;
      if (lastSoundRoundRef.current !== roundKey) {
        lastSoundRoundRef.current = roundKey;
        const myResult = currentResult.perPlayer?.[playerSession.uid];
        const isCorrect = myResult
          ? myResult.correct
          : (Array.isArray(currentResult.correctAnswers) &&
             currentResult.correctAnswers.length > 0 &&
             selectedChoices.length > 0 &&
             selectedChoices.every((ans) => currentResult.correctAnswers.includes(ans)));

        if (isCorrect) {
          sound.playCorrect();
        } else {
          sound.playWrong();
        }
      }
    } else if (gameMeta.status === 'finished') {
      if (lastSoundRoundRef.current !== 'finished') {
        lastSoundRoundRef.current = 'finished';
        sound.playWin();
        try {
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        } catch {}
      }
    }
  }, [gameMeta?.status, currentResult, playerSession, selectedChoices]);

  // Handle player answer click
  const handleAnswerClick = async (choiceIndex: number) => {
    if (hasAnswered || isTimeUp || !pin || !playerSession || !gameMeta || gameMeta.status !== 'question') {
      return;
    }

    const nowEst = getEstimatedServerTime();
    if (gameMeta.endsAt && nowEst > gameMeta.endsAt + 500) {
      setIsTimeUp(true);
      return;
    }

    sound.playClick();
    const timeMs = Math.max(100, nowEst - roundStartTime);
    const choices = [choiceIndex];

    setSelectedChoices(choices);
    setHasAnswered(true);

    const submission: AnswerSubmission = {
      choice: choices,
      submittedAt: nowEst,
      timeMs,
    };

    try {
      await submitPlayerAnswer(pin, gameMeta.currentIndex, playerSession.uid, submission);
    } catch (err) {
      console.error('[Player Answer Submit Error]:', err);
      // Late answers or network drops show calm screen, never scary errors
      setIsTimeUp(true);
    }
  };

  const currentPlayer = playerSession ? allPlayers[playerSession.uid] : null;
  const myStanding = playerSession ? standings.find((s) => s.uid === playerSession.uid) : null;
  const totalPlayersCount = Math.max(Object.keys(allPlayers).length, standings.length, 1);
  const currentQuestion =
    questions && gameMeta && questions[gameMeta.currentIndex]
      ? questions[gameMeta.currentIndex]
      : null;

  const showQuestionOnPlayer = gameMeta?.showQuestionOnPlayers !== false;

  const optionThemes = [
    {
      bg: 'bg-[#E11D48] hover:bg-rose-700 active:bg-rose-800 text-white border-rose-400/30',
      shape: (
        <svg className="w-5 h-5 sm:w-7 sm:h-7 fill-white shrink-0" viewBox="0 0 24 24">
          <polygon points="12,3 22,21 2,21" />
        </svg>
      ),
      letter: 'A',
    },
    {
      bg: 'bg-[#0757D9] hover:bg-blue-700 active:bg-blue-800 text-white border-blue-400/30',
      shape: (
        <svg className="w-5 h-5 sm:w-7 sm:h-7 fill-white shrink-0" viewBox="0 0 24 24">
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      ),
      letter: 'B',
    },
    {
      bg: 'bg-[#D97706] hover:bg-amber-600 active:bg-amber-700 text-white border-amber-400/30',
      shape: (
        <svg className="w-5 h-5 sm:w-7 sm:h-7 fill-white shrink-0" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      letter: 'C',
    },
    {
      bg: 'bg-[#059669] hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-400/30',
      shape: (
        <svg className="w-5 h-5 sm:w-7 sm:h-7 fill-white shrink-0" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
      letter: 'D',
    },
  ];

  // Disconnection Banner
  if (isDisconnected) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white">
        <WifiOff className="w-14 h-14 text-[#0757D9] dark:text-[#FFC928] mb-4 animate-bounce" />
        <h2 className="text-xl sm:text-2xl font-black mb-2">{t('errConnectionLost')}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
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
      <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-4 sm:p-6 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white select-none safe-area-inset transition-colors">
        <div className="flex justify-between items-center shrink-0 h-11">
          <span className="px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md text-xs font-black tracking-widest text-[#0757D9] dark:text-[#FFC928] border border-slate-200 dark:border-white/10 shadow-xs">
            PIN: {pin}
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="text-center py-6 flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-tr from-[#0757D9] to-[#1769FF] text-white flex items-center justify-center text-3xl sm:text-4xl font-black shadow-2xl mb-4 border-2 border-white/20 animate-pulse">
            {playerSession?.firstName?.[0] || '★'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-1 tracking-tight text-slate-900 dark:text-white">
            {t('playerLobbyTitle')}
          </h2>
          <p className="text-xl sm:text-2xl font-black text-[#0757D9] dark:text-[#FFC928] mb-3">
            {playerSession?.firstName} {playerSession?.lastName}
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
            {t('playerLobbySubtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B1730] border border-slate-200 dark:border-white/10 p-3 sm:p-4 rounded-2xl text-center shadow-lg shrink-0">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
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
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white text-center safe-area-inset select-none transition-colors">
        <Sparkles className="w-12 h-12 text-[#0757D9] dark:text-[#FFC928] mb-4 animate-spin" />
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
          {t('getReadyTitle')}
        </h2>
        <p className="text-base sm:text-lg font-bold text-[#0757D9] dark:text-[#FFC928]">
          {t('questionLabel')} {(gameMeta.currentIndex || 0) + 1} / {gameMeta.totalQuestions}
        </p>
      </div>
    );
  }

  // ==========================================
  // 3. QUESTION STATE (MOBILE TOUCH INTERFACE)
  // ==========================================
  if (gameMeta.status === 'question' && currentQuestion) {
    // 3a. Answer Locked State
    if (hasAnswered) {
      return (
        <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-4 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white text-center safe-area-inset select-none transition-colors">
          {/* Always Visible Top Bar */}
          <div className="flex items-center justify-between text-xs font-black px-3 py-1.5 bg-white dark:bg-[#0B1730] rounded-xl border border-slate-200 dark:border-white/10 shrink-0 h-11 shadow-xs">
            <span className="text-[#0757D9] dark:text-[#FFC928] flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>#{myStanding?.rank || 1} / {totalPlayersCount}</span>
            </span>
            <span className="text-slate-900 dark:text-white font-extrabold">
              {currentPlayer?.score || myStanding?.score || 0} pts
            </span>
            <div className="flex items-center gap-2">
              <span className="text-orange-500 flex items-center gap-0.5">
                <Flame className="w-3.5 h-3.5" />
                <span>{currentPlayer?.streak || 0}</span>
              </span>
              <ThemeToggle />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="w-20 h-20 rounded-full bg-[#0757D9] text-white flex items-center justify-center mb-4 shadow-xl border-4 border-[#0757D9]/30 dark:border-[#FFC928] animate-in zoom-in-95">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900 dark:text-white">
              {t('answerLocked')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs">
              {t('waitingForOthers')}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-[#0757D9] dark:text-[#FFC928] font-bold bg-white dark:bg-[#0B1730] px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 shadow-sm">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Look at the host screen</span>
            </div>
          </div>

          <div className="p-3 text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0 font-bold">
            {currentQuestion.text}
          </div>
        </div>
      );
    }

    // 3b. Calm "Time is Up" State (Late submission or timer expired)
    if (isTimeUp) {
      return (
        <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-4 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white text-center safe-area-inset select-none transition-colors">
          <div className="flex items-center justify-between text-xs font-black px-3 py-1.5 bg-white dark:bg-[#0B1730] rounded-xl border border-slate-200 dark:border-white/10 shrink-0 h-11 shadow-xs">
            <span className="text-[#0757D9] dark:text-[#FFC928] flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>#{myStanding?.rank || 1} / {totalPlayersCount}</span>
            </span>
            <span className="text-slate-900 dark:text-white font-extrabold">
              {currentPlayer?.score || myStanding?.score || 0} pts
            </span>
            <div className="flex items-center gap-2">
              <span className="text-orange-500 flex items-center gap-0.5">
                <Flame className="w-3.5 h-3.5" />
                <span>{currentPlayer?.streak || 0}</span>
              </span>
              <ThemeToggle />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 text-amber-500 flex items-center justify-center mb-4 shadow-xl border-4 border-amber-400/50">
              <Clock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900 dark:text-white">
              {t('timesUpCalm')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs">
              Waiting for round reveal...
            </p>
          </div>

          <div className="p-3 text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0 font-bold">
            {currentQuestion.text}
          </div>
        </div>
      );
    }

    const isTrueFalse = currentQuestion.type === 'truefalse';

    return (
      <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-2 sm:p-3 bg-[#F5F8FF] dark:bg-[#050B18] safe-area-inset select-none landscape:flex-row landscape:gap-3 transition-colors">
        {/* Left Column in Landscape / Top Header in Portrait */}
        <div className="flex flex-col shrink-0 landscape:w-2/5 landscape:h-full landscape:justify-between">
          {/* Top Mini Bar with Live Rank & Score */}
          <div className="flex items-center justify-between text-xs font-black px-3 py-1.5 bg-white dark:bg-[#0B1730] text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 shrink-0 h-10 sm:h-11 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#0757D9] dark:text-[#FFC928] flex items-center gap-1 font-black">
                <Trophy className="w-3.5 h-3.5" />
                <span>#{myStanding?.rank || 1}/{totalPlayersCount}</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">
                Q{currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
              </span>
            </div>

            {/* Countdown seconds indicator */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-black text-slate-900 dark:text-white tabular-nums border border-slate-200 dark:border-white/10">
              <Clock className="w-3 h-3 text-[#0757D9] dark:text-[#FFC928]" />
              <span>{remainingSec}s</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#0757D9] dark:text-[#FFC928] font-black">
                {currentPlayer?.score || myStanding?.score || 0} pts
              </span>
              {(currentPlayer?.streak || 0) > 0 && (
                <span className="text-orange-500 font-black flex items-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  <span>{currentPlayer?.streak}</span>
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* Question Text & Media Card (Respects showQuestionOnPlayers) */}
          {showQuestionOnPlayer && (
            <div className="shrink-0 max-h-[22vh] sm:max-h-[26vh] landscape:max-h-none landscape:flex-1 overflow-y-auto px-3 py-2 my-1.5 rounded-2xl bg-white dark:bg-[#0B1730]/90 border border-slate-200 dark:border-white/15 flex flex-col items-center justify-center text-center shadow-md">
              {currentQuestion.imageUrl && (
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question media"
                  className="max-h-16 sm:max-h-20 rounded-xl object-contain mb-1 shadow-md border border-slate-200 dark:border-white/10"
                />
              )}
              <h2 className="text-slate-900 dark:text-white font-extrabold text-[clamp(0.95rem,3.8vw,1.3rem)] leading-snug break-words max-w-full">
                {currentQuestion.text}
              </h2>
            </div>
          )}
        </div>

        {/* 4 Huge Touch-Friendly Answer Buttons */}
        <div
          className={`grid gap-2 sm:gap-2.5 flex-1 min-h-0 my-1 landscape:w-3/5 landscape:h-full ${
            isTrueFalse ? 'grid-rows-2 grid-cols-1' : 'grid-cols-2 grid-rows-2'
          }`}
        >
          {isTrueFalse ? (
            <>
              {/* True Button: Royal Blue */}
              <button
                onClick={() => handleAnswerClick(0)}
                className="w-full h-full rounded-2xl bg-[#0757D9] hover:bg-blue-700 active:scale-95 transition-all p-3 flex items-center justify-center gap-3 text-white shadow-xl border-2 border-blue-400/40 select-none min-h-[50px] cursor-pointer"
              >
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,2 22,12 12,22 2,12" />
                  </svg>
                </div>
                <span className="text-[clamp(1.1rem,4.4vw,1.5rem)] font-black uppercase tracking-wider">
                  {t('trueOption')}
                </span>
              </button>

              {/* False Button: Rose Red */}
              <button
                onClick={() => handleAnswerClick(1)}
                className="w-full h-full rounded-2xl bg-[#E11D48] hover:bg-rose-700 active:scale-95 transition-all p-3 flex items-center justify-center gap-3 text-white shadow-xl border-2 border-rose-400/40 select-none min-h-[50px] cursor-pointer"
              >
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,3 22,21 2,21" />
                  </svg>
                </div>
                <span className="text-[clamp(1.1rem,4.4vw,1.5rem)] font-black uppercase tracking-wider">
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
                  className={`w-full h-full rounded-2xl ${theme.bg} active:scale-95 transition-all p-2.5 sm:p-3 flex items-center ${
                    showQuestionOnPlayer ? 'justify-start' : 'justify-center'
                  } gap-2.5 shadow-xl border-2 select-none min-h-[50px] overflow-hidden cursor-pointer`}
                >
                  <div className="p-1.5 sm:p-2 bg-black/20 rounded-xl shrink-0 flex items-center justify-center font-black">
                    {theme.shape}
                  </div>
                  {showQuestionOnPlayer ? (
                    <div className="flex-1 min-w-0 text-left overflow-y-auto max-h-full pr-1">
                      <span className="text-[clamp(0.875rem,3.2vw,1.15rem)] font-extrabold leading-snug break-words block text-white drop-shadow-xs">
                        {optText}
                      </span>
                    </div>
                  ) : (
                    optText && (
                      <span className="text-xs sm:text-sm font-bold text-center break-words px-1 line-clamp-3">
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
    const myRoundResult = currentResult?.perPlayer?.[playerSession?.uid || ''];
    const isCorrect = myRoundResult
      ? myRoundResult.correct
      : Boolean(
          currentResult &&
          Array.isArray(currentResult.correctAnswers) &&
          currentResult.correctAnswers.length > 0 &&
          selectedChoices.length > 0 &&
          selectedChoices.every((ans) => currentResult.correctAnswers.includes(ans)) &&
          currentResult.correctAnswers.every((ca) => selectedChoices.includes(ca))
        );

    const roundDelta = myRoundResult?.delta ?? 0;
    const currentScore = myRoundResult?.score ?? currentPlayer?.score ?? myStanding?.score ?? 0;
    const currentRank = myRoundResult?.rank ?? myStanding?.rank ?? 1;
    const currentStreak = myRoundResult?.streak ?? currentPlayer?.streak ?? 0;
    const rankDelta = myRoundResult
      ? (myRoundResult.prevRank - myRoundResult.rank)
      : (myStanding?.prevRank && myStanding?.rank ? myStanding.prevRank - myStanding.rank : 0);

    return (
      <div
        className={`h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-4 sm:p-6 text-center safe-area-inset select-none transition-colors ${
          isCorrect
            ? 'bg-gradient-to-b from-emerald-100 via-[#F5F8FF] to-emerald-50 dark:from-emerald-950 dark:via-[#050B18] dark:to-emerald-950 text-slate-900 dark:text-white'
            : 'bg-gradient-to-b from-rose-100 via-[#F5F8FF] to-rose-50 dark:from-rose-950 dark:via-[#050B18] dark:to-rose-950 text-slate-900 dark:text-white'
        }`}
      >
        {/* Top Mini Bar with Live Rank & Delta Animation */}
        <div className="flex items-center justify-between text-xs font-black px-3 py-1.5 bg-white dark:bg-[#0B1730] rounded-xl border border-slate-200 dark:border-white/10 shrink-0 h-10 shadow-xs">
          <span className="text-[#0757D9] dark:text-[#FFC928] flex items-center gap-1 font-black">
            <Trophy className="w-3.5 h-3.5" />
            <span>#{currentRank} / {totalPlayersCount}</span>
          </span>

          {rankDelta !== 0 && (
            <span
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black animate-bounce ${
                rankDelta > 0
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
              }`}
            >
              {rankDelta > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span>{Math.abs(rankDelta)}</span>
            </span>
          )}

          <div className="flex items-center gap-2">
            <span className="text-slate-900 dark:text-white font-extrabold">
              {currentScore} pts
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Center Feedback Icon & Title */}
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-4 shadow-2xl border-4 ${
              isCorrect
                ? 'bg-emerald-500 text-white border-emerald-300 animate-in zoom-in-90'
                : 'bg-rose-600 text-white border-rose-300 animate-in shake'
            }`}
          >
            {isCorrect ? (
              <Check className="w-12 h-12 stroke-[3]" />
            ) : (
              <XCircle className="w-12 h-12" />
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900 dark:text-white">
            {isCorrect ? t('correctMessage') : t('wrongMessage')}
          </h2>

          {/* Player Stats Card */}
          <div className="bg-white/95 dark:bg-[#0B1730]/90 backdrop-blur-md rounded-3xl p-5 w-full max-w-xs border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xl">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-400 font-bold">{t('pointsThisRound')}</span>
              <span className={`font-black text-xl sm:text-2xl ${roundDelta > 0 ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                {roundDelta > 0 ? `+${roundDelta}` : '0'} ball
              </span>
            </div>

            <div className="flex justify-between items-center text-xs sm:text-sm border-t border-slate-100 dark:border-white/10 pt-2.5">
              <span className="text-slate-600 dark:text-slate-400 font-bold">{t('totalScoreLabel')}</span>
              <span className="font-black text-lg text-[#0757D9] dark:text-[#FFC928]">
                {currentScore} ball
              </span>
            </div>

            <div className="flex justify-between items-center text-xs sm:text-sm border-t border-slate-100 dark:border-white/10 pt-2.5">
              <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>{t('streak')}</span>
              </span>
              <span className="font-black text-orange-500 text-base">
                {currentStreak} 🔥
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold pb-2 shrink-0">
          Look at the host projector screen
        </p>
      </div>
    );
  }

  // ==========================================
  // 5. FINAL PODIUM RESULTS SCREEN
  // ==========================================
  if (gameMeta.status === 'finished') {
    const sorted = Object.values(allPlayers).sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((p) => p.uid === playerSession?.uid) + 1;
    const winner = sorted[0];
    const isWinner = myRank === 1;

    return (
      <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-[#EBF1FD] via-[#F5F8FF] to-[#EBF1FD] dark:from-[#071A3D] dark:via-[#050B18] dark:to-[#071A3D] text-slate-900 dark:text-white text-center select-none safe-area-inset transition-colors">
        <div className="pt-2 flex items-center justify-between shrink-0">
          <span className="text-xs uppercase font-black tracking-widest text-[#0757D9] dark:text-[#FFC928]">
            {t('gameComplete')}
          </span>
          <ThemeToggle />
        </div>

        <div className="py-4 max-w-sm mx-auto w-full flex-1 flex flex-col items-center justify-center min-h-0">
          {/* Winner Trophy / Rank Card */}
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl flex items-center justify-center text-3xl sm:text-4xl font-black shadow-2xl mb-3 border-4 ${
              isWinner
                ? 'bg-gradient-to-tr from-[#FFC928] to-[#FFD43B] text-[#071A3D] border-yellow-200'
                : 'bg-white dark:bg-[#0B1730] text-slate-900 dark:text-white border-slate-200 dark:border-white/10'
            }`}
          >
            {isWinner ? <Trophy className="w-12 h-12" /> : `#${myRank}`}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">
            {playerSession?.firstName} {playerSession?.lastName}
          </h1>

          <div className="text-2xl sm:text-3xl font-black text-[#0757D9] dark:text-[#FFC928] mb-3">
            {currentPlayer?.score || 0} ball
          </div>

          {!isWinner && winner && (
            <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-3 text-xs font-bold text-slate-700 dark:text-slate-300 w-full shadow-xs">
              🏆 {t('winner')}: <span className="text-[#0757D9] dark:text-[#FFC928]">{winner.firstName} {winner.lastName}</span> ({winner.score} ball)
            </div>
          )}

          <div className="inline-block px-4 py-2 rounded-full bg-white dark:bg-[#0B1730] backdrop-blur-md text-xs sm:text-sm font-black border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white shadow-md">
            {t('yourFinalRank')}: #{myRank} {t('outOf')} {sorted.length} {t('players')}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pb-2 space-y-2.5 max-w-sm mx-auto w-full shrink-0">
          <button
            onClick={() => {
              localStorage.removeItem('ilmhub_player_session');
              setPlayerSession(null);
              navigate('/join');
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0757D9] to-[#1769FF] dark:from-[#FFC928] dark:to-[#FFD43B] text-white dark:text-[#071A3D] font-black text-base shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('playAgain')}</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('ilmhub_player_session');
              setPlayerSession(null);
              navigate('/');
            }}
            className="w-full py-3 px-6 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs sm:text-sm transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>{t('navHome')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex items-center justify-center p-6 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#0757D9] dark:text-[#FFC928]" />
    </div>
  );
};

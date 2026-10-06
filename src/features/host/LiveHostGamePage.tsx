import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import {
  subscribeGameMeta,
  subscribePublicQuestions,
  subscribePlayers,
  subscribeAnswersForQuestion,
  updateGameStatus,
  publishQuestionResult,
  kickPlayerFromGame,
  getGameSecret,
} from '../../lib/firebase';
import {
  GameMeta,
  PublicQuestion,
  Player,
  AnswerSubmission,
  QuestionResult,
  LeaderboardEntry,
} from '../../types/quiz';
import { sound } from '../../lib/audio';
import { calculateQuestionScore } from '../../lib/scoring';
import { exportResultsToCsv } from '../../lib/csv';
import { Logo } from '../../components/common/Logo';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Users,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
  Maximize,
  Minimize,
  Download,
  CheckCircle,
  X,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  StopCircle,
  Smartphone,
} from 'lucide-react';

export const LiveHostGamePage: React.FC = () => {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { showToast } = useGameStore();

  const [gameMeta, setGameMeta] = useState<GameMeta | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [countdownNum, setCountdownNum] = useState<number>(3);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const joinUrl = `${window.location.origin}/join/${pin}`;

  // Generate QR Code on mount
  useEffect(() => {
    if (pin) {
      QRCode.toDataURL(joinUrl, { width: 320, margin: 2, color: { dark: '#0B1B4D', light: '#FFFFFF' } })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [pin, joinUrl]);

  // Subscribe to real-time Firebase state
  useEffect(() => {
    if (!pin) return;

    const unsubMeta = subscribeGameMeta(pin, (meta) => setGameMeta(meta));
    const unsubQuestions = subscribePublicQuestions(pin, (q) => setQuestions(q));
    const unsubPlayers = subscribePlayers(pin, (p) => setPlayers(p || {}));

    return () => {
      unsubMeta();
      unsubQuestions();
      unsubPlayers();
    };
  }, [pin]);

  // Subscribe to answers during question round
  useEffect(() => {
    if (pin && gameMeta && gameMeta.status === 'question') {
      const unsubAnswers = subscribeAnswersForQuestion(pin, gameMeta.currentIndex, (a) => {
        setAnswers(a || {});
      });
      return () => unsubAnswers();
    }
  }, [pin, gameMeta?.currentIndex, gameMeta?.status]);

  const currentQuestion =
    questions && gameMeta && questions[gameMeta.currentIndex]
      ? questions[gameMeta.currentIndex]
      : null;

  // Synced 3-2-1 Countdown Logic
  useEffect(() => {
    if (gameMeta?.status === 'countdown') {
      setCountdownNum(3);
      sound.playTick();

      const cdInterval = setInterval(() => {
        setCountdownNum((prev) => {
          if (prev <= 1) {
            clearInterval(cdInterval);
            // Transition to question phase
            if (pin && currentQuestion) {
              const now = Date.now();
              const endsAt = now + currentQuestion.timeLimit * 1000;
              updateGameStatus(pin, 'question', { startedAt: now, endsAt });
            }
            return 0;
          }
          sound.playTick();
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(cdInterval);
    }
  }, [gameMeta?.status, pin, currentQuestion]);

  // Question Timer Countdown
  useEffect(() => {
    if (gameMeta?.status === 'question' && currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleEndQuestionNow();
            return 0;
          }
          if (prev <= 6) {
            sound.playTick();
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameMeta?.status, gameMeta?.currentIndex, currentQuestion]);

  // Auto-end question if ALL players have answered!
  useEffect(() => {
    if (gameMeta?.status === 'question') {
      const totalPlayerCount = Object.keys(players).length;
      const answeredCount = Object.keys(answers).length;

      if (totalPlayerCount > 0 && answeredCount >= totalPlayerCount) {
        handleEndQuestionNow();
      }
    }
  }, [answers, players, gameMeta?.status]);

  // Reveal calculation: Evaluate scores, update player streak & totals
  const handleEndQuestionNow = async () => {
    if (!pin || !gameMeta || !currentQuestion || gameMeta.status !== 'question') return;

    if (timerRef.current) clearInterval(timerRef.current);
    sound.playRoundEnd();

    // 1. Fetch secret correct answers for this question
    const secret = await getGameSecret(pin, gameMeta.currentIndex);
    const correctAnswers = secret?.correctAnswers || [0];

    // 2. Tally distribution across options
    const optionCount = currentQuestion.options.length;
    const distribution = new Array(optionCount).fill(0);

    const updatedPlayers = { ...players };

    Object.entries(answers).forEach(([uid, ans]) => {
      ans.choice.forEach((c) => {
        if (c >= 0 && c < optionCount) {
          distribution[c] = (distribution[c] || 0) + 1;
        }
      });

      // Calculate score for this player
      const isCorrect = correctAnswers.some((ca) => ans.choice.includes(ca));
      const playerRecord = updatedPlayers[uid];

      if (playerRecord) {
        const scoreResult = calculateQuestionScore({
          isCorrect,
          responseTimeMs: ans.timeMs,
          timeLimitSeconds: currentQuestion.timeLimit,
          pointsMode: currentQuestion.pointsMode,
          currentStreak: playerRecord.streak || 0,
        });

        updatedPlayers[uid] = {
          ...playerRecord,
          score: (playerRecord.score || 0) + scoreResult.pointsEarned,
          streak: scoreResult.newStreak,
          lastResponseTimeMs: ans.timeMs,
        };
      }
    });

    const result: QuestionResult = {
      questionIndex: gameMeta.currentIndex,
      correctAnswers,
      distribution,
      totalAnswered: Object.keys(answers).length,
    };

    setCurrentResult(result);

    // Compute updated Leaderboard
    const sortedLeaderboard: LeaderboardEntry[] = Object.values(updatedPlayers)
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({
        uid: p.uid,
        firstName: p.firstName,
        lastName: p.lastName,
        score: p.score,
        streak: p.streak,
        rank: idx + 1,
      }));

    setLeaderboard(sortedLeaderboard);

    // Publish to Realtime Database
    await publishQuestionResult(pin, gameMeta.currentIndex, result, updatedPlayers);
    await updateGameStatus(pin, 'reveal');
  };

  const handleStartCountdown = async () => {
    if (!pin || Object.keys(players).length === 0) return;
    sound.playClick();
    await updateGameStatus(pin, 'countdown');
  };

  const handleNextQuestion = async () => {
    if (!pin || !gameMeta || !questions) return;
    sound.playClick();

    const nextIndex = gameMeta.currentIndex + 1;

    if (nextIndex >= questions.length) {
      // Game finished! Final Podium
      await updateGameStatus(pin, 'finished');
      sound.playWin();
      try {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      } catch {}
    } else {
      // Next Question Countdown
      await updateGameStatus(pin, 'countdown', { currentIndex: nextIndex });
    }
  };

  const handleKickPlayer = async (uid: string) => {
    if (!pin) return;
    sound.playClick();
    await kickPlayerFromGame(pin, uid);
    showToast('Player removed from game.');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard Shortcuts: Space = Next / Start, S = Skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameMeta?.status === 'lobby') handleStartCountdown();
        else if (gameMeta?.status === 'reveal') handleNextQuestion();
      } else if (e.code === 'KeyS') {
        if (gameMeta?.status === 'question') handleEndQuestionNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleExportCsv = () => {
    const rows = Object.values(players)
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({
        rank: idx + 1,
        fullName: `${p.firstName} ${p.lastName}`,
        score: p.score,
        correctCount: Math.round(p.score / 800), // Approximate estimation for summary
        avgTimeMs: p.lastResponseTimeMs || 2500,
      }));

    exportResultsToCsv(gameMeta?.quizTitle || 'Ilmhub_Game', rows);
    showToast(t('exportSuccess'));
  };

  const playerList = Object.values(players);
  const showQuestionOnPlayers = gameMeta?.showQuestionOnPlayers !== false;

  const handleToggleShowQuestionOnPlayers = async () => {
    if (!pin || !gameMeta) return;
    sound.playClick();
    const nextVal = !showQuestionOnPlayers;
    await updateGameStatus(pin, gameMeta.status, { showQuestionOnPlayers: nextVal });
  };

  // 1. LOBBY VIEW (PROJECTOR)
  if (!gameMeta || gameMeta.status === 'lobby') {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white select-none">
        {/* Top Bar with Join Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4">
            <Logo size="lg" />
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-300 font-bold block">
                {t('joinAt')}
              </span>
              <span className="text-xl sm:text-2xl font-black text-yellow-400">
                {window.location.host}/join/{pin}
              </span>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-xs uppercase tracking-widest text-slate-300 font-bold block">
              {t('gamePin')}
            </span>
            <span className="text-5xl sm:text-6xl font-black tracking-widest text-white drop-shadow-md">
              {pin}
            </span>
          </div>
        </div>

        {/* Center: QR Code & Live Player Pop-in List */}
        <div className="my-8 flex flex-col lg:flex-row items-center justify-center gap-10 max-w-6xl mx-auto w-full">
          {/* Huge QR Code Card */}
          <div className="bg-white p-5 rounded-3xl shadow-2xl flex flex-col items-center shrink-0">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Join QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                Loading QR...
              </div>
            )}
            <span className="text-slate-900 font-bold text-xs mt-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t('scanQrCode')}</span>
            </span>
          </div>

          {/* Players in Lobby Grid */}
          <div className="flex-1 w-full bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/10 min-h-[300px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-base">{t('playersInLobby')}</span>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-sm">
                {playerList.length}
              </span>
            </div>

            {playerList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <Users className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
                <p className="text-sm font-semibold">{t('noPlayersYet')}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 max-h-72 overflow-y-auto pr-1 content-start">
                {playerList.map((p) => (
                  <div
                    key={p.uid}
                    className="group relative px-4 py-2 rounded-2xl bg-white/15 hover:bg-rose-500/20 backdrop-blur-md text-white font-bold text-sm border border-white/20 transition-all flex items-center gap-2 animate-in zoom-in-95 duration-200"
                  >
                    <span>{p.firstName} {p.lastName}</span>
                    <button
                      onClick={() => handleKickPlayer(p.uid)}
                      title={t('kickPlayer')}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 text-xs text-slate-400 text-center font-medium">
              Tip: Press Space to start game when players have joined
            </div>
          </div>
        </div>

        {/* Lobby Setting: Show question on player devices */}
        <div className="max-w-6xl mx-auto w-full bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/20 text-yellow-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block">
                {t('showQuestionOnPlayers')}
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline">
                Display question text, media, and choices directly on students' screens
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleShowQuestionOnPlayers}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showQuestionOnPlayers ? 'bg-amber-400' : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={showQuestionOnPlayers}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 shadow-md transition duration-200 ease-in-out ${
                showQuestionOnPlayers ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleToggleFullscreen}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <button
            onClick={handleStartCountdown}
            disabled={playerList.length === 0}
            className="py-4 px-10 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xl shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-3"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>{t('startGame')} ({playerList.length})</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. COUNTDOWN VIEW
  if (gameMeta.status === 'countdown') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-950 text-white">
        <span className="text-2xl uppercase tracking-widest text-slate-400 mb-6 font-bold">
          {t('getReadyTitle')}
        </span>
        <div className="w-48 h-48 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center text-8xl font-black shadow-2xl animate-ping duration-1000">
          {countdownNum}
        </div>
      </div>
    );
  }

  // 3. LIVE QUESTION VIEW (PROJECTOR)
  if (gameMeta.status === 'question' && currentQuestion) {
    const answeredCount = Object.keys(answers).length;
    const totalCount = playerList.length;
    const isTrueFalse = currentQuestion.type === 'truefalse';

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-8 bg-slate-950 text-white select-none">
        {/* Top Header: Question Counter & Timer & Controls */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="px-4 py-1.5 rounded-full bg-white/10 font-bold text-sm text-yellow-400">
            {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}
          </span>

          {/* Animated Timer Pill */}
          <div className="flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full border border-white/15">
            <span className={`text-4xl font-black tabular-nums ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
              {timeLeft}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-full bg-white/10 font-bold text-sm text-slate-300">
              {answeredCount} / {totalCount} {t('answeredCounter')}
            </span>
            <button
              onClick={handleEndQuestionNow}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <StopCircle className="w-4 h-4" />
              <span>{t('endQuestionNow')}</span>
            </button>
          </div>
        </div>

        {/* Center: Big Question Card */}
        <div className="flex-1 flex flex-col items-center justify-center my-4 max-w-5xl mx-auto w-full text-center">
          <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight px-4 mb-6">
            {currentQuestion.text}
          </h2>

          {currentQuestion.imageUrl && (
            <img
              src={currentQuestion.imageUrl}
              alt="Question illustration"
              className="max-h-64 rounded-2xl object-contain shadow-2xl border border-white/10 mb-4"
            />
          )}
        </div>

        {/* Bottom Options Grid */}
        <div className={`grid gap-4 w-full max-w-6xl mx-auto ${isTrueFalse ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {isTrueFalse ? (
            <>
              <div className="p-6 rounded-2xl bg-blue-600 text-white flex items-center gap-4 text-2xl font-black shadow-lg">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" /></svg>
                </div>
                <span>{t('trueOption')}</span>
              </div>
              <div className="p-6 rounded-2xl bg-rose-600 text-white flex items-center gap-4 text-2xl font-black shadow-lg">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24"><polygon points="12,3 22,21 2,21" /></svg>
                </div>
                <span>{t('falseOption')}</span>
              </div>
            </>
          ) : (
            currentQuestion.options.map((opt, idx) => {
              const bgColors = ['bg-rose-600', 'bg-blue-600', 'bg-amber-500', 'bg-emerald-600'];
              const shapes = [
                <polygon points="12,3 22,21 2,21" />,
                <polygon points="12,2 22,12 12,22 2,12" />,
                <circle cx="12" cy="12" r="10" />,
                <rect x="3" y="3" width="18" height="18" rx="2" />,
              ];

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl ${bgColors[idx]} text-white flex items-center gap-4 text-xl sm:text-2xl font-black shadow-lg`}
                >
                  <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                    <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
                      {shapes[idx]}
                    </svg>
                  </div>
                  <span className="truncate">{opt}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 4. REVEAL VIEW (BAR CHART OF ANSWERS & CORRECT HIGHLIGHT)
  if (gameMeta.status === 'reveal' && currentQuestion && currentResult) {
    const isTrueFalse = currentQuestion.type === 'truefalse';
    const totalAnswers = currentResult.totalAnswered || 1;

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-8 bg-slate-950 text-white select-none">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xl font-black text-yellow-400">
            {t('roundResults')}
          </span>

          <button
            onClick={handleNextQuestion}
            className="py-3 px-8 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base shadow-xl transition-all active:scale-95 flex items-center gap-2"
          >
            <span>{t('nextQuestion')}</span>
            <SkipForward className="w-5 h-5 fill-slate-950" />
          </button>
        </div>

        {/* Center: Animated Bar Chart of Distribution */}
        <div className="my-8 max-w-4xl mx-auto w-full">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-center mb-10">
            {currentQuestion.text}
          </h3>

          <div className="grid grid-cols-4 gap-4 sm:gap-6 items-end h-64 sm:h-80 bg-white/5 p-6 rounded-3xl border border-white/10">
            {currentQuestion.options.map((opt, idx) => {
              const count = currentResult.distribution[idx] || 0;
              const heightPercent = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
              const isCorrect = currentResult.correctAnswers.includes(idx);
              const barColors = ['bg-rose-600', 'bg-blue-600', 'bg-amber-500', 'bg-emerald-600'];

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end">
                  <span className="text-lg font-black mb-2 text-white">
                    {count}
                  </span>
                  <div
                    style={{ height: `${Math.max(12, heightPercent)}%` }}
                    className={`w-full rounded-2xl ${barColors[idx]} transition-all duration-700 relative flex items-center justify-center shadow-lg ${
                      isCorrect ? 'ring-4 ring-yellow-400' : 'opacity-70'
                    }`}
                  >
                    {isCorrect && (
                      <CheckCircle className="w-6 h-6 text-yellow-300 fill-slate-950" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold truncate max-w-full text-slate-300 mt-3">
                    {opt}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Leaderboard Preview */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 max-w-2xl mx-auto w-full flex items-center justify-between text-xs sm:text-sm">
          <span className="font-bold text-slate-300">Top Player:</span>
          {leaderboard[0] ? (
            <span className="font-black text-yellow-400 text-base">
              🥇 {leaderboard[0].firstName} {leaderboard[0].lastName} ({leaderboard[0].score} pts)
            </span>
          ) : (
            <span>No players scored</span>
          )}
        </div>
      </div>
    );
  }

  // 5. FINAL PODIUM VIEW (CONFETTI, 1st 2nd 3rd, CSV EXPORT)
  if (gameMeta.status === 'finished') {
    const sortedFinal = Object.values(players).sort((a, b) => b.score - a.score);
    const first = sortedFinal[0];
    const second = sortedFinal[1];
    const third = sortedFinal[2];

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-b from-blue-950 via-slate-950 to-indigo-950 text-white select-none">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <h1 className="text-3xl font-black text-yellow-400">
            {t('podiumTitle')}
          </h1>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportResultsCsv')}</span>
          </button>
        </div>

        {/* Animated Podium Steps */}
        <div className="my-10 flex items-end justify-center gap-4 sm:gap-6 max-w-4xl mx-auto w-full">
          {/* 2nd Place */}
          {second && (
            <div className="flex flex-col items-center w-1/3">
              <span className="text-sm font-bold text-slate-300 mb-1 truncate max-w-full">
                {second.firstName} {second.lastName}
              </span>
              <span className="text-xs font-black text-yellow-400 mb-2">
                {second.score} pts
              </span>
              <div className="w-full h-44 rounded-t-3xl bg-gradient-to-t from-slate-700 to-slate-500 shadow-2xl flex flex-col items-center justify-center p-4 border-t-4 border-slate-300">
                <span className="text-4xl font-black text-white">2</span>
                <span className="text-xs font-bold uppercase mt-1 tracking-wider text-slate-200">
                  {t('secondPlace')}
                </span>
              </div>
            </div>
          )}

          {/* 1st Place (Champion) */}
          {first && (
            <div className="flex flex-col items-center w-1/3">
              <Trophy className="w-12 h-12 text-yellow-400 mb-2 animate-bounce" />
              <span className="text-base sm:text-lg font-black text-white mb-1 truncate max-w-full">
                {first.firstName} {first.lastName}
              </span>
              <span className="text-sm font-black text-yellow-400 mb-2">
                {first.score} pts
              </span>
              <div className="w-full h-60 rounded-t-3xl bg-gradient-to-t from-amber-500 to-yellow-400 shadow-2xl flex flex-col items-center justify-center p-4 border-t-4 border-yellow-200 text-slate-950">
                <span className="text-6xl font-black">1</span>
                <span className="text-sm font-black uppercase mt-1 tracking-wider">
                  {t('firstPlace')}
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex flex-col items-center w-1/3">
              <span className="text-sm font-bold text-slate-300 mb-1 truncate max-w-full">
                {third.firstName} {third.lastName}
              </span>
              <span className="text-xs font-black text-yellow-400 mb-2">
                {third.score} pts
              </span>
              <div className="w-full h-32 rounded-t-3xl bg-gradient-to-t from-amber-900 to-amber-700 shadow-2xl flex flex-col items-center justify-center p-4 border-t-4 border-amber-500">
                <span className="text-3xl font-black text-white">3</span>
                <span className="text-xs font-bold uppercase mt-1 tracking-wider text-amber-200">
                  {t('thirdPlace')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/host')}
            className="py-3.5 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
          >
            {t('returnToDashboard')}
          </button>
          <button
            onClick={handleExportCsv}
            className="py-3.5 px-8 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportResultsCsv')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-white">
      Loading game session...
    </div>
  );
};

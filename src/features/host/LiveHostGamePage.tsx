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
  startQuestionRound,
  updateGameStandings,
  subscribeStandings,
} from '../../lib/firebase';
import {
  GameMeta,
  PublicQuestion,
  Player,
  AnswerSubmission,
  QuestionResult,
  PlayerRoundResult,
  LeaderboardEntry,
  PlayerStanding,
} from '../../types/quiz';
import { sound } from '../../lib/audio';
import { calculateQuestionScore } from '../../lib/scoring';
import { exportResultsToCsv } from '../../lib/csv';
import { Logo } from '../../components/common/Logo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Users,
  Play,
  Pause,
  Clock,
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
  Sparkles,
  StopCircle,
  Smartphone,
  Copy,
  Share2,
  Check,
  Flame,
  ArrowRight,
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
  const [standings, setStandings] = useState<PlayerStanding[]>([]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-advance after reveal state
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState<number | null>(null);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const autoAdvanceSec = gameMeta?.autoAdvanceSec ?? 0;
  const showQuestionOnPlayers = gameMeta?.showQuestionOnPlayers !== false;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isEndingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const currentRoundIdRef = useRef<string | null>(null);
  const joinUrl = `${window.location.origin}/join/${pin}`;

  // Up-to-date refs to eliminate stale closure bugs during timer countdown and answer checks
  const answersRef = useRef<Record<string, AnswerSubmission>>({});
  const playersRef = useRef<Record<string, Player>>({});
  const gameMetaRef = useRef<GameMeta | null>(null);
  const questionsRef = useRef<PublicQuestion[] | null>(null);
  const standingsRef = useRef<PlayerStanding[]>([]);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { gameMetaRef.current = gameMeta; }, [gameMeta]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { standingsRef.current = standings; }, [standings]);

  // Helper: Compute and write standings (score descending, ties broken by lower response time)
  const computeAndPublishStandings = async (
    currentPlayers: Record<string, Player>,
    prevStandingsList: PlayerStanding[] = []
  ): Promise<PlayerStanding[]> => {
    if (!pin) return [];
    const prevMap: Record<string, number> = {};
    prevStandingsList.forEach((s) => {
      prevMap[s.uid] = s.rank;
    });

    const list = Object.values(currentPlayers).map((p) => ({
      uid: p.uid,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      score: p.score || 0,
      timeMs: p.lastResponseTimeMs ?? 999999,
    }));

    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeMs - b.timeMs;
    });

    const computed: PlayerStanding[] = list.map((p, idx) => {
      const rank = idx + 1;
      const prevRank = prevMap[p.uid] || rank;
      return {
        uid: p.uid,
        firstName: p.firstName,
        lastName: p.lastName,
        score: p.score,
        rank,
        prevRank,
      };
    });

    setStandings(computed);
    try {
      await updateGameStandings(pin, computed);
    } catch (err) {
      console.error('[Host] Failed to update standings:', err);
    }
    return computed;
  };

  // Subscribe to standings
  useEffect(() => {
    if (!pin) return;
    const unsub = subscribeStandings(pin, (s) => {
      if (s && Array.isArray(s)) setStandings(s);
    });
    return () => unsub();
  }, [pin]);

  // Log host game state on changes
  useEffect(() => {
    if (gameMeta) {
      console.debug('[Host State]', {
        roundId: gameMeta.roundId,
        currentIndex: gameMeta.currentIndex,
        status: gameMeta.status,
        endsAt: gameMeta.endsAt,
        now: Date.now(),
      });
    }
  }, [gameMeta]);

  // Generate QR Code on mount with brand colors
  useEffect(() => {
    if (pin) {
      QRCode.toDataURL(joinUrl, {
        width: 360,
        margin: 2,
        color: { dark: '#071A3D', light: '#FFFFFF' },
      })
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

  // Subscribe to answers during question round with explicit reset on round change
  useEffect(() => {
    if (pin && gameMeta && gameMeta.status === 'question') {
      // Clear answers from previous round immediately
      setAnswers({});
      const expectedIndex = gameMeta.currentIndex;
      const expectedRound = gameMeta.roundId;

      const unsubAnswers = subscribeAnswersForQuestion(pin, expectedIndex, (a) => {
        // Only accept if still on the same round
        if (gameMeta.currentIndex === expectedIndex) {
          setAnswers(a || {});
        }
      });
      return () => unsubAnswers();
    } else {
      setAnswers({});
    }
  }, [pin, gameMeta?.currentIndex, gameMeta?.status, gameMeta?.roundId]);

  const currentQuestion =
    questions && gameMeta && questions[gameMeta.currentIndex]
      ? questions[gameMeta.currentIndex]
      : null;

  // Synced 3-2-1 Countdown Logic: Starts question round atomically with roundId & server-offset time
  useEffect(() => {
    if (gameMeta?.status === 'countdown') {
      setCountdownNum(3);
      sound.playTick();

      const cdInterval = setInterval(async () => {
        setCountdownNum((prev) => {
          if (prev <= 1) {
            clearInterval(cdInterval);
            if (pin && currentQuestion && gameMeta) {
              const targetIndex = gameMeta.currentIndex || 0;
              const roundId = `round-${targetIndex}-${Date.now()}`;
              currentRoundIdRef.current = roundId;
              setAnswers({});
              computeAndPublishStandings(players, standings).catch(() => {});
              startQuestionRound(pin, targetIndex, currentQuestion.timeLimit, roundId).then((res) => {
                console.debug('[Host Game Started]', {
                  roundId,
                  currentIndex: targetIndex,
                  status: 'question',
                  endsAt: res.endsAt,
                  now: Date.now(),
                });
              }).catch((err) => {
                console.error('[Host] Error starting question round:', err);
              });
            }
            return 0;
          }
          sound.playTick();
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(cdInterval);
    }
  }, [gameMeta?.status, gameMeta?.currentIndex, pin, currentQuestion]);

  // Reveal auto-advance timer effect (advances automatically when autoAdvanceSec > 0)
  useEffect(() => {
    if (gameMeta?.status === 'reveal' && autoAdvanceSec > 0 && !autoAdvancePaused) {
      setAutoAdvanceRemaining(autoAdvanceSec);
      const interval = setInterval(() => {
        setAutoAdvanceRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            handleNextQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setAutoAdvanceRemaining(null);
    }
  }, [gameMeta?.status, gameMeta?.currentIndex, autoAdvanceSec, autoAdvancePaused]);

  // Question Timer Countdown
  useEffect(() => {
    if (gameMeta?.status === 'question' && currentQuestion) {
      isEndingRef.current = false;
      setTimeLeft(currentQuestion.timeLimit);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleEndQuestionNow(false);
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
  }, [gameMeta?.status, gameMeta?.roundId, gameMeta?.currentIndex, currentQuestion]);

  // Auto-end question if ALL CONNECTED players answered (checked seamlessly without stale closures)
  useEffect(() => {
    if (gameMeta?.status === 'question' && gameMeta?.roundId) {
      const checkAllAnswered = () => {
        if (isEndingRef.current || gameMetaRef.current?.status !== 'question') return;

        const connectedPlayers = Object.values(playersRef.current).filter((p) => p.connected !== false);
        const answeredCount = Object.keys(answersRef.current).length;

        // Immediately transition when all connected players submitted
        if (connectedPlayers.length > 0 && answeredCount >= connectedPlayers.length) {
          handleEndQuestionNow(false);
        }
      };

      const timer = setTimeout(checkAllAnswered, 300);
      return () => clearTimeout(timer);
    }
  }, [answers, players, gameMeta?.status, gameMeta?.roundId]);

  // Reveal calculation: Evaluate scores, per-player delta, update player streak & totals (Atomic & Idempotent)
  const handleEndQuestionNow = async (forceSkip = false) => {
    const meta = gameMetaRef.current;
    const questionsList = questionsRef.current;
    if (!pin || !meta || !questionsList) return;
    const activeQuestion = questionsList[meta.currentIndex];
    if (!activeQuestion || meta.status !== 'question') return;
    if (isEndingRef.current) return;

    // Grace period for accidental double triggers
    const roundAge = Date.now() - (meta.startedAt || Date.now());
    if (!forceSkip && roundAge < 800) {
      return;
    }

    isEndingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    sound.playRoundEnd();

    console.debug('[Host EndQuestion]', {
      roundId: meta.roundId,
      currentIndex: meta.currentIndex,
      status: 'reveal',
      roundAge,
      forceSkip,
      now: Date.now(),
    });

    try {
      // 1. Fetch secret correct answers for this question
      const secret = await getGameSecret(pin, meta.currentIndex);
      const correctAnswers = secret?.correctAnswers || [0];

      // 2. Tally distribution across options
      const optionCount = activeQuestion.options.length;
      const distribution = new Array(optionCount).fill(0);

      const currentAnswers = { ...answersRef.current };
      const updatedPlayers = { ...playersRef.current };
      const prevStandingsList = standingsRef.current;
      const prevMap: Record<string, number> = {};
      prevStandingsList.forEach((s) => {
        prevMap[s.uid] = s.rank;
      });

      const perPlayerResults: Record<string, PlayerRoundResult> = {};

      // Process all players: calculate score for those who answered, reset streak for those who didn't
      Object.entries(updatedPlayers).forEach(([uid, playerRecord]) => {
        const ans = currentAnswers[uid];
        if (ans) {
          // Tally distribution
          ans.choice.forEach((c) => {
            if (c >= 0 && c < optionCount) {
              distribution[c] = (distribution[c] || 0) + 1;
            }
          });

          // Exact correctness check:
          const isCorrect =
            Array.isArray(ans.choice) &&
            ans.choice.length > 0 &&
            ans.choice.every((c) => correctAnswers.includes(c)) &&
            correctAnswers.every((ca) => ans.choice.includes(ca));

          const scoreResult = calculateQuestionScore({
            isCorrect,
            responseTimeMs: ans.timeMs,
            timeLimitSeconds: activeQuestion.timeLimit,
            pointsMode: activeQuestion.pointsMode,
            currentStreak: playerRecord.streak || 0,
          });

          const newScore = (playerRecord.score || 0) + scoreResult.pointsEarned;
          const newStreak = scoreResult.newStreak;

          updatedPlayers[uid] = {
            ...playerRecord,
            score: newScore,
            streak: newStreak,
            lastResponseTimeMs: ans.timeMs,
          };

          perPlayerResults[uid] = {
            correct: isCorrect,
            delta: scoreResult.pointsEarned,
            score: newScore,
            rank: 1,
            prevRank: prevMap[uid] || 1,
            streak: newStreak,
          };
        } else {
          // Player did not answer in time: streak resets to 0
          updatedPlayers[uid] = {
            ...playerRecord,
            streak: 0,
          };

          perPlayerResults[uid] = {
            correct: false,
            delta: 0,
            score: playerRecord.score || 0,
            rank: 1,
            prevRank: prevMap[uid] || 1,
            streak: 0,
          };
        }
      });

      // Compute updated standings
      const computedStandings = await computeAndPublishStandings(updatedPlayers, prevStandingsList);
      computedStandings.forEach((s) => {
        if (perPlayerResults[s.uid]) {
          perPlayerResults[s.uid].rank = s.rank;
          perPlayerResults[s.uid].prevRank = s.prevRank;
        }
      });

      const result: QuestionResult = {
        questionIndex: meta.currentIndex,
        roundId: meta.roundId,
        correctAnswers,
        distribution,
        totalAnswered: Object.keys(currentAnswers).length,
        perPlayer: perPlayerResults,
      };

      setCurrentResult(result);

      // Compute updated Leaderboard sorted by score descending, ties broken by faster response time
      const sortedLeaderboard: LeaderboardEntry[] = Object.values(updatedPlayers)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const aTime = a.lastResponseTimeMs ?? 999999;
          const bTime = b.lastResponseTimeMs ?? 999999;
          return aTime - bTime;
        })
        .map((p, idx) => ({
          uid: p.uid,
          firstName: p.firstName,
          lastName: p.lastName,
          score: p.score,
          streak: p.streak,
          rank: idx + 1,
        }));

      setPlayers(updatedPlayers);
      setLeaderboard(sortedLeaderboard);

      // Publish atomically to Realtime Database
      await publishQuestionResult(pin, meta.currentIndex, result, updatedPlayers, computedStandings);
    } catch (err) {
      console.error('[Host] Error ending question round:', err);
    } finally {
      isEndingRef.current = false;
    }
  };

  const handleStartCountdown = async () => {
    if (!pin || Object.keys(players).length === 0 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    sound.playClick();
    try {
      await updateGameStatus(pin, 'countdown');
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const handleNextQuestion = async () => {
    const meta = gameMetaRef.current;
    const questionsList = questionsRef.current;
    if (!pin || !meta || !questionsList || isTransitioningRef.current) return;
    if (meta.status !== 'reveal') return;
    isTransitioningRef.current = true;
    sound.playClick();

    try {
      const nextIndex = meta.currentIndex + 1;

      if (nextIndex >= questionsList.length) {
        // Game finished! Final Podium
        await updateGameStatus(pin, 'finished');
        sound.playWin();
        try {
          confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
        } catch {}
      } else {
        // Reset answers & transition to Next Question Countdown
        setAnswers({});
        await updateGameStatus(pin, 'countdown', { currentIndex: nextIndex });
      }
    } finally {
      isTransitioningRef.current = false;
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

  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    showToast(t('toastPinCopied'));
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    showToast(t('copied'));
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'ILMHUB KAHOOT',
        text: `Join the live game with PIN: ${pin}`,
        url: joinUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `ilmhub-game-${pin}-qr.png`;
    a.click();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameMeta?.status === 'lobby') handleStartCountdown();
        else if (gameMeta?.status === 'reveal') handleNextQuestion();
      } else if (e.code === 'KeyS') {
        if (gameMeta?.status === 'question') handleEndQuestionNow(true);
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
        correctCount: Math.round(p.score / 800),
        avgTimeMs: p.lastResponseTimeMs || 2500,
      }));

    exportResultsToCsv(gameMeta?.quizTitle || 'Ilmhub_Game', rows);
    showToast(t('exportSuccess'));
  };

  const playerList = Object.values(players);

  const handleToggleShowQuestionOnPlayers = async () => {
    if (!pin || !gameMeta) return;
    sound.playClick();
    const nextVal = !showQuestionOnPlayers;
    await updateGameStatus(pin, gameMeta.status, { showQuestionOnPlayers: nextVal });
  };

  const handleSetAutoAdvanceSec = async (sec: number) => {
    if (!pin || !gameMeta) return;
    sound.playClick();
    await updateGameStatus(pin, gameMeta.status, { autoAdvanceSec: sec });
  };

  // Format PIN visually: "728 491"
  const formattedPin = pin && pin.length === 6 ? `${pin.slice(0, 3)} ${pin.slice(3, 6)}` : pin;

  // Avatar background colors
  const avatarBgColors = [
    'from-blue-600 to-indigo-700',
    'from-amber-500 to-yellow-600',
    'from-emerald-600 to-teal-700',
    'from-rose-600 to-pink-700',
    'from-purple-600 to-violet-800',
    'from-cyan-600 to-blue-700',
  ];

  // ==========================================
  // 1. PROJECTOR LOBBY VIEW
  // ==========================================
  if (!gameMeta || gameMeta.status === 'lobby') {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-10 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white select-none transition-colors">
        {/* Top Bar with Projector Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-[#0B1730]/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl">
          <div className="flex items-center gap-4">
            <Logo size="lg" showTagline={false} />
            <div>
              <span className="text-xs uppercase tracking-widest text-[#0757D9] dark:text-[#FFC928] font-black block">
                {t('joinAt')}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {window.location.host}/join
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {/* Huge Projector-Friendly PIN */}
            <div className="text-center sm:text-right">
              <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-1">
                {t('gamePinLabel')}
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-3">
                <span
                  style={{ fontSize: 'clamp(44px, 7vw, 100px)' }}
                  className="font-black tracking-[0.2em] text-[#0757D9] dark:text-[#FFC928] drop-shadow-sm leading-none"
                >
                  {formattedPin}
                </span>
                <button
                  onClick={handleCopyPin}
                  title={t('copyPin')}
                  className="p-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-all active:scale-95 shrink-0 cursor-pointer"
                >
                  {copiedPin ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center: QR Card & Live Player Grid */}
        <div className="my-8 flex flex-col lg:flex-row items-center justify-center gap-8 max-w-7xl mx-auto w-full">
          {/* SCAN TO JOIN QR Card */}
          <div className="bg-white dark:bg-[#0B1730] text-slate-900 dark:text-white p-6 rounded-3xl shadow-2xl flex flex-col items-center shrink-0 border-4 border-[#0757D9] dark:border-[#FFC928]">
            <div className="text-xs font-black uppercase tracking-widest text-[#0757D9] dark:text-[#FFC928] mb-3">
              {t('scanToJoin')}
            </div>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Join QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl bg-white p-2"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 dark:bg-[#050B18] rounded-2xl flex items-center justify-center text-slate-400 font-bold">
                Loading QR...
              </div>
            )}
            <div className="text-sm font-black text-slate-800 dark:text-white mt-3">
              or enter: <span className="text-[#0757D9] dark:text-[#FFC928]">{formattedPin}</span>
            </div>

            {/* QR Action Buttons: Copy Link, Share, Download QR */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/10 w-full justify-center">
              <button
                onClick={handleCopyLink}
                title={t('copyLink')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{t('copyLink')}</span>
              </button>
              <button
                onClick={handleShare}
                title={t('sharePin')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('sharePin')}</span>
              </button>
              <button
                onClick={handleDownloadQr}
                title={t('downloadQr')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
            </div>
          </div>

          {/* Players in Lobby Grid */}
          <div className="flex-1 w-full bg-white/90 dark:bg-[#0B1730]/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 min-h-[380px] flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0757D9]/15 dark:bg-[#0757D9]/20 text-[#0757D9] dark:text-[#FFC928] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {t('playersJoining')}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Live classroom roster
                  </span>
                </div>
              </div>

              {/* Animated Player Counter */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0757D9] dark:bg-[#FFC928] text-white dark:text-[#071A3D] font-black text-base shadow-lg animate-pulse">
                <span>{playerList.length}</span>
                <span>{t('playersCount')}</span>
              </div>
            </div>

            {playerList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8">
                <Users className="w-16 h-16 mb-4 opacity-30 animate-pulse text-[#0757D9] dark:text-[#FFC928]" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                  {t('noPlayersYet')}
                </p>
                <span className="text-xs text-slate-500 mt-1">
                  Students join from their phones using the PIN above
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 max-h-72 overflow-y-auto pr-1 content-start">
                {playerList.map((p, idx) => {
                  const gradient = avatarBgColors[idx % avatarBgColors.length];
                  return (
                    <div
                      key={p.uid}
                      className="group relative px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#102044] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-3 animate-in zoom-in-95 duration-200 shadow-xs"
                    >
                      {/* Avatar circle */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center font-black text-xs text-white shadow-xs shrink-0`}>
                        {p.firstName[0]}
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {p.firstName} {p.lastName}
                      </span>
                      <button
                        onClick={() => handleKickPlayer(p.uid)}
                        title={t('kickPlayer')}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-opacity ml-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
              Tip: Press Spacebar on keyboard to start the game
            </div>
          </div>
        </div>

        {/* Lobby Settings: Show question on player devices & Auto-advance */}
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Show question on player devices */}
          <div className="bg-white/90 dark:bg-[#0B1730]/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#0757D9]/10 text-[#0757D9] dark:text-[#FFC928] shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {t('showQuestionOnPlayers')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Display questions and options on student phones
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleShowQuestionOnPlayers}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showQuestionOnPlayers ? 'bg-[#0757D9] dark:bg-[#FFC928]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={showQuestionOnPlayers}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white dark:bg-[#071A3D] shadow-md transition duration-200 ease-in-out ${
                  showQuestionOnPlayers ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-advance setting */}
          <div className="bg-white/90 dark:bg-[#0B1730]/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#FFC928] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {t('autoAdvanceLabel')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Automatically proceed to next question
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {[0, 5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSetAutoAdvanceSec(sec)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    autoAdvanceSec === sec
                      ? 'bg-[#0757D9] dark:bg-[#FFC928] text-white dark:text-[#071A3D] shadow-md scale-105'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'
                  }`}
                >
                  {sec === 0 ? t('autoAdvanceOff') : `${sec}s`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <button
            onClick={handleToggleFullscreen}
            className="p-3.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-transparent transition-colors shadow-sm cursor-pointer"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <button
            onClick={handleStartCountdown}
            disabled={playerList.length === 0}
            className="py-4 px-10 rounded-2xl bg-gradient-to-r from-[#0757D9] to-[#1769FF] dark:from-[#FFC928] dark:to-[#FFD43B] text-white dark:text-[#071A3D] font-black text-xl shadow-2xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-3 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>{t('startGame')} ({playerList.length})</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. COUNTDOWN VIEW
  // ==========================================
  if (gameMeta.status === 'countdown') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white transition-colors">
        <span className="text-2xl uppercase tracking-widest text-[#0757D9] dark:text-[#FFC928] mb-6 font-black">
          {t('getReadyTitle')}
        </span>
        <div className="w-48 h-48 rounded-full bg-[#0757D9] dark:bg-[#FFC928] text-white dark:text-[#071A3D] flex items-center justify-center text-8xl font-black shadow-2xl animate-ping duration-1000">
          {countdownNum}
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. LIVE QUESTION VIEW (PROJECTOR)
  // ==========================================
  if (gameMeta.status === 'question' && currentQuestion) {
    const answeredCount = Object.keys(answers).length;
    const connectedPlayers = Object.values(players).filter((p) => p.connected !== false);
    const totalCount = Math.max(playerList.length, connectedPlayers.length);
    const isTrueFalse = currentQuestion.type === 'truefalse';
    const topStandings = standings.length > 0 ? standings.slice(0, 5) : Object.values(players).slice(0, 5).map((p, idx) => ({
      uid: p.uid,
      firstName: p.firstName,
      lastName: p.lastName,
      score: p.score || 0,
      rank: idx + 1,
      prevRank: idx + 1,
    }));

    return (
      <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-between p-2.5 sm:p-4 lg:p-6 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white select-none safe-area-inset transition-colors">
        {/* Top Header: Question Counter & Timer Ring & Controls */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 shrink-0 h-10 sm:h-12">
          <div className="flex items-center gap-2">
            <span className="px-3 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0B1730] border border-slate-200 dark:border-white/10 font-black text-xs sm:text-sm text-[#0757D9] dark:text-[#FFC928] shadow-xs">
              {t('questionLabel')} {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}
            </span>
            <span className="hidden sm:inline-block px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-xs">
              PIN: {pin}
            </span>
          </div>

          {/* Center Fluid Timer Ring */}
          <div className="flex items-center justify-center">
            <div
              className={`w-[12vmin] h-[12vmin] min-w-[44px] min-h-[44px] max-w-[64px] max-h-[64px] rounded-full flex flex-col items-center justify-center shadow-lg border-3 transition-colors ${
                timeLeft <= 5
                  ? 'border-rose-500 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 animate-pulse'
                  : 'border-[#0757D9] dark:border-[#FFC928] bg-white dark:bg-[#0B1730] text-slate-900 dark:text-white'
              }`}
            >
              <span className="text-base sm:text-2xl font-black tabular-nums leading-none">
                {timeLeft}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold hidden sm:block">
                {t('secShort')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B1730] border border-slate-200 dark:border-white/10 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs">
              <Users className="w-3.5 h-3.5 text-[#0757D9] dark:text-[#FFC928]" />
              <span>{answeredCount} / {totalCount}</span>
              <span className="hidden md:inline text-[11px] text-slate-500 dark:text-slate-400">{t('answeredCounter')}</span>
            </div>

            <ThemeToggle />

            <button
              onClick={() => handleEndQuestionNow(true)}
              title={t('skipQuestion')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('skipQuestion')}</span>
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors hidden sm:flex items-center justify-center cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Live Standings Ticker */}
        <div className="flex lg:hidden items-center justify-center gap-2 overflow-x-auto py-1 shrink-0 text-xs">
          {topStandings.slice(0, 3).map((p) => {
            const hasAns = Boolean(answers[p.uid]);
            return (
              <div
                key={p.uid}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                  hasAns
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</span>
                <span className="truncate max-w-[80px]">{p.firstName}</span>
                <span className="text-[#0757D9] dark:text-[#FFC928] font-black">{p.score}</span>
                {hasAns && <span className="text-emerald-500 font-black">✓</span>}
              </div>
            );
          })}
        </div>

        {/* Middle Content */}
        <div className="flex-1 min-h-0 flex flex-row items-stretch justify-between gap-3 sm:gap-4 my-1 sm:my-2 overflow-hidden">
          {/* Question Display Card */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-3 sm:p-5 bg-white dark:bg-[#0B1730]/70 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-lg">
            {currentQuestion.imageUrl && (
              <img
                src={currentQuestion.imageUrl}
                alt="Question illustration"
                className="max-h-[20vh] sm:max-h-[26vh] rounded-2xl object-contain shadow-md border border-slate-200 dark:border-white/10 mb-2 shrink-0"
              />
            )}
            <h2 className="text-[clamp(1.15rem,3.2vw,2.2rem)] font-black leading-tight tracking-tight px-2 text-slate-900 dark:text-white line-clamp-3">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Desktop Live Standings Panel */}
          <div className="hidden lg:flex w-64 xl:w-72 flex-col bg-white dark:bg-[#0B1730]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-3.5 shrink-0 shadow-lg overflow-hidden self-stretch">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/10 text-xs font-black text-[#0757D9] dark:text-[#FFC928]">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>{t('liveStandings')} ({t('top5')})</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                {answeredCount}/{totalCount}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {topStandings.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                  {t('noPlayersYet')}
                </div>
              ) : (
                topStandings.map((p) => {
                  const hasAnsweredPlayer = Boolean(answers[p.uid]);
                  return (
                    <div
                      key={p.uid}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                        hasAnsweredPlayer
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-black text-xs w-4 text-center shrink-0">
                          {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[100px] xl:max-w-[120px]">
                          {p.firstName} {p.lastName?.[0] ? `${p.lastName[0]}.` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-extrabold text-[#0757D9] dark:text-[#FFC928] text-[11px]">{p.score}</span>
                        {hasAnsweredPlayer ? (
                          <span
                            className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black animate-in zoom-in duration-200"
                            title="Answered"
                          >
                            ✓
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-white/10 text-slate-400 flex items-center justify-center text-[9px]">
                            …
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Options Grid */}
        <div
          className={`grid gap-2 sm:gap-3 w-full shrink-0 ${
            isTrueFalse ? 'grid-cols-2 max-h-[26vh]' : 'grid-cols-2 max-h-[30vh] sm:max-h-[32vh]'
          }`}
        >
          {isTrueFalse ? (
            <>
              {/* True: Royal Blue */}
              <div className="p-3 sm:p-5 rounded-2xl bg-[#0757D9] text-white flex items-center gap-3 sm:gap-4 text-base sm:text-xl font-black shadow-xl border-2 border-blue-400/30 min-h-[50px]">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,2 22,12 12,22 2,12" />
                  </svg>
                </div>
                <span className="text-[clamp(1rem,2.8vw,1.4rem)] uppercase">{t('trueOption')}</span>
              </div>
              {/* False: Rose/Red */}
              <div className="p-3 sm:p-5 rounded-2xl bg-[#E11D48] text-white flex items-center gap-3 sm:gap-4 text-base sm:text-xl font-black shadow-xl border-2 border-rose-400/30 min-h-[50px]">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-white" viewBox="0 0 24 24">
                    <polygon points="12,3 22,21 2,21" />
                  </svg>
                </div>
                <span className="text-[clamp(1rem,2.8vw,1.4rem)] uppercase">{t('falseOption')}</span>
              </div>
            </>
          ) : (
            currentQuestion.options.map((opt, idx) => {
              const bgColors = [
                'bg-[#E11D48] border-rose-400/30',
                'bg-[#0757D9] border-blue-400/30',
                'bg-[#D97706] border-amber-400/30',
                'bg-[#059669] border-emerald-400/30',
              ];
              const letters = ['A', 'B', 'C', 'D'];
              const shapes = [
                <polygon key="1" points="12,3 22,21 2,21" />,
                <polygon key="2" points="12,2 22,12 12,22 2,12" />,
                <circle key="3" cx="12" cy="12" r="10" />,
                <rect key="4" x="3" y="3" width="18" height="18" rx="2" />,
              ];

              return (
                <div
                  key={idx}
                  className={`p-3 sm:p-4 rounded-2xl ${bgColors[idx]} text-white flex items-center gap-2.5 sm:gap-3 text-sm sm:text-base font-black shadow-lg border-2 min-h-[48px] overflow-hidden`}
                >
                  <div className="w-7 h-7 sm:w-9 sm:h-9 bg-black/20 rounded-xl flex items-center justify-center shrink-0 text-xs sm:text-sm font-black">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white mr-1" viewBox="0 0 24 24">
                      {shapes[idx]}
                    </svg>
                    <span>{letters[idx]}</span>
                  </div>
                  <span className="truncate text-[clamp(0.9rem,2.2vw,1.25rem)] font-extrabold leading-snug">
                    {opt}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. REVEAL VIEW (RESPONSE BAR CHART & LIVE RANKINGS)
  // ==========================================
  if (gameMeta.status === 'reveal' && currentQuestion && currentResult) {
    const totalAnswers = currentResult.totalAnswered || 1;
    const isLastQuestion = gameMeta.currentIndex + 1 >= (questions?.length || 0);

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-8 bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white select-none transition-colors">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 dark:bg-[#0B1730]/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black text-[#0757D9] dark:text-[#FFC928]">
              {t('roundResults')}
            </span>

            {/* Auto-advance indicator */}
            {autoAdvanceRemaining !== null && autoAdvanceRemaining > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-[#FFC928] text-xs font-black animate-pulse">
                <Clock className="w-4 h-4 animate-spin" />
                <span>{t('autoAdvanceNextIn')}: {autoAdvanceRemaining}s</span>
                <button
                  type="button"
                  onClick={() => setAutoAdvancePaused(!autoAdvancePaused)}
                  className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors ml-1 cursor-pointer"
                  title={autoAdvancePaused ? t('autoAdvanceResume') : t('autoAdvancePause')}
                >
                  {autoAdvancePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Auto-advance Selector in Reveal view */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">{t('autoAdvance')}:</span>
              {[0, 5, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSetAutoAdvanceSec(sec)}
                  className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    autoAdvanceSec === sec
                      ? 'bg-[#0757D9] dark:bg-[#FFC928] text-white dark:text-[#071A3D] font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {sec === 0 ? t('autoAdvanceOff') : `${sec}s`}
                </button>
              ))}
            </div>

            <ThemeToggle />

            {/* Next Question / Show Podium Button */}
            <button
              onClick={handleNextQuestion}
              className="py-3 px-8 rounded-2xl bg-gradient-to-r from-[#0757D9] to-[#1769FF] dark:from-[#FFC928] dark:to-[#FFD43B] text-white dark:text-[#071A3D] font-black text-base shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer hover:brightness-105"
            >
              <span>{isLastQuestion ? t('showPodium') : t('nextQuestion')}</span>
              {autoAdvanceRemaining !== null && autoAdvanceRemaining > 0 && !autoAdvancePaused && (
                <span className="opacity-80 text-xs font-bold">({autoAdvanceRemaining}s)</span>
              )}
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>

        {/* Center: Animated Bar Chart of Distribution */}
        <div className="my-8 max-w-5xl mx-auto w-full">
          <h3 className="text-2xl sm:text-3xl font-black text-center mb-8 text-slate-900 dark:text-white">
            {currentQuestion.text}
          </h3>

          <div className="grid grid-cols-4 gap-4 sm:gap-6 items-end h-64 sm:h-80 bg-white dark:bg-[#0B1730] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl">
            {currentQuestion.options.map((opt, idx) => {
              const count = currentResult.distribution[idx] || 0;
              const heightPercent = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
              const isCorrect = currentResult.correctAnswers.includes(idx);
              const barColors = ['bg-[#E11D48]', 'bg-[#0757D9]', 'bg-[#D97706]', 'bg-[#059669]'];
              const letters = ['A', 'B', 'C', 'D'];

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end">
                  <span className="text-xl font-black mb-2 text-slate-900 dark:text-white">
                    {count}
                  </span>
                  <div
                    style={{ height: `${Math.max(14, heightPercent)}%` }}
                    className={`w-full rounded-2xl ${barColors[idx]} transition-all duration-700 relative flex items-center justify-center shadow-lg ${
                      isCorrect ? 'ring-4 ring-[#0757D9] dark:ring-[#FFC928]' : 'opacity-65'
                    }`}
                  >
                    {isCorrect && (
                      <CheckCircle className="w-7 h-7 text-white dark:text-[#FFC928] fill-current" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs sm:text-sm font-bold truncate max-w-full text-slate-700 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-white/15 flex items-center justify-center text-[11px] font-black shrink-0 text-slate-900 dark:text-white">
                      {letters[idx]}
                    </span>
                    <span className="truncate">{opt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Top Players Mini-Leaderboard */}
        <div className="bg-white/90 dark:bg-[#0B1730] backdrop-blur-md rounded-2xl p-4 sm:p-5 max-w-3xl mx-auto w-full border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs sm:text-sm shadow-xl">
          <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#0757D9] dark:text-[#FFC928]" />
            <span>Top Ranks:</span>
          </span>
          <div className="flex items-center gap-4">
            {leaderboard.slice(0, 3).map((entry, idx) => (
              <span key={entry.uid} className="font-extrabold text-slate-900 dark:text-white">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {entry.firstName} ({entry.score} pts)
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. FINAL PODIUM VIEW
  // ==========================================
  if (gameMeta.status === 'finished') {
    const sortedFinal = Object.values(players).sort((a, b) => b.score - a.score);
    const first = sortedFinal[0];
    const second = sortedFinal[1];
    const third = sortedFinal[2];

    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-b from-[#EBF1FD] via-[#F5F8FF] to-[#EBF1FD] dark:from-[#071A3D] dark:via-[#050B18] dark:to-[#071A3D] text-slate-900 dark:text-white select-none transition-colors">
        <div className="flex items-center justify-between">
          <Logo size="md" showTagline={false} />
          <h1 className="text-3xl sm:text-4xl font-black text-[#0757D9] dark:text-[#FFC928]">
            {t('podiumTitle')}
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-2 border border-slate-200 dark:border-white/10 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#0757D9] dark:text-[#FFC928]" />
              <span>{t('exportResultsCsv')}</span>
            </button>
          </div>
        </div>

        {/* Animated Podium Steps */}
        <div className="my-10 flex items-end justify-center gap-4 sm:gap-8 max-w-4xl mx-auto w-full">
          {/* 2nd Place */}
          {second && (
            <div className="flex flex-col items-center w-1/3">
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1 truncate max-w-full">
                {second.firstName} {second.lastName}
              </span>
              <span className="text-sm font-black text-[#0757D9] dark:text-[#FFC928] mb-2">
                {second.score} pts
              </span>
              <div className="w-full h-48 rounded-t-3xl bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-500 shadow-2xl flex flex-col items-center justify-center p-4 border-t-4 border-slate-300">
                <span className="text-5xl font-black text-white">2</span>
                <span className="text-xs font-bold uppercase mt-1 tracking-wider text-slate-100 dark:text-slate-200">
                  {t('secondPlace')}
                </span>
              </div>
            </div>
          )}

          {/* 1st Place (Champion) */}
          {first && (
            <div className="flex flex-col items-center w-1/3">
              <Trophy className="w-16 h-16 text-amber-500 dark:text-[#FFC928] mb-2 animate-bounce" />
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 truncate max-w-full">
                {first.firstName} {first.lastName}
              </span>
              <span className="text-base font-black text-[#0757D9] dark:text-[#FFC928] mb-2">
                {first.score} pts
              </span>
              <div className="w-full h-64 rounded-t-3xl bg-gradient-to-t from-amber-500 to-[#FFC928] shadow-2xl flex flex-col items-center justify-center p-4 border-t-4 border-yellow-200 text-[#071A3D]">
                <span className="text-7xl font-black">1</span>
                <span className="text-sm font-black uppercase mt-1 tracking-wider">
                  {t('firstPlace')}
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex flex-col items-center w-1/3">
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1 truncate max-w-full">
                {third.firstName} {third.lastName}
              </span>
              <span className="text-sm font-black text-[#0757D9] dark:text-[#FFC928] mb-2">
                {third.score} pts
              </span>
              <div className="w-full h-36 rounded-t-3xl bg-gradient-to-t from-amber-800 to-amber-600 dark:from-amber-900 dark:to-amber-700 shadow-2xl flex flex-col items-center justify-center p-4 border-t-4 border-amber-500 text-white">
                <span className="text-4xl font-black text-white">3</span>
                <span className="text-xs font-bold uppercase mt-1 tracking-wider text-amber-100 dark:text-amber-200">
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
            className="py-4 px-8 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-sm transition-all border border-slate-200 dark:border-white/10 shadow-sm cursor-pointer"
          >
            {t('returnToDashboard')}
          </button>
          <button
            onClick={handleExportCsv}
            className="py-4 px-8 rounded-2xl bg-[#0757D9] dark:bg-[#FFC928] hover:brightness-105 text-white dark:text-[#071A3D] font-black text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportResultsCsv')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5F8FF] dark:bg-[#050B18] text-slate-900 dark:text-white">
      Loading game session...
    </div>
  );
};

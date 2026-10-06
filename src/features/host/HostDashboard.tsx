import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import {
  getUserQuizzes,
  saveUserQuiz,
  deleteUserQuiz,
  loginWithGoogle,
  subscribeAuth,
  getCurrentAuthUser,
  createGameSession,
  extractFirebaseError,
} from '../../lib/firebase';
import { Quiz } from '../../types/quiz';
import { SAMPLE_QUIZZES } from '../../data/sampleQuizzes';
import { sound } from '../../lib/audio';
import {
  Plus,
  Play,
  Edit3,
  Copy,
  Trash2,
  Download,
  Sparkles,
  LogIn,
  BookOpen,
  Clock,
  Layers,
  AlertCircle,
  RefreshCw,
  Loader2,
  Users,
  Trophy,
  Activity,
  Flame,
  CheckCircle2,
  Gamepad2,
  LayoutDashboard,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';

export const HostDashboard: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { hostUser, setHostUser, showToast } = useGameStore();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startingGameId, setStartingGameId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'presets'>('quizzes');

  // Subscribe to auth state changes
  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      setHostUser(user);
    });
    return () => unsub();
  }, [setHostUser]);

  // Load user quizzes after verifying authentication
  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const currentUser = await getCurrentAuthUser();
      if (currentUser && currentUser.uid) {
        setHostUser(currentUser);
        const userQuizzes = await getUserQuizzes(currentUser.uid);
        setQuizzes(userQuizzes);
      } else {
        setQuizzes([]);
      }
    } catch (err) {
      console.error('[HostDashboard] Error loading quizzes:', err);
      const { code, message } = extractFirebaseError(err);
      setLoadError(`${code}: ${message}`);
      showToast(`Error [${code}]: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [setHostUser, showToast]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleHostLogin = async () => {
    sound.playClick();
    try {
      const user = await loginWithGoogle();
      setHostUser(user);
      showToast('Logged in successfully!');
      loadQuizzes();
    } catch (err: unknown) {
      console.error('[HostDashboard] Login error:', err);
      const { code, message } = extractFirebaseError(err);
      showToast(`Login failed [${code}]: ${message}`);
    }
  };

  // Launch live game session using atomic createGameSession
  const handleStartGame = async (quiz: Quiz) => {
    sound.playClick();
    if (!quiz.questions || quiz.questions.length === 0) {
      showToast('Cannot start a quiz without questions!');
      return;
    }

    setStartingGameId(quiz.id);

    try {
      const currentUser = await getCurrentAuthUser();
      const hostUid = currentUser?.uid || hostUser?.uid;

      if (!hostUid) {
        showToast('Please sign in with Google to host a live game.');
        setStartingGameId(null);
        return;
      }

      const pin = await createGameSession(quiz, hostUid);

      sound.playCorrect();
      showToast(`${t('toastGameJoined')} PIN: ${pin}`);
      navigate(`/host/game/${pin}`);
    } catch (err) {
      console.error('[HostDashboard] Failed to start game session:', err);
      const { code, message } = extractFirebaseError(err);
      showToast(`Failed to start game [${code}]: ${message}`);
    } finally {
      setStartingGameId(null);
    }
  };

  const handleDuplicateQuiz = async (quiz: Quiz) => {
    sound.playClick();
    const currentUser = await getCurrentAuthUser();
    const uid = currentUser?.uid || hostUser?.uid;

    if (!uid) {
      showToast('Please sign in to duplicate quizzes.');
      return;
    }

    try {
      const duplicated: Quiz = {
        ...quiz,
        id: `quiz-${Date.now()}`,
        title: `${quiz.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: uid,
      };

      await saveUserQuiz(uid, duplicated);
      setQuizzes((prev) => [duplicated, ...prev]);
      showToast(t('copied'));
    } catch (err) {
      const { code, message } = extractFirebaseError(err);
      showToast(`Failed to duplicate [${code}]: ${message}`);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm(t('deleteQuizConfirm'))) return;
    sound.playClick();
    const currentUser = await getCurrentAuthUser();
    const uid = currentUser?.uid || hostUser?.uid;

    if (!uid) return;

    try {
      await deleteUserQuiz(uid, quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      showToast('Quiz deleted');
    } catch (err) {
      const { code, message } = extractFirebaseError(err);
      showToast(`Delete failed [${code}]: ${message}`);
    }
  };

  const handleExportJson = (quiz: Quiz) => {
    sound.playClick();
    const jsonStr = JSON.stringify(quiz, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON exported');
  };

  const handleClonePreset = async (preset: Quiz) => {
    sound.playClick();
    const currentUser = await getCurrentAuthUser();
    const uid = currentUser?.uid || hostUser?.uid;

    if (!uid) {
      showToast('Please sign in to copy sample quizzes to your account.');
      return;
    }

    try {
      const cloned: Quiz = {
        ...preset,
        id: `quiz-preset-${Date.now()}`,
        createdBy: uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveUserQuiz(uid, cloned);
      setQuizzes((prev) => [cloned, ...prev]);
      showToast('Sample quiz added to your library!');
    } catch (err) {
      const { code, message } = extractFirebaseError(err);
      showToast(`Failed to copy sample [${code}]: ${message}`);
    }
  };

  // Stats calculation
  const totalQuestionsCount = quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 selection:bg-[#FFC928]">
      {/* Top Welcome Header */}
      <div className="bg-white/90 dark:bg-[#0B1730]/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0757D9]/10 text-xs font-black text-[#0757D9] dark:text-[#FFC928] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('brandSlogan')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
            {t('goodMorningTeacher')}
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {hostUser ? (
              <span>
                Ustoz:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {hostUser.displayName || hostUser.email || hostUser.uid}
                </strong>
              </span>
            ) : (
              <span>Google orqali kiring va jonli o‘yinlar boshqaring</span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {!hostUser ? (
            <button
              onClick={handleHostLogin}
              className="px-6 py-3 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-[#FFC928]" />
              <span>{t('signInWithGoogle')}</span>
            </button>
          ) : (
            <>
              <Link
                to="/host/import"
                className="px-5 py-3 rounded-2xl bg-white dark:bg-[#102044] hover:bg-slate-100 text-[#071A3D] dark:text-white font-bold text-xs border border-slate-200 dark:border-white/10 shadow-xs transition-all active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#FFC928]" />
                <span>{t('importAIQuiz')}</span>
              </Link>

              <Link
                to="/host/quiz/new"
                className="px-6 py-3 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#FFC928]" />
                <span>{t('createNewQuiz')}</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <div className="bg-white dark:bg-[#0B1730] p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#0757D9] dark:text-[#1769FF] flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {quizzes.length}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('totalQuizzes')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1730] p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-yellow-950/60 text-[#FFC928] flex items-center justify-center shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {quizzes.length > 0 ? 1 : 0}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('activeGames')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1730] p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalQuestionsCount}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('totalQuestions')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1730] p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              9,850
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('avgScore')}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: My Quizzes vs Ready Sample Quizzes */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'quizzes'
                ? 'bg-[#0757D9] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {t('myQuizzes')} ({quizzes.length})
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'presets'
                ? 'bg-[#0757D9] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {t('presetQuizzesTitle')} ({SAMPLE_QUIZZES.length})
          </button>
        </div>

        <button
          onClick={loadQuizzes}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-400 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadQuizzes}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors shrink-0"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {/* Tab 1: My Quizzes Content */}
      {activeTab === 'quizzes' && (
        <div>
          {loading ? (
            /* Skeleton Loaders (No ugly generic loading) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-[#0B1730] rounded-3xl border border-slate-200 dark:border-white/10 p-6 animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full w-1/3" />
                  <div className="h-6 bg-slate-200 dark:bg-white/10 rounded-xl w-3/4" />
                  <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl" />
                  <div className="h-10 bg-slate-200 dark:bg-white/10 rounded-xl" />
                </div>
              ))}
            </div>
          ) : !hostUser ? (
            /* Sign-in prompt card */
            <div className="bg-white dark:bg-[#0B1730] rounded-3xl border border-slate-200 dark:border-white/10 p-10 sm:p-14 text-center max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-[#0757D9]/10 text-[#0757D9] dark:text-[#FFC928] mx-auto flex items-center justify-center mb-4">
                <LogIn className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {t('loginWelcome')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {t('loginSubtitle')}
              </p>
              <button
                onClick={handleHostLogin}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-black text-sm shadow-md active:scale-95 transition-all"
              >
                {t('signInWithGoogle')}
              </button>
            </div>
          ) : quizzes.length === 0 ? (
            /* Empty State */
            <div className="bg-white dark:bg-[#0B1730] rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 p-10 sm:p-14 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#FFC928]/20 text-[#071A3D] dark:text-[#FFC928] mx-auto flex items-center justify-center mb-4 font-black text-2xl">
                📚
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {t('firstQuizStartsHere')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {t('noQuizzesSub')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/host/quiz/new"
                  className="px-6 py-3 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-black text-sm shadow-md"
                >
                  {t('createNewQuiz')}
                </Link>
                <Link
                  to="/host/import"
                  className="px-6 py-3 rounded-2xl bg-white dark:bg-[#102044] text-[#071A3D] dark:text-white font-bold text-sm border border-slate-200 dark:border-white/10"
                >
                  {t('importAIQuiz')}
                </Link>
              </div>
            </div>
          ) : (
            /* Quiz Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-[#0B1730] rounded-3xl border border-slate-200/90 dark:border-white/10 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 font-bold">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0757D9]/10 text-[#0757D9] dark:text-[#FFC928]">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{quiz.questions.length} {t('questionsCount')}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{quiz.defaultTimeLimit || 20}s</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-1">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-6">
                      {quiz.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleStartGame(quiz)}
                        disabled={startingGameId === quiz.id}
                        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FFC928] to-[#FFD43B] hover:brightness-105 text-[#071A3D] font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {startingGameId === quiz.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 fill-[#071A3D]" />
                        )}
                        <span>
                          {startingGameId === quiz.id ? t('loading') : t('startLiveGame')}
                        </span>
                      </button>

                      <Link
                        to={`/host/quiz/${quiz.id}`}
                        className="p-3 rounded-2xl bg-slate-100 dark:bg-[#102044] hover:bg-slate-200 dark:hover:bg-[#162a56] text-slate-700 dark:text-slate-200 transition-colors"
                        title={t('edit')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleDuplicateQuiz(quiz)}
                        className="p-3 rounded-2xl bg-slate-100 dark:bg-[#102044] hover:bg-slate-200 dark:hover:bg-[#162a56] text-slate-700 dark:text-slate-200 transition-colors"
                        title={t('duplicate')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleExportJson(quiz)}
                        className="p-3 rounded-2xl bg-slate-100 dark:bg-[#102044] hover:bg-slate-200 dark:hover:bg-[#162a56] text-slate-700 dark:text-slate-200 transition-colors"
                        title={t('exportQuizJson')}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sample Preset Quizzes */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_QUIZZES.map((preset) => (
            <div
              key={preset.id}
              className="bg-white dark:bg-[#0B1730] rounded-3xl border border-slate-200/90 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#0757D9]/10 text-[#0757D9] dark:text-[#FFC928] text-xs font-bold mb-3">
                  {preset.questions.length} {t('questionsCount')}
                </span>
                <h3 className="font-black text-lg text-slate-900 dark:text-white mb-2">
                  {preset.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-6">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => handleStartGame(preset)}
                  disabled={startingGameId === preset.id}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#0757D9] hover:bg-[#1769FF] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t('startLiveGame')}</span>
                </button>
                {hostUser && (
                  <button
                    onClick={() => handleClonePreset(preset)}
                    className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-[#102044] hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{t('clonePreset')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
} from 'lucide-react';

export const HostDashboard: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { hostUser, setHostUser, showToast } = useGameStore();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startingGameId, setStartingGameId] = useState<string | null>(null);

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
        // Not authenticated yet
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
      showToast(`Game created! PIN: ${pin}`);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {t('hostGame')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {hostUser ? (
              <span>
                Signed in as:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {hostUser.displayName || hostUser.email || hostUser.uid}
                </strong>
              </span>
            ) : (
              <span>Sign in with Google to save your quizzes and host live games</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!hostUser ? (
            <button
              onClick={handleHostLogin}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4 text-yellow-300" />
              <span>{t('hostLogin')} (Google)</span>
            </button>
          ) : (
            <>
              <Link
                to="/host/import"
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>{t('importAIQuiz')}</span>
              </Link>

              <Link
                to="/host/quiz/new"
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('createNewQuiz')}</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* User's Quizzes Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{t('myQuizzes')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
              {quizzes.length}
            </span>
          </h2>

          <button
            onClick={loadQuizzes}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

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
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-sm font-semibold">{t('loading')}</span>
          </div>
        ) : !hostUser ? (
          <div className="bg-white/50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center">
            <LogIn className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              Sign In to Access Your Quizzes
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Authenticate with Google to create and host your quizzes, or try one of the ready-to-play sample quizzes below.
            </p>
            <button
              onClick={handleHostLogin}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
            >
              Sign In with Google
            </button>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white/50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              {t('noQuizzesYet')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              {t('noQuizzesSub')}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/host/quiz/new"
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm shadow-sm"
              >
                {t('createNewQuiz')}
              </Link>
              <Link
                to="/host/import"
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-sm"
              >
                {t('importAIQuiz')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        {quiz.questions.length} {t('questionsCount')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{quiz.defaultTimeLimit || 20}s</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {quiz.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleStartGame(quiz)}
                      disabled={startingGameId === quiz.id}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {startingGameId === quiz.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-white" />
                      )}
                      <span>
                        {startingGameId === quiz.id ? t('loading') : t('startLiveGame')}
                      </span>
                    </button>

                    <Link
                      to={`/host/quiz/${quiz.id}`}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title={t('edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleDuplicateQuiz(quiz)}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title={t('duplicate')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleExportJson(quiz)}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title={t('exportQuizJson')}
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
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

      {/* Preset Ready-to-Play Quizzes Section */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>{t('presetQuizzesTitle')}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SAMPLE_QUIZZES.map((preset) => (
            <div
              key={preset.id}
              className="bg-white/70 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold mb-2">
                  {preset.questions.length} {t('questionsCount')}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                  {preset.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleStartGame(preset)}
                  disabled={startingGameId === preset.id}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{t('startLiveGame')}</span>
                </button>
                {hostUser && (
                  <button
                    onClick={() => handleClonePreset(preset)}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('clonePreset')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

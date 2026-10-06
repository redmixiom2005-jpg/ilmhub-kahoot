import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import {
  getQuizById,
  saveUserQuiz,
  getCurrentAuthUser,
  extractFirebaseError,
  stripUndefined,
} from '../../lib/firebase';
import { Quiz, Question, QuestionType, PointsMode } from '../../types/quiz';
import { sound } from '../../lib/audio';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Save,
  Clock,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const QuizEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { hostUser, setHostUser, showToast } = useGameStore();

  const isNew = id === 'new';
  const [quizId] = useState(isNew ? `quiz-${Date.now()}` : (id || ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(20);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const hasLoadedRef = useRef(false);

  // Load existing quiz or initialize with default template
  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await getCurrentAuthUser();
        if (currentUser) {
          setHostUser(currentUser);
        }

        const uid = currentUser?.uid || hostUser?.uid;

        if (!isNew && id && uid) {
          const existing = await getQuizById(uid, id);
          if (existing) {
            setTitle(existing.title || '');
            setDescription(existing.description || '');
            setCoverImageUrl(existing.coverImageUrl || '');
            setDefaultTimeLimit(existing.defaultTimeLimit || 20);
            setQuestions(existing.questions || []);
            hasLoadedRef.current = true;
            return;
          }
        }

        // Default initial question for new quizzes
        setTitle('New Ilmhub Quiz');
        setQuestions([
          {
            id: `q-${Date.now()}-1`,
            type: 'quiz',
            text: 'What is the capital city of Uzbekistan?',
            options: ['Samarkand', 'Tashkent', 'Bukhara', 'Khiva'],
            correctAnswers: [1],
            timeLimit: 20,
            pointsMode: 'standard',
          },
        ]);
        hasLoadedRef.current = true;
      } catch (err) {
        console.error('[QuizEditor] Failed to load quiz:', err);
        const { code, message } = extractFirebaseError(err);
        showToast(`Failed to load quiz [${code}]: ${message}`);
      }
    };

    load();
  }, [id, isNew, hostUser, setHostUser, showToast]);

  // Execute Save Routine
  const performSave = useCallback(async () => {
    const currentUser = await getCurrentAuthUser();
    const uid = currentUser?.uid || hostUser?.uid;

    if (!uid) {
      setSaveError('Please sign in with Google to save quizzes.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const quizToSave: Quiz = stripUndefined({
      id: quizId,
      title: title.trim() || 'Untitled Quiz',
      description: description.trim(),
      coverImageUrl: coverImageUrl.trim(),
      defaultTimeLimit,
      questions,
      createdBy: uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    try {
      await saveUserQuiz(uid, quizToSave);
      setLastSavedTime(Date.now());
      setSaveError(null);
    } catch (err) {
      console.error('[QuizEditor] Save failed:', err);
      const { code, message } = extractFirebaseError(err);
      setSaveError(`Save failed [${code}]: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [quizId, title, description, coverImageUrl, defaultTimeLimit, questions, hostUser]);

  // Debounced Autosave (1.5s after user stops typing)
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!title.trim() && questions.length === 0) return;

    const timer = setTimeout(() => {
      performSave();
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, description, coverImageUrl, defaultTimeLimit, questions, performSave]);

  const activeQuestion = questions[selectedQuestionIndex];

  const updateActiveQuestion = (patch: Partial<Question>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (copy[selectedQuestionIndex]) {
        copy[selectedQuestionIndex] = { ...copy[selectedQuestionIndex], ...patch };
      }
      return copy;
    });
  };

  const handleAddQuestion = (type: QuestionType) => {
    sound.playClick();
    const newQ: Question = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      type,
      text: '',
      options: type === 'truefalse' ? ['True', 'False'] : ['', '', '', ''],
      correctAnswers: [0],
      timeLimit: defaultTimeLimit,
      pointsMode: 'standard',
    };
    setQuestions((prev) => [...prev, newQ]);
    setSelectedQuestionIndex(questions.length);
  };

  const handleDuplicateQuestion = (idx: number) => {
    sound.playClick();
    const q = questions[idx];
    if (!q) return;

    const cloned: Question = {
      ...q,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, cloned);
      return next;
    });
    setSelectedQuestionIndex(idx + 1);
  };

  const handleDeleteQuestion = (idx: number) => {
    sound.playClick();
    if (questions.length <= 1) {
      showToast('A quiz must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setSelectedQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    sound.playClick();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    setSelectedQuestionIndex(targetIdx);
  };

  const handleOptionChange = (optIdx: number, val: string) => {
    if (!activeQuestion) return;
    const nextOptions = [...activeQuestion.options];
    nextOptions[optIdx] = val;
    updateActiveQuestion({ options: nextOptions });
  };

  const toggleCorrectAnswer = (optIdx: number) => {
    sound.playClick();
    if (!activeQuestion) return;
    updateActiveQuestion({ correctAnswers: [optIdx] });
  };

  const handleManualSave = async () => {
    sound.playClick();
    const issues: string[] = [];
    if (!title.trim()) issues.push(t('emptyQuestionText'));

    questions.forEach((q, idx) => {
      if (!q.text.trim()) {
        issues.push(`Q${idx + 1}: ${t('emptyQuestionText')}`);
      }
      if (q.type === 'quiz') {
        const nonEmpty = q.options.filter((o) => o.trim().length > 0);
        if (nonEmpty.length < 2) {
          issues.push(`Q${idx + 1}: ${t('atLeastTwoOptions')}`);
        }
      }
      if (q.correctAnswers.length === 0) {
        issues.push(`Q${idx + 1}: ${t('atLeastOneCorrect')}`);
      }
    });

    setValidationErrors(issues);
    if (issues.length > 0) return;

    await performSave();
    if (!saveError) {
      showToast(t('quizSavedSuccess'));
      navigate('/host');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Bar with Title, Autosave Status, and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/host"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {t('quizEditorTitle')}
            </h1>
            <div className="flex items-center gap-2 text-xs mt-0.5">
              {isSaving ? (
                <span className="text-amber-500 font-bold flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('saving')}</span>
                </span>
              ) : saveError ? (
                <span className="text-rose-500 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{saveError}</span>
                  <button
                    onClick={performSave}
                    className="ml-2 underline hover:text-rose-600 font-extrabold flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </span>
              ) : lastSavedTime ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{t('saved')}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{t('save')}</span>
          </button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Validation issues</span>
          </div>
          {validationErrors.map((err, i) => (
            <div key={i}>• {err}</div>
          ))}
        </div>
      )}

      {/* Main Grid: Left Column Question List | Right Column Active Question Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Questions list & Reordering */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quiz General Settings Box */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {t('quizTitleLabel')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('quizTitlePlaceholder')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {t('quizDescLabel')}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('quizDescPlaceholder')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Question List */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Questions ({questions.length})
              </span>
            </div>

            <div className="space-y-2 max-h-[50dvh] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionIndex(idx)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    selectedQuestionIndex === idx
                      ? 'bg-amber-50 dark:bg-yellow-950/40 border-amber-400 dark:border-yellow-500 font-bold text-slate-950 dark:text-yellow-200'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      {idx + 1}
                    </span>
                    <span className="truncate">
                      {q.text || 'Empty question text...'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveQuestion(idx, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveQuestion(idx, 'down');
                      }}
                      disabled={idx === questions.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleAddQuestion('quiz')}
                className="py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ 4-Quiz</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('truefalse')}
                className="py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ True / False</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Main Editor: Active Question Configuration */}
        {activeQuestion && (
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              {/* Question Header & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Question {selectedQuestionIndex + 1} (
                  {activeQuestion.type === 'truefalse' ? 'True / False' : '4-Option'})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(selectedQuestionIndex)}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('duplicate')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(selectedQuestionIndex)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-xs flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('questionTextLabel')}
                </label>
                <textarea
                  rows={3}
                  value={activeQuestion.text}
                  onChange={(e) => updateActiveQuestion({ text: e.target.value })}
                  placeholder={t('questionTextPlaceholder')}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-400 dark:focus:border-yellow-400 focus:outline-none text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              {/* Time Limit & Points Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('timeLimitLabel')}</span>
                  </label>
                  <select
                    value={activeQuestion.timeLimit}
                    onChange={(e) => updateActiveQuestion({ timeLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                  >
                    {[5, 10, 20, 30, 60, 90, 120].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec} {t('seconds')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    {t('pointsModeLabel')}
                  </label>
                  <select
                    value={activeQuestion.pointsMode}
                    onChange={(e) => updateActiveQuestion({ pointsMode: e.target.value as PointsMode })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                  >
                    <option value="standard">{t('standardPoints')}</option>
                    <option value="double">{t('doublePoints')}</option>
                    <option value="none">{t('noPoints')}</option>
                  </select>
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t('coverImageLabel')}</span>
                </label>
                <input
                  type="url"
                  value={activeQuestion.imageUrl || ''}
                  onChange={(e) => updateActiveQuestion({ imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Answer Options Configuration */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Answer Options (Click to designate the correct answer)
                </label>

                {activeQuestion.type === 'truefalse' ? (
                  <div className="grid grid-cols-2 gap-4">
                    {['True', 'False'].map((tf, idx) => {
                      const isCorrect = activeQuestion.correctAnswers.includes(idx);
                      const isTrue = idx === 0;
                      return (
                        <div
                          key={tf}
                          onClick={() => toggleCorrectAnswer(idx)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className={`text-lg font-black ${
                              isTrue ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {tf}
                          </span>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                              isCorrect
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isCorrect && <CheckCircle className="w-4 h-4 fill-white text-emerald-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeQuestion.options.map((opt, optIdx) => {
                      const isCorrect = activeQuestion.correctAnswers.includes(optIdx);
                      const labels = ['A', 'B', 'C', 'D'];
                      const borderColors = [
                        'border-rose-400 focus-within:border-rose-500',
                        'border-blue-400 focus-within:border-blue-500',
                        'border-amber-400 focus-within:border-amber-500',
                        'border-emerald-400 focus-within:border-emerald-500',
                      ];

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800/80 transition-all ${
                            borderColors[optIdx]
                          } ${isCorrect ? 'ring-2 ring-emerald-500' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                              Option {labels[optIdx]}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCorrectAnswer(optIdx)}
                              className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                                isCorrect
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{isCorrect ? 'Correct' : 'Mark'}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                            placeholder={`Option ${labels[optIdx]} text...`}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

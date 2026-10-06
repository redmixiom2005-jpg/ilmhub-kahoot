import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { parseImportContent, generatePromptTemplate, ParseIssue } from '../../lib/parser';
import { saveUserQuiz } from '../../lib/firebase';
import { Question, Quiz } from '../../types/quiz';
import { sound } from '../../lib/audio';
import {
  ArrowLeft,
  Copy,
  Sparkles,
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  Layers,
  Save,
  HelpCircle,
  Brain,
  Loader2,
} from 'lucide-react';

export const ImportQuestionsPage: React.FC = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { hostUser, showToast } = useGameStore();

  // Prompt generator parameters
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [languageOption, setLanguageOption] = useState(locale === 'uz' ? 'Uzbek' : locale === 'ru' ? 'Russian' : 'English');

  // Input & Parsing state
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [quizTitle, setQuizTitle] = useState('Imported AI Quiz');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleCopyPrompt = () => {
    sound.playClick();
    const prompt = generatePromptTemplate(topic, questionCount, difficulty, languageOption);
    navigator.clipboard.writeText(prompt);
    showToast(t('copied'));
  };

  const handleParse = () => {
    sound.playClick();
    const result = parseImportContent(rawText);
    setParsedQuestions(result.questions);
    setIssues(result.issues);
    if (result.title) {
      setQuizTitle(result.title);
    } else if (topic) {
      setQuizTitle(`${topic} Quiz`);
    }

    if (result.questions.length > 0) {
      sound.playCorrect();
      showToast(`${result.questions.length} questions parsed!`);
    } else {
      sound.playWrong();
      showToast('No questions could be parsed from input.');
    }
  };

  // Direct AI Generation via server-side Gemini 3.1 Pro Preview with HIGH thinking mode!
  const handleGenerateDirectAI = async () => {
    if (!topic.trim()) {
      showToast('Please enter a topic first');
      return;
    }
    sound.playClick();
    setIsGeneratingAI(true);

    try {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count: questionCount,
          difficulty,
          language: languageOption,
        }),
      });

      if (!response.ok) {
        throw new Error('AI Generation request failed');
      }

      const data = await response.json();
      if (data.rawText) {
        setRawText(data.rawText);
        const result = parseImportContent(data.rawText);
        setParsedQuestions(result.questions);
        setIssues(result.issues);
        setQuizTitle(data.title || `${topic} Quiz`);
        sound.playCorrect();
        showToast('AI Questions generated successfully!');
      }
    } catch (err) {
      console.error(err);
      // Fallback: Populate formatted template sample for testing
      const sampleFallback = `Q: What is the primary focus of ${topic}?
Type: quiz
A) Fundamentals and Core Concepts
B) Unrelated Theories
C) Historical Background Only
D) Future Speculation
Answer: A
Time: 20
Points: standard

Q: True or False: ${topic} is widely studied globally.
Type: truefalse
Answer: True
Time: 15
Points: standard`;
      setRawText(sampleFallback);
      const result = parseImportContent(sampleFallback);
      setParsedQuestions(result.questions);
      setIssues(result.issues);
      setQuizTitle(`${topic} Quiz`);
      showToast('Sample template populated.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        const result = parseImportContent(content);
        setParsedQuestions(result.questions);
        setIssues(result.issues);
        if (result.title) setQuizTitle(result.title);
        showToast('File loaded and parsed!');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveQuiz = async () => {
    if (parsedQuestions.length === 0) {
      showToast('No questions to save!');
      return;
    }
    sound.playClick();

    const uid = hostUser ? hostUser.uid : 'guest-host';
    const newQuiz: Quiz = {
      id: `quiz-ai-${Date.now()}`,
      title: quizTitle || 'Imported Quiz',
      description: `Imported via AI on ${new Date().toLocaleDateString()}`,
      defaultTimeLimit: 20,
      questions: parsedQuestions,
      createdBy: uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveUserQuiz(uid, newQuiz);
    sound.playCorrect();
    showToast(t('quizSavedSuccess'));
    navigate('/host');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/host"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <span>{t('importTitle')}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('importSubtitle')}
            </p>
          </div>
        </div>

        {parsedQuestions.length > 0 && (
          <button
            onClick={handleSaveQuiz}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{t('createQuizFromImport')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1: Prompt Generator for ChatGPT/Claude */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-xs flex items-center justify-center font-black">
                1
              </span>
              <span>{t('promptGeneratorTitle')}</span>
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {t('promptTopicLabel')}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('promptTopicPlaceholder')}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {t('promptCountLabel')}
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value={3}>3 questions</option>
                  <option value={5}>5 questions</option>
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                  <option value={20}>20 questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {t('promptDifficultyLabel')}
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="easy">{t('promptDifficultyEasy')}</option>
                  <option value="medium">{t('promptDifficultyMedium')}</option>
                  <option value="hard">{t('promptDifficultyHard')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {t('promptLanguageLabel')}
              </label>
              <select
                value={languageOption}
                onChange={(e) => setLanguageOption(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="Uzbek">Uzbek (O'zbek tili)</option>
                <option value="Russian">Russian (Русский)</option>
                <option value="English">English</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>{t('copyPromptButton')}</span>
              </button>

              {/* Direct Server Gemini AI Generation with Thinking Mode */}
              <button
                type="button"
                onClick={handleGenerateDirectAI}
                disabled={isGeneratingAI}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                    <span>{t('generatingAI')}</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 text-yellow-300" />
                    <span>{t('generateWithGemini')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Paste Area & File Upload */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-black">
                  2
                </span>
                <span>{t('pasteAreaTitle')}</span>
              </h2>

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{t('uploadFileButton')}</span>
                <input
                  type="file"
                  accept=".txt,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={9}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={t('pastePlaceholder')}
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 placeholder:font-sans placeholder:text-slate-400"
            />

            <button
              type="button"
              onClick={handleParse}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{t('parseButton')}</span>
            </button>
          </div>

          {/* Step 3: Parsed Questions Preview & Validation */}
          {parsedQuestions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-black">
                    3
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {t('parsedQuestionsPreview')}
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                  {parsedQuestions.length} {t('totalParsed')}
                </span>
              </div>

              {issues.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-yellow-950/30 border border-amber-200 dark:border-yellow-800 rounded-xl text-xs text-amber-800 dark:text-yellow-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{issues.length} {t('parserErrorCount')}</span>
                  </div>
                  {issues.slice(0, 3).map((iss, i) => (
                    <div key={i}>• Q{iss.questionNumber}: {iss.message}</div>
                  ))}
                </div>
              )}

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Q{idx + 1}: {q.text}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                        {q.timeLimit}s • {q.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = q.correctAnswers.includes(oIdx);
                        return (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-xl border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span>{opt}</span>
                            {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveQuiz}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{t('createQuizFromImport')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

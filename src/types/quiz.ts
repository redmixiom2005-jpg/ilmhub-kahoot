export type QuestionType = 'quiz' | 'truefalse';

export type PointsMode = 'standard' | 'double' | 'none';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[]; // 2 to 4 options for quiz, 2 options ("True", "False") for truefalse
  correctAnswers: number[]; // Indices of correct options (e.g. [1])
  timeLimit: number; // in seconds (5, 10, 20, 30, 60, 90, 120)
  pointsMode: PointsMode; // standard (1000), double (2000), none (0)
  imageUrl?: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  defaultTimeLimit: number;
  questions: Question[];
  createdBy: string; // Host UID
  createdAt: number;
  updatedAt: number;
  isPublic?: boolean;
}

export type GameStatus =
  | 'lobby'
  | 'countdown'
  | 'question'
  | 'reveal'
  | 'leaderboard'
  | 'finished';

export interface GameMeta {
  pin: string;
  quizId: string;
  quizTitle: string;
  hostUid: string;
  status: GameStatus;
  currentIndex: number;
  totalQuestions: number;
  startedAt?: number;
  endsAt?: number;
  serverTime?: number;
  showLeaderboardAfterQuestion?: boolean;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  timeLimit: number;
  pointsMode: PointsMode;
  imageUrl?: string;
  questionNumber: number;
  totalQuestions: number;
}

export interface SecretQuestionData {
  correctAnswers: number[];
  explanation?: string;
}

export interface Player {
  uid: string;
  firstName: string;
  lastName: string;
  nickname: string;
  score: number;
  streak: number;
  joinedAt: number;
  connected: boolean;
  avatarSeed?: string;
  lastResponseTimeMs?: number;
}

export interface AnswerSubmission {
  choice: number[];
  submittedAt: number;
  timeMs: number;
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface QuestionResult {
  questionIndex: number;
  correctAnswers: number[];
  distribution: number[]; // Count of choices for each option index
  totalAnswered: number;
}

export interface LeaderboardEntry {
  uid: string;
  firstName: string;
  lastName: string;
  score: number;
  streak: number;
  rank: number;
  previousRank?: number;
  rankDelta?: number;
  pointsGained?: number;
  avatarSeed?: string;
}

export interface GameResultsReport {
  id: string;
  quizTitle: string;
  playedAt: number;
  totalPlayers: number;
  totalQuestions: number;
  players: {
    uid: string;
    fullName: string;
    score: number;
    rank: number;
    correctCount: number;
    avgTimeMs: number;
  }[];
}

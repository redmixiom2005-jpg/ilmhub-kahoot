import { PointsMode } from '../types/quiz';

export interface ScoreCalculationParams {
  isCorrect: boolean;
  responseTimeMs: number;
  timeLimitSeconds: number;
  pointsMode: PointsMode;
  currentStreak: number;
}

export interface ScoreCalculationResult {
  pointsEarned: number;
  basePointsEarned: number;
  streakBonusEarned: number;
  newStreak: number;
}

export function calculateQuestionScore({
  isCorrect,
  responseTimeMs,
  timeLimitSeconds,
  pointsMode,
  currentStreak,
}: ScoreCalculationParams): ScoreCalculationResult {
  if (!isCorrect || pointsMode === 'none') {
    return {
      pointsEarned: 0,
      basePointsEarned: 0,
      streakBonusEarned: 0,
      newStreak: 0,
    };
  }

  const basePointsMultiplier = pointsMode === 'double' ? 2000 : 1000;
  const timeLimitMs = Math.max(timeLimitSeconds * 1000, 1000);
  const clampedResponseTimeMs = Math.min(Math.max(responseTimeMs, 0), timeLimitMs);

  // Kahoot formula: (1 - ((responseTime / timeLimit) / 2)) * basePoints
  const responseRatio = clampedResponseTimeMs / timeLimitMs;
  const factor = Math.max(0.5, 1 - responseRatio / 2);
  const basePointsEarned = Math.round(factor * basePointsMultiplier);

  // Consecutive correct answer bonus: +100 for each streak step up to +500
  const nextStreak = currentStreak + 1;
  const streakBonusEarned = Math.min(Math.max(0, nextStreak - 1) * 100, 500);

  const pointsEarned = basePointsEarned + streakBonusEarned;

  return {
    pointsEarned,
    basePointsEarned,
    streakBonusEarned,
    newStreak: nextStreak,
  };
}

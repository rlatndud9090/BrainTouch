import type { RoundGenerationConfig } from './BlockGenerator';

export type DifficultyAxis = 'blockCount' | 'numberRange' | 'targetComplexity';

export interface DifficultyAxisLevels {
  blockCount: number;
  numberRange: number;
  targetComplexity: number;
}

interface NumberRangeConfig {
  minValue: number;
  maxValue: number;
}

interface TargetComplexityConfig {
  maxRemove: number;
  preferRemove: number;
  maxTargetSum: number | null;
}

export interface ResolvedRoundDifficulty {
  generationConfig: RoundGenerationConfig;
  timeLimit: number;
  timeDifficultyLevel: number;
  difficultyScore: number;
  difficultyName: string;
}

export interface DifficultyUpgradeResult {
  levels: DifficultyAxisLevels;
  history: DifficultyAxis[];
  upgradedAxis: DifficultyAxis | null;
  blockedByScoreCap: boolean;
  reachedMaxDifficulty: boolean;
}

export interface DifficultyDowngradeResult {
  levels: DifficultyAxisLevels;
  downgradedAxis: Exclude<DifficultyAxis, 'blockCount'> | null;
}

export type RoundOutcome = 'success' | 'fail';

export interface RoundTelemetryEntry {
  round: number;
  outcome: RoundOutcome;
  elapsedMs: number;
  timeLimitSec: number;
  difficultyScore: number;
}

export interface RoundDifficultyStat {
  round: number;
  attempts: number;
  successes: number;
  fails: number;
  failRate: number;
  averageSuccessTimeSec: number | null;
}

export interface DifficultyMetricsSummary {
  totalAttempts: number;
  totalSuccesses: number;
  totalFails: number;
  overallFailRate: number;
  roundStats: RoundDifficultyStat[];
  failRateDeltaRound3To4: number | null;
}

const BLOCK_COUNT_LEVELS = [4, 5, 6] as const;

const NUMBER_RANGE_LEVELS: readonly NumberRangeConfig[] = [
  { minValue: 1, maxValue: 5 },
  { minValue: 1, maxValue: 7 },
  { minValue: 1, maxValue: 9 },
  { minValue: 1, maxValue: 12 },
];

const TARGET_COMPLEXITY_LEVELS: readonly TargetComplexityConfig[] = [
  { maxRemove: 1, preferRemove: 1, maxTargetSum: 15 },
  { maxRemove: 2, preferRemove: 1, maxTargetSum: 22 },
  { maxRemove: 2, preferRemove: 2, maxTargetSum: 30 },
  { maxRemove: 3, preferRemove: 2, maxTargetSum: null },
];

const TIME_LIMIT_LEVELS = [8, 7, 6, 5, 4] as const;
const TIME_LEVEL_INTERVAL_ROUNDS = 12;

const AXIS_WEIGHTS: Record<DifficultyAxis, number> = {
  blockCount: 0.4,
  numberRange: 0.35,
  targetComplexity: 0.25,
};

const MAX_LEVEL_BY_AXIS: Record<DifficultyAxis, number> = {
  blockCount: BLOCK_COUNT_LEVELS.length - 1,
  numberRange: NUMBER_RANGE_LEVELS.length - 1,
  targetComplexity: TARGET_COMPLEXITY_LEVELS.length - 1,
};

const MAX_UPGRADE_SCORE_DELTA = 0.2;
const HISTORY_LIMIT = 12;

export const ROUND_UPGRADE_INTERVAL = 4;

const FAILURE_DOWNGRADE_AXES: readonly Exclude<DifficultyAxis, 'blockCount'>[] = [
  'targetComplexity',
  'numberRange',
];

const AXES: readonly DifficultyAxis[] = ['blockCount', 'numberRange', 'targetComplexity'];

export function createInitialDifficultyLevels(): DifficultyAxisLevels {
  return {
    blockCount: 0,
    numberRange: 0,
    targetComplexity: 0,
  };
}

export function isMaxDifficulty(levels: DifficultyAxisLevels): boolean {
  return AXES.every((axis) => levels[axis] >= MAX_LEVEL_BY_AXIS[axis]);
}

export function getDifficultyScore(levels: DifficultyAxisLevels): number {
  let score = 0;

  for (const axis of AXES) {
    const maxLevel = MAX_LEVEL_BY_AXIS[axis];
    if (maxLevel === 0) {
      continue;
    }

    const normalized = clamp(levels[axis], 0, maxLevel) / maxLevel;
    score += normalized * AXIS_WEIGHTS[axis];
  }

  return roundTo(score, 4);
}

export function getDifficultyName(levels: DifficultyAxisLevels): string {
  if (isMaxDifficulty(levels)) {
    return '최상';
  }

  const score = getDifficultyScore(levels);
  if (score >= 0.68) {
    return '어려움';
  }

  if (score >= 0.34) {
    return '중간';
  }

  return '쉬움';
}

export function getScoreMultiplier(difficultyScore: number): number {
  const clamped = clamp(difficultyScore, 0, 1);
  return roundTo(1 + clamped * 2, 2);
}

export function getTimeDifficultyLevel(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  const level = Math.floor((safeRound - 1) / TIME_LEVEL_INTERVAL_ROUNDS);
  return clamp(level, 0, TIME_LIMIT_LEVELS.length - 1);
}

export function resolveRoundDifficulty(
  round: number,
  levels: DifficultyAxisLevels
): ResolvedRoundDifficulty {
  const timeDifficultyLevel = getTimeDifficultyLevel(round);

  return {
    generationConfig: resolveGenerationConfig(levels),
    timeLimit: TIME_LIMIT_LEVELS[timeDifficultyLevel],
    timeDifficultyLevel,
    difficultyScore: getDifficultyScore(levels),
    difficultyName: getDifficultyName(levels),
  };
}

export function downgradeDifficultyOnFail(levels: DifficultyAxisLevels): DifficultyDowngradeResult {
  for (const axis of FAILURE_DOWNGRADE_AXES) {
    if (levels[axis] > 0) {
      return {
        levels: {
          ...levels,
          [axis]: levels[axis] - 1,
        },
        downgradedAxis: axis,
      };
    }
  }

  return {
    levels: { ...levels },
    downgradedAxis: null,
  };
}

export function upgradeDifficulty(
  levels: DifficultyAxisLevels,
  history: DifficultyAxis[],
  randomFn: () => number = Math.random
): DifficultyUpgradeResult {
  const upgradableAxes = AXES.filter((axis) => levels[axis] < MAX_LEVEL_BY_AXIS[axis]);
  if (upgradableAxes.length === 0) {
    return {
      levels: { ...levels },
      history: [...history],
      upgradedAxis: null,
      blockedByScoreCap: false,
      reachedMaxDifficulty: true,
    };
  }

  const streakFiltered = upgradableAxes.filter((axis) => !wouldCreateTripleStreak(history, axis));
  const candidates = streakFiltered.length > 0 ? streakFiltered : upgradableAxes;

  const baseScore = getDifficultyScore(levels);
  const rejectedAxes = new Set<DifficultyAxis>();

  while (rejectedAxes.size < candidates.length) {
    const selectableAxes = candidates.filter((axis) => !rejectedAxes.has(axis));
    const selectedAxis = pickWeightedAxis(selectableAxes, levels, history, randomFn);
    const nextLevels = incrementAxis(levels, selectedAxis);
    const delta = getDifficultyScore(nextLevels) - baseScore;

    if (delta <= MAX_UPGRADE_SCORE_DELTA) {
      return {
        levels: nextLevels,
        history: appendHistory(history, selectedAxis),
        upgradedAxis: selectedAxis,
        blockedByScoreCap: false,
        reachedMaxDifficulty: isMaxDifficulty(nextLevels),
      };
    }

    rejectedAxes.add(selectedAxis);
  }

  return {
    levels: { ...levels },
    history: [...history],
    upgradedAxis: null,
    blockedByScoreCap: true,
    reachedMaxDifficulty: isMaxDifficulty(levels),
  };
}

export function summarizeDifficultyMetrics(entries: RoundTelemetryEntry[]): DifficultyMetricsSummary {
  type RoundAccumulator = {
    attempts: number;
    successes: number;
    fails: number;
    successTimeMs: number;
  };

  const totals = {
    attempts: entries.length,
    successes: 0,
    fails: 0,
  };

  const byRound = new Map<number, RoundAccumulator>();

  for (const entry of entries) {
    const aggregate = byRound.get(entry.round) ?? {
      attempts: 0,
      successes: 0,
      fails: 0,
      successTimeMs: 0,
    };

    aggregate.attempts += 1;
    if (entry.outcome === 'success') {
      aggregate.successes += 1;
      aggregate.successTimeMs += entry.elapsedMs;
      totals.successes += 1;
    } else {
      aggregate.fails += 1;
      totals.fails += 1;
    }

    byRound.set(entry.round, aggregate);
  }

  const roundStats: RoundDifficultyStat[] = Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, aggregate]) => {
      const failRate = aggregate.attempts > 0 ? aggregate.fails / aggregate.attempts : 0;
      const averageSuccessTimeSec =
        aggregate.successes > 0 ? roundTo(aggregate.successTimeMs / aggregate.successes / 1000, 2) : null;

      return {
        round,
        attempts: aggregate.attempts,
        successes: aggregate.successes,
        fails: aggregate.fails,
        failRate: roundTo(failRate, 3),
        averageSuccessTimeSec,
      };
    });

  const round3FailRate = roundStats.find((stat) => stat.round === 3)?.failRate;
  const round4FailRate = roundStats.find((stat) => stat.round === 4)?.failRate;

  return {
    totalAttempts: totals.attempts,
    totalSuccesses: totals.successes,
    totalFails: totals.fails,
    overallFailRate: totals.attempts > 0 ? roundTo(totals.fails / totals.attempts, 3) : 0,
    roundStats,
    failRateDeltaRound3To4:
      round3FailRate !== undefined && round4FailRate !== undefined
        ? roundTo(round4FailRate - round3FailRate, 3)
        : null,
  };
}

function resolveGenerationConfig(levels: DifficultyAxisLevels): RoundGenerationConfig {
  const numberRange = NUMBER_RANGE_LEVELS[clamp(levels.numberRange, 0, MAX_LEVEL_BY_AXIS.numberRange)];
  const targetComplexity =
    TARGET_COMPLEXITY_LEVELS[clamp(levels.targetComplexity, 0, MAX_LEVEL_BY_AXIS.targetComplexity)];

  return {
    blockCount: BLOCK_COUNT_LEVELS[clamp(levels.blockCount, 0, MAX_LEVEL_BY_AXIS.blockCount)],
    minValue: numberRange.minValue,
    maxValue: numberRange.maxValue,
    maxRemove: targetComplexity.maxRemove,
    preferRemove: targetComplexity.preferRemove,
    maxTargetSum: targetComplexity.maxTargetSum,
  };
}

function wouldCreateTripleStreak(history: DifficultyAxis[], candidateAxis: DifficultyAxis): boolean {
  if (history.length < 2) {
    return false;
  }

  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];
  return last === candidateAxis && secondLast === candidateAxis;
}

function pickWeightedAxis(
  candidates: DifficultyAxis[],
  levels: DifficultyAxisLevels,
  history: DifficultyAxis[],
  randomFn: () => number
): DifficultyAxis {
  const weights = candidates.map((axis) => getAxisWeight(axis, levels, history));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight <= 0) {
    return candidates[Math.floor(randomFn() * candidates.length)];
  }

  let roll = randomFn() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return candidates[i];
    }
  }

  return candidates[candidates.length - 1];
}

function getAxisWeight(
  axis: DifficultyAxis,
  levels: DifficultyAxisLevels,
  history: DifficultyAxis[]
): number {
  const remainingSteps = MAX_LEVEL_BY_AXIS[axis] - levels[axis];
  const baseWeight = Math.max(1, remainingSteps + 1);
  const recentPenalty = history[history.length - 1] === axis ? 0.7 : 1;
  return baseWeight * recentPenalty;
}

function incrementAxis(levels: DifficultyAxisLevels, axis: DifficultyAxis): DifficultyAxisLevels {
  return {
    ...levels,
    [axis]: clamp(levels[axis] + 1, 0, MAX_LEVEL_BY_AXIS[axis]),
  };
}

function appendHistory(history: DifficultyAxis[], axis: DifficultyAxis): DifficultyAxis[] {
  return [...history, axis].slice(-HISTORY_LIMIT);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}


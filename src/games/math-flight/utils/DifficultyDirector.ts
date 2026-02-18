import type { MeteorGenerationConfig } from './MeteorGenerator';

export type DifficultyAxis = 'fallSpeed' | 'numberGap';

export interface DifficultyAxisLevels {
  fallSpeed: number;
  numberGap: number;
}

interface NumberGapConfig {
  minGap: number;
  maxGap: number;
}

export interface ResolvedRoundDifficulty {
  speedMultiplier: number;
  generationConfig: MeteorGenerationConfig;
  difficultyScore: number;
  difficultyName: string;
}

export interface DifficultyUpgradeResult {
  levels: DifficultyAxisLevels;
  history: DifficultyAxis[];
  upgradedAxis: DifficultyAxis | null;
  reachedMaxDifficulty: boolean;
}

export interface DifficultyDowngradeResult {
  levels: DifficultyAxisLevels;
  downgradedAxis: DifficultyAxis | null;
}

const FALL_SPEED_LEVELS = [1.0, 1.1, 1.22, 1.36, 1.52, 1.7] as const;

const NUMBER_GAP_LEVELS: readonly NumberGapConfig[] = [
  { minGap: 9, maxGap: 14 },
  { minGap: 7, maxGap: 12 },
  { minGap: 6, maxGap: 10 },
  { minGap: 5, maxGap: 8 },
  { minGap: 4, maxGap: 6 },
  { minGap: 3, maxGap: 5 },
];

const AXIS_WEIGHTS: Record<DifficultyAxis, number> = {
  fallSpeed: 0.45,
  numberGap: 0.55,
};

const MAX_LEVEL_BY_AXIS: Record<DifficultyAxis, number> = {
  fallSpeed: FALL_SPEED_LEVELS.length - 1,
  numberGap: NUMBER_GAP_LEVELS.length - 1,
};

const AXES: readonly DifficultyAxis[] = ['fallSpeed', 'numberGap'];

const HISTORY_LIMIT = 12;
const DOWNGRADE_ORDER: readonly DifficultyAxis[] = ['numberGap', 'fallSpeed'];

export const ROUND_UPGRADE_INTERVAL = 4;

export function createInitialDifficultyLevels(): DifficultyAxisLevels {
  return {
    fallSpeed: 0,
    numberGap: 0,
  };
}

export function isMaxDifficulty(levels: DifficultyAxisLevels): boolean {
  return AXES.every((axis) => levels[axis] >= MAX_LEVEL_BY_AXIS[axis]);
}

export function getDifficultyScore(levels: DifficultyAxisLevels): number {
  let score = 0;

  for (const axis of AXES) {
    const maxLevel = MAX_LEVEL_BY_AXIS[axis];
    const normalized = maxLevel > 0 ? clamp(levels[axis], 0, maxLevel) / maxLevel : 0;
    score += normalized * AXIS_WEIGHTS[axis];
  }

  return roundTo(score, 4);
}

export function getDifficultyName(levels: DifficultyAxisLevels): string {
  if (isMaxDifficulty(levels)) {
    return '최상';
  }

  const score = getDifficultyScore(levels);
  if (score >= 0.68) return '상';
  if (score >= 0.34) return '중';
  return '하';
}

export function resolveRoundDifficulty(
  _round: number,
  levels: DifficultyAxisLevels
): ResolvedRoundDifficulty {
  const speedMultiplier = FALL_SPEED_LEVELS[clamp(levels.fallSpeed, 0, MAX_LEVEL_BY_AXIS.fallSpeed)];
  const gapConfig = NUMBER_GAP_LEVELS[clamp(levels.numberGap, 0, MAX_LEVEL_BY_AXIS.numberGap)];

  return {
    speedMultiplier,
    generationConfig: {
      minGap: gapConfig.minGap,
      maxGap: gapConfig.maxGap,
    },
    difficultyScore: getDifficultyScore(levels),
    difficultyName: getDifficultyName(levels),
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
      reachedMaxDifficulty: true,
    };
  }

  const streakFiltered = upgradableAxes.filter((axis) => !wouldCreateTripleStreak(history, axis));
  const candidates = streakFiltered.length > 0 ? streakFiltered : upgradableAxes;
  const selectedAxis = pickWeightedAxis(candidates, levels, history, randomFn);
  const nextLevels = incrementAxis(levels, selectedAxis);

  return {
    levels: nextLevels,
    history: appendHistory(history, selectedAxis),
    upgradedAxis: selectedAxis,
    reachedMaxDifficulty: isMaxDifficulty(nextLevels),
  };
}

export function downgradeDifficultyOnFail(levels: DifficultyAxisLevels): DifficultyDowngradeResult {
  for (const axis of DOWNGRADE_ORDER) {
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
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

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

function getAxisWeight(axis: DifficultyAxis, levels: DifficultyAxisLevels, history: DifficultyAxis[]): number {
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

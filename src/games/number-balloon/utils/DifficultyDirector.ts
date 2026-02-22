import type { RoundGenerationConfig } from './BalloonGenerator';

export type DifficultyAxis = 'balloonLoad' | 'mappingChaos' | 'numberCognition';

export interface DifficultyAxisLevels {
  balloonLoad: number;
  mappingChaos: number;
  numberCognition: number;
}

interface BalloonLoadConfig {
  minBalloonCount: number;
  maxBalloonCount: number;
  minSize: number;
  maxSize: number;
}

interface MappingChaosConfig {
  swapCount: number;
  maxIndexDiff: number;
}

interface NumberCognitionConfig {
  minNumber: number;
  maxNumber: number;
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
  downgradedAxis: DifficultyAxis | null;
}

export type DifficultyDowngradeReason = 'wrongTap' | 'timeout';

const BALLOON_LOAD_LEVELS: readonly BalloonLoadConfig[] = [
  { minBalloonCount: 5, maxBalloonCount: 5, minSize: 52, maxSize: 74 },
  { minBalloonCount: 6, maxBalloonCount: 7, minSize: 48, maxSize: 70 },
  { minBalloonCount: 8, maxBalloonCount: 9, minSize: 44, maxSize: 64 },
];

const MAPPING_CHAOS_LEVELS: readonly MappingChaosConfig[] = [
  { swapCount: 0, maxIndexDiff: 0 },
  { swapCount: 1, maxIndexDiff: 2 },
  { swapCount: 1, maxIndexDiff: 3 },
  { swapCount: 2, maxIndexDiff: 4 },
  { swapCount: 3, maxIndexDiff: 6 },
  { swapCount: 4, maxIndexDiff: 8 },
];

const NUMBER_COGNITION_LEVELS: readonly NumberCognitionConfig[] = [
  { minNumber: 0, maxNumber: 20 },
  { minNumber: 0, maxNumber: 35 },
  { minNumber: 5, maxNumber: 50 },
  { minNumber: 10, maxNumber: 70 },
  { minNumber: 20, maxNumber: 90 },
  { minNumber: 30, maxNumber: 99 },
];

const TIME_LIMIT_LEVELS = [6, 5, 4] as const;
const COUNT_TIME_LEVEL_INTERVAL_ROUNDS = 12;

const AXIS_WEIGHTS: Record<DifficultyAxis, number> = {
  balloonLoad: 0.3,
  mappingChaos: 0.45,
  numberCognition: 0.25,
};

const MAX_LEVEL_BY_AXIS: Record<DifficultyAxis, number> = {
  balloonLoad: BALLOON_LOAD_LEVELS.length - 1,
  mappingChaos: MAPPING_CHAOS_LEVELS.length - 1,
  numberCognition: NUMBER_COGNITION_LEVELS.length - 1,
};

const AXES: readonly DifficultyAxis[] = ['balloonLoad', 'mappingChaos', 'numberCognition'];
const RANDOM_UPGRADE_AXES: readonly Exclude<DifficultyAxis, 'balloonLoad'>[] = [
  'mappingChaos',
  'numberCognition',
];
const WRONG_TAP_DOWNGRADE_ORDER: readonly Exclude<DifficultyAxis, 'balloonLoad'>[] = [
  'mappingChaos',
  'numberCognition',
];
const TIMEOUT_DOWNGRADE_ORDER: readonly Exclude<DifficultyAxis, 'balloonLoad'>[] = [
  'mappingChaos',
  'numberCognition',
];

const MAX_UPGRADE_SCORE_DELTA = 0.22;
const HISTORY_LIMIT = 12;

export const ROUND_UPGRADE_INTERVAL = 12;

export function createInitialDifficultyLevels(): DifficultyAxisLevels {
  return {
    balloonLoad: 0,
    mappingChaos: 0,
    numberCognition: 0,
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

export function getTimeDifficultyLevel(round: number): number {
  const intervalIndex = getCountTimeIntervalIndex(round);
  const timeLevel = Math.floor(intervalIndex / 2);
  return clamp(timeLevel, 0, TIME_LIMIT_LEVELS.length - 1);
}

export function getBalloonLoadDifficultyLevel(round: number): number {
  const intervalIndex = getCountTimeIntervalIndex(round);
  const loadLevel = Math.floor((intervalIndex + 1) / 2);
  return clamp(loadLevel, 0, BALLOON_LOAD_LEVELS.length - 1);
}

export function resolveRoundDifficulty(
  round: number,
  levels: DifficultyAxisLevels
): ResolvedRoundDifficulty {
  const balloonLoadDifficultyLevel = getBalloonLoadDifficultyLevel(round);
  const load = BALLOON_LOAD_LEVELS[balloonLoadDifficultyLevel];
  const chaos = MAPPING_CHAOS_LEVELS[clamp(levels.mappingChaos, 0, MAX_LEVEL_BY_AXIS.mappingChaos)];
  const cognition =
    NUMBER_COGNITION_LEVELS[clamp(levels.numberCognition, 0, MAX_LEVEL_BY_AXIS.numberCognition)];

  const timeDifficultyLevel = getTimeDifficultyLevel(round);
  const effectiveLevels: DifficultyAxisLevels = {
    ...levels,
    balloonLoad: balloonLoadDifficultyLevel,
  };
  const balloonCount = randomInt(load.minBalloonCount, load.maxBalloonCount);

  return {
    generationConfig: {
      balloonCount,
      swapCount: chaos.swapCount,
      maxIndexDiff: chaos.maxIndexDiff,
      minNumber: cognition.minNumber,
      maxNumber: cognition.maxNumber,
      minSize: load.minSize,
      maxSize: load.maxSize,
    },
    timeLimit: TIME_LIMIT_LEVELS[timeDifficultyLevel],
    timeDifficultyLevel,
    difficultyScore: getDifficultyScore(effectiveLevels),
    difficultyName: getDifficultyName(effectiveLevels),
  };
}

export function downgradeDifficultyOnFail(
  levels: DifficultyAxisLevels,
  reason: DifficultyDowngradeReason = 'wrongTap'
): DifficultyDowngradeResult {
  const order = reason === 'timeout' ? TIMEOUT_DOWNGRADE_ORDER : WRONG_TAP_DOWNGRADE_ORDER;

  for (const axis of order) {
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
  const upgradableAxes = RANDOM_UPGRADE_AXES.filter((axis) => levels[axis] < MAX_LEVEL_BY_AXIS[axis]);
  if (upgradableAxes.length === 0) {
    return {
      levels: { ...levels },
      history: [...history],
      upgradedAxis: null,
      blockedByScoreCap: false,
      reachedMaxDifficulty: isMaxRandomUpgradeDifficulty(levels),
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
        reachedMaxDifficulty: isMaxRandomUpgradeDifficulty(nextLevels),
      };
    }

    rejectedAxes.add(selectedAxis);
  }

  return {
    levels: { ...levels },
    history: [...history],
    upgradedAxis: null,
    blockedByScoreCap: true,
    reachedMaxDifficulty: isMaxRandomUpgradeDifficulty(levels),
  };
}

function getCountTimeIntervalIndex(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return Math.floor((safeRound - 1) / COUNT_TIME_LEVEL_INTERVAL_ROUNDS);
}

function isMaxRandomUpgradeDifficulty(levels: DifficultyAxisLevels): boolean {
  return RANDOM_UPGRADE_AXES.every((axis) => levels[axis] >= MAX_LEVEL_BY_AXIS[axis]);
}

function randomInt(min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
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


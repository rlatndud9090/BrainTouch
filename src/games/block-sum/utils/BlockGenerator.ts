/**
 * 블록셈 블록 생성 유틸리티
 */

export interface BlockData {
  id: number;
  value: number;
}

export interface RoundGenerationConfig {
  blockCount: number;
  minValue: number;
  maxValue: number;
  maxRemove: number;
  preferRemove: number;
  maxTargetSum: number | null;
}

export interface RoundData {
  blocks: BlockData[];
  targetSum: number;
  minBlocksToKeep: number; // 최소 유지해야 할 블록 수 (점수 계산용)
}

const MAX_ROUND_GENERATION_ATTEMPTS = 30;

/**
 * 랜덤 정수 생성 (min ~ max 포함)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 블록 배열에서 가능한 모든 부분집합의 합 계산
 * 2^n 조합이므로 최대 64개 (n=6)
 */
function getAllPossibleSums(blocks: BlockData[]): Map<number, number[]> {
  const results = new Map<number, number[]>(); // sum -> 제거할 블록 인덱스들
  const n = blocks.length;

  // 모든 부분집합 순회 (비트마스크)
  for (let mask = 0; mask < 1 << n; mask++) {
    const removedIndices: number[] = [];
    let keptSum = 0;

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        // 이 블록은 제거
        removedIndices.push(i);
      } else {
        // 이 블록은 유지
        keptSum += blocks[i].value;
      }
    }

    // 최소 1개는 남겨야 함
    if (removedIndices.length < n) {
      // 더 적게 제거하는 조합 우선 (없으면 추가)
      if (!results.has(keptSum) || results.get(keptSum)!.length > removedIndices.length) {
        results.set(keptSum, removedIndices);
      }
    }
  }

  return results;
}

/**
 * 라운드 데이터 생성
 */
export function generateRound(config: RoundGenerationConfig): RoundData {
  const normalizedConfig = normalizeConfig(config);

  for (let attempt = 0; attempt < MAX_ROUND_GENERATION_ATTEMPTS; attempt++) {
    const blocks = createBlocks(normalizedConfig);
    const selectedTarget = selectTarget(blocks, normalizedConfig, true);

    if (selectedTarget) {
      return {
        blocks,
        targetSum: selectedTarget.sum,
        minBlocksToKeep: blocks.length - selectedTarget.removeCount,
      };
    }
  }

  return generateFallbackRound(normalizedConfig);
}

/**
 * 현재 블록 상태에서 목표 달성 가능 여부 확인
 */
export function canAchieveTarget(blocks: BlockData[], targetSum: number): boolean {
  const possibleSums = getAllPossibleSums(blocks);
  return possibleSums.has(targetSum);
}

/**
 * 현재 블록 합계 계산
 */
export function calculateSum(blocks: BlockData[]): number {
  return blocks.reduce((sum, b) => sum + b.value, 0);
}

function normalizeConfig(config: RoundGenerationConfig): RoundGenerationConfig {
  const minValue = Math.max(0, Math.floor(config.minValue));
  const maxValue = Math.max(minValue, Math.floor(config.maxValue));
  const blockCount = Math.max(2, Math.floor(config.blockCount));
  const maxRemove = Math.max(1, Math.min(blockCount - 1, Math.floor(config.maxRemove)));
  const preferRemove = Math.max(1, Math.min(maxRemove, Math.floor(config.preferRemove)));

  return {
    blockCount,
    minValue,
    maxValue,
    maxRemove,
    preferRemove,
    maxTargetSum: config.maxTargetSum,
  };
}

function createBlocks(config: RoundGenerationConfig): BlockData[] {
  const blocks: BlockData[] = [];

  for (let i = 0; i < config.blockCount; i++) {
    blocks.push({
      id: i,
      value: randomInt(config.minValue, config.maxValue),
    });
  }

  return blocks;
}

function selectTarget(
  blocks: BlockData[],
  config: RoundGenerationConfig,
  respectMaxTarget: boolean
): { sum: number; removeCount: number } | null {
  const possibleSums = getAllPossibleSums(blocks);
  const validTargets: { sum: number; removeCount: number }[] = [];

  for (const [sum, removedIndices] of possibleSums.entries()) {
    const removeCount = removedIndices.length;
    if (removeCount < 1 || removeCount > config.maxRemove || sum <= 0) {
      continue;
    }

    if (respectMaxTarget && config.maxTargetSum !== null && sum > config.maxTargetSum) {
      continue;
    }

    validTargets.push({ sum, removeCount });
  }

  if (validTargets.length === 0) {
    return null;
  }

  const weightedTargets: { sum: number; removeCount: number }[] = [];
  for (const target of validTargets) {
    const weight = target.removeCount <= config.preferRemove ? 3 : 1;
    for (let i = 0; i < weight; i++) {
      weightedTargets.push(target);
    }
  }

  return weightedTargets[randomInt(0, weightedTargets.length - 1)];
}

function generateFallbackRound(config: RoundGenerationConfig): RoundData {
  const blocks = createBlocks(config);
  const preferredTarget =
    selectTarget(blocks, config, false) ??
    ({
      sum: calculateSum(blocks.slice(1)),
      removeCount: 1,
    } as const);

  return {
    blocks,
    targetSum: preferredTarget.sum,
    minBlocksToKeep: blocks.length - preferredTarget.removeCount,
  };
}

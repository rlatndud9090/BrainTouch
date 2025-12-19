/**
 * 블록셈 블록 생성 유틸리티
 */

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface BlockData {
  id: number;
  value: number;
}

export interface RoundData {
  blocks: BlockData[];
  targetSum: number;
  minBlocksToKeep: number; // 최소 유지해야 할 블록 수 (점수 계산용)
}

// 난이도 설정
const DIFFICULTY_CONFIG = {
  easy: {
    blockCount: 4,
    minValue: 1,
    maxValue: 9,
  },
  normal: {
    blockCount: 5,
    minValue: 1,
    maxValue: 12,
  },
  hard: {
    blockCount: 6,
    minValue: 1,
    maxValue: 15,
  },
} as const;

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
export function generateRound(difficulty: Difficulty): RoundData {
  const config = DIFFICULTY_CONFIG[difficulty];
  const blocks: BlockData[] = [];

  // 블록 생성
  for (let i = 0; i < config.blockCount; i++) {
    blocks.push({
      id: i,
      value: randomInt(config.minValue, config.maxValue),
    });
  }

  // 가능한 모든 합 계산
  const possibleSums = getAllPossibleSums(blocks);

  // 가능한 목표 합 중 하나 선택 (전체 합은 제외 - 아무것도 안 빼면 재미없음)
  const totalSum = blocks.reduce((sum, b) => sum + b.value, 0);
  const validTargets = Array.from(possibleSums.keys()).filter((sum) => sum !== totalSum && sum > 0);

  if (validTargets.length === 0) {
    // 극히 드문 경우 - 다시 생성
    return generateRound(difficulty);
  }

  // 랜덤 목표 선택
  const targetSum = validTargets[randomInt(0, validTargets.length - 1)];
  const minRemoveCount = possibleSums.get(targetSum)!.length;
  const minBlocksToKeep = config.blockCount - minRemoveCount;

  return {
    blocks,
    targetSum,
    minBlocksToKeep,
  };
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

/**
 * 난이도 이름 (한글)
 */
export function getDifficultyName(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return '하';
    case 'normal':
      return '중';
    case 'hard':
      return '상';
  }
}

/**
 * 다음 난이도 반환
 */
export function getNextDifficulty(current: Difficulty): Difficulty {
  switch (current) {
    case 'easy':
      return 'normal';
    case 'normal':
      return 'hard';
    case 'hard':
      return 'hard';
  }
}

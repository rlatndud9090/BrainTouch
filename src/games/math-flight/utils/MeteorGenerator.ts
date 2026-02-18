/**
 * 중간값 비행 - 운석 생성 알고리즘
 *
 * 규칙:
 * - 5개 운석이 동시에 떨어짐
 * - 가장 큰 수 / 가장 작은 수 → 실패 (라이프 -1)
 * - 중간 3개 → 성공 (점수 획득)
 * - 정확히 중간값 → 2배 점수
 */

export type MeteorType = 'min' | 'max' | 'success' | 'median';

export interface MeteorData {
  value: number;
  lane: number;
  type: MeteorType;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

// 난이도별 설정
interface DifficultyConfig {
  successRange: { min: number; max: number }; // 성공 운석 범위 (±)
  failRange: { min: number; max: number }; // 실패 운석 범위 (±)
  speedMultiplier: number;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    successRange: { min: 5, max: 8 },
    failRange: { min: 10, max: 15 },
    speedMultiplier: 1.0,
  },
  medium: {
    successRange: { min: 4, max: 7 },
    failRange: { min: 7, max: 11 },
    speedMultiplier: 1.3,
  },
  hard: {
    successRange: { min: 3, max: 5 },
    failRange: { min: 4, max: 8 },
    speedMultiplier: 1.6,
  },
};

/**
 * 턴 수에 따른 난이도 결정
 */
export function getDifficulty(turnCount: number): Difficulty {
  if (turnCount <= 10) return 'easy';
  if (turnCount <= 25) return 'medium';
  return 'hard';
}

/**
 * 난이도별 속도 배수 반환
 */
export function getSpeedMultiplier(difficulty: Difficulty): number {
  return DIFFICULTY_CONFIG[difficulty].speedMultiplier;
}

/**
 * min ~ max 사이 랜덤 정수
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 배열 셔플 (Fisher-Yates)
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 5개 운석 생성 (새로운 규칙)
 *
 * @param difficulty 현재 난이도
 * @returns 5개 운석 데이터 (랜덤 레인 배치)
 */
export function generateMeteors(difficulty: Difficulty): MeteorData[] {
  const config = DIFFICULTY_CONFIG[difficulty];

  // 1. 중간값 결정 (10~40 범위, 경계 여유)
  const medianValue = randomInt(12, 38);

  // 2. 성공 범위 숫자 2개 (중간값 ± successRange)
  const successOffset1 = randomInt(config.successRange.min, config.successRange.max);
  const successOffset2 = randomInt(config.successRange.min, config.successRange.max);

  // 3. 실패 범위 숫자 2개 (중간값 ± failRange)
  const failOffset1 = randomInt(config.failRange.min, config.failRange.max);
  const failOffset2 = randomInt(config.failRange.min, config.failRange.max);

  // 4. 실제 값 계산 (0~50 범위 내로 클램핑)
  const clamp = (v: number) => Math.max(0, Math.min(50, v));

  const values = [
    { value: clamp(medianValue - failOffset1), type: 'min' as MeteorType }, // 가장 작은 (실패)
    { value: clamp(medianValue - successOffset1), type: 'success' as MeteorType }, // 성공
    { value: medianValue, type: 'median' as MeteorType }, // 중간값 (2배)
    { value: clamp(medianValue + successOffset2), type: 'success' as MeteorType }, // 성공
    { value: clamp(medianValue + failOffset2), type: 'max' as MeteorType }, // 가장 큰 (실패)
  ];

  // 5. 정렬 후 타입 재지정 (실제 최소/최대 확인)
  const sorted = [...values].sort((a, b) => a.value - b.value);

  // 실제 최소값과 최대값에 타입 지정
  sorted[0].type = 'min';
  sorted[4].type = 'max';
  sorted[2].type = 'median';
  sorted[1].type = 'success';
  sorted[3].type = 'success';

  // 6. 레인 셔플 (0~4)
  const lanes = shuffle([0, 1, 2, 3, 4]);

  // 7. 최종 운석 데이터 생성
  const meteors: MeteorData[] = sorted.map((item, index) => ({
    value: item.value,
    lane: lanes[index],
    type: item.type,
  }));

  return meteors;
}

/**
 * 운석이 성공인지 확인
 */
export function isSuccessMeteor(type: MeteorType): boolean {
  return type === 'success' || type === 'median';
}

/**
 * 운석이 중간값인지 확인 (2배 점수)
 */
export function isMedianMeteor(type: MeteorType): boolean {
  return type === 'median';
}

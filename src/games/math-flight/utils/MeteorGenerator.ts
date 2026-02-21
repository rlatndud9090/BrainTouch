/**
 * 중간값 비행 - 운석 생성 알고리즘
 *
 * 규칙:
 * - 3개 운석이 동시에 떨어짐
 * - 중간값 운석만 성공 판정
 * - 최솟값/최댓값 운석은 실패 판정
 */

export type MeteorType = 'min' | 'median' | 'max';

export interface MeteorData {
  value: number;
  lane: number;
  type: MeteorType;
}

export interface MeteorGenerationConfig {
  minGap: number;
  maxGap: number;
}

const VALUE_MIN = 0;
const VALUE_MAX = 50;
const LANE_INDEXES = [0, 1, 2] as const;

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
 * 3개 운석 생성
 *
 * @param config 숫자 간격 설정
 * @returns 3개 운석 데이터 (랜덤 레인 배치)
 */
export function generateMeteors(config: MeteorGenerationConfig): MeteorData[] {
  const minGap = Math.max(1, Math.floor(config.minGap));
  const maxGap = Math.max(minGap, Math.floor(config.maxGap));

  const leftGap = randomInt(minGap, maxGap);
  const rightGap = randomInt(minGap, maxGap);
  const largestGap = Math.max(leftGap, rightGap);

  const medianMin = VALUE_MIN + largestGap;
  const medianMax = VALUE_MAX - largestGap;

  if (medianMin > medianMax) {
    throw new Error('[math-flight] 유효한 중간값을 생성할 수 없습니다. 간격 설정을 확인하세요.');
  }

  const medianValue = randomInt(medianMin, medianMax);

  const ordered: Array<{ value: number; type: MeteorType }> = [
    { value: medianValue - leftGap, type: 'min' },
    { value: medianValue, type: 'median' },
    { value: medianValue + rightGap, type: 'max' },
  ];

  const lanes = shuffle([...LANE_INDEXES]);

  return ordered.map((item, index) => ({
    value: item.value,
    lane: lanes[index],
    type: item.type,
  }));
}

/**
 * 운석이 성공인지 확인 (중간값 단일 성공)
 */
export function isSuccessMeteor(type: MeteorType): boolean {
  return type === 'median';
}

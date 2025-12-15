/**
 * 운석 생성 알고리즘
 * - 현재 파워를 기준으로 5개 운석 생성
 * - 성공 운석 3개 + 실패 운석 2개 (기본)
 * - 난이도 조정에 따라 비율 변경
 */

export interface MeteorData {
  value: number;
  lane: number;
  isOptimal: boolean;
}

/**
 * 랜덤 정수 생성 (min 이상 max 이하)
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
 * 일반 운석 5개 생성
 */
export function generateMeteors(
  power: number,
  successCount: number = 3,
  failCount: number = 2
): MeteorData[] {
  const meteors: MeteorData[] = [];
  const usedLanes: Set<number> = new Set();

  // 성공 운석 생성 (power 이하)
  const successValues: number[] = [];
  for (let i = 0; i < successCount; i++) {
    // 파워의 20% ~ 100% 범위에서 생성
    const minVal = Math.max(1, Math.floor(power * 0.2));
    const maxVal = power;
    let value = randomInt(minVal, maxVal);

    // 중복 방지
    while (successValues.includes(value)) {
      value = randomInt(minVal, maxVal);
    }
    successValues.push(value);
  }

  // 정답 찾기 (가장 큰 성공 운석)
  const optimalValue = Math.max(...successValues);

  // 실패 운석 생성 (power 초과)
  const failValues: number[] = [];
  for (let i = 0; i < failCount; i++) {
    // 파워의 101% ~ 150% 범위에서 생성
    const minVal = power + 1;
    const maxVal = Math.floor(power * 1.5) + 5;
    let value = randomInt(minVal, maxVal);

    // 중복 방지
    while (failValues.includes(value)) {
      value = randomInt(minVal, maxVal);
    }
    failValues.push(value);
  }

  // 모든 값을 합쳐서 레인에 배치
  const allValues = [...successValues, ...failValues];
  const lanes = shuffle([0, 1, 2, 3, 4]);

  for (let i = 0; i < 5; i++) {
    meteors.push({
      value: allValues[i],
      lane: lanes[i],
      isOptimal: allValues[i] === optimalValue,
    });
  }

  return meteors;
}

/**
 * 마이너스 운석 5개 생성
 */
export function generateMinusMeteors(power: number): MeteorData[] {
  const meteors: MeteorData[] = [];
  const values: number[] = [];

  // 음수 운석 생성 (-1 ~ -파워의 30%)
  for (let i = 0; i < 5; i++) {
    const minAbs = 1;
    const maxAbs = Math.max(5, Math.floor(power * 0.3));
    let value = -randomInt(minAbs, maxAbs);

    // 중복 방지
    while (values.includes(value)) {
      value = -randomInt(minAbs, maxAbs);
    }
    values.push(value);
  }

  // 정답 찾기 (절대값이 가장 작은 것 = 가장 큰 음수)
  const optimalValue = Math.max(...values);

  const lanes = shuffle([0, 1, 2, 3, 4]);

  for (let i = 0; i < 5; i++) {
    meteors.push({
      value: values[i],
      lane: lanes[i],
      isOptimal: values[i] === optimalValue,
    });
  }

  return meteors;
}

/**
 * 난이도에 따른 운석 구성 결정
 */
export function getMeteorConfig(
  consecutiveOptimal: number,
  consecutiveFail: number
): {
  successCount: number;
  failCount: number;
} {
  // 연속 실패 시 구제
  if (consecutiveFail >= 2) {
    return { successCount: 4, failCount: 1 };
  }

  // 기본 구성
  return { successCount: 3, failCount: 2 };
}

/**
 * 마이너스 턴 발동 조건 체크
 */
export function shouldTriggerMinusTurn(power: number, turnCount: number): boolean {
  // 파워 99 도달 시 강제 발동
  if (power >= 99) return true;

  // 파워 50 이상, 5턴마다 발동
  if (power >= 50 && turnCount > 0 && turnCount % 5 === 0) return true;

  return false;
}

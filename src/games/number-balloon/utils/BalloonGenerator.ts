/**
 * 숫자풍선 생성 유틸리티
 * 형님 알고리즘: 정렬 기반 매칭 + 난이도별 index 교환
 */

export interface BalloonData {
  id: number;
  value: number; // 풍선에 적힌 숫자
  size: number; // 풍선 크기 (반지름)
  x: number; // 위치
  y: number;
  color: number; // 풍선 색상
}

export interface RoundConfig {
  balloonCount: number; // 풍선 개수
  swapCount: number; // 교환 쌍 개수
  maxIndexDiff: number; // 최대 index 차이
  minNumber: number; // 숫자 범위 최소
  maxNumber: number; // 숫자 범위 최대
}

// 풍선 색상 팔레트 (이미지 참고)
const BALLOON_COLORS = [
  0xff69b4, // 핑크
  0x4fc3f7, // 하늘색
  0xff7043, // 주황
  0x81c784, // 초록
  0xef5350, // 빨강
  0xffee58, // 노랑
  0xba68c8, // 보라
  0x4dd0e1, // 민트
];

// 풍선 크기 범위
const MIN_SIZE = 40;
const MAX_SIZE = 70;

// 그리드 설정
const GRID_COLS = 3;
const GRID_ROWS = 3;

/**
 * 라운드에 따른 난이도 설정 반환
 */
export function getRoundConfig(round: number): RoundConfig {
  // 라운드가 올라갈수록 난이도 상승
  const balloonCount = Math.min(5 + Math.floor(round / 3), 9); // 5 → 9개
  const swapCount = Math.min(Math.floor(round / 2), 3); // 0 → 3쌍
  const maxIndexDiff = Math.min(1 + Math.floor(round / 2), 4); // 1 → 4

  // 숫자 범위도 확장
  const minNumber = 0;
  const maxNumber = Math.min(9 + round * 2, 99); // 9 → 99

  return {
    balloonCount,
    swapCount,
    maxIndexDiff,
    minNumber,
    maxNumber,
  };
}

/**
 * 랜덤 정수 생성 (min ~ max 포함)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 배열에서 중복 없는 랜덤 숫자 N개 선택
 */
function pickUniqueRandomNumbers(min: number, max: number, count: number): number[] {
  const range = max - min + 1;
  if (count > range) {
    throw new Error('범위보다 많은 숫자를 요청할 수 없습니다');
  }

  const numbers: Set<number> = new Set();
  while (numbers.size < count) {
    numbers.add(randomInt(min, max));
  }

  return Array.from(numbers);
}

/**
 * 그리드 기반 풍선 위치 생성 (겹침 방지 보장)
 * 3×3 그리드에서 필요한 만큼 셀을 선택하고, 셀 중심에 랜덤 오프셋 적용
 */
function generateGridPositions(
  count: number,
  areaWidth: number,
  areaHeight: number,
  padding: number = 30
): { x: number; y: number }[] {
  const cellWidth = (areaWidth - padding * 2) / GRID_COLS;
  const cellHeight = (areaHeight - padding * 2) / GRID_ROWS;

  // 셀 인덱스 배열 생성 (0~8)
  const cellIndices = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => i);

  // 셔플해서 필요한 만큼 선택
  const shuffled = cellIndices.sort(() => Math.random() - 0.5);
  const selectedCells = shuffled.slice(0, count);

  // 각 셀의 중심점 + 랜덤 오프셋
  const positions = selectedCells.map((cellIndex) => {
    const col = cellIndex % GRID_COLS;
    const row = Math.floor(cellIndex / GRID_COLS);

    // 셀 중심 좌표
    const centerX = padding + col * cellWidth + cellWidth / 2;
    const centerY = padding + row * cellHeight + cellHeight / 2;

    // 랜덤 오프셋 (셀 크기의 15% 범위 내)
    const offsetRange = Math.min(cellWidth, cellHeight) * 0.15;
    const offsetX = randomInt(-offsetRange, offsetRange);
    const offsetY = randomInt(-offsetRange, offsetRange);

    return {
      x: centerX + offsetX,
      y: centerY + offsetY,
    };
  });

  return positions;
}

/**
 * Index 교환 쌍 생성
 * @param count 배열 길이
 * @param swapCount 교환할 쌍의 개수
 * @param maxIndexDiff 교환 시 최대 index 차이
 * @returns 교환할 index 쌍 배열 [[a, b], [c, d], ...]
 */
function generateSwapPairs(
  count: number,
  swapCount: number,
  maxIndexDiff: number
): [number, number][] {
  if (swapCount === 0 || count < 2) return [];

  const swapPairs: [number, number][] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < swapCount && usedIndices.size < count - 1; i++) {
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      // 작은 index 선택 (앞쪽에서)
      const smallIdx = randomInt(0, Math.floor(count / 2));
      // 큰 index 선택 (뒤쪽에서, maxIndexDiff 고려)
      const minLargeIdx = Math.min(smallIdx + 1, count - 1);
      const maxLargeIdx = Math.min(smallIdx + maxIndexDiff, count - 1);

      if (maxLargeIdx <= minLargeIdx) {
        attempts++;
        continue;
      }

      const largeIdx = randomInt(minLargeIdx, maxLargeIdx);

      if (!usedIndices.has(smallIdx) && !usedIndices.has(largeIdx)) {
        swapPairs.push([smallIdx, largeIdx]);
        usedIndices.add(smallIdx);
        usedIndices.add(largeIdx);
        break;
      }

      attempts++;
    }
  }

  return swapPairs;
}

/**
 * 라운드 풍선 데이터 생성 (형님 알고리즘)
 */
export function generateBalloons(
  round: number,
  areaWidth: number,
  areaHeight: number
): BalloonData[] {
  const config = getRoundConfig(round);
  const { balloonCount, swapCount, maxIndexDiff, minNumber, maxNumber } = config;

  // 1. 크기 배열 랜덤 생성 후 정렬 (오름차순)
  const sizes = Array.from({ length: balloonCount }, () => randomInt(MIN_SIZE, MAX_SIZE));
  sizes.sort((a, b) => a - b);

  // 2. 숫자 배열 랜덤 생성 후 정렬 (오름차순)
  const numbers = pickUniqueRandomNumbers(minNumber, maxNumber, balloonCount);
  numbers.sort((a, b) => a - b);

  // 3. 기본 매칭: 같은 index (작은 숫자 = 작은 풍선)
  // → 일단 그대로 유지

  // 4. 난이도에 따라 크기 index 교환 (숫자는 그대로, 크기만 교환)
  const swapPairs = generateSwapPairs(balloonCount, swapCount, maxIndexDiff);
  for (const [i, j] of swapPairs) {
    // 크기 배열에서 i와 j를 교환
    // 결과: 작은 숫자(numbers[i])가 큰 풍선(sizes[j])에, 큰 숫자(numbers[j])가 작은 풍선(sizes[i])에
    [sizes[i], sizes[j]] = [sizes[j], sizes[i]];
  }

  // 5. 위치 생성 (그리드 기반, 겹침 방지)
  const positions = generateGridPositions(balloonCount, areaWidth, areaHeight);

  // 6. 색상 랜덤 할당
  const shuffledColors = [...BALLOON_COLORS].sort(() => Math.random() - 0.5);

  // 7. 최종 풍선 데이터 생성
  const balloons: BalloonData[] = numbers.map((value, index) => ({
    id: index,
    value,
    size: sizes[index],
    x: positions[index].x,
    y: positions[index].y,
    color: shuffledColors[index % shuffledColors.length],
  }));

  // 8. 위치 셔플 (화면에 랜덤하게 배치되도록)
  return balloons.sort(() => Math.random() - 0.5);
}

/**
 * 정답 순서 반환 (작은 숫자부터)
 */
export function getCorrectOrder(balloons: BalloonData[]): number[] {
  return [...balloons].sort((a, b) => a.value - b.value).map((b) => b.id);
}
